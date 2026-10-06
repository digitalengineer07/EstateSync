const { Prisma } = require('@prisma/client');
const db = require('../../config/db');
const P = require('./policy');
const A = require('./sources');
const S = require('./service');

// Static SQL only. User supplied filter values are always bound parameters.
const SOURCES = Prisma.raw(`
 SELECT 'EXPENSE'::text AS "sourceType", e.id AS "sourceId", e.amount, e."fundMode" AS "paymentMode", e.reference AS reference,
 e.date AS date, u.name AS party, e."userId" AS "createdBy", e.description, NULL::text AS "customerId", NULL::text AS "propertyId",
 'EXP-' || upper(substr(replace(e.id, '-', ''), 1, 8)) AS identifier FROM "Expense" e JOIN "User" u ON u.id=e."userId"
 UNION ALL SELECT CASE WHEN p.status='REFUND_DISBURSED' THEN 'REFUND' ELSE 'CUSTOMER_PAYMENT' END, p.id,p.amount,p."paymentMode",p."referenceNo",p."dateOfPayment",c."customerName",p."recordedById",c."plotNo",c.id,NULL,p.id
 FROM "CustomerPayment" p JOIN "Customer" c ON c.id=p."customerId"
 UNION ALL SELECT 'LAND_PAYOUT',p.id,p.amount,p."paymentMode",p."referenceNo",p."dateOfPayment",c."landOwnerName",p."paidById",c."plotNo",NULL,c.id,p.id
 FROM "PropertyPayment" p JOIN "PropertyAcquisition" c ON c.id=p."propertyId"
 UNION ALL SELECT 'PROPERTY',p.id,p."totalLandValue",'N/A',NULL,p."createdAt",p."landOwnerName",p."createdById",p."plotNo",NULL,p.id,p.id FROM "PropertyAcquisition" p
 UNION ALL SELECT CASE WHEN w."referenceType"='BANK_STATEMENT' THEN 'BANK_INFLOW' WHEN w.type IN ('FUND_ALLOCATION','FUND_TRANSFER') THEN 'WALLET_ALLOCATION' ELSE 'OTHER_FINANCIAL_TRANSACTION' END,
 w.id,w.amount,COALESCE(b."paymentMode",w."fundMode"),w."referenceId",w."createdAt",COALESCE(b."bankName",w.description),w."createdBy",w.description,NULL,NULL,w.id
 FROM "WalletTransaction" w LEFT JOIN LATERAL (SELECT "paymentMode","bankName" FROM "GlobalBankReference" WHERE "sourceRecordId"=w.id ORDER BY "createdAt" DESC LIMIT 1) b ON true
 WHERE w."referenceType"='BANK_STATEMENT' OR w.type IN ('FUND_ALLOCATION','FUND_TRANSFER','ADJUSTMENT','EXPENSE_REVERSAL')
`);
function allowedSources(actor) {
  return Object.keys(P.TYPES).filter(type => {
    if (actor.role === 'ADMIN') return true;
    const permission = { EXPENSE: 'expense.view_all', CUSTOMER_PAYMENT: 'customer.view_all', REFUND: 'customer.view_all', LAND_PAYOUT: 'property.view_all', PROPERTY: 'property.view_all', BANK_INFLOW: 'accounting.view', WALLET_ALLOCATION: 'transaction.view_all', OTHER_FINANCIAL_TRANSACTION: 'transaction.view_all' }[type];
    return A.has(actor, permission);
  });
}
function filters(actor, q, documents) {
  A.capability(actor, 'review');
  const allowed = allowedSources(actor);
  if (!allowed.length) throw P.fail(403, 'No financial modules are available for review.');
  const clauses = [Prisma.sql`s."sourceType" IN (${Prisma.join(allowed)})`];
  for (const [key, column] of Object.entries({ sourceType: 'sourceType', sourceId: 'sourceId', customerId: 'customerId', propertyId: 'propertyId', employee: 'createdBy', paymentMode: 'paymentMode' })) {
    if (q[key]) clauses.push(Prisma.sql`${Prisma.raw(`s."${column}"`)} = ${String(q[key]).slice(0, 200)}`);
  }
  if (q.search) clauses.push(Prisma.sql`concat_ws(' ',s."sourceId",s.identifier,s.reference,s.party,s.description,s."createdBy") ILIKE ${`%${String(q.search).slice(0, 150)}%`}`);
  if (q.utr) clauses.push(Prisma.sql`s.reference ILIKE ${`%${String(q.utr).slice(0, 100)}%`}`);
  for (const key of ['minAmount', 'maxAmount']) if (q[key] !== undefined && q[key] !== '') {
    if (!/^\d+(\.\d{1,2})?$/.test(String(q[key]))) throw P.fail(400, 'Invalid amount filter.');
    clauses.push(key === 'minAmount' ? Prisma.sql`s.amount >= ${Number(q[key])}` : Prisma.sql`s.amount <= ${Number(q[key])}`);
  }
  for (const key of ['from', 'to']) if (q[key]) {
    const date = new Date(q[key]);
    if (Number.isNaN(date.getTime())) throw P.fail(400, 'Invalid date filter.');
    clauses.push(key === 'from' ? Prisma.sql`s.date >= ${date}` : Prisma.sql`s.date < ${new Date(date.getTime() + 86400000)}`);
  }
  if (documents) {
    for (const key of ['status', 'documentType', 'uploadedBy', 'sha256']) if (q[key]) clauses.push(Prisma.sql`${Prisma.raw(`d."${key}"`)} = ${String(q[key]).slice(0, 100)}`);
    if (!A.has(actor, 'document.sensitive')) clauses.push(Prisma.sql`d."documentType" NOT IN ('CHEQUE_FRONT','CHEQUE_BACK')`);
  }
  return Prisma.join(clauses, ' AND ');
}
function pagination(q) {
  const page = Number(q.page || 1), pageSize = Number(q.pageSize || 20);
  if (!Number.isInteger(page) || page < 1 || page > 100000 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw P.fail(400, 'Invalid pagination.');
  return { page, pageSize, skip: (page - 1) * pageSize };
}
async function queue(actor, q) {
  const where = filters(actor, q, true); const { page, pageSize, skip } = pagination(q);
  const base = Prisma.sql`FROM "TransactionDocument" d JOIN (${SOURCES}) s ON s."sourceType"=d."sourceType" AND s."sourceId"=d."sourceId" WHERE ${where}`;
  const rows = await db.$queryRaw`SELECT d.id, d."sourceType", d."sourceId", d."documentType", d."originalFileName", d.version,d.status,d."uploadedAt", s.amount,s.party,s.reference,s."paymentMode",s.date ${base} ORDER BY d."uploadedAt" DESC,d.id LIMIT ${pageSize} OFFSET ${skip}`;
  const [count] = await db.$queryRaw`SELECT count(*)::int AS total ${base}`;
  return { documents: rows, total: count.total, page, pageSize };
}
function missingCondition() {
  const rules = [];
  for (const type of Object.keys(P.TYPES)) {
    for (const mode of ['CASH', 'CHEQUE', 'BANK']) {
      const groups = P.requiredGroups(type, mode);
      if (!groups.length) continue;
      const modeCheck = mode === 'BANK' ? Prisma.sql`s."paymentMode" NOT IN ('CASH','CHEQUE')` : Prisma.sql`s."paymentMode"=${mode}`;
      const missing = groups.map(g => {
        const absent = Prisma.sql`NOT EXISTS (SELECT 1 FROM "TransactionDocument" d WHERE d."sourceType"=s."sourceType" AND d."sourceId"=s."sourceId" AND d."documentType" IN (${Prisma.join(g)}) AND d.status IN ('VERIFIED','PENDING_REVIEW'))`;
        return type === 'EXPENSE' && g.includes('EXPENSE_RECEIPT')
          ? Prisma.sql`(${absent} AND NOT EXISTS (SELECT 1 FROM "DocumentException" e WHERE e."sourceType"=s."sourceType" AND e."sourceId"=s."sourceId" AND e.status='VERIFIED'))`
          : absent;
      });
      rules.push(Prisma.sql`(s."sourceType"=${type} AND ${modeCheck} AND (${Prisma.join(missing, ' OR ')}))`);
    }
  }
  if (!rules.length) return Prisma.sql`false`;
  return Prisma.sql`(${Prisma.join(rules, ' OR ')})`;
}
async function transactions(actor, q) {
  const where = filters(actor, q, false); const { page, pageSize, skip } = pagination(q);
  const missing = q.missing === 'true' ? missingCondition() : Prisma.sql`true`;
  const rows = await db.$queryRaw`SELECT s.* FROM (${SOURCES}) s WHERE ${where} AND (${missing}) ORDER BY s.date DESC,s."sourceId" LIMIT ${pageSize} OFFSET ${skip}`;
  const [count] = await db.$queryRaw`SELECT count(*)::int AS total FROM (${SOURCES}) s WHERE ${where} AND (${missing})`;
  const items = [];
  for (const row of rows) {
    // Re-validate each returned record against the same resolver used for access.
    const details = await S.list(actor, row.sourceType, row.sourceId);
    items.push({ ...row, state: details.state, exception: details.exception });
  }
  return { transactions: items, total: count.total, page, pageSize };
}
// Missing-evidence counts need only source identity and payment mode.
// Parent joins used to display names are redundant here: foreign keys guarantee
// those parents exist. Do not scan source types with no required evidence rules.
function summarySources(types) {
  const mode = expression => `,${expression} AS "paymentMode"`;
  const parts = [];
  for (const type of types) {
    if (type === 'EXPENSE') parts.push(`SELECT 'EXPENSE'::text AS "sourceType", id AS "sourceId"${mode('"fundMode"')} FROM "Expense"`);
    else if (['CUSTOMER_PAYMENT', 'REFUND'].includes(type)) parts.push(`SELECT '${type}', id${mode('"paymentMode"')} FROM "CustomerPayment" WHERE status ${type === 'REFUND' ? '=' : '<>'} 'REFUND_DISBURSED'`);
    else if (type === 'LAND_PAYOUT') parts.push(`SELECT 'LAND_PAYOUT',id${mode('"paymentMode"')} FROM "PropertyPayment"`);
    else if (type === 'PROPERTY') parts.push(`SELECT 'PROPERTY',id${mode("'N/A'::text")} FROM "PropertyAcquisition"`);
    else {
      const condition = type === 'BANK_INFLOW' ? `w."referenceType"='BANK_STATEMENT'`
        : type === 'WALLET_ALLOCATION' ? `w."referenceType" IS DISTINCT FROM 'BANK_STATEMENT' AND w.type IN ('FUND_ALLOCATION','FUND_TRANSFER')`
          : `w."referenceType" IS DISTINCT FROM 'BANK_STATEMENT' AND w.type IN ('ADJUSTMENT','EXPENSE_REVERSAL')`;
      parts.push(`SELECT '${type}',w.id${mode(`COALESCE((SELECT "paymentMode" FROM "GlobalBankReference" WHERE "sourceRecordId"=w.id ORDER BY "createdAt" DESC LIMIT 1),w."fundMode")`)} FROM "WalletTransaction" w WHERE ${condition}`);
    }
  }
  // Explicit column aliases are necessary when EXPENSE is not permitted.
  return Prisma.sql`SELECT * FROM (${Prisma.raw(parts.join(' UNION ALL '))}) source("sourceType","sourceId","paymentMode")`;
}
function summaryQueries(actor) {
  filters(actor, {}, true); // Validate review capability and module access.
  const types = allowedSources(actor);
  // Drive this count from existing documents. Joining every financial source to
  // a small document set can sort/scan the entire payment table. PK existence
  // checks preserve orphan/type exclusion without that full-table union.
  const exists = types.map(type => {
    let table, condition = '';
    if (type === 'EXPENSE') table = 'Expense';
    else if (['CUSTOMER_PAYMENT', 'REFUND'].includes(type)) {
      table = 'CustomerPayment'; condition = ` AND p.status ${type === 'REFUND' ? '=' : '<>'} 'REFUND_DISBURSED'`;
    } else if (type === 'LAND_PAYOUT') table = 'PropertyPayment';
    else if (type === 'PROPERTY') table = 'PropertyAcquisition';
    else {
      table = 'WalletTransaction';
      condition = type === 'BANK_INFLOW' ? ` AND p."referenceType"='BANK_STATEMENT'`
        : type === 'WALLET_ALLOCATION' ? ` AND p."referenceType" IS DISTINCT FROM 'BANK_STATEMENT' AND p.type IN ('FUND_ALLOCATION','FUND_TRANSFER')`
          : ` AND p."referenceType" IS DISTINCT FROM 'BANK_STATEMENT' AND p.type IN ('ADJUSTMENT','EXPENSE_REVERSAL')`;
    }
    return Prisma.sql`(d."sourceType"=${type} AND EXISTS (SELECT 1 FROM ${Prisma.raw(`"${table}"`)} p WHERE p.id=d."sourceId" ${Prisma.raw(condition)}))`;
  });
  const counts = Prisma.sql`SELECT count(*) FILTER (WHERE d.status='PENDING_REVIEW')::int AS pending,
  count(*) FILTER (WHERE d.status='REJECTED')::int AS rejected,
  count(*) FILTER (WHERE d.status='VERIFIED' AND d."verifiedAt">=(date_trunc('day',now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'UTC')::int AS "verifiedToday"
  FROM "TransactionDocument" d WHERE d.status IN ('PENDING_REVIEW','REJECTED','VERIFIED')
    AND (${Prisma.join(exists, ' OR ')})
    ${A.has(actor, 'document.sensitive') ? Prisma.empty : Prisma.sql`AND d."documentType" NOT IN ('CHEQUE_FRONT','CHEQUE_BACK')`}`;
  const requiredTypes = types.filter(type => ['CASH', 'CHEQUE', 'BANK'].some(mode => P.requiredGroups(type, mode).length));
  const missing = requiredTypes.length
    ? Prisma.sql`SELECT count(*)::int AS missing FROM (${summarySources(requiredTypes)}) s WHERE ${missingCondition()}`
    : Prisma.sql`SELECT 0::int AS missing`;
  return { counts, missing };
}
async function summary(actor) {
  // Check current permissions before looking in the cache; never key by role alone.
  filters(actor, {}, true);
  const policyKey = [process.env.DOCUMENT_EXPENSE_RECEIPT_REQUIRED, process.env.DOCUMENT_BANK_PROOF_REQUIRED,
    process.env.DOCUMENT_CHEQUE_FRONT_REQUIRED, process.env.DOCUMENT_HIGH_VALUE_THRESHOLD];
  const day = new Date(Date.now() + 19800000).toISOString().slice(0, 10);
  const key = JSON.stringify(['documents', allowedSources(actor), A.has(actor, 'document.sensitive'), policyKey, day]);
  return require('../../utils/summaryCache').rememberSummary(key, async () => {
    const queries = summaryQueries(actor);
    const [[counts], [missing]] = await Promise.all([db.$queryRaw(queries.counts), db.$queryRaw(queries.missing)]);
    return { ...counts, ...missing, highValueThreshold: process.env.DOCUMENT_HIGH_VALUE_THRESHOLD || null };
  });
}
async function journalSource(actor, id) {
  if (!A.has(actor, 'accounting.view')) throw P.fail(403, 'Accounting access is required.');
  P.uuid(id);
  const j = await db.journalEntry.findUnique({ where: { id } });
  if (!j) throw P.fail(404, 'Journal not found.');
  const map = { CUSTOMER_PAYMENT: 'CUSTOMER_PAYMENT', CUSTOMER_PAYMENT_ADJUSTMENT: 'CUSTOMER_PAYMENT', PROPERTY_PAYMENT: 'LAND_PAYOUT', PROPERTY_PAYMENT_ADJUSTMENT: 'LAND_PAYOUT', CAPITAL_INFUSION: 'BANK_INFLOW', BANK_STATEMENT: 'BANK_INFLOW', WALLET_TRANSACTION: 'OTHER_FINANCIAL_TRANSACTION', ADMIN_ADJUSTMENT: 'OTHER_FINANCIAL_TRANSACTION' };
  let type = map[j.referenceType], sourceId = j.referenceId;
  if (j.referenceType === 'FUND_ALLOCATION') {
    const rows = await db.walletTransaction.findMany({ where: { referenceId: j.referenceId, type: { in: ['FUND_ALLOCATION', 'FUND_TRANSFER'] } }, take: 2 });
    if (rows.length === 1) { type = 'WALLET_ALLOCATION'; sourceId = rows[0].id; }
  }
  if (j.referenceType === 'EXPENSE' || j.referenceType === 'EXPENSE_REVERSAL') {
    const match = /^EXP-([A-F0-9]{8})$/i.exec(String(j.referenceId).replace(/^REV-/, ''));
    if (match) {
      const rows = await db.$queryRaw`SELECT id FROM "Expense" WHERE upper(substr(replace(id,'-',''),1,8))=${match[1].toUpperCase()} LIMIT 2`;
      if (rows.length === 1) { type = 'EXPENSE'; sourceId = rows[0].id; }
    }
  }
  if (j.referenceType === 'CUSTOMER_REFUND') {
    const rows = await db.customerPayment.findMany({ where: { customerId: j.referenceId, status: 'REFUND_DISBURSED' }, take: 2 });
    if (rows.length === 1) { type = 'REFUND'; sourceId = rows[0].id; }
  }
  if (!type || !sourceId) return { source: null };
  try { return { source: await A.resolveSource(db, actor, type, sourceId) }; }
  catch (error) { if (error.statusCode === 404 || error.statusCode === 400) return { source: null }; throw error; }
}
module.exports = { queue, transactions, summary, journalSource, SOURCES, summaryQueries, missingCondition };
