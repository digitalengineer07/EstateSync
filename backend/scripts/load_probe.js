const fs = require('node:fs/promises');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

// One request in flight: one active ADMIN session, not simultaneous virtual users.
async function runLoadProbe(base, env, dataset, workflowError) {
  const host = new URL(base);
  if (host.hostname !== '127.0.0.1' || env.DATABASE_URL !== env.DOCUMENT_TEST_DATABASE_URL) throw Error('Only isolated loopback tests are allowed');
  const rounds = Number(env.LOAD_ROUNDS || 5), pause = Number(env.LOAD_PAUSE_MS || 1000);
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 100 || !Number.isFinite(pause) || pause < 0 || pause > 60000) throw Error('Invalid load rounds or pause');
  const endpoints = [
    '/dashboard/admin','/dashboard/accounting','/dashboard/manager','/dashboard/wallet',
    '/customers?page=1&limit=25','/customers/load-c-1','/properties?page=1&limit=25',
    '/accounts','/journals?page=1&limit=25','/audit?page=1&limit=25',
    '/transactions/all?page=1&limit=25','/treasury/inflows','/treasury/cashflow',
    '/expenses/categories','/expenses/all','/fund-requests/all','/users/all',
    '/employees?page=1&limit=25','/employees/salary/summary','/accounting/periods',
    '/billing/plans','/billing/demands','/billing/customers/load-c-1/statement',
    '/billing/aging','/billing/reconciliation','/notes?page=1&limit=25','/notes/stats',
    '/notifications','/search?q=load','/documents/summary','/documents/review?page=1',
  ];
  const samples = []; let token, cookie, refreshToken;
  async function request(route, options = {}) {
    const start = performance.now(); let status = null, bytes = 0;
    try {
      const response = await fetch(base+'/api/v1'+route, { ...options, headers: { 'Content-Type':'application/json', ...(token ? { Authorization:'Bearer '+token } : {}), ...(cookie ? { Cookie:cookie } : {}) }, signal: AbortSignal.timeout(30000) });
      status = response.status;
      const sessionCookie = response.headers.get('set-cookie');
      if (sessionCookie) cookie = sessionCookie.split(';')[0];
      const chunks = [];
      for await (const chunk of response.body) {
        bytes += chunk.length;
        if (bytes > 20 * 1024 * 1024) { throw Error('Response exceeds 20 MiB: likely unbounded endpoint'); }
        chunks.push(Buffer.from(chunk));
      }
      const body = JSON.parse(Buffer.concat(chunks).toString());
      if (!response.ok || body.success === false) throw Error('HTTP '+status);
      samples.push({ route, status, bytes, ms: performance.now()-start, ok:true });
      return body;
    } catch (error) {
      samples.push({ route, status, bytes, ms:performance.now()-start, ok:false, error:error.message });
      return null;
    }
  }
  const startedAt = new Date().toISOString();
  const login = await request('/auth/login', { method:'POST', body:JSON.stringify({ email:'admin@estatesync.local', password:env.TEST_USER_PASSWORD || 'password123' }) });
  token = login?.accessToken;
  refreshToken = login?.refreshToken;
  if (token) for (let round=0;round<rounds;round++) {
    if (round > 0) {
      const refreshed = await request('/auth/refresh', { method:'POST', body:JSON.stringify({ token:refreshToken }) });
      if (!refreshed?.accessToken) break;
      token = refreshed.accessToken; refreshToken = refreshed.refreshToken;
    }
    for (const endpoint of endpoints) {
      await request(endpoint);
      await new Promise(resolve=>setTimeout(resolve,pause));
    }
    console.log(`Read pass ${round+1}/${rounds} complete`);
    if (samples.slice(-endpoints.length).filter(s=>!s.ok).length >= 5) { console.log('Stopping after 5 or more failures in one pass.'); break; }
  }
  if (token) await request('/auth/logout', { method:'POST', body:'{}' });
  const percentile = (values,p) => values.sort((a,b)=>a-b)[Math.max(0,Math.ceil(values.length*p)-1)];
  const summary = [...new Set(samples.map(s=>s.route))].map(route => {
    const rows=samples.filter(s=>s.route===route);
    return { route, requests:rows.length, failures:rows.filter(s=>!s.ok).length, p95Ms:Math.round(percentile(rows.map(s=>s.ms),.95)), maxBytes:Math.max(...rows.map(s=>s.bytes)) };
  });
  const failures=samples.filter(s=>!s.ok).length;
  const passed=Boolean(token)&&!workflowError&&!failures&&summary.every(s=>s.p95Ms<2000);
  const report={ startedAt, finishedAt:new Date().toISOString(), concurrency:1, dataset, requestedRounds:rounds, passed, workflowError, thresholds:{unexpectedFailures:0,p95Ms:2000}, summary, samples,
    limitations:['Local host capacity, not production hosting capacity.','Synthetic rows are not ten million complete business transactions.','Existing workflows cover several roles sequentially; reads use one admin session.','No exhaustive role matrix, browser rendering, external storage or payroll workflow coverage.','Large responses and timeouts are failures, not successful throughput.'] };
  const directory=path.resolve(__dirname,'../../docs/qa/load-tests'); await fs.mkdir(directory,{recursive:true});
  const file=path.join(directory,startedAt.replace(/[:.]/g,'-')+'.json');
  await fs.writeFile(file,JSON.stringify(report,null,2));
  console.table(summary); console.log('Report:',file);
  if (!passed) throw Error('Load test thresholds or workflows failed; inspect the report.');
}
module.exports={runLoadProbe};
