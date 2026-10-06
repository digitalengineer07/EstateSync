require('dotenv').config();
const fs = require('node:fs/promises');
const path = require('node:path');
const { Client } = require('pg');
async function applyReadIndexes(url = process.env.DATABASE_URL) {
  if (!url) throw Error('DATABASE_URL is required');
  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    await db.query("SET lock_timeout='10s'");
    const sql = await fs.readFile(path.join(__dirname, '../prisma/upgrades/20261006_read_indexes.sql'), 'utf8');
    for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await db.query(statement);
    const invalid = await db.query(`SELECT c.relname FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
      WHERE NOT i.indisvalid AND c.relname IN ('Customer_createdAt_id_idx','Customer_salesOwnerId_createdAt_id_idx','CustomerPayment_customerId_dateOfPayment_idx')`);
    if (invalid.rows.length) throw Error('Incomplete concurrent indexes: ' + invalid.rows.map(r => r.relname).join(', ') + '. Drop these INVALID indexes concurrently and rerun.');
  } finally { await db.end(); }
}
if (require.main === module) applyReadIndexes().then(() => console.log('Read indexes installed and valid.')).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { applyReadIndexes };
