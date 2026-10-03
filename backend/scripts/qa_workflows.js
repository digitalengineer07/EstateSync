// QA uses public HTTP application workflows only. No ORM, SQL, or manufactured JWTs.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const BASE = 'http://127.0.0.1:4000/api/v1';
const DIR = path.resolve(__dirname, '../../scratch/qa-2026-10-03');
fs.mkdirSync(DIR, { recursive: true });
const stateFile = path.join(DIR, 'session.json');
const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : { run: 'QA' + Date.now().toString(36).toUpperCase(), actors: {}, ids: {} };
const evidence = [];
const results = [];
const save = () => fs.writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
const key = () => `${state.run}-${crypto.randomUUID()}`;
const money = value => Math.round(Number(value) * 100);
async function request(method, route, body, role = 'admin', extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  if (state.actors[role]?.token) headers.Authorization = `Bearer ${state.actors[role].token}`;
  if (!['GET', 'HEAD'].includes(method) && !headers['Idempotency-Key']) headers['Idempotency-Key'] = key();
  const started = Date.now();
  const res = await fetch(BASE + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(90000) });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }
  const safe = JSON.parse(JSON.stringify(data));
  for (const name of ['accessToken', 'refreshToken']) if (safe[name]) safe[name] = '[REDACTED]';
  evidence.push({ method, route, role, status: res.status, ms: Date.now() - started, data: safe });
  return { status: res.status, data, headers: res.headers };
}
async function expect(label, method, route, body, role, statuses = [200], extra) {
  const r = await request(method, route, body, role, extra);
  const pass = statuses.includes(r.status);
  results.push({ label, pass, expected: statuses, actual: r.status, message: r.data.message });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label}: ${r.status}${pass ? '' : ' ' + r.data.message}`);
  return r;
}
function verify(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ label, pass, actual, expected });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label}${pass ? '' : ` actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`}`);
}
async function section(name, fn) {
  console.log('\nSECTION ' + name);
  try { await fn(); } catch (e) { results.push({ label: name, pass: false, error: e.message }); console.log('ERROR ' + name + ': ' + e.message); }
  save();
}
async function wallet(role = 'admin') { return (await request('GET', '/dashboard/wallet', undefined, role)).data.stats; }
const customer = suffix => ({ customerName: `${state.run} Customer ${suffix}`, customerContact: '9000000101', customerAddress: 'QA fictional address', projectLocation: `${state.run} Test Site`, plotNo: suffix, areaSqft: 100, khataNo: state.run + suffix, identityType: 'TEST', identityNumber: state.run + suffix, ratePerSqft: 1000, landCost: 100000, registryCost: 5000, otherCharges: 2000, discount: 1000, taxes: 1000 });

