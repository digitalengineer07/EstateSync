// Only presentation summaries use this cache. Never use it to authorize a write
// or to validate balances. The database revision changes in the writing transaction.
function createSummaryCache({ revision, ttlMs = 5000, maxEntries = 256, now = Date.now }) {
  const entries = new Map();
  return async function remember(key, loader) {
    let version;
    try { version = String(await revision()); }
    catch { return loader(); } // Missing upgrade/unavailable revision: do not cache.
    const cacheKey = `${version}:${key}`;
    const existing = entries.get(cacheKey);
    if (existing && (existing.pending || existing.expires > now())) return existing.value;
    if (entries.size >= maxEntries) entries.delete(entries.keys().next().value);
    const entry = { pending: true, expires: 0 };
    entry.value = Promise.resolve().then(loader).then(value => {
      entry.pending = false;
      entry.expires = now() + ttlMs;
      return value;
    }).catch(error => {
      if (entries.get(cacheKey) === entry) entries.delete(cacheKey);
      throw error;
    });
    entries.set(cacheKey, entry);
    return entry.value;
  };
}
const rememberSummary = createSummaryCache({ revision: async () => {
  const db = require('../config/db');
  const rows = await db.$queryRaw`SELECT revision::text FROM "SummaryRevision" WHERE id=1`;
  if (!rows.length) throw Error('Summary revision is not initialized');
  return rows[0].revision;
} });
module.exports = { createSummaryCache, rememberSummary };
