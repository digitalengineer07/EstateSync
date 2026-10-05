const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const dir = path.join(root,'docs/qa/security-audit-2026-10-04');
const read = f => JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));
const inventory = read('static-inventory.json');
const probes = read('anonymous-route-probes.json');
const faults = read('authenticated-failure-probes.json');
const tracked = cp.execFileSync('git',['ls-files'],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
const code = tracked.filter(f=>/\.(js|cjs|mjs|ts|tsx|jsx)$/.test(f));
const sources = code.map(f=>({file:f,text:fs.readFileSync(path.join(root,f),'utf8')}));
const esc = s => String(s??'').replaceAll('|','\\|').replaceAll('\n',' ');
const link = (f,l) => `[${f}${l?':'+l:''}](../../../${f}${l?'#L'+l:''})`;
const csv = (name,rows) => { const keys=Object.keys(rows[0]||{}); fs.writeFileSync(path.join(dir,name),[keys,...rows.map(r=>keys.map(k=>r[k]))].map(row=>row.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(',')).join('\n')); };
csv('functions.csv',inventory.functions);
csv('loops.csv',inventory.loops);
csv('queries.csv',inventory.queries);
const routes = probes.results.filter(r=>r.method).map(r=> {
 const fault=faults.find(f=>f.method===r.method&&f.path===r.path);
 return {method:r.method,path:r.path,anonymousStatus:r.status,anonymousDbCalls:r.dbCalls.join(';'),faultProbeStatus:fault?.status??'not run',internalErrorLeaked:fault?.leaksInternalError??false,handlers:r.handlers.join(';')};
});
csv('endpoints.csv',routes);
const bindings=[];
for(const file of ['unused-bindings.json','frontend-lint.json']) for(const entry of read(file)) for(const m of entry.messages) {
 if(!/no-unused-vars$/.test(m.ruleId||'')) continue;
 const name=m.message.match(/^'([^']+)'/)?.[1]||'';
 if(bindings.some(x=>x.file===entry.file&&x.line===m.line&&x.name===name)) continue;
 const source=fs.readFileSync(path.join(root,entry.file),'utf8').split(/\r?\n/);
 const context=source.slice(Math.max(0,m.line-8),m.line+1).join('\n');
 let action='Review binding only; preserve initializer side effects and callback argument positions.';
 if(/import\b/.test(context)&&/from\s+["']/.test(context)) action='Unused import candidate; remove specifier only after checking module side effects.';
 if(['req','res','next','promise'].includes(name)) action='KEEP positional callback signature; error middleware must retain four arguments.';
 if(['updatedWallet','updatedTreasuryWallet'].includes(name)) action='Remove assignment binding only; KEEP awaited database write.';
 if(['userRole','actorId','transactionDate','notes','isTaxable','employeeCode','isAdmin','error'].includes(name)) action='Investigate missing behavior first; do not automatically delete.';
 if(['e','err','parseErr','lockErr'].includes(name)) action='Catch binding may be optional; review swallowed error before deleting.';
 bindings.push({file:entry.file,line:m.line,name,action});
}
csv('unused-bindings.csv',bindings);
const ts=require(path.join(root,'frontend/node_modules/typescript'));
const exportCandidates=[];
for(const s of sources.filter(s=>s.file.startsWith('backend/src/')||s.file.startsWith('frontend/src/'))) {
 const sf=ts.createSourceFile(s.file,s.text,ts.ScriptTarget.Latest,true,/x$/.test(s.file)?ts.ScriptKind.TSX:ts.ScriptKind.JS);
 const record=n=> { const name=n.getText(sf); if(!/^[A-Za-z_$][\w$]*$/.test(name)) return; const external=sources.filter(x=>x.file!==s.file&&new RegExp('\\b'+name+'\\b').test(x.text)).map(x=>x.file); if(!external.length) exportCandidates.push({file:s.file,line:sf.getLineAndCharacterOfPosition(n.getStart(sf)).line+1,name,classification:'No textual reference in other tracked code; inspect internal calls/dynamic use before removal'}); };
 for(const st of sf.statements) {
  if(st.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)&&!st.modifiers?.some(m=>m.kind===ts.SyntaxKind.DefaultKeyword)) {
   if(st.name) record(st.name);
   if(ts.isVariableStatement(st)) for(const d of st.declarationList.declarations) record(d.name);
  }
  if(ts.isExpressionStatement(st)&&ts.isBinaryExpression(st.expression)) {
   const e=st.expression;
   if(e.left.getText(sf)==='module.exports'&&ts.isObjectLiteralExpression(e.right)) for(const p of e.right.properties) if(p.name) record(p.name);
   else if(e.left.getText(sf).startsWith('exports.')&&ts.isPropertyAccessExpression(e.left)) record(e.left.name);
  }
 }
}
csv('export-review.csv',exportCandidates);
const assets=tracked.filter(f=>f.startsWith('frontend/public/')).filter(f=>!sources.some(s=>s.text.includes(f.slice('frontend/public'.length))||s.text.includes(path.basename(f))));
const cleanup=[
'# Cleanup review — new-features-branch, e6ffc3b',
'',
'Application files were not removed. The lists below separate runtime-empty files, unused bindings, and items that must be retained or investigated. Static analysis cannot guarantee every external integration or future dynamic import.',
'',
'## 26 runtime-empty placeholder files',
'',
'All contain only comments (no executable statements). No application imports were found. The route probe was rerun with imports of these files forced to throw, simulating their absence: application startup and all 102 registered method/path probes still completed. These are high-confidence runtime cleanup candidates. setup.js recreates them, and architecture documents mention some; update those references if deleting. A full frontend build and real-database regression suite were not run.',
'',...inventory.empty.map(f=>'- '+link(f)),
'','## All unused bindings detected','',
'This combines JSX-aware JavaScript lint with the configured frontend TypeScript lint. It is a review list, not an automatic deletion list. Do not delete entire declarations containing awaited writes or hooks. Removing the unused fourth parameter from Express error middleware breaks error dispatch.',
'','| File | Binding | Required treatment |','|---|---|---|',
...bindings.map(b=>`| ${link(b.file,b.line)} | ${esc(b.name)} | ${esc(b.action)} |`),
'','## Exported names with no references in other tracked code','',
'Internal calls can still require these functions. Framework entry points and configuration exports are not ordinary imports. Remove only an unused export if the function is used inside its defining module.',
'','| File | Export |','|---|---|',...exportCandidates.map(e=>`| ${link(e.file,e.line)} | ${e.name} |`),
'','## Public asset candidates','',
'No textual reference in tracked JS/TS was found for these assets. CSS references, metadata conventions, design references and external URLs must be checked before deleting. Public files may be externally linked.',
'',...assets.map(f=>'- '+link(f)),
'','## Retain or repair','',
'- backend/src/services/documents/permissions.js is used by the Prisma seed, permission sync scripts and integration tests. The application-only import graph falsely labels it unreferenced; KEEP it.',
'- invalidateUserAuthCache is a no-op compatibility export still imported/called by userController. Remove both export and call/import together only after confirming integrations; fixing session revocation is higher priority.',
'- financialMutationLimiter is exported but not applied by routes. Wire it into mutations; deleting it would abandon the intended safeguard.',
'- userRole in updateCustomer and actorId in assignPlanToCustomer indicate missing authorization/audit behavior. Repair those functions before cleanup.',
'- transactionDate in recordBankInflow is ignored despite being accepted. Honor it with validation; do not simply remove the input.',
'- Keep database writes assigned to unused updatedWallet/updatedTreasuryWallet variables.',
'- Keep Next.js page/layout/route exports, hooks, Prisma schema, upgrades, runtime @prisma/client and migrations.',
'- backend/src/generated and backend/src/prisma-client are generated local artifacts excluded from source counts. Current db.js imports @prisma/client. Do not delete generated runtimes without verifying deployment and generation settings.',
'- Tests, reset/repair/seed scripts, setup.js, design documents and backups are not unused just because no runtime module imports them. setup.js overwrites application files and must not be run against a working checkout. Destructive database scripts require an isolated test database.',
'','## Verification before applying cleanup','',
'Keep cleanup separate from authorization and accounting fixes. Remove one reviewed group at a time, regenerate Prisma if relevant, rerun startup/route probes, backend unit tests, frontend lint/build and tests, then perform role-based integration tests on an isolated PostgreSQL database. The local frontend test runner is currently missing; therefore a no-regression guarantee for all frontend deletions is not available.'
].join('\n');
fs.writeFileSync(path.join(dir,'CLEANUP.md'),cleanup);
fs.writeFileSync(path.join(dir,'ENDPOINTS.md'),['# Endpoint verification','',
'Local Express app, production mode, disposable JWT signing secrets, .env disabled, database replaced with a rejecting stub. No live mutations. 102 explicitly registered method/path combinations; implicit HEAD/OPTIONS and unmatched paths are not counted. 98 protected routes include password change; 97 other protected routes also received a synthetic ADMIN token and empty body/database-failure probe. A 400 in that probe means validation stopped the request before the database; it does not prove downstream outage handling. No credentialed successful business transaction was tested.','',
'| Method | Path | Anonymous | Authenticated failure/empty-body probe | Internal error exposed |','|---|---|---|---|---|',
...routes.map(r=>`| ${r.method} | ${r.path} | ${r.anonymousStatus} | ${r.faultProbeStatus} | ${r.internalErrorLeaked?'YES':'not observed'} |`),
'','## Additional parser/login probes','',...probes.results.filter(r=>r.name).map(r=>`- ${r.name}: HTTP ${r.status}; ${r.body}`)
].join('\n'));
console.log(JSON.stringify({bindings:bindings.length,exportCandidates,assetCandidates:assets,endpointCount:routes.length}));
