// Only invoked by the disposable-cluster runner; never load .env here.
const { Client } = require('pg');
async function seedLoadDataset(env) {
  if (!env.DOCUMENT_TEST_DATABASE_URL || env.DATABASE_URL !== env.DOCUMENT_TEST_DATABASE_URL) throw Error('Disposable test database required');
  const count = Number(env.LOAD_RECORDS || 10000);
  if (!Number.isSafeInteger(count) || count < 10 || count > 10000000 || count % 10) throw Error('LOAD_RECORDS must be a multiple of 10, between 10 and 10000000');
  if (count >= 1000000 && env.LOAD_LARGE_DATASET !== 'YES') throw Error('Set LOAD_LARGE_DATASET=YES for one million or more records');
  const db = new Client({ connectionString: env.DATABASE_URL, statement_timeout: 120000 });
  await db.connect();
  const started = Date.now();
  try {
    const { rows: [actor] } = await db.query('SELECT id FROM "User" WHERE email=$1', ['admin@estatesync.local']);
    if (!actor) throw Error('Seed test accounts first');
    await db.query(`INSERT INTO "Account" (id,code,name,type,"updatedAt") VALUES
      ('load-asset','LOAD-ASSET','Synthetic load asset','ASSET',now()),
      ('load-equity','LOAD-EQUITY','Synthetic load equity','EQUITY',now())`);
    // Each bundle is exactly 10 workload rows. Small transactions bound memory/WAL bursts.
    for (let start = 1; start <= count / 10; start += 5000) {
      const end = Math.min(start + 4999, count / 10);
      await db.query('BEGIN');
      try {
        await db.query(`INSERT INTO "Customer" (id,"salesOwnerId","customerName","customerContact","projectLocation","plotNo","areaSqft","khataNo","identityType","identityNumber","totalContractValue","balanceDue","updatedAt")
          SELECT 'load-c-'||n,$3,'Load customer '||n,'0000000000','Synthetic project','LOAD-'||n,100,'LOAD-'||n,'TEST','LOAD-'||n,1000,1000,now() FROM generate_series($1::int,$2::int) n`, [start,end,actor.id]);
        await db.query(`INSERT INTO "JournalEntry" (id,"entryNumber",date,"referenceType",description,"createdBy")
          SELECT 'load-j-'||n,'LOAD-J-'||n,now()-(n%730)*interval '1 day','LOAD_TEST','Synthetic balanced journal',$3 FROM generate_series($1::int,$2::int) n`, [start,end,actor.id]);
        await db.query(`INSERT INTO "JournalLine" (id,"journalEntryId","accountId",debit,credit)
          SELECT 'load-line-'||n||'-'||side,'load-j-'||n,CASE WHEN side=1 THEN 'load-asset' ELSE 'load-equity' END,
          CASE WHEN side=1 THEN 100 ELSE 0 END,CASE WHEN side=2 THEN 100 ELSE 0 END
          FROM generate_series($1::int,$2::int) n CROSS JOIN generate_series(1,2) side`, [start,end]);
        await db.query(`INSERT INTO "OperationalNote" (id,title,category,amount,"noteDate","createdById","updatedAt")
          SELECT 'load-note-'||n||'-'||side,'Synthetic note '||n,'GENERAL_NOTE',0,now()-(n%730)*interval '1 day',$3,now()
          FROM generate_series($1::int,$2::int) n CROSS JOIN generate_series(1,2) side`, [start,end,actor.id]);
        await db.query(`INSERT INTO "AuditLog" (id,"actorId",action,"entityType","entityId","createdAt")
          SELECT 'load-audit-'||n||'-'||side,$3,'LOAD_TEST','CUSTOMER','load-c-'||n,now()-(n%730)*interval '1 day'
          FROM generate_series($1::int,$2::int) n CROSS JOIN generate_series(1,4) side`, [start,end,actor.id]);
        await db.query('COMMIT');
      } catch (error) { await db.query('ROLLBACK'); throw error; }
      console.log(`Dataset: ${end * 10}/${count} rows`);
    }
    await db.query('ANALYZE');
    const size = await db.query('SELECT pg_database_size(current_database())::text AS bytes');
    return { workloadRows: count, customers: count/10, journals: count/10, journalLines: count/5, notes: count/5, auditLogs: count*0.4, additionalFixtureRows: true, seedSeconds: (Date.now()-started)/1000, databaseBytes: size.rows[0].bytes };
  } finally { await db.end(); }
}
module.exports = { seedLoadDataset };
