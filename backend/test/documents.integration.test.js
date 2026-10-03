const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const sharp = require('sharp');
const express = require('express');
const jwt = require('jsonwebtoken');
if (!process.env.DOCUMENT_TEST_DATABASE_URL || process.env.DATABASE_URL !== process.env.DOCUMENT_TEST_DATABASE_URL) throw Error('Run using the isolated document test runner or an explicitly configured test database.');
const db = require('../src/config/db');
const S = require('../src/services/documents/service');
const A = require('../src/services/documents/sources');
const R = require('../src/services/documents/review');
const { syncDocumentPermissions } = require('../src/services/documents/permissions');
let server, origin, category, expense, otherExpense, customer, payment, refund, property, payout, inflow;
const actors = {}, users = {}, tokens = {};
const bytes = color => sharp({ create: { width: 3, height: 3, channels: 3, background: color || '#ff7700' } }).png().toBuffer();
async function json(path, method = 'GET', body, role = 'ADMIN') {
  const response = await fetch(`${origin}/api/v1/documents${path}`, { method, headers: { Authorization: `Bearer ${tokens[role]}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
}
async function stage(type = 'EXPENSE', docType = 'EXPENSE_RECEIPT', color, actor = actors.ADMIN, key = crypto.randomUUID()) {
  return S.stage(actor, await bytes(color), { sourceType: type, documentType: docType, fileName: 'receipt.png' }, key, { headers: { 'content-type': 'image/png' } });
}
async function attached(color) {
  const u = await stage('EXPENSE', 'EXPENSE_RECEIPT', color);
  await db.$transaction(tx => S.attach(tx, actors.ADMIN, 'EXPENSE', expense.id, [u.id]));
  return db.transactionDocument.findUnique({ where: { storageKey: (await db.documentUpload.findUnique({ where: { id: u.id } })).storageKey } });
}
before(async () => {
  for (const role of ['ADMIN', 'ACCOUNTING', 'MANAGER', 'SALES', 'MARKETING', 'OTHER']) {
    const r = await db.role.create({ data: { name: role } });
    users[role] = await db.user.create({ data: { email: `${role.toLowerCase()}@documents.test`, name: role, passwordHash: 'test-only-not-a-login', roleId: r.id, wallet: { create: { availableBalanceCash: 1000, availableBalanceLiquid: 1000 } } }, include: { wallet: true } });
    const permissions = role === 'ADMIN' || role === 'ACCOUNTING' ? ['expense.view_all', 'expense.create', 'customer.view_all', 'customer.payment.record', 'property.view_all', 'property.payment.record', 'property.create', 'accounting.view', 'transaction.view_all'] : ['expense.view', 'expense.create', 'transaction.view', 'customer.view'];
    for (const code of permissions) {
      const p = await db.permission.upsert({ where: { code }, create: { code }, update: {} });
      await db.rolePermission.create({ data: { roleId: r.id, permissionId: p.id } });
    }
  }
  await syncDocumentPermissions(db);
  for (const role of Object.keys(users)) { actors[role] = await A.actorFrom(db, users[role].id); tokens[role] = jwt.sign({ userId: users[role].id, role }, process.env.JWT_SECRET, { expiresIn: '1h' }); }
  category = await db.expenseCategory.create({ data: { name: 'Document test expense' } });
  const makeExpense = user => db.expense.create({ data: { userId: user.id, walletId: user.wallet.id, categoryId: category.id, amount: 50, description: 'Receipt test', date: new Date(), fundMode: 'CASH', status: 'RECORDED' } });
  expense = await makeExpense(users.SALES); otherExpense = await makeExpense(users.OTHER);
  customer = await db.customer.create({ data: { salesOwnerId: users.SALES.id, customerName: 'Evidence Customer', customerContact: '9999900000', projectLocation: 'Test', plotNo: 'DOC-1', areaSqft: 100, khataNo: 'DOC', identityType: 'TEST', identityNumber: 'TEST', totalContractValue: 1000, balanceDue: 900 } });
  payment = await db.customerPayment.create({ data: { customerId: customer.id, amount: 100, paymentMode: 'NEFT', referenceNo: 'DOC-UTR-001', recordedById: users.ACCOUNTING.id } });
  refund = await db.customerPayment.create({ data: { customerId: customer.id, amount: 10, paymentMode: 'CASH', status: 'REFUND_DISBURSED', recordedById: users.ACCOUNTING.id } });
  property = await db.propertyAcquisition.create({ data: { khataNo: 'DOC', plotNo: 'DOC-2', projectLocation: 'Test', landOwnerName: 'Evidence Owner', landOwnerContact: '9999911111', totalLandValue: 1000, balanceRemaining: 900, createdById: users.ADMIN.id } });
  payout = await db.propertyPayment.create({ data: { propertyId: property.id, amount: 100, paymentMode: 'NEFT', referenceNo: 'DOC-LAND-001', paidById: users.ADMIN.id } });
  inflow = await db.walletTransaction.create({ data: { type: 'CAPITAL_INFUSION', referenceType: 'BANK_STATEMENT', referenceId: 'DOC-BANK-001', amount: 100, fundMode: 'LIQUID', destWalletId: users.ADMIN.wallet.id, status: 'COMPLETED', createdBy: users.ADMIN.id } });
  await db.globalBankReference.create({ data: { referenceNo: 'DOC-BANK-001', module: 'TREASURY_INFLOW', sourceTable: 'WalletTransaction', sourceRecordId: inflow.id, amount: 100, paymentMode: 'RTGS', bankName: 'Test bank', recordedBy: users.ADMIN.id } });
  const app = express(); app.use(express.json()); app.use('/api/v1/documents', require('../src/routes/documentRoutes'));
  app.post('/api/v1/expenses', require('../src/middleware/authMiddleware').verifyJWT, require('../src/controller/expenseController').createExpense);
  app.post('/api/v1/customers/:id/payments', require('../src/middleware/authMiddleware').verifyJWT, require('../src/controller/customerController').recordPayment);
  app.post('/api/v1/bank-inflows', require('../src/middleware/authMiddleware').verifyJWT, require('../src/controller/treasuryController').recordBankInflow);
  app.post('/api/v1/properties/:id/payments', require('../src/middleware/authMiddleware').verifyJWT, require('../src/controller/propertyController').recordPayment);
  app.post('/api/v1/customers/:id/refund', require('../src/middleware/authMiddleware').verifyJWT, require('../src/controller/customerController').settleCustomerCancellationRefund);
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); }); origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await db.$disconnect(); });

test('HTTP upload uses authenticated raw bytes, rejects missing auth and invalid MIME', async () => {
  const params = new URLSearchParams({ sourceType: 'EXPENSE', documentType: 'EXPENSE_RECEIPT', fileName: 'receipt.png' });
  let response = await fetch(`${origin}/api/v1/documents/uploads?${params}`, { method: 'POST', body: await bytes(), headers: { 'Content-Type': 'image/png' } }); assert.equal(response.status, 401);
  response = await fetch(`${origin}/api/v1/documents/uploads?${params}`, { method: 'POST', body: await bytes(), headers: { Authorization: `Bearer ${tokens.SALES}`, 'Content-Type': 'image/png', 'Idempotency-Key': crypto.randomUUID() } }); assert.equal(response.status, 201); assert.ok((await response.json()).upload.id);
  response = await fetch(`${origin}/api/v1/documents/uploads?${params}`, { method: 'POST', body: '<script>bad</script>', headers: { Authorization: `Bearer ${tokens.SALES}`, 'Content-Type': 'image/png', 'Idempotency-Key': crypto.randomUUID() } }); assert.equal(response.status, 400);
});
test('upload-only user can read submission policy but not another transaction', async () => {
  const permission = await db.permission.findUnique({ where: { code: 'document.view' } });
  await db.rolePermission.delete({ where: { roleId_permissionId: { roleId: users.SALES.roleId, permissionId: permission.id } } });
  try {
    assert.equal((await json('/policy?sourceType=EXPENSE&paymentMode=CASH', 'GET', null, 'SALES')).status, 200);
    assert.equal((await json(`?sourceType=EXPENSE&sourceId=${expense.id}`, 'GET', null, 'SALES')).status, 403);
  } finally {
    await db.rolePermission.create({ data: { roleId: users.SALES.roleId, permissionId: permission.id } });
  }
});
test('upload replay is actor-scoped and content-bound including concurrent identical retries', async () => {
  const key = crypto.randomUUID();
  const [a, b] = await Promise.all([stage('EXPENSE', 'EXPENSE_RECEIPT', '#000001', actors.ADMIN, key), stage('EXPENSE', 'EXPENSE_RECEIPT', '#000001', actors.ADMIN, key)]);
  assert.equal(a.id, b.id);
  await assert.rejects(stage('EXPENSE', 'EXPENSE_RECEIPT', '#000002', actors.ADMIN, key), { statusCode: 409 });
  const own = await stage('EXPENSE', 'EXPENSE_RECEIPT', '#000001', actors.SALES, key); assert.notEqual(a.id, own.id);
});
test('source-specific access rejects another user expense and cross-module IDs', async () => {
  assert.equal((await json(`?sourceType=EXPENSE&sourceId=${expense.id}`, 'GET', null, 'OTHER')).status, 403);
  assert.equal((await json(`?sourceType=EXPENSE&sourceId=${expense.id}`, 'GET', null, 'SALES')).status, 200);
  assert.equal((await json(`?sourceType=LAND_PAYOUT&sourceId=${payment.id}`)).status, 404);
  assert.equal((await json(`?sourceType=REFUND&sourceId=${payment.id}`)).status, 404);
  assert.equal((await json(`?sourceType=CUSTOMER_PAYMENT&sourceId=${refund.id}`)).status, 404);
  assert.equal((await json(`?sourceType=BANK_INFLOW&sourceId=${expense.id}`)).status, 404);
});
test('invalid source and nonexistent identifiers fail safely', async () => {
  assert.equal((await json(`?sourceType=constructor&sourceId=${expense.id}`)).status, 400);
  assert.equal((await json('?sourceType=EXPENSE&sourceId=invalid')).status, 400);
  assert.equal((await json(`?sourceType=EXPENSE&sourceId=${crypto.randomUUID()}`)).status, 404);
});
test('attaches receipts and rejects duplicate hashes without altering financial balances', async () => {
  const beforeWallet = await db.wallet.findUnique({ where: { id: users.SALES.wallet.id } });
  const beforeJournals = await db.journalEntry.count();
  const d = await attached('#101010');
  const duplicate = await stage('EXPENSE', 'EXPENSE_RECEIPT', '#101010');
  await assert.rejects(db.$transaction(tx => S.attach(tx, actors.ADMIN, 'EXPENSE', expense.id, [duplicate.id])), { statusCode: 409 });
  assert.deepEqual(await db.wallet.findUnique({ where: { id: beforeWallet.id } }), beforeWallet);
  assert.equal(await db.journalEntry.count(), beforeJournals);
  const list = await S.list(actors.ADMIN, 'EXPENSE', expense.id); assert.ok(list.documents.some(x => x.id === d.id)); assert.ok(!JSON.stringify(list).includes('storageKey'));
});
test('private preview and download reject foreign users; authorized bytes match SHA-256', async () => {
  const d = await attached('#202020');
  for (const action of ['preview', 'download']) {
    assert.equal((await json(`/${d.id}/${action}`, 'GET', null, 'OTHER')).status, 403);
    const response = await fetch(`${origin}/api/v1/documents/${d.id}/${action}`, { headers: { Authorization: `Bearer ${tokens.SALES}` } });
    assert.equal(response.status, 200); assert.match(response.headers.get('cache-control'), /no-store/); assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    if (action === 'download') assert.equal(crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'), d.sha256);
  }
  assert.equal((await fetch(`${origin}/private-documents/${d.storageKey}`)).status, 404);
});
test('every non-financial role is denied verify/reject/review', async () => {
  const d = await attached('#303030');
  for (const role of ['SALES', 'MARKETING', 'MANAGER', 'OTHER']) {
    assert.equal((await json(`/${d.id}/verify`, 'POST', {}, role)).status, 403);
    assert.equal((await json(`/${d.id}/reject`, 'POST', { reason: 'Not valid evidence' }, role)).status, 403);
    assert.equal((await json('/review', 'GET', null, role)).status, 403);
  }
});
test('rejection requires reason; replacement preserves rejected fields, lineage and audit', async () => {
  const d = await attached('#404040');
  assert.equal((await json(`/${d.id}/reject`, 'POST', {})).status, 400);
  assert.equal((await json(`/${d.id}/reject`, 'POST', { reason: 'Wrong invoice number' }, 'ACCOUNTING')).status, 200);
  const u = await stage('EXPENSE', 'EXPENSE_RECEIPT', '#414141');
  const r = await S.replace(actors.ADMIN, d.id, u.id);
  assert.equal(r.version, 2); assert.equal(r.replacesDocumentId, d.id); assert.equal(r.rootDocumentId, d.rootDocumentId);
  const old = await db.transactionDocument.findUnique({ where: { id: d.id } }); assert.equal(old.status, 'REPLACED'); assert.equal(old.rejectionReason, 'Wrong invoice number'); assert.ok(old.rejectedAt);
  assert.equal((await json(`/${r.id}/verify`, 'POST', {}, 'ACCOUNTING')).status, 200);
  assert.ok(await db.auditLog.findFirst({ where: { entityId: r.id, action: 'DOCUMENT_REPLACED' } }));
  assert.ok(await db.auditLog.findFirst({ where: { entityId: r.id, action: 'DOCUMENT_VERIFIED' } }));
  assert.ok(await S.content(actors.ADMIN, d.id, true));
});
test('parallel verification has exactly one winner', async () => {
  const d = await attached('#505050');
  const results = await Promise.allSettled([S.transition(actors.ADMIN, d.id, 'verify'), S.transition(actors.ACCOUNTING, d.id, 'verify')]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(await db.auditLog.count({ where: { entityId: d.id, action: 'DOCUMENT_VERIFIED' } }), 1);
});
test('parallel replacement has one successor and keeps original evidence', async () => {
  const d = await attached('#606060'); const a = await stage('EXPENSE', 'EXPENSE_RECEIPT', '#616161'); const b = await stage('EXPENSE', 'EXPENSE_RECEIPT', '#626262');
  const results = await Promise.allSettled([S.replace(actors.ADMIN, d.id, a.id), S.replace(actors.ADMIN, d.id, b.id)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(await db.transactionDocument.count({ where: { rootDocumentId: d.id } }), 2);
});
test('cannot steal, reuse, expire or cross-link staged uploads', async () => {
  const u = await stage('EXPENSE', 'EXPENSE_RECEIPT', '#707070', actors.SALES);
  await assert.rejects(db.$transaction(tx => S.attach(tx, actors.ADMIN, 'EXPENSE', expense.id, [u.id])), { statusCode: 403 });
  await assert.rejects(db.$transaction(tx => S.attach(tx, actors.SALES, 'CUSTOMER_PAYMENT', payment.id, [u.id])), { statusCode: 403 });
  await db.documentUpload.update({ where: { id: u.id }, data: { expiresAt: new Date(0) } });
  await assert.rejects(db.$transaction(tx => S.attach(tx, actors.SALES, 'EXPENSE', expense.id, [u.id])), { statusCode: 409 });
});
test('all existing financial source adapters link evidence', async () => {
  for (const [type, id, kind, color] of [['CUSTOMER_PAYMENT', payment.id, 'CUSTOMER_PAYMENT_PROOF', '#800001'], ['REFUND', refund.id, 'REFUND_PROOF', '#800002'], ['LAND_PAYOUT', payout.id, 'PAYMENT_PROOF', '#800003'], ['BANK_INFLOW', inflow.id, 'BANK_ADVICE', '#800004'], ['PROPERTY', property.id, 'AGREEMENT', '#800005']]) {
    const u = await stage(type, kind, color); await db.$transaction(tx => S.attach(tx, actors.ADMIN, type, id, [u.id]));
    assert.equal((await S.list(actors.ADMIN, type, id)).documents.length, 1);
  }
});
test('required receipt failure rolls back the existing expense wallet mutation', async () => {
  const oldWallet = await db.wallet.findUnique({ where: { id: users.SALES.wallet.id } });
  const response = await fetch(`${origin}/api/v1/expenses`, { method: 'POST', headers: { Authorization: `Bearer ${tokens.SALES}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 25, description: 'Missing required receipt', date: new Date().toISOString(), categoryId: category.id, fundMode: 'CASH' }) });
  assert.equal(response.status, 400); assert.deepEqual(await db.wallet.findUnique({ where: { id: oldWallet.id } }), oldWallet);
  assert.equal(await db.expense.count({ where: { description: 'Missing required receipt' } }), 0);
});
test('successful expense posts a balanced journal and links evidence atomically', async () => {
  const u = await stage('EXPENSE', 'EXPENSE_RECEIPT', '#919191', actors.SALES);
  const beforeWallet = await db.wallet.findUnique({ where: { id: users.SALES.wallet.id } });
  const response = await fetch(`${origin}/api/v1/expenses`, { method: 'POST', headers: { Authorization: `Bearer ${tokens.SALES}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 25, description: 'Expense with receipt', date: new Date().toISOString(), categoryId: category.id, fundMode: 'CASH', documentUploadIds: [u.id] }) });
  const body = await response.json(); assert.equal(response.status, 201, JSON.stringify(body));
  assert.equal((await S.list(actors.SALES, 'EXPENSE', body.expense.id)).documents.length, 1);
  const afterWallet = await db.wallet.findUnique({ where: { id: beforeWallet.id } });
  assert.equal(Number(afterWallet.availableBalanceCash), Number(beforeWallet.availableBalanceCash) - 25);
  const source = await A.resolveSource(db, actors.ADMIN, 'EXPENSE', body.expense.id);
  const journal = await db.journalEntry.findFirst({ where: { referenceId: source.identifier }, include: { lines: true } });
  assert.ok(journal); assert.equal(journal.lines.reduce((sum, l) => sum + Number(l.debit) - Number(l.credit), 0), 0);
  assert.equal((await R.journalSource(actors.ADMIN, journal.id)).source.sourceId, body.expense.id);
});
test('closed accounting periods roll back document claims, wallet changes and expenses', async () => {
  const now = new Date(); const period = await db.accountingPeriod.findFirst({ where: { startDate: { lte: now }, endDate: { gte: now } } });
  assert.ok(period); await db.accountingPeriod.update({ where: { id: period.id }, data: { status: 'CLOSED' } });
  try {
    const u = await stage('EXPENSE', 'EXPENSE_RECEIPT', '#929292', actors.SALES);
    const oldWallet = await db.wallet.findUnique({ where: { id: users.SALES.wallet.id } });
    const response = await fetch(`${origin}/api/v1/expenses`, { method: 'POST', headers: { Authorization: `Bearer ${tokens.SALES}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 25, description: 'Closed period attempt', date: now.toISOString(), categoryId: category.id, fundMode: 'CASH', documentUploadIds: [u.id] }) });
    assert.ok(response.status >= 400); assert.match((await response.json()).message, /CLOSED/);
    assert.deepEqual(await db.wallet.findUnique({ where: { id: oldWallet.id } }), oldWallet);
    assert.equal((await db.documentUpload.findUnique({ where: { id: u.id } })).documentId, null);
    assert.equal(await db.expense.count({ where: { description: 'Closed period attempt' } }), 0);
  } finally { await db.accountingPeriod.update({ where: { id: period.id }, data: { status: 'OPEN' } }); }
});
test('customer payment links proof and preserves the global duplicate UTR control', async () => {
  const u = await stage('CUSTOMER_PAYMENT', 'CUSTOMER_PAYMENT_PROOF', '#939393');
  const submit = body => fetch(`${origin}/api/v1/customers/${customer.id}/payments`, { method: 'POST', headers: { Authorization: `Bearer ${tokens.ADMIN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const response = await submit({ amount: 20, paymentMode: 'NEFT', referenceNo: 'DOC-PAYMENT-NEW', documentUploadIds: [u.id] });
  const result = await response.json(); assert.equal(response.status, 201, JSON.stringify(result));
  const linked = await db.documentUpload.findUnique({ where: { id: u.id }, include: { document: true } });
  assert.equal(linked.document.sourceType, 'CUSTOMER_PAYMENT');
  const beforeWallet = await db.wallet.findUnique({ where: { id: users.ADMIN.wallet.id } });
  const duplicate = await submit({ amount: 20, paymentMode: 'NEFT', referenceNo: 'DOC-PAYMENT-NEW', documentUploadIds: [u.id] });
  assert.equal(duplicate.status, 400);
  assert.deepEqual(await db.wallet.findUnique({ where: { id: beforeWallet.id } }), beforeWallet);
});
test('bank inflow commits evidence with the existing treasury posting', async () => {
  const u = await stage('BANK_INFLOW', 'BANK_ADVICE', '#949494');
  const response = await fetch(`${origin}/api/v1/bank-inflows`, { method: 'POST', headers: { Authorization: `Bearer ${tokens.ADMIN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 100, paymentMode: 'RTGS', bankName: 'Evidence Test Bank', referenceNo: 'DOC-INFLOW-NEW', documentUploadIds: [u.id] }) });
  const body = await response.json(); assert.equal(response.status, 201, JSON.stringify(body));
  const linked = await db.documentUpload.findUnique({ where: { id: u.id }, include: { document: true } });
  assert.equal(linked.document.sourceType, 'BANK_INFLOW');
});
test('one staged upload cannot be consumed concurrently by two transactions', async () => {
  const u = await stage('EXPENSE', 'EXPENSE_RECEIPT', '#959595');
  const results = await Promise.allSettled([expense.id, otherExpense.id].map(id => db.$transaction(tx => S.attach(tx, actors.ADMIN, 'EXPENSE', id, [u.id]))));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  const intent = await db.documentUpload.findUnique({ where: { id: u.id } });
  assert.equal(await db.transactionDocument.count({ where: { storageKey: intent.storageKey } }), 1);
});
test('landowner payout and cancellation refund use their existing financial controllers', async () => {
  const landUpload = await stage('LAND_PAYOUT', 'PAYMENT_PROOF', '#969696');
  const post = (path, body) => fetch(`${origin}/api/v1${path}`, { method: 'POST', headers: { Authorization: `Bearer ${tokens.ADMIN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const land = await post(`/properties/${property.id}/payments`, { amount: 10, paymentMode: 'NEFT', referenceNo: 'DOC-PAYOUT-NEW', documentUploadIds: [landUpload.id] });
  assert.equal(land.status, 201, JSON.stringify(await land.json()));
  assert.equal((await db.documentUpload.findUnique({ where: { id: landUpload.id }, include: { document: true } })).document.sourceType, 'LAND_PAYOUT');
  await db.customer.update({ where: { id: customer.id }, data: { status: 'CANCELLED', totalPaid: 20 } });
  const refundUpload = await stage('REFUND', 'REFUND_PROOF', '#979797');
  const refunded = await post(`/customers/${customer.id}/refund`, { deductionAmount: 5, refundMode: 'NEFT', payoutAccount: 'Test Treasury', referenceNo: 'DOC-REFUND-NEW', documentUploadIds: [refundUpload.id] });
  assert.equal(refunded.status, 200, JSON.stringify(await refunded.json()));
  const linked = await db.documentUpload.findUnique({ where: { id: refundUpload.id }, include: { document: true } });
  assert.equal(linked.document.sourceType, 'REFUND');
  assert.equal((await db.customerPayment.findUnique({ where: { id: linked.document.sourceId } })).status, 'REFUND_DISBURSED');
});
test('audit failure rolls back evidence and upload consumption', async () => {
  const u = await stage('EXPENSE', 'EXPENSE_RECEIPT', '#989898');
  await assert.rejects(db.$transaction(tx => S.attach(new Proxy(tx, {
    get(target, key) { return key === 'auditLog' ? { create: async () => { throw Error('Injected audit outage'); } } : target[key]; }
  }), actors.ADMIN, 'EXPENSE', expense.id, [u.id])), { statusCode: 503 });
  assert.equal((await db.documentUpload.findUnique({ where: { id: u.id } })).documentId, null);
});
test('cheque evidence is visible only to financial staff and expired tokens fail', async () => {
  const u = await stage('CUSTOMER_PAYMENT', 'CHEQUE_FRONT', '#999999');
  await db.$transaction(tx => S.attach(tx, actors.ADMIN, 'CUSTOMER_PAYMENT', payment.id, [u.id]));
  const d = (await db.documentUpload.findUnique({ where: { id: u.id }, include: { document: true } })).document;
  assert.equal((await json(`/${d.id}/download`, 'GET', null, 'SALES')).status, 403);
  assert.ok(!(await S.list(actors.SALES, 'CUSTOMER_PAYMENT', payment.id)).documents.some(item => item.id === d.id));
  assert.ok(await S.content(actors.ADMIN, d.id, true));
  const token = jwt.sign({ userId: users.ADMIN.id }, process.env.JWT_SECRET, { expiresIn: -1 });
  assert.equal((await fetch(`${origin}/api/v1/documents/${d.id}/download`, { headers: { Authorization: `Bearer ${token}` } })).status, 401);
});
test('exceptions require a reason and financial review with an audit', async () => {
  await assert.rejects(db.$transaction(tx => S.attach(tx, actors.OTHER, 'EXPENSE', otherExpense.id, [], 'no')), { statusCode: 400 });
  await db.$transaction(tx => S.attach(tx, actors.OTHER, 'EXPENSE', otherExpense.id, [], 'Supplier could not issue a bill; cash purchase at a remote site.'));
  const exception = (await S.list(actors.ADMIN, 'EXPENSE', otherExpense.id)).exception;
  assert.equal(exception.status, 'PENDING_REVIEW');
  assert.equal((await json(`/exceptions/${exception.id}/verify`, 'POST', { reason: 'Confirmed with supplier' }, 'OTHER')).status, 403);
  assert.equal((await json(`/exceptions/${exception.id}/verify`, 'POST', { reason: 'Confirmed with supplier' }, 'ACCOUNTING')).status, 200);
});
test('review queue filters, missing detection, paging, UTR and SQL injection safety', async () => {
  const queue = await R.queue(actors.ACCOUNTING, { sourceType: 'CUSTOMER_PAYMENT', documentType: 'CUSTOMER_PAYMENT_PROOF', utr: 'DOC-UTR', pageSize: 1 }); assert.equal(queue.total, 1); assert.equal(queue.documents.length, 1);
  assert.equal((await R.queue(actors.ADMIN, { search: "' OR 1=1 --" })).total, 0);
  assert.ok((await R.summary(actors.ADMIN)).pending >= 1);
  const sources = await R.transactions(actors.ADMIN, { missing: 'true', pageSize: 1 }); assert.ok(sources.total >= 0);
  assert.equal((await json('/review?pageSize=10000')).status, 400);
});
test('live permission revocation invalidates a previously issued token', async () => {
  const p = await db.permission.findUnique({ where: { code: 'document.review' } });
  await db.rolePermission.delete({ where: { roleId_permissionId: { roleId: users.ACCOUNTING.roleId, permissionId: p.id } } });
  assert.equal((await json('/review', 'GET', null, 'ACCOUNTING')).status, 403);
});
test('archival keeps evidence and historical access; integrity failure is closed', async () => {
  const d = await attached('#909090');
  await S.transition(actors.ADMIN, d.id, 'archive', 'Superseded by corrected transaction');
  assert.ok(await S.content(actors.ADMIN, d.id, true));
  await fs.writeFile(require('../src/services/documents/storage').storage().location(d.storageKey), Buffer.from('tampered'));
  await assert.rejects(S.content(actors.ADMIN, d.id, true), { statusCode: 503 });
});
test('verification fails closed when pending evidence has been tampered with', async () => {
  const d = await attached('#909091');
  await fs.writeFile(require('../src/services/documents/storage').storage().location(d.storageKey), Buffer.from('tampered'));
  await assert.rejects(S.transition(actors.ADMIN, d.id, 'verify'), { statusCode: 503 });
  assert.equal((await db.transactionDocument.findUnique({ where: { id: d.id } })).status, 'PENDING_REVIEW');
});
test('source lists paginate retained versions without losing policy coverage', async () => {
  const source = await db.expense.create({ data: { userId: users.ADMIN.id, walletId: users.ADMIN.wallet.id, categoryId: category.id, amount: 1, description: 'Pagination evidence fixture', date: new Date(), fundMode: 'CASH', status: 'RECORDED' } });
  for (let i = 0; i < 51; i++) {
    const u = await stage('EXPENSE', i === 0 ? 'EXPENSE_RECEIPT' : 'SUPPORTING_DOCUMENT', `#a0${i.toString(16).padStart(4, '0')}`);
    await db.$transaction(tx => S.attach(tx, actors.ADMIN, 'EXPENSE', source.id, [u.id], null, null, false));
  }
  const first = await S.list(actors.ADMIN, 'EXPENSE', source.id);
  const second = await S.list(actors.ADMIN, 'EXPENSE', source.id, 2);
  assert.equal(first.documents.length, 50); assert.equal(first.total, 51); assert.equal(second.documents.length, 1);
  assert.equal(first.state, 'DOCUMENT_PENDING'); // Required receipt is on the second page.
  assert.equal(second.documents[0].documentType, 'EXPENSE_RECEIPT');
});
