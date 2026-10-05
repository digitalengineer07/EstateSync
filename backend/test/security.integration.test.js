const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
if (!process.env.DOCUMENT_TEST_DATABASE_URL || process.env.DATABASE_URL !== process.env.DOCUMENT_TEST_DATABASE_URL) throw Error('Use the isolated PostgreSQL runner');
process.env.PORT = '0';
process.env.JWT_REFRESH_SECRET = crypto.randomBytes(32).toString('hex');
process.env.DOCUMENT_EXPENSE_RECEIPT_REQUIRED = 'false';
const db = require('../src/config/db');
const { authVersion } = require('../src/utils/authVersion');
const users = {}, tokens = {};
let server, base, category, customer;
async function request(route, method = 'GET', body, role = 'ADMIN', key) {
  const response = await fetch(base + '/api/v1' + route, { method, headers: { 'Content-Type': 'application/json', ...(role ? { Authorization: `Bearer ${tokens[role]}` } : {}), ...(key ? { 'Idempotency-Key': key } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(45000) });
  return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie') };
}
before(async () => {
  for (const name of ['ADMIN','SALES','OTHER','MANAGER']) {
    const role = await db.role.create({ data: { name } });
    users[name] = await db.user.create({ data: { name, email: `${name.toLowerCase()}@security.test`, roleId: role.id, passwordHash: await bcrypt.hash('Testing!Secure42', 4), wallet: { create: { availableBalanceCash: name === 'SALES' ? 100 : 1000, availableBalanceLiquid: 1000 } } }, include: { wallet: true } });
    for (const code of ['expense.create','expense.view','fund.request', ...(name === 'SALES' ? ['customer.view','customer.edit'] : []), ...(name === 'MANAGER' ? ['fund.approve','fund.reject'] : [])]) {
      const permission = await db.permission.upsert({ where: { code }, create: { code }, update: {} });
      await db.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
    }
    tokens[name] = jwt.sign({ userId: users[name].id, authVersion: authVersion(users[name]) }, process.env.JWT_SECRET, { expiresIn: '1h' });
  }
  await require('../src/utils/accountingHelper').ensureStandardAccounts();
  category = await db.expenseCategory.create({ data: { name: 'Travel' } });
  customer = await db.customer.create({ data: { salesOwnerId: users.OTHER.id, customerName: 'Private Customer', customerContact: '9999900000', projectLocation: 'Test', plotNo: 'P1', khataNo: 'K1', areaSqft: 100, identityType: 'TEST', identityNumber: 'TEST', totalContractValue: 1000, balanceDue: 1000 } });
  const express = require('express');
  const listen = express.application.listen;
  express.application.listen = function(...args) { server = listen.apply(this,args); return server; };
  await require('../src/app').ready;
  express.application.listen = listen;
  if (!server.listening) await new Promise(resolve => server.once('listening',resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server?.closeAllConnections(); if(server) await new Promise(resolve => server.close(resolve)); await db.$disconnect(); });

test('anonymous business routes reject before any mutation', async () => {
  assert.equal((await request('/customers','GET',undefined,null)).status,401);
  assert.equal((await request('/expenses','POST',{},null)).status,401);
});
test('invalid financial and note values return 400', async () => {
  for (const amount of ['100garbage','Infinity',{},-1]) assert.equal((await request('/fund-requests','POST',{amount,reason:'test',managerId:users.MANAGER.id},'SALES')).status,400);
  assert.equal((await request('/notes','POST',{title:'A note',amount:'garbage'})).status,400);
  assert.equal((await request('/notes','POST',{title:'A note',noteDate:'2026-02-30'})).status,400);
  assert.equal((await request('/fund-requests','POST',{amount:10,reason:'test',managerId:users.SALES.id},'SALES')).status,400);
});
test('sales cannot edit another customer, read statement, or book payments', async () => {
  assert.equal((await request(`/customers/${customer.id}`,'PUT',{customerName:'Changed'},'SALES')).status,403);
  assert.equal((await request(`/billing/customers/${customer.id}/statement`,'GET',undefined,'SALES')).status,404);
  assert.equal((await request('/billing/payments','POST',{customerId:customer.id,amount:10,paymentMode:'CASH'},'SALES')).status,403);
  assert.equal((await db.customer.findUnique({where:{id:customer.id}})).customerName,'Private Customer');
});
test('wallet fields remain available for finance but not sales', async () => {
  const sales=await request('/users/all','GET',undefined,'SALES');
  assert.equal(sales.status,200);assert.equal(sales.body.users.some(u=>Object.hasOwn(u,'wallet')),false);
  assert.equal((await request('/users/all')).body.users.some(u=>u.wallet),true);
});
const expenseBody = amount => ({amount,description:'Travel expense',categoryId:category.id,date:'2026-10-04',fundMode:'CASH'});
test('concurrent expenses cannot overdraw a wallet', async () => {
  const results=await Promise.all([request('/expenses','POST',expenseBody(80),'SALES'),request('/expenses','POST',expenseBody(80),'SALES')]);
  assert.deepEqual(results.map(r=>r.status).sort(),[201,400]);
  const wallet=await db.wallet.findUnique({where:{userId:users.SALES.id}});assert.equal(Number(wallet.availableBalanceCash),20);
});
test('same-key concurrent requests commit once and changed payload conflicts', async () => {
  const key=crypto.randomUUID();
  const results=await Promise.all([request('/expenses','POST',expenseBody(5),'SALES',key),request('/expenses','POST',expenseBody(5),'SALES',key)]);
  assert.deepEqual(results.map(r=>r.status),[201,201]);
  assert.equal(await db.expense.count({where:{userId:users.SALES.id,amount:5}}),1);
  assert.equal((await request('/expenses','POST',expenseBody(6),'SALES',key)).status,409);
});
test('concurrent reversal restores the balance only once', async () => {
  const expense=await db.expense.findFirst({where:{userId:users.SALES.id,amount:80}});
  const results=await Promise.all([request(`/expenses/${expense.id}/reverse`,'POST',{reason:'Correction'}),request(`/expenses/${expense.id}/reverse`,'POST',{reason:'Correction'})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
  assert.equal(Number((await db.wallet.findUnique({where:{userId:users.SALES.id}})).availableBalanceCash),95);
});
test('password changes revoke preexisting access tokens', async () => {
  await db.user.update({where:{id:users.OTHER.id},data:{passwordHash:await bcrypt.hash('Changed!Secure42',4)}});
  assert.equal((await request('/users/managers','GET',undefined,'OTHER')).status,401);
});
test('login session persists in the database and refresh works with cookie', async () => {
  const login=await request('/auth/login','POST',{email:users.ADMIN.email,password:'Testing!Secure42'},null);
  assert.equal(login.status,200);assert.ok(login.cookie?.includes('estatesync_sid='));
  const response=await fetch(base+'/api/v1/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json',Cookie:login.cookie.split(';')[0]},body:JSON.stringify({token:login.body.refreshToken})});
  assert.equal(response.status,200);assert.ok((await response.json()).accessToken);
  assert.equal(await db.authSession.count(),1);
});
test('unknown APIs and bodyless login return JSON without crashing', async () => {
  assert.equal((await request('/missing')).status,404);
  assert.equal((await request('/auth/login','POST',undefined,null)).status,400);
  assert.equal((await request('/users/managers')).status,200);
});
test('concurrent refresh requests cannot reuse the same refresh token', async () => {
  const login = await request('/auth/login','POST',{email:users.ADMIN.email,password:'Testing!Secure42'},null);
  assert.equal(login.status,200);
  const refresh = () => fetch(base+'/api/v1/auth/refresh', {
    method:'POST', headers:{'Content-Type':'application/json', Cookie:login.cookie.split(';')[0]},
    body:JSON.stringify({token:login.body.refreshToken})
  });
  const responses = await Promise.all([refresh(), refresh()]);
  assert.deepEqual(responses.map(response => response.status).sort(), [200,403]);
  assert.equal((await refresh()).status,403);
});
test('schema upgrade is repeatable and retention preserves active sessions', async () => {
  const activeId = crypto.randomUUID(), expiredId = crypto.randomUUID();
  await db.authSession.createMany({ data: [
    { id: activeId, data: { marker: 'preserve' }, expiresAt: new Date(Date.now() + 60000) },
    { id: expiredId, data: {}, expiresAt: new Date(Date.now() - 60000) },
  ] });
  await require('../src/utils/securitySchema').ensureSecuritySchema();
  await require('../src/utils/securitySchema').ensureSecuritySchema();
  await require('../src/utils/securityRetention').pruneSecurityRecords();
  assert.deepEqual((await db.authSession.findUnique({ where: { id: activeId } })).data, { marker: 'preserve' });
  assert.equal(await db.authSession.findUnique({ where: { id: expiredId } }), null);
});
