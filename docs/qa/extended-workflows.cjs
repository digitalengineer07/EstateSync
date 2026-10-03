// Application-only QA: all state changes travel through authenticated public API routes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const sharp = require('../../backend/node_modules/sharp');
const { PDFDocument } = require('../../backend/node_modules/pdf-lib');
const Q = require('../../backend/scripts/qa_workflows');
const { state, DIR, request, expect, verify, section, wallet, customer, money, key } = Q;
const BASE='http://127.0.0.1:4000/api/v1';

async function upload(label, {sourceType='EXPENSE',documentType='EXPENSE_RECEIPT',name='qa-receipt.png',mime='image/png',bytes,role='sales',idempotencyKey=key(),statuses=[201]}={}) {
  bytes ||= await sharp({create:{width:16,height:16,channels:3,background:'#' + crypto.randomBytes(3).toString('hex')}}).png().toBuffer();
  const route='/documents/uploads?'+new URLSearchParams({sourceType,documentType,fileName:name});
  const res=await fetch(BASE+route,{method:'POST',headers:{Authorization:`Bearer ${state.actors[role].token}`,'Content-Type':mime,'Idempotency-Key':idempotencyKey},body:bytes,signal:AbortSignal.timeout(60000)});
  const data=await res.json();
  verify(label+' HTTP',statuses.includes(res.status),true);
  Q.evidence.push({label,route,status:res.status,data});
  return {status:res.status,data,bytes};
}

