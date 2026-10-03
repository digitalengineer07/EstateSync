require('dotenv').config();
const db = require('../src/config/db');
const { storage } = require('../src/services/documents/storage');
async function reconcile({ apply = false } = {}) {
  const provider = storage();
  let expired = 0, orphans = 0, unavailable = 0;
  let uploadCursor;
  do {
    const uploads = await db.documentUpload.findMany({ where: { documentId: null, OR: [{ expiresAt: { lt: new Date() } }, { discardedAt: { not: null } }] }, take: 500, ...(uploadCursor ? { cursor: { id: uploadCursor }, skip: 1 } : {}), orderBy: { id: 'asc' } });
    for (const u of uploads) {
      if (!await provider.exists(u.storageKey)) continue;
      expired++;
      if (apply) {
        const claimed = await db.documentUpload.updateMany({ where: { id: u.id, documentId: null, OR: [{ expiresAt: { lt: new Date() } }, { discardedAt: { not: null } }] }, data: { discardedAt: new Date() } });
        if (claimed.count) await provider.removeUnclaimed(u.storageKey);
      }
    }
    uploadCursor = uploads.length === 500 ? uploads.at(-1).id : null;
  } while (uploadCursor);
  for (const item of await provider.list()) {
    if (item.modifiedAt > new Date(Date.now() - 48 * 3600000)) continue;
    if (await db.transactionDocument.findUnique({ where: { storageKey: item.key }, select: { id: true } })) continue;
    if (await db.documentUpload.findUnique({ where: { storageKey: item.key }, select: { id: true } })) continue;
    orphans++; if (apply) await provider.removeUnclaimed(item.key);
  }
  let cursor;
  do {
    const documents = await db.transactionDocument.findMany({ take: 100, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), orderBy: { id: 'asc' }, select: { id: true, storageKey: true } });
    for (const d of documents) if (!await provider.exists(d.storageKey)) unavailable++;
    cursor = documents.length === 100 ? documents.at(-1).id : null;
  } while (cursor);
  return { apply, expired, orphans, unavailable };
}
if (require.main === module) reconcile({ apply: process.argv.includes('--apply') }).then(result => { console.log(JSON.stringify(result)); if (result.unavailable) process.exitCode = 1; }).catch(() => { console.error('Document storage reconciliation failed.'); process.exitCode = 1; }).finally(() => db.$disconnect());
module.exports = { reconcile };
