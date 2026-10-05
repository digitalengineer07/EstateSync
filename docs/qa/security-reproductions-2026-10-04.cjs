// Isolated in-memory demonstrations; no environment loading or database connections.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const results = [];
const writes = [];
const db = new Proxy({}, { get: (_, model) => new Proxy({}, { get: (_, operation) => async args => {
  if (operation === 'create') { writes.push({model, data:args.data}); return {id:'audit-row',...args.data}; }
  if (operation === 'findMany') return [];
  throw Error('Unexpected database operation blocked');
} }) });
const load = Module._load;
Module._load = function(id,parent,...rest) { if(id.endsWith('/config/db')) return db; return load.call(this,id,parent,...rest); };
const response = () => ({ statusCode:200, status(n){this.statusCode=n;return this;}, json(body){this.body=body;return this;} });
async function main() {
  const {createIdempotencyMiddleware} = require(path.join(root,'backend/src/middleware/idempotencyMiddleware'));
  const middleware = createIdempotencyMiddleware({idempotencyKey:{findUnique:async()=>null,create:async()=>({})}});
  const req={headers:{'idempotency-key':'same-key'},user:{userId:'audit-user'},method:'POST',originalUrl:'/api/v1/expenses'};
  let executed=0;
  await Promise.all([middleware(req,response(),()=>executed++),middleware(req,response(),()=>executed++)]);
  assert.equal(executed,2);
  results.push({finding:'Concurrent identical idempotency keys both enter the mutation',executed});
  const notes=require(path.join(root,'backend/src/controller/noteController'));
  const noteRes=response();
  await notes.createNote({body:{title:'Audit',amount:'garbage',noteDate:'not-a-date',category:'ARBITRARY_CATEGORY'},user:{userId:'audit-user',role:'ADMIN'},headers:{}},noteRes);
  assert.equal(noteRes.statusCode,201);
  assert.equal(noteRes.body.note.amount,0);
  results.push({finding:'Invalid note input accepted as successful creation',status:noteRes.statusCode,amount:noteRes.body.note.amount,category:noteRes.body.note.category,dateReplacedWithValidDate:!Number.isNaN(noteRes.body.note.noteDate.getTime())});
  const funds=require(path.join(root,'backend/src/controller/fundRequestController'));
  const fundRes=response();
  await funds.createRequest({body:{amount:'100garbage',reason:' ',managerId:'audit-user',fundMode:'INVALID'},user:{userId:'audit-user',email:'audit@example.invalid'},headers:{}},fundRes);
  assert.equal(fundRes.statusCode,201);
  results.push({finding:'Fund request accepts numeric prefix, blank reason, self manager and invalid mode',status:fundRes.statusCode,data:fundRes.body.fundRequest});
  fs.writeFileSync(path.join(root,'docs/qa/security-audit-2026-10-04/reproductions.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