async function documents() {
  await section('Receipt upload, storage, review and replacement',async()=>{
    const u=await upload('Upload PNG receipt'); assert(u.data.upload?.id,JSON.stringify(u.data));
    const before=await wallet('sales');
    const r=await expect('Create expense with actual uploaded receipt','POST','/expenses',{amount:123.45,description:state.run+' receipt-backed expense',categoryId:state.ids.category,date:'2026-10-03',fundMode:'CASH',documentUploadIds:[u.data.upload.id]},'sales',[201]);
    const id=r.data.expense?.id; assert(id); state.ids.documentExpense=id;
    verify('Receipt expense exact cash deduction',money(before.availableBalanceCash)-money((await wallet('sales')).availableBalanceCash),12345);
    const list=await expect('Owner lists receipt','GET',`/documents?sourceType=EXPENSE&sourceId=${id}`,undefined,'sales');
    const doc=list.data.documents?.[0]; assert(doc); state.ids.document=doc.id;
    verify('New receipt pending review',doc.status,'PENDING_REVIEW');
    verify('Private storage path not exposed',Object.hasOwn(doc,'storageKey'),false);
    await expect('Unrelated staff cannot read receipt','GET',`/documents/${doc.id}`,undefined,'marketing',[403,404]);
    await expect('Uploader cannot self-verify','POST',`/documents/${doc.id}/verify`,{},'sales',[403]);
    for(const action of ['preview','download']) {
      const res=await fetch(`${BASE}/documents/${doc.id}/${action}`,{headers:{Authorization:`Bearer ${state.actors.sales.token}`}});
      const bytes=Buffer.from(await res.arrayBuffer());
      verify('Receipt '+action+' succeeds',res.status,200);
      verify('Receipt '+action+' private cache control',res.headers.get('cache-control')?.includes('no-store'),true);
      if(action==='download') verify('Downloaded receipt bytes match original',crypto.createHash('sha256').update(bytes).digest('hex'),crypto.createHash('sha256').update(u.bytes).digest('hex'));
    }
    await expect('Finance verifies receipt','POST',`/documents/${doc.id}/verify`,{},'accounting');
    await expect('Double receipt review blocked','POST',`/documents/${doc.id}/reject`,{reason:'QA rejection after verification'},'accounting',[409]);
    const replacement=await upload('Upload replacement receipt');
    const replaced=await expect('Replace receipt preserving history','POST',`/documents/${doc.id}/replace`,{uploadId:replacement.data.upload.id},'sales');
    const next=replaced.data.document; assert(next);
    verify('Replacement version increments',next.version,2);
    await expect('Reject replacement with reason','POST',`/documents/${next.id}/reject`,{reason:'QA receipt needs correction'},'accounting');
    const history=await expect('Receipt version history','GET',`/documents/${next.id}`,undefined,'accounting');
    verify('Original and replacement both retained',history.data.history?.length,2);
    await expect('Archive reviewed receipt','POST',`/documents/${next.id}/archive`,{reason:'QA evidence archive test'},'admin');
    await expect('Consumed upload cannot be reused','POST','/expenses',{amount:1,description:state.run+' reuse',categoryId:state.ids.category,date:'2026-10-03',fundMode:'CASH',documentUploadIds:[u.data.upload.id]},'sales',[409]);
  });
  await section('File formats, rejected files and upload replay',async()=>{
    const image=sharp({create:{width:12,height:12,channels:3,background:'#0099aa'}});
    for(const [ext,mime] of [['jpg','image/jpeg'],['webp','image/webp']]) {
      const u=await upload('Accept '+ext,{name:'qa.'+ext,mime,bytes:await image.clone().toFormat(ext==='jpg'?'jpeg':ext).toBuffer()});
      if(u.data.upload) await expect('Discard '+ext+' staging upload','POST',`/documents/uploads/${u.data.upload.id}/discard`,{},'sales');
    }
    const pdf=await PDFDocument.create(); pdf.addPage([100,100]);
    const u=await upload('Accept PDF',{name:'qa.pdf',mime:'application/pdf',bytes:Buffer.from(await pdf.save())});
    if(u.data.upload) await expect('Discard PDF staging upload','POST',`/documents/uploads/${u.data.upload.id}/discard`,{},'sales');
    await upload('Reject MIME spoofing',{bytes:Buffer.from('QA not an image; plain text payload'),statuses:[400]});
    await upload('Reject path traversal filename',{name:'../receipt.png',statuses:[400]});
    await upload('Reject oversized file',{bytes:Buffer.alloc(10*1024*1024+1),statuses:[413]});
    const k=key(), first=await upload('Stage idempotent upload',{idempotencyKey:k});
    const replay=await upload('Replay exact upload',{idempotencyKey:k,bytes:first.bytes});
    verify('Same upload key returns same ID',replay.data.upload?.id,first.data.upload?.id);
    await upload('Changed file with same key blocked',{idempotencyKey:k,statuses:[409]});
    if(first.data.upload) await expect('Discard replay upload','POST',`/documents/uploads/${first.data.upload.id}/discard`,{},'sales');
  });
  await section('Receipt exception review',async()=>{
    const r=await request('GET',`/documents?sourceType=EXPENSE&sourceId=${state.ids.expense}`);
    assert(r.data.exception?.id,'Receipt exception missing');
    await expect('Review receipt exception','POST',`/documents/exceptions/${r.data.exception.id}/verify`,{reason:'QA confirms paper receipt unavailable'},'accounting');
    await expect('Duplicate exception review blocked','POST',`/documents/exceptions/${r.data.exception.id}/reject`,{reason:'QA repeated review'},'accounting',[409]);
  });
}

