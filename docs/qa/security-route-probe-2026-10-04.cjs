// Runs only on loopback with database access blocked. Never loads a .env file.
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const { EventEmitter } = require('node:events');
const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'docs/qa/security-audit-2026-10-04');
fs.mkdirSync(out, { recursive: true });
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = require('node:crypto').randomBytes(32).toString('hex');
process.env.JWT_REFRESH_SECRET = require('node:crypto').randomBytes(32).toString('hex');
process.env.CORS_ORIGIN = 'https://audit.invalid';
delete process.env.AUDIT_DB_ON_START;
delete process.env.PASSENGER_APP_ENV;
let dbCalls = [];
let authenticated = false;
const actor = { id: '00000000-0000-4000-8000-000000000002', name: 'Local audit', email: 'audit@example.invalid', isActive: true, role: { name: 'ADMIN', permissions: [] } };
const blocked = name => async () => { dbCalls.push(name); throw Error('AUDIT_DATABASE_BLOCKED'); };
const db = new Proxy({}, { get: (_, k) => String(k).startsWith('$') ? blocked(String(k)) : new Proxy({}, { get: (_, m) => authenticated && k === 'user' && m === 'findUnique' ? async () => actor : blocked(`${String(k)}.${String(m)}`) }) });
const load = Module._load;
const emptyCandidates = new Set(JSON.parse(fs.readFileSync(path.join(out, 'static-inventory.json'), 'utf8')).empty.map(f => path.resolve(root, f)));
Module._load = function(id, parent, ...rest) {
  if (id === 'dotenv') return { config() {} };
  if (id.endsWith('/config/db')) return db;
  if (id.startsWith('.') || path.isAbsolute(id)) {
    const resolved = Module._resolveFilename(id, parent);
    if (emptyCandidates.has(resolved)) throw Error(`CLEANUP_CANDIDATE_REQUIRED: ${resolved}`);
  }
  return load.call(this, id, parent, ...rest);
};
const express = require(path.join(root, 'backend/node_modules/express'));
const originalUse = express.application.use;
const originalListen = express.application.listen;
const mounts = [];
express.application.use = function(...args) {
  if (typeof args[0] === 'string' && args[1]?.stack) mounts.push({ prefix: args[0], router: args[1] });
  return originalUse.apply(this, args);
};
express.application.listen = () => new EventEmitter();
const app = require(path.join(root, 'backend/src/app'));
express.application.listen = originalListen;
app.listen = originalListen;
express.application.use = originalUse;
const routes = mounts.flatMap(({prefix,router}) => router.stack.filter(l=>l.route).flatMap(l=>Object.keys(l.route.methods).map(method=>({method:method.toUpperCase(),path:prefix+l.route.path,handlers:l.route.stack.map(s=>s.handle.name || '(anonymous)')}))));
routes.push({method:'GET',path:'/',handlers:['health']});
const server = app.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const results=[];
  try {
    for (const route of routes) {
      const url=route.path.replace(/:[A-Za-z]+/g,'00000000-0000-4000-8000-000000000001');
      const before=dbCalls.length;
      const response=await fetch(base+url,{method:route.method,headers:{'Content-Type':'application/json'},...(['GET','HEAD'].includes(route.method)?{}:{body:'{}'}),signal:AbortSignal.timeout(5000)});
      results.push({...route,status:response.status,body:(await response.text()).slice(0,600),dbCalls:dbCalls.slice(before)});
    }
    for(const [name,body,headers] of [
      ['malformed-json','{',{'Content-Type':'application/json'}],
      ['oversized-json',JSON.stringify({x:'a'.repeat(1024*1024)}),{'Content-Type':'application/json'}],
      ['missing-body',undefined,{}],
      ['wrong-email-type',JSON.stringify({email:{x:1},password:'audit'}),{'Content-Type':'application/json'}]
    ]) {
      const response=await fetch(base+'/api/v1/auth/login',{method:'POST',headers,body,signal:AbortSignal.timeout(5000)});
      results.push({name,path:'/api/v1/auth/login',status:response.status,body:(await response.text()).slice(0,600)});
    }
    for(const url of ['/test-db','/does-not-exist']) {
      const response=await fetch(base+url);results.push({path:url,status:response.status,body:(await response.text()).slice(0,300)});
    }
    fs.writeFileSync(path.join(out,'anonymous-route-probes.json'),JSON.stringify({routes:routes.length,results,dbCalls},null,2));
    console.log(JSON.stringify({routes:routes.length,statusCounts:results.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{}),dbCalls}));
    authenticated = true;
    const jwt = require(path.join(root, 'backend/node_modules/jsonwebtoken'));
    const token = jwt.sign({ userId: actor.id }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const authenticatedResults = [];
    for (const route of routes.filter(r => !r.path.startsWith('/api/v1/auth') && r.path !== '/')) {
      const url=route.path.replace(/:[A-Za-z]+/g,'00000000-0000-4000-8000-000000000001');
      const before=dbCalls.length;
      const response=await fetch(base+url,{method:route.method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},...(['GET','HEAD'].includes(route.method)?{}:{body:'{}'}),signal:AbortSignal.timeout(5000)});
      const body = (await response.text()).slice(0,2000);
      authenticatedResults.push({...route,status:response.status,body,dbCalls:dbCalls.slice(before),leaksInternalError:body.includes('AUDIT_DATABASE_BLOCKED')});
    }
    fs.writeFileSync(path.join(out,'authenticated-failure-probes.json'),JSON.stringify(authenticatedResults,null,2));
    console.log(JSON.stringify({authenticatedRoutes:authenticatedResults.length,internalErrorLeaks:authenticatedResults.filter(r=>r.leaksInternalError).length,statusCounts:authenticatedResults.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{})}));
  } catch(e) { console.error(e);process.exitCode=1; }
  finally {server.closeAllConnections();server.close();}
});