async function core() {
  await section('Real login and role inventory', async () => {
    for (const role of ['admin', 'manager', 'sales', 'marketing', 'accounting', 'other']) {
      const r = await expect(`Login ${role}`, 'POST', '/auth/login', { email: `${role}@estatesync.local`, password: 'password123' }, 'none', [200]);
      if (r.status === 200) state.actors[role] = { token: r.data.accessToken, refreshToken: r.data.refreshToken, user: r.data.user };
    }
    assert(state.actors.admin, 'Admin login is required');
    const users = (await request('GET', '/users/all')).data.users;
    state.users = users.map(u => ({ id: u.id, email: u.email, role: u.role.name, isActive: u.isActive }));
    state.roles = (await request('GET', '/users/roles')).data.roles;
    state.ids.category = (await request('GET', '/expenses/categories')).data.categories[0].id;
    for (const role of Object.keys(state.actors)) state.actors[role].id = users.find(u => u.email === `${role}@estatesync.local`)?.id;
    await expect('Anonymous wallet blocked', 'GET', '/dashboard/wallet', undefined, 'none', [401]);
    await expect('Sales cannot view general ledger', 'GET', '/journals', undefined, 'sales', [403]);
    await expect('Sales cannot view treasury', 'GET', '/treasury/cashflow', undefined, 'sales', [403]);
  });
  await section('Every mounted read module', async () => {
    for (const route of ['/users/all','/users/roles','/users/managers','/expenses/categories','/expenses/my','/expenses/team','/expenses/all','/fund-requests/my','/fund-requests/incoming','/fund-requests/all','/transactions/all','/dashboard/wallet','/dashboard/manager','/dashboard/admin','/dashboard/accounting','/accounts','/journals','/audit','/customers','/properties','/treasury/inflows','/treasury/cashflow','/employees','/employees/salary/summary?month=2026-10','/accounting/periods','/billing/plans','/billing/demands','/billing/aging','/billing/reconciliation','/wallets/overview','/notes','/notes/stats','/notifications','/search?q=QA','/documents/policy?sourceType=EXPENSE','/documents/review','/documents/transactions','/documents/summary']) await expect('Read ' + route, 'GET', route);
  });
  await section('Treasury deposits and validation', async () => {
    state.initialWallet = await wallet();
    await expect('Reject zero treasury inflow','POST','/treasury/inflow',{ amount:0, paymentMode:'CASH' },'accounting',[400]);
    await expect('Reject missing bank reference','POST','/treasury/inflow',{amount:100,paymentMode:'NEFT',bankName:'QA Bank'},'accounting',[400]);
    const deposit = {amount:500000,paymentMode:'NEFT',bankName:'QA fictional bank',referenceNo:state.run+'-CAPITAL',inflowType:'CAPITAL_INFUSION',narration:state.run+' opening test funds',transactionDate:'2026-09-15'};
    let r = await expect('Bank capital deposit with ledger','POST','/treasury/inflow',deposit,'accounting',[201]);
    state.ids.inflow = r.data.transaction?.id;
    verify('Bank deposit increases treasury by 500000',money((await wallet()).availableBalanceLiquid)-money(state.initialWallet.availableBalanceLiquid),50000000);
    verify('Deposit honors selected transaction date',r.data.journalEntry?.date?.slice(0,10),'2026-09-15');
    await expect('Cross-case duplicate UTR blocked','POST','/treasury/inflow',{...deposit,referenceNo:' '+deposit.referenceNo.toLowerCase()+' '},'accounting',[400,409]);
    r = await expect('Cash deposit','POST','/treasury/inflow',{amount:50000,paymentMode:'CASH',referenceNo:state.run+'-CASH',inflowType:'CAPITAL_INFUSION',narration:state.run+' cash test funds'},'admin',[201]);
    verify('Cash deposit increases cash balance',money((await wallet()).availableBalanceCash)-money(state.initialWallet.availableBalanceCash),5000000);
    for (const type of ['DIRECTOR_LOAN','BANK_INTEREST','OTHER']) await expect(type+' inflow','POST','/treasury/inflow',{amount:1000,paymentMode:'NEFT',bankName:'QA Bank',referenceNo:state.run+'-'+type,inflowType:type},'accounting',[201]);
  });
  await section('Allocations and approval lifecycle', async () => {
    const before = await wallet('manager');
    await expect('Admin allocates manager liquid','POST','/fund-requests/allocate',{targetUserId:state.actors.manager.id,amount:20000,fundMode:'LIQUID',description:state.run+' allocation'},'admin',[200]);
    verify('Manager liquid allocation calculation',money((await wallet('manager')).availableBalanceLiquid)-money(before.availableBalanceLiquid),2000000);
    await expect('Admin allocates sales cash','POST','/fund-requests/allocate',{targetUserId:state.actors.sales.id,amount:5000,fundMode:'CASH',description:state.run+' allocation'},'admin',[200]);
    let r = await expect('Sales submits request','POST','/fund-requests',{managerId:state.actors.manager.id,amount:2500,fundMode:'LIQUID',reason:state.run+' travel'},'sales',[201]);
    state.ids.request=r.data.fundRequest?.id; assert(state.ids.request);
    await expect('Other role cannot approve','POST',`/fund-requests/${state.ids.request}/approve`,{},'marketing',[403]);
    const beforeManager=await wallet('manager'), beforeSales=await wallet('sales');
    await expect('Manager approves request','POST',`/fund-requests/${state.ids.request}/approve`,{},'manager',[200]);
    verify('Approval debits manager once',money(beforeManager.availableBalanceLiquid)-money((await wallet('manager')).availableBalanceLiquid),250000);
    verify('Approval credits sales once',money((await wallet('sales')).availableBalanceLiquid)-money(beforeSales.availableBalanceLiquid),250000);
    await expect('Approved request cannot approve again','POST',`/fund-requests/${state.ids.request}/approve`,{},'manager',[400,409]);
    r=await expect('Request for rejection','POST','/fund-requests',{managerId:state.actors.manager.id,amount:100,fundMode:'CASH',reason:state.run+' reject'},'sales',[201]);
    await expect('Manager rejects request','POST',`/fund-requests/${r.data.fundRequest?.id}/reject`,{comments:'QA rejection'},'manager',[200]);
    await expect('Reject negative allocation','POST','/fund-requests/allocate',{targetUserId:state.actors.sales.id,amount:-10},'admin',[400]);
    await expect('Reject allocation exceeding treasury','POST','/fund-requests/allocate',{targetUserId:state.actors.sales.id,amount:999999999,fundMode:'LIQUID'},'admin',[400]);
  });
  await section('Expense receipt requirement, exception, reversal', async () => {
    const expense={amount:125.75,description:state.run+' travel expense',categoryId:state.ids.category,date:'2026-10-03',fundMode:'CASH'};
    await expect('Missing mandatory receipt blocked','POST','/expenses',expense,'sales',[400]);
    const before=await wallet('sales');
    const r=await expect('Documented receipt exception expense','POST','/expenses',{...expense,receiptExceptionReason:'QA test: paper receipt unavailable and sent for review.'},'sales',[201]);
    state.ids.expense=r.data.expense?.id; assert(state.ids.expense);
    verify('Expense deducts exact paise',money(before.availableBalanceCash)-money((await wallet('sales')).availableBalanceCash),12575);
    await expect('Unauthorized expense reversal blocked','POST',`/expenses/${state.ids.expense}/reverse`,{reason:'QA reversal test'},'sales',[403]);
    await expect('Accounting expense reversal','POST',`/expenses/${state.ids.expense}/reverse`,{reason:'QA cancellation of test expense'},'accounting',[200]);
    verify('Reversal restores exact wallet cash',money((await wallet('sales')).availableBalanceCash),money(before.availableBalanceCash));
    await expect('Double reversal blocked','POST',`/expenses/${state.ids.expense}/reverse`,{reason:'QA duplicate reversal'},'accounting',[400,409]);
  });
  await section('Customer registration, editing, collections', async () => {
    let r=await expect('Sales creates complete customer','POST','/customers',customer('C1'),'sales',[201]);
    state.ids.customer=r.data.customer?.id; assert(state.ids.customer);
    verify('Contract cost formula',money(r.data.customer.totalContractValue),10700000);
    await expect('Duplicate customer plot rejected','POST','/customers',customer('C1'),'sales',[400,409]);
    await expect('Admin edits customer address','PUT',`/customers/${state.ids.customer}`,{customerAddress:'QA edited test address'},'admin',[200]);
    await expect('Reject overpayment','POST',`/customers/${state.ids.customer}/payments`,{amount:108000,paymentMode:'CASH'},'accounting',[400]);
    const before=await wallet();
    r=await expect('Customer receives bank collection','POST',`/customers/${state.ids.customer}/payments`,{amount:10000.25,paymentMode:'NEFT',referenceNo:state.run+'-COLLECT',dateOfPayment:'2026-10-03'},'accounting',[201]);
    state.ids.customerPayment=r.data.payment?.id;
    verify('Collection credits treasury',money((await wallet()).availableBalanceLiquid)-money(before.availableBalanceLiquid),1000025);
    r=await request('GET',`/customers/${state.ids.customer}`);
    verify('Collection reduces customer balance',money(r.data.customer?.balanceDue),9699975);
    const paymentId=state.ids.customerPayment || r.data.customer?.payments?.[0]?.id;
    state.ids.customerPayment=paymentId;
    if(paymentId) {
      await expect('Correct customer collection amount','PATCH',`/customers/payments/${paymentId}`,{amount:12000.25,paymentMode:'NEFT',referenceNo:state.run+'-COLLECT',dateOfPayment:'2026-10-03',reason:'QA payment correction'},'accounting',[200]);
      const c=(await request('GET',`/customers/${state.ids.customer}`)).data.customer;
      verify('Correction recomputes paid total',money(c.totalPaid),1200025);
      verify('Correction recomputes amount due',money(c.balanceDue),9499975);
    }
  });
  await section('Property acquisition and payouts', async () => {
    const property={khataNo:state.run+'-LAND',plotNo:'L1',projectLocation:state.run+' Land Site',landOwnerName:state.run+' Owner',landOwnerContact:'9000000201',landOwnerAddress:'QA fictional land owner address',areaSqft:1000,totalLandValue:80000,agreementDate:'2026-10-03'};
    let r=await expect('Create acquisition','POST','/properties',property,'admin',[201]);
    state.ids.property=r.data.property?.id; assert(state.ids.property);
    await expect('Duplicate acquisition rejected','POST','/properties',property,'admin',[400,409]);
    await expect('Edit acquisition contact','PUT',`/properties/${state.ids.property}`,{landOwnerContact:'9000000202'},'admin',[200]);
    const before=await wallet();
    r=await expect('Pay land owner','POST',`/properties/${state.ids.property}/payments`,{amount:10000,paymentMode:'NEFT',referenceNo:state.run+'-LANDPAY',dateOfPayment:'2026-10-03'},'accounting',[201]);
    state.ids.propertyPayment=r.data.payment?.id;
    verify('Land payout debits treasury',money(before.availableBalanceLiquid)-money((await wallet()).availableBalanceLiquid),1000000);
    r=await request('GET',`/properties/${state.ids.property}`);
    verify('Land remaining value calculation',money(r.data.property?.balanceRemaining),7000000);
    const paymentId=state.ids.propertyPayment || r.data.property?.payments?.[0]?.id; state.ids.propertyPayment=paymentId;
    if(paymentId) await expect('Correct land payout','PUT',`/properties/payments/${paymentId}`,{amount:11000,paymentMode:'NEFT',referenceNo:state.run+'-LANDPAY',dateOfPayment:'2026-10-03',reason:'QA payout correction'},'admin',[200]);
    await expect('Reject land overpayment','POST',`/properties/${state.ids.property}/payments`,{amount:90000,paymentMode:'CASH'},'accounting',[400]);
  });
  await section('Employee and salary lifecycle', async () => {
    let r=await expect('Create employee','POST','/employees',{fullName:state.run+' Employee',mobile:'9000000301',email:state.run.toLowerCase()+'@example.test',department:'SALES',designation:'QA tester',joiningDate:'2026-09-01',baseSalary:10000,bankName:'QA Bank',bankAccountNo:'TEST0001',ifscCode:'TEST0000001'},'admin',[201]);
    state.ids.employee=r.data.employee?.id; assert(state.ids.employee);
    await expect('Edit employee master','PATCH',`/employees/${state.ids.employee}`,{designation:'QA senior tester'},'admin',[200]);
    await expect('Configure salary','PUT',`/employees/${state.ids.employee}/salary`,{baseSalary:15000,paymentMethod:'BANK_TRANSFER',bankName:'QA Bank',bankAccountNo:'TEST0001',ifscCode:'TEST0000001'},'admin',[200]);
    const before=await wallet();
    await expect('Pay configured monthly salary','POST',`/employees/${state.ids.employee}/pay-salary`,{month:'2026-10',paymentMode:'NEFT',referenceNo:state.run+'-SALARY',notes:'QA test salary'},'accounting',[201]);
    verify('Salary debits exact configured amount',money(before.availableBalanceLiquid)-money((await wallet()).availableBalanceLiquid),1500000);
    await expect('Duplicate month salary blocked','POST',`/employees/${state.ids.employee}/pay-salary`,{month:'2026-10',paymentMode:'NEFT',referenceNo:state.run+'-SALARY2'},'accounting',[409]);
    await expect('Salary history','GET',`/employees/${state.ids.employee}/salary-payments`,undefined,'accounting',[200]);
    await expect('Employee links to user','POST',`/employees/${state.ids.employee}/link-user`,{userId:state.actors.sales.id},'admin',[200]);
    await expect('Employee unlinks from user','POST',`/employees/${state.ids.employee}/unlink-user`,{},'admin',[200]);
  });
}

async function main() {
  const phase=process.argv[2] || 'core';
  if(phase==='core') await core();
  else throw Error('Unknown phase');
  fs.writeFileSync(path.join(DIR,`${phase}-results.json`),JSON.stringify({run:state.run,results,evidence},null,2),{mode:0o600});
  console.log(JSON.stringify({run:state.run,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,report:path.join(DIR,`${phase}-results.json`)}));
}
if(require.main===module) main().catch(e=>{save();console.error(e.message);process.exitCode=1;});
module.exports={state,DIR,request,expect,verify,section,wallet,customer,money,key,save,results,evidence};