async function billing() {
  await section('Milestone plans, demands, allocation and aging',async()=>{
    let r=await expect('Create 30/70 payment plan','POST','/billing/plans',{name:state.run+' PLAN',milestones:[{name:'Booking',percentage:30,sequence:1},{name:'Possession',percentage:70,sequence:2}]},'accounting',[201]);
    const plan=r.data.data; assert(plan); state.ids.plan=plan.id;
    await expect('Reject plan not totaling 100 percent','POST','/billing/plans',{name:state.run+' INVALID',milestones:[{name:'Booking',percentage:20}]},'accounting',[400]);
    await expect('Read payment plan','GET',`/billing/plans/${plan.id}`);
    r=await expect('Create customer for milestone flow','POST','/customers',customer('AR1'),'sales',[201]);
    const c=r.data.customer; assert(c); state.ids.arCustomer=c.id;
    await expect('Assign payment plan','POST','/billing/plans/assign',{customerId:c.id,planId:plan.id},'accounting');
    r=await expect('Issue 30 percent demand','POST','/billing/demands',{customerId:c.id,milestoneId:plan.milestones[0].id,customDueDate:'2026-09-15'},'accounting',[201]);
    const dn=r.data.data?.demandNote; assert(dn); state.ids.demand=dn.id;
    verify('Demand percentage calculation',money(dn.totalDemandAmount),3210000);
    await expect('Duplicate milestone demand rejected','POST','/billing/demands',{customerId:c.id,milestoneId:plan.milestones[0].id},'accounting',[409]);
    r=await expect('Pay against demand with FIFO allocation','POST','/billing/payments',{customerId:c.id,amount:10000,paymentMode:'NEFT',referenceNo:state.run+'-AR1'},'accounting',[201]);
    verify('Receipt allocated exactly to demand',money(r.data.data?.allocatedAmount),1000000);
    state.ids.arPayment=r.data.data?.payment?.id;
    r=await request('GET',`/billing/customers/${c.id}/statement`);
    verify('Customer subledger closing balance',money(r.data.data?.closingBalance),2210000);
    const filtered=await request('GET',`/billing/customers/${c.id}/statement?startDate=2026-10-03&endDate=2026-10-03`);
    verify('Inclusive end-date retains today entries',filtered.data.data?.lines?.length,r.data.data?.lines?.length);
    await expect('AR aging report','GET','/billing/aging?asOfDate=2026-10-03');
    await expect('AR reconciliation report','GET','/billing/reconciliation');
    r=await expect('Issue second milestone','POST','/billing/demands',{customerId:c.id,milestoneId:plan.milestones[1].id},'accounting',[201]);
    const second=r.data.data?.demandNote; assert(second);
    await expect('Cancel unpaid demand','POST',`/billing/demands/${second.id}/cancel`,{reason:'QA cancelled milestone'},'admin');
    await expect('Cancel partially paid demand safely','POST',`/billing/demands/${dn.id}/cancel`,{reason:'QA cannot cancel allocated demand'},'admin',[400,409]);
  });
  await section('Cross-owner access controls',async()=>{
    const r=await expect('Create separate admin-owned customer','POST','/customers',customer('PRIVATE'),'admin',[201]);
    const c=r.data.customer; assert(c); state.ids.privateCustomer=c.id;
    await expect('Sales denied another owners customer','GET',`/customers/${c.id}`,undefined,'sales',[403,404]);
    await expect('Sales denied another owners statement','GET',`/billing/customers/${c.id}/statement`,undefined,'sales',[403,404]);
    await expect('Sales denied another owners demand list','GET',`/billing/demands?customerId=${c.id}`,undefined,'sales',[403,404]);
    await expect('Ordinary staff denied all user wallet balances','GET','/users/all',undefined,'other',[403]);
  });
  await section('Legacy collection and subledger consistency',async()=>{
    await expect('Admin corrects standard collection amount','PATCH',`/customers/payments/${state.ids.customerPayment}`,{amount:12000.25,paymentMode:'NEFT',referenceNo:state.run+'-COLLECT',dateOfPayment:'2026-10-03',reason:'QA authorised financial correction'},'admin');
    const c=(await request('GET',`/customers/${state.ids.customer}`)).data.customer;
    const s=(await request('GET',`/billing/customers/${state.ids.customer}/statement`)).data.data;
    verify('Standard customer collection appears in customer subledger',money(s.totalCredits),money(c.totalPaid));
    if(state.ids.arPayment) {
      await expect('Correct allocated customer receipt','PATCH',`/customers/payments/${state.ids.arPayment}`,{amount:11000,paymentMode:'NEFT',referenceNo:state.run+'-AR1',dateOfPayment:'2026-10-03',reason:'QA allocated receipt correction'},'admin');
      const s2=(await request('GET',`/billing/customers/${state.ids.arCustomer}/statement`)).data.data;
      verify('Payment correction updates customer subledger credits',money(s2.totalCredits),1100000);
    }
  });
  await section('Customer cancellation and refund',async()=>{
    let r=await expect('Cancel customer with collections','PUT',`/customers/${state.ids.customer}`,{status:'CANCELLED',cancellationReason:'QA cancelled booking'},'admin');
    const before=await wallet();
    r=await expect('Refund with retained costing','POST',`/customers/${state.ids.customer}/settle-cancellation`,{deductionAmount:2000.25,refundMode:'NEFT',referenceNo:state.run+'-REFUND',notes:'QA refund test'},'accounting');
    verify('Refund calculation paid minus retention',money(r.data.data?.refundAmount),1000000);
    verify('Refund debits treasury exactly',money(before.availableBalanceLiquid)-money((await wallet()).availableBalanceLiquid),1000000);
    await expect('Duplicate refund rejected','POST',`/customers/${state.ids.customer}/settle-cancellation`,{deductionAmount:2000.25,refundMode:'CASH'},'accounting',[400,409]);
    await expect('Cancelled customer cannot receive new collection','POST',`/customers/${state.ids.customer}/payments`,{amount:10,paymentMode:'CASH'},'accounting',[400]);
  });
}

