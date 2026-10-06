const TABLES = ['Customer', 'CustomerPayment', 'PropertyAcquisition', 'PropertyPayment',
  'Wallet', 'WalletTransaction', 'Expense', 'FundRequest', 'User', 'Role',
  'TransactionDocument', 'DocumentException', 'GlobalBankReference'];

async function ensureSummarySchema(db = require('../config/db').$root) {
  await db.$transaction(async tx => {
    await tx.$executeRaw`SET LOCAL lock_timeout = '10s'`;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(734821906)::text`;
    await tx.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "SummaryRevision" (id integer PRIMARY KEY, revision bigint NOT NULL DEFAULT 0)');
    await tx.$executeRawUnsafe('INSERT INTO "SummaryRevision" (id,revision) VALUES (1,0) ON CONFLICT (id) DO NOTHING');
    await tx.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION estatesync_summary_changed() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN UPDATE "SummaryRevision" SET revision=revision+1 WHERE id=1; RETURN NULL; END $$`);
    for (const table of TABLES) {
      // Static identifiers only; a statement trigger also covers bulk writes and
      // maintenance scripts. Its revision update rolls back with failed writes.
      await tx.$executeRawUnsafe(`CREATE OR REPLACE TRIGGER estatesync_summary_changed AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON "${table}"
        FOR EACH STATEMENT EXECUTE FUNCTION estatesync_summary_changed()`);
    }
  }, { maxWait: 10000, timeout: 30000 });
}
module.exports = { ensureSummarySchema };
