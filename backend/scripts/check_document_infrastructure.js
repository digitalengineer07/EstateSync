// Run on the actual backend host before enabling uploads. Does not touch the DB.
require('dotenv').config();
const { storage } = require('../src/services/documents/storage');
const clamav = require('../src/services/documents/clamav');

async function main() {
  const store = storage();
  if (process.env.DOCUMENT_STORAGE_PROVIDER !== 's3' && !process.env.DOCUMENT_STORAGE_PATH) throw Error('DOCUMENT_STORAGE_PATH must be set for local private storage.');
  const probe = Buffer.from('EstateSync private storage probe');
  const key = await store.put(probe);
  try {
    if (!(await store.read(key)).equals(probe)) throw Error('Private storage failed its read-after-write check.');
    if (!(await store.exists(key))) throw Error('Private storage failed its object-existence check.');
    if (!(await store.list()).some(item => item.key === key)) throw Error('Private storage failed its listing check.');
  } finally { await store.removeUnclaimed(key); }
  console.log('Private document storage passed write/read/remove checks.');
  if (process.env.DOCUMENT_SCANNER_PROVIDER !== 'clamav' || process.env.DOCUMENT_SCANNER_REQUIRED !== 'true') {
    throw Error('Set DOCUMENT_SCANNER_PROVIDER=clamav and DOCUMENT_SCANNER_REQUIRED=true before production rollout.');
  }
  await clamav.ping();
  console.log('ClamAV daemon responded to its health check.');
}

main().catch(error => {
  console.error('Document infrastructure check failed:', error.message);
  process.exitCode = 1;
});
