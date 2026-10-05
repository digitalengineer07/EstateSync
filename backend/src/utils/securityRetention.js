const prisma = require('../config/db');
async function pruneSecurityRecords(db = prisma.$root) {
  for (const model of ['idempotencyKey','authSession']) {
    const rows = await db[model].findMany({ where: { expiresAt: { lt: new Date() } }, select: { id: true }, take: 500 });
    if (rows.length) await db[model].deleteMany({ where: { id: { in: rows.map(r => r.id) }, expiresAt: { lt: new Date() } } });
  }
}
function startSecurityRetention() {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try { await pruneSecurityRecords(); } catch (e) { console.error('Security retention failed:', e.message); } finally { running = false; }
  }, 300000);
  timer.unref();
  return timer;
}
module.exports = { pruneSecurityRecords, startSecurityRetention };
