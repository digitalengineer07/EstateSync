const { Client } = require('pg');
const fs = require('node:fs/promises');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runConcurrentLoad(base, env, dataset, workflowError) {
  if (new URL(base).hostname !== '127.0.0.1' || !env.DOCUMENT_TEST_DATABASE_URL || env.DATABASE_URL !== env.DOCUMENT_TEST_DATABASE_URL) throw Error('Disposable loopback server required');
  const number = (key, fallback, min, max) => {
    const n = Number(env[key] || fallback);
    if (!Number.isInteger(n) || n < min || n > max) throw Error(`Invalid ${key}`);
    return n;
  };
  const users = number('LOAD_USERS',1000,1,1000);
  const rampSeconds = number('LOAD_RAMP_SECONDS',30,1,300);
  const holdSeconds = number('LOAD_HOLD_SECONDS',60,1,1800);
  const thinkMs = number('LOAD_THINK_MS',3000,100,60000);
  const stages = [...new Set([50,100,250,500,users].filter(n=>n<=users))].sort((a,b)=>a-b);
  const routes = ['/dashboard/admin','/customers?page=1&limit=25','/customers/load-c-1','/accounts','/journals?page=1&limit=25','/audit?limit=25','/notes?page=1&limit=25','/notes/stats','/search?q=load','/documents/summary'];
  const db = new Client({connectionString:env.DATABASE_URL});
  await db.connect();
  try {
    await db.query(`INSERT INTO "User" (id,name,email,"passwordHash","roleId","updatedAt")
      SELECT gen_random_uuid()::text,'Load user '||n,'load-vu-'||n||'@estatesync.local',u."passwordHash",u."roleId",now()
      FROM generate_series(1,$1::int) n CROSS JOIN "User" u WHERE u.email='admin@estatesync.local'`,[users]);
  } finally { await db.end(); }
  const stats = new Map(), stageResults = [], workers = [];
  let stop=false, stopReason=null, total=0, failures=0, rateLimited=0, authenticated=0, active=0, peakActive=0, inFlight=0, peakInFlight=0, requestsInWindow=0, failedInWindow=0;
  const startedAt = new Date().toISOString(), started=performance.now();
  let paused = false, phaseStats = null;
  const percentile=(hist,p,count)=>{let sum=0;for(let i=0;i<hist.length;i++){sum+=hist[i];if(sum>=Math.ceil(count*p))return i;}return null;};
  const summarize = map => [...map.values()].map(({histogram,...s})=>({...s,meanMs:Math.round(s.totalMs/s.requests),p95Ms:percentile(histogram,.95,s.requests),p99Ms:percentile(histogram,.99,s.requests)}));
  function addSample(map, route, status, bytes, ms, error) {
    if (!map.has(route)) map.set(route,{route,requests:0,failures:0,rateLimited:0,timeouts:0,maxBytes:0,totalMs:0,statusCounts:{},errorCounts:{},histogram:new Uint32Array(30002)});
    const s=map.get(route);s.requests++;s.totalMs+=ms;s.maxBytes=Math.max(s.maxBytes,bytes);s.histogram[Math.min(30001,Math.ceil(ms))]++;
    const statusKey=status===null?'NO_RESPONSE':String(status);
    s.statusCounts[statusKey]=(s.statusCounts[statusKey]||0)+1;
    if(error) {
      const errorKey=String(error.cause?.code||error.name||'UnknownError');
      s.errorCounts[errorKey]=(s.errorCounts[errorKey]||0)+1;
    }
    if(error || status!==200) s.failures++;
    if(status===429) s.rateLimited++;
    if(error?.name==='TimeoutError') s.timeouts++;
  }
  function record(route, status, bytes, ms, error, bucket) {
    addSample(stats,route,status,bytes,ms,error);
    if(bucket) addSample(bucket,route,status,bytes,ms,error);
    total++;requestsInWindow++;
    if(error || status!==200) {failures++;failedInWindow++;}
    if(status===429) rateLimited++;
  }

  async function request(id, route, token, credentials) {
    const bucket=phaseStats;
    const start=performance.now(); let status=null,bytes=0,body='',error=null;
    inFlight++;peakInFlight=Math.max(peakInFlight,inFlight);
    try {
      const response=await fetch(base+'/api/v1'+route,{method:credentials?'POST':'GET',headers:{'Content-Type':'application/json',
        // Only used against the disposable server with trust-proxy=1. Never sent externally.
        'X-Forwarded-For':`10.254.${Math.floor(id/250)}.${id%250+1}`,
        ...(token?{Authorization:'Bearer '+token}:{})},
        ...(credentials?{body:JSON.stringify(credentials)}:{}),signal:AbortSignal.timeout(30000)});
      status=response.status;
      for await(const chunk of response.body) {
        bytes+=chunk.length;
        if(bytes>2*1024*1024) throw Error('Response exceeds 2 MiB');
        if(credentials) body+=Buffer.from(chunk).toString();
      }
      if(!response.headers.get('content-type')?.includes('application/json')) throw Error('Expected JSON response');
      if(credentials) {
        const parsed=JSON.parse(body);
        if(!parsed.accessToken) throw Error('Login did not return an access token');
        return parsed.accessToken;
      }
    } catch(e) { error=e; } finally { inFlight--;record(route,status,bytes,performance.now()-start,error,bucket); }
    return null;
  }
  async function worker(id) {
    const token=await request(id,'/auth/login',null,{email:`load-vu-${id}@estatesync.local`,password:env.TEST_USER_PASSWORD||'password123'});
    if(!token) return;
    authenticated++;active++;peakActive=Math.max(peakActive,active);
    try {
      let i=id;
      while(!stop) {
        if(paused) { await sleep(50); continue; }
        await request(id,routes[i++%routes.length],token);
        if(!stop) await sleep(thinkMs*(0.5+Math.random()));
      }
    } finally { active--; }
  }
  const monitor=setInterval(()=>{
    console.log(`Active users ${active}/${users}, in-flight ${inFlight}, requests ${total}, failures ${failures}, 429 ${rateLimited}`);
    if(requestsInWindow>=100 && failedInWindow/requestsInWindow>0.1) {stop=true;stopReason='More than 10% failures in a monitoring window';}
    requestsInWindow=0;failedInWindow=0;
  },10000);
  try {
    for(const target of stages) {
      if(stop) break;
      const initial=workers.length;
      const rampStats = new Map(), steadyStats = new Map();
      phaseStats = rampStats; paused = false;
      const rampStart = performance.now();
      console.log(`Ramp to ${target} users over ${rampSeconds}s, hold ${holdSeconds}s`);
      for(let id=initial+1;id<=target&&!stop;id++) {
        workers.push(worker(id));
        await sleep(rampSeconds*1000/(target-initial));
      }
      const loginDeadline=performance.now()+30000;
      while(!stop && active<target && performance.now()<loginDeadline) await sleep(250);
      if(active<target && !stop) {stop=true;stopReason=`Could not authenticate ${target} active users within the stage deadline`;}
      // Drain ramp requests before starting the steady window; no sample spans stages.
      paused = true;
      while(inFlight) await sleep(50);
      const rampDuration = (performance.now()-rampStart)/1000;
      phaseStats = steadyStats;
      const steadyStart=performance.now();
      paused = false;
      const end=steadyStart+holdSeconds*1000;
      while(!stop&&performance.now()<end) await sleep(250);
      paused = true;
      const measurementSeconds=(performance.now()-steadyStart)/1000;
      // Finish requests launched in this hold before starting the next ramp.
      while(inFlight) await sleep(50);
      const drainSeconds=(performance.now()-steadyStart)/1000-measurementSeconds;
      const steady=summarize(steadyStats), ramp=summarize(rampStats);
      const requests=steady.reduce((n,s)=>n+s.requests,0), errors=steady.reduce((n,s)=>n+s.failures,0);
      const worst=steady.reduce((a,s)=>!a||s.p95Ms>a.p95Ms?s:a,null);
      const enoughSamples=routes.every(route=>steady.some(s=>s.route===route&&s.requests>=20));
      const passed=!stopReason&&active===target&&measurementSeconds>=holdSeconds&&enoughSamples&&errors/Math.max(1,requests)<0.01&&steady.every(s=>s.p95Ms<2000);
      stageResults.push({target,activeAtEnd:active,passed,enoughSamples,requests,failures:errors,measurementSeconds,drainSeconds,
        requestsPerSecond:requests/(measurementSeconds+drainSeconds),worstP95Ms:worst?.p95Ms??null,worstRoute:worst?.route??null,
        ramp:{seconds:rampDuration,summary:ramp},steady:{summary:steady}});
      console.log('STAGE RESULT '+JSON.stringify({users:target,passed,requests,failures:errors,worstP95Ms:worst?.p95Ms,worstRoute:worst?.route}));
    }
  } finally {stop=true;clearInterval(monitor);await Promise.allSettled(workers);}
  const summary=summarize(stats);
  const elapsedSeconds=(performance.now()-started)/1000;
  const passed=!workflowError&&!stopReason&&authenticated===users&&peakActive===users&&failures/Math.max(total,1)<0.01&&stageResults.length===stages.length&&stageResults.every(s=>s.passed);
  const report={startedAt,finishedAt:new Date().toISOString(),dataset,requestedUsers:users,authenticated,peakActive,peakInFlight,total,failures,rateLimited,elapsedSeconds,requestsPerSecond:total/elapsedSeconds,passed,stopReason,workflowError,stages:stageResults,summary,highestPassingStage:Math.max(0,...stageResults.filter(s=>s.passed).map(s=>s.target)),thresholds:{steadyRouteP95Ms:2000,failureRate:0.01,minSamplesPerRoute:20},
    limitations:['Local client/server/database share hardware. Not production capacity.','Read-heavy ADMIN workload only. Distinct accounts and sessions; synthetic proxy client IPs.','Reads validate status/content type/size, not JSON semantics; functional suite runs first.','Rate limits stay enabled. Timeouts may leave server-side queries running.','No 1000-user financial-write or browser-rendering test.']};
  const directory=path.resolve(__dirname,'../../docs/qa/load-tests');await fs.mkdir(directory,{recursive:true});
  const file=path.join(directory,'concurrent-'+startedAt.replace(/[:.]/g,'-')+'.json');await fs.writeFile(file,JSON.stringify(report,null,2));
  console.table(summary);console.log('Report:',file);
  if(!passed) throw Error('Concurrent load criteria failed; inspect the JSON report');
}
module.exports={runConcurrentLoad};