async function controls() {
  await section('Treasury type fixtures and financial validation',async()=>{
    for(const [i,type] of ['DIRECTOR_LOAN','BANK_INTEREST'].entries()) await expect(type+' valid short UTR','POST','/treasury/inflow',{amount:1000,paymentMode:'NEFT',bankName:'QA Bank',referenceNo:state.run+'-T'+i,inflowType:type},'accounting',[201]);
    await expect('Reject malformed numeric treasury amount','POST','/treasury/inflow',{amount:'12garbage',paymentMode:'CASH',referenceNo:state.run+'-BADNUM'},'accounting',[400]);
    await expect('Reject unsupported treasury mode','POST','/treasury/inflow',{amount:10,paymentMode:'INVALID',bankName:'QA Bank',referenceNo:state.run+'-BADMODE'},'accounting',[400]);
    const before=await wallet(); const k=key();
    const b={amount:20,paymentMode:'CASH',referenceNo:state.run+'-IDEM',narration:'QA idempotency'};
    const first=await expect('Initial treasury request key','POST','/treasury/inflow',b,'admin',[201],{'Idempotency-Key':k});
    const second=await expect('Treasury retry returns original success','POST','/treasury/inflow',b,'admin',[200,201],{'Idempotency-Key':k});
    verify('Treasury retry creates no extra credit',money((await wallet()).availableBalanceCash)-money(before.availableBalanceCash),2000);
  });
  await section('Wallet balance adjustment controls',async()=>{
    const start=await wallet('sales');
    for(const [adjustmentType,amount] of [['INCREASE',100],['DECREASE',25]]) await expect('Wallet '+adjustmentType,'POST','/wallets/adjust',{targetUserId:state.actors.sales.id,fundMode:'CASH',adjustmentType,amount,reason:'QA authorised adjustment'},'admin');
    verify('Increase then decrease calculation',money((await wallet('sales')).availableBalanceCash)-money(start.availableBalanceCash),7500);
    await expect('Set balance through audited workflow','POST','/wallets/adjust',{targetUserId:state.actors.sales.id,fundMode:'CASH',adjustmentType:'SET_BALANCE',targetBalance:Number(start.availableBalanceCash),reason:'QA restore previous balance'},'admin');
    verify('Set balance matches requested amount',money((await wallet('sales')).availableBalanceCash),money(start.availableBalanceCash));
    await expect('Adjustment requires reason','POST','/wallets/adjust',{targetUserId:state.actors.sales.id,amount:1,adjustmentType:'INCREASE'},'admin',[400]);
    await expect('Non-admin cannot adjust wallet','POST','/wallets/adjust',{targetUserId:state.actors.sales.id,amount:1,reason:'QA restricted test'},'sales',[403]);
  });
  await section('Operational note CRUD does not move money',async()=>{
    const before=await wallet(), journalCount=(await request('GET','/journals')).data.journals.length;
    let r=await expect('Manager creates cash memo','POST','/notes',{title:state.run+' cash memo',category:'CASH_RECEIVED_CUSTOMER',partyName:'QA fictional party',amount:5432.10,description:'QA information only',noteDate:'2026-10-03'},'manager',[201]);
    const id=r.data.note?.id; assert(id);
    await expect('Read single note','GET',`/notes/${id}`,undefined,'manager');
    await expect('Creator edits memo','PUT',`/notes/${id}`,{title:state.run+' amended memo',amount:6000},'manager');
    await expect('Other creator edit blocked','PUT',`/notes/${id}`,{title:'QA forbidden'},'accounting',[403]);
    await expect('Find note via search','GET','/notes?search='+state.run,undefined,'manager');
    await expect('Delete test memo via application','DELETE',`/notes/${id}`,undefined,'manager');
    verify('Memo leaves cash unchanged',money((await wallet()).availableBalanceCash),money(before.availableBalanceCash));
    verify('Memo creates no journal',(await request('GET','/journals')).data.journals.length,journalCount);
  });
  await section('Accounting close/reopen and rollback',async()=>{
    const periods=(await request('GET','/accounting/periods')).data.periods;
    const period=periods.find(p=>p.periodName==='2026-10'); assert(period);
    const before=await wallet();
    await expect('Close accounting month','POST',`/accounting/periods/${period.id}/close`,{},'admin');
    try {
      await expect('Closed month deposit rejected without server error','POST','/treasury/inflow',{amount:17,paymentMode:'CASH',referenceNo:state.run+'-CLOSED'},'admin',[400,409]);
      verify('Closed period failed posting rolls wallet back',money((await wallet()).availableBalanceCash),money(before.availableBalanceCash));
      await expect('Accountant cannot reopen month','POST',`/accounting/periods/${period.id}/reopen`,{reason:'QA accounting reopen test'},'accounting',[403]);
    } finally { await expect('Admin reopens month','POST',`/accounting/periods/${period.id}/reopen`,{reason:'QA completed closed period validation'},'admin'); }
  });
  await section('Concurrent overspending and duplicate submission',async()=>{
    await expect('Fund concurrency test wallet','POST','/fund-requests/allocate',{targetUserId:state.actors.marketing.id,amount:100,fundMode:'CASH',description:state.run+' concurrency test'},'admin');
    const b={amount:80,description:state.run+' concurrent expense',categoryId:state.ids.category,date:'2026-10-03',fundMode:'CASH',receiptExceptionReason:'QA no receipt for concurrent synthetic test'};
    const pair=await Promise.all([request('POST','/expenses',b,'marketing'),request('POST','/expenses',b,'marketing')]);
    verify('Concurrent expenses allow at most one success',pair.filter(r=>r.status===201).length<=1,true);
    verify('Concurrent expenses never produce negative cash',Number((await wallet('marketing')).availableBalanceCash)>=0,true);
    verify('Concurrent conflict is a controlled client error',pair.every(r=>[201,400,409].includes(r.status)),true);
    const idem=key(), requestBody={amount:10,managerId:state.actors.manager.id,reason:'QA retry test',fundMode:'CASH'};
    const one=await expect('Initial idempotent fund request','POST','/fund-requests',requestBody,'sales',[201],{'Idempotency-Key':idem});
    const two=await expect('Replay same fund request','POST','/fund-requests',requestBody,'sales',[200,201],{'Idempotency-Key':idem});
    verify('Replay returns same request ID',two.data.fundRequest?.id,one.data.fundRequest?.id);
    await expect('Changed request with same key rejected','POST','/fund-requests',{...requestBody,amount:20},'sales',[409],{'Idempotency-Key':idem});
  });
}

