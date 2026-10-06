// Executed only by --performance in the disposable PostgreSQL runner.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Client } = require('pg');
const { Prisma } = require('@prisma/client');
async function main() {
  if (!process.env.DOCUMENT_TEST_DATABASE_URL || process.env.DATABASE_URL !== process.env.DOCUMENT_TEST_DATABASE_URL) throw Error('Disposable test database required');
  process.env.PROFILE_READ_QUERIES = 'true';
  const db = require('../src/config/db');
  let capture = false; const actualQueries = [], dashboardQueries = [];
  db.$on('query', event => { if (capture && /^SELECT/i.test(event.query.trim())) (capture === 'dashboard' ? dashboardQueries : actualQueries).push(event); });
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  try {
    await require('../src/utils/summarySchema').ensureSummarySchema();
    const R = require('../src/services/documents/review');
    const customerController = require('../src/controller/customerController');
    const dashboard = require('../src/controller/dashboardController');
    const admin = await db.user.findUnique({ where: { email: 'admin@estatesync.local' } });
    const sales = await db.user.findUnique({ where: { email: 'sales@estatesync.local' } });
    const actor = { role: 'ADMIN', userId: admin.id, permissions: [] };
    const invoke = async (handler, query = {}, user = actor, params = {}) => {
      let status = 200, data;
      await handler({ query, user, params }, { status(code) { status = code; return this; }, json(value) { data = value; return this; } });
      return { status, data };
    };
    // Realistic relation cardinality for the payment count/detail plans.
    await pg.query(`INSERT INTO "CustomerPayment" (id,"customerId",amount,"paymentMode","recordedById")
      SELECT 'perf-payment-'||c.id||'-'||n,c.id,1,'CASH',$1 FROM "Customer" c CROSS JOIN generate_series(1,5) n WHERE c.id LIKE 'load-c-%'`, [admin.id]);
    await pg.query('ANALYZE');
    capture = true;
    const first = await invoke(customerController.getCustomers, { limit: '25' });
    capture = false;
    const second = await invoke(customerController.getCustomers, { limit: '25', page: '2' });
    assert.equal(first.status, 200); assert.equal(first.data.customers.length, 25);
    assert.equal(second.data.customers.length, 25);
    assert.equal(first.data.customers.some(c => second.data.customers.some(d => c.id === d.id)), false);
    assert.equal(first.data.customers[0].payments, undefined);
    assert.equal(first.data.customers[0].kycDocuments, undefined);
    assert.equal((await invoke(customerController.getCustomers, { limit: '101' })).status, 400);
    assert.equal((await invoke(customerController.getCustomers, { search: '%' })).data.pagination.total, 0);
    assert.equal((await invoke(customerController.getCustomers, { page: '9999' })).data.customers.length, 0);
    const own = await invoke(customerController.getCustomers, {}, { role: 'SALES', userId: sales.id, permissions: [] });
    assert.ok(own.data.customers.every(c => c.salesOwnerId === sales.id));
    assert.equal(own.data.pagination.total, await db.customer.count({ where: { salesOwnerId: sales.id } }));
    const search = await invoke(customerController.getCustomers, { search: 'LOAD-999', status: 'ACTIVE' });
    assert.ok(search.data.customers.length > 0);
    assert.ok(search.data.customers.every(c => [c.customerName,c.plotNo,c.projectLocation,c.khataNo].some(v => v.toLowerCase().includes('load-999'))));
    assert.deepEqual(search.data.summary, first.data.summary); // Whole authorized portfolio, not just page/filter.
    const detail = await invoke(customerController.getCustomerById, {}, actor, { id: 'load-c-1' });
    assert.equal(detail.data.customer.payments.length, 5);
    assert.equal((await invoke(customerController.getCustomerById, {}, { role: 'SALES', userId: sales.id, permissions: [] }, { id: 'load-c-1' })).status, 403);

    capture = 'dashboard';
    const before = (await invoke(dashboard.getAdminStats)).data;
    capture = false;
    assert.deepEqual((await invoke(dashboard.getAccountingStats)).data, before);
    const revision = async () => (await pg.query('SELECT revision::text FROM "SummaryRevision" WHERE id=1')).rows[0].revision;
    const v = await revision();
    await assert.rejects(db.$transaction(async tx => { await tx.customer.update({ where: { id: 'load-c-1' }, data: { totalPaid: { increment: 5 } } }); throw Error('rollback'); }));
    assert.equal(await revision(), v);
    // Mutation made on a different connection immediately invalidates cached totals.
    await pg.query('UPDATE "Customer" SET "totalPaid"="totalPaid"+5,"balanceDue"="balanceDue"-5 WHERE id=$1', ['load-c-1']);
    const after = (await invoke(dashboard.getAdminStats)).data;
    assert.equal(after.stats.totalCustomerCollections, before.stats.totalCustomerCollections + 5);
    assert.equal(after.stats.totalCustomerReceivables, before.stats.totalCustomerReceivables - 5);
    assert.equal((await invoke(customerController.getCustomers)).data.summary.totalCollected, first.data.summary.totalCollected + 5);

    // Compare summary results with the original full display-source SQL across policies.
    const original = async () => {
      const [counts] = await db.$queryRaw`SELECT count(*) FILTER (WHERE d.status='PENDING_REVIEW')::int pending,
        count(*) FILTER (WHERE d.status='REJECTED')::int rejected,
        count(*) FILTER (WHERE d.status='VERIFIED' AND d."verifiedAt">=(date_trunc('day',now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'UTC')::int AS "verifiedToday"
        FROM "TransactionDocument" d JOIN (${R.SOURCES}) s ON s."sourceType"=d."sourceType" AND s."sourceId"=d."sourceId"`;
      const [missing] = await db.$queryRaw`SELECT count(*)::int missing FROM (${R.SOURCES}) s WHERE ${R.missingCondition()}`;
      return { ...counts, ...missing, highValueThreshold: process.env.DOCUMENT_HIGH_VALUE_THRESHOLD || null };
    };
    for (const required of ['false', 'true']) {
      process.env.DOCUMENT_BANK_PROOF_REQUIRED = required;
      process.env.DOCUMENT_CHEQUE_FRONT_REQUIRED = required;
      assert.deepEqual(await R.summary(actor), await original());
    }
    process.env.DOCUMENT_BANK_PROOF_REQUIRED = 'false';
    process.env.DOCUMENT_CHEQUE_FRONT_REQUIRED = 'false';
    await assert.rejects(R.summary({ role: 'SALES', permissions: [] }), { statusCode: 403 });
    const { counts, missing } = R.summaryQueries(actor);
    const queries = {
      customerOld: { text: 'SELECT * FROM "Customer" ORDER BY "createdAt" DESC', values: [] },
      customerPage: { text: 'SELECT id,"customerName","plotNo","totalContractValue" FROM "Customer" ORDER BY "createdAt" DESC,id DESC LIMIT 25', values: [] },
      customerOwnerPage: { text: 'SELECT id,"customerName" FROM "Customer" WHERE "salesOwnerId"=$1 ORDER BY "createdAt" DESC,id DESC LIMIT 25', values: [admin.id] },
      paymentCount: { text: 'SELECT count(*) FROM "CustomerPayment" WHERE "customerId"=$1', values: ['load-c-1'] },
      paymentDetail: { text: 'SELECT * FROM "CustomerPayment" WHERE "customerId"=$1 ORDER BY "dateOfPayment" DESC', values: ['load-c-1'] },
      dashboardCustomerAggregate: { text: 'SELECT count(*),sum("totalContractValue"),sum("totalPaid"),sum("refundAmount"),sum("balanceDue") FROM "Customer" WHERE status<>$1', values: ['CANCELLED'] },
      documentCounts: counts, documentMissing: missing,
      documentOldCounts: Prisma.sql`SELECT count(*) FILTER (WHERE d.status='PENDING_REVIEW')::int pending,
        count(*) FILTER (WHERE d.status='REJECTED')::int rejected FROM "TransactionDocument" d
        JOIN (${R.SOURCES}) s ON s."sourceType"=d."sourceType" AND s."sourceId"=d."sourceId"`,

      documentOldMissing: Prisma.sql`SELECT count(*)::int missing FROM (${R.SOURCES}) s WHERE ${R.missingCondition()}`,
    };
    actualQueries.forEach((event, index) => { queries['actualCustomerQuery' + index] = { text: event.query, values: JSON.parse(event.params) }; });
    dashboardQueries.forEach((event, index) => { queries['actualDashboardQuery' + index] = { text: event.query, values: JSON.parse(event.params) }; });
    async function plans() {
      const results = {};
      for (const [name, sql] of Object.entries(queries)) {
        const { rows } = await pg.query('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + sql.text, sql.values);
        results[name] = rows[0]['QUERY PLAN'][0];
      }
      return results;
    }
    const beforeIndexes = await plans();
    await require('./upgrade_read_indexes').applyReadIndexes(process.env.DATABASE_URL);
    await pg.query('ANALYZE');
    const afterIndexes = await plans();
    const timings = {};
    for (const [name, handler] of Object.entries({ customers: customerController.getCustomers, dashboard: dashboard.getAdminStats,
      documents: async (_req, res) => res.json(await R.summary(actor)) })) {
      // A new committed revision forces one cold load; warm requests share the result.
      await pg.query('UPDATE "SummaryRevision" SET revision=revision+1 WHERE id=1');
      const start = performance.now(); await invoke(handler); const coldMs = performance.now() - start;
      const warmStart = performance.now(); await Promise.all(Array.from({ length: 50 }, () => invoke(handler)));
      timings[name] = { coldMs, fiftyConcurrentWarmMs: performance.now() - warmStart };
    }
    const report = { generatedAt: new Date().toISOString(), customers: await db.customer.count(), payments: await db.customerPayment.count(),
      customerPageBytes: Buffer.byteLength(JSON.stringify(first.data)), checks: 'pagination, authorization, detail, portfolio totals, committed/rolled-back invalidation, summary parity',
      timings, beforeIndexes, afterIndexes };
    const dest = path.join(__dirname, '../../docs/qa/load-tests/read-optimization-' + Date.now() + '.json');
    await fs.mkdir(path.dirname(dest), { recursive: true }); await fs.writeFile(dest, JSON.stringify(report, null, 2));
    console.table(Object.fromEntries(Object.keys(queries).map(name => [name, { beforeMs: beforeIndexes[name]['Execution Time'], afterMs: afterIndexes[name]['Execution Time'] }])));
    console.log('PASS read optimization checks. Page bytes:', report.customerPageBytes, 'Report:', dest);
  } finally { await pg.end(); await db.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
