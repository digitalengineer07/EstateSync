const fs = require('node:fs');
const path = require('node:path');
const prisma = require('../config/db');

async function ensureSecuritySchema(db = prisma.$root || prisma) {
  const sql = fs.readFileSync(path.join(__dirname, '../../prisma/upgrades/20261004_security_sessions.sql'), 'utf8');
  await db.$transaction(async tx => {
    await tx.$executeRaw`SET LOCAL lock_timeout = '10s'`;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(734821906)::text`;
    for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) {
      await tx.$executeRawUnsafe(statement);
    }
  }, { maxWait: 10000, timeout: 30000 });
}

module.exports = { ensureSecuritySchema };