async function auth() {
  await section('User provisioning and security lifecycle',async()=>{
    const email=state.run.toLowerCase()+'@example.test',password='Qa!'+crypto.randomBytes(12).toString('hex');
    const r=await expect('Admin registers test staff','POST','/users/register',{email,password,name:state.run+' Auth Tester',roleId:state.roles.find(r=>r.name==='OTHER').id},'admin',[201]);
    const id=r.data.user?.id; assert(id); state.ids.qaUser=id;
    let login=await expect('New staff logs in','POST','/auth/login',{email,password},'none');
    state.actors.qa={token:login.data.accessToken,refreshToken:login.data.refreshToken,id};
    verify('New account wallet starts at zero',money((await wallet('qa')).availableBalanceCash),0);
    await expect('Reject weak password reset','PUT',`/users/${id}/reset-password`,{newPassword:'12345678',confirmPassword:'12345678'},'admin',[400]);
    await expect('Deactivate test account','PATCH',`/users/${id}/status`,{isActive:false},'admin');
    await expect('Deactivated token stops working','GET','/dashboard/wallet',undefined,'qa',[403]);
    await expect('Reactivate test account','PATCH',`/users/${id}/status`,{isActive:true},'admin');
    const changed='Qa!'+crypto.randomBytes(12).toString('hex');
    await expect('Admin resets test password','PUT',`/users/${id}/reset-password`,{newPassword:changed,confirmPassword:changed},'admin');
    await expect('Old access token revoked after password reset','GET','/dashboard/wallet',undefined,'qa',[401,403]);
    await expect('Old refresh token revoked after password reset','POST','/auth/refresh',{refreshToken:state.actors.qa.refreshToken},'none',[401,403]);
    login=await expect('New password login','POST','/auth/login',{email,password:changed},'none');
    if(login.status===200) state.actors.qa={...state.actors.qa,token:login.data.accessToken,refreshToken:login.data.refreshToken};
    const own='Qa!'+crypto.randomBytes(12).toString('hex');
    await expect('User changes own password','PUT','/auth/change-password',{currentPassword:changed,newPassword:own,confirmPassword:own},'qa');
    await expect('Logout','POST','/auth/logout',{refreshToken:state.actors.qa.refreshToken},'qa');
    await expect('Logged-out refresh token cannot mint tokens','POST','/auth/refresh',{refreshToken:state.actors.qa.refreshToken},'none',[401,403]);
    await expect('Admin self-deactivation blocked','PATCH',`/users/${state.actors.admin.id}/status`,{isActive:false},'admin',[400]);
    // Leave the synthetic account disabled and record its generated password privately.
    state.qaCredentials={email,password:own};
    await expect('Disable synthetic account after test','PATCH',`/users/${id}/status`,{isActive:false},'admin');
  });
}

