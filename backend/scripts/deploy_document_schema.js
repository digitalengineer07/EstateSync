// Explicit additive upgrade for repositories deployed via db push, not migrate.
require('dotenv').config();
const { Client } = require('pg');
const fs = require('node:fs/promises');
const path = require('node:path');
async function main() {
  if (!process.argv.includes('--apply')) throw Error('Review the SQL and back up the database, then run with --apply.');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout='5s'");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('estatesync-document-schema'))");
    const { rows } = await client.query(`SELECT to_regclass('"TransactionDocument"') AS documents, to_regclass('"DocumentUpload"') AS uploads, to_regclass('"DocumentException"') AS exceptions`);
    if (Object.values(rows[0]).some(Boolean)) throw Error('Document tables already exist. Validate schema rather than reapplying this upgrade.');
    const sql = await fs.readFile(path.join(__dirname, '../prisma/upgrades/20260930_transaction_documents.sql'), 'utf8');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Applied 20260930_transaction_documents. Generate Prisma client and synchronize document permissions next.');
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { await client.end(); }
}
main().catch(() => { console.error('Document schema upgrade failed. No changes committed; inspect schema and connection configuration.'); process.exitCode = 1; });