async function audit() {
  await section('Global ledger and wallet reconciliation',async()=>{
    const journals=(await request('GET','/journals')).data.journals;
    verify('Every fetched journal balances to the paise',journals.filter(j=>j.lines.reduce((a,l)=>a+money(l.debit)-money(l.credit),0)!==0).map(j=>j.entryNumber),[]);
    const users=(await request('GET','/users/all')).data.users;
    const txns=(await request('GET','/transactions/all')).data.transactions;
    verify('Ledger list below its 100-row truncation limit',txns.length<100,true);
    for(const u of users) for(const mode of ['Cash','Liquid']) {
      const expected=txns.filter(t=>t.fundMode===mode.toUpperCase()).reduce((a,t)=>a+(t.destWalletId===u.wallet.id?money(t.amount):0)-(t.sourceWalletId===u.wallet.id?money(t.amount):0),0);
      verify(`${u.role.name} ${u.email} ${mode} wallet reconciles to movements`,money(u.wallet['availableBalance'+mode]),expected);
    }
    for(const route of ['/dashboard/admin','/dashboard/accounting','/dashboard/manager','/treasury/cashflow','/accounts','/billing/reconciliation','/documents/summary','/audit?limit=100','/search?q='+state.run,'/notifications']) await expect('Final '+route,'GET',route);
    const s=(await request('GET','/employees/salary/summary?month=2026-10')).data.summary;
    Q.evidence.push({label:'Salary summary final',data:s});
    if(state.ids.employee) {
      await expect('Archive test employee','POST',`/employees/${state.ids.employee}/archive`,{exitReason:'QA test lifecycle complete',exitDate:'2026-10-03'},'admin');
      await expect('Archived employee salary prohibited','POST',`/employees/${state.ids.employee}/pay-salary`,{month:'2026-11',paymentMode:'CASH',amount:1},'accounting',[400]);
    }
  });
}

const phases={documents,billing,controls,auth,audit};
(async()=>{
  const phase=process.argv[2]; assert(phases[phase],'Choose documents, billing, controls, auth or audit');
  await phases[phase](); Q.save();
  fs.writeFileSync(path.join(DIR,phase+'-results.json'),JSON.stringify({run:state.run,results:Q.results,evidence:Q.evidence},null,2),{mode:0o600});
  console.log(JSON.stringify({phase,passed:Q.results.filter(r=>r.pass).length,failed:Q.results.filter(r=>!r.pass).length}));
})().catch(e=>{Q.save();console.error(e);process.exitCode=1;});
