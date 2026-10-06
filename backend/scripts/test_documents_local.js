// Start only a dedicated temporary PostgreSQL cluster. Never reads DATABASE_URL
// from .env and never drops databases on an existing server.
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { Client } = require('pg');
const crypto = require('node:crypto');
const run = (file, args, options = {}) => new Promise((resolve, reject) => {
  const { live = false, ...spawnOptions } = options;
  const child = spawn(file, args, { windowsHide: true, ...spawnOptions }); let output = '', diagnostics = '';
  child.stdout?.on('data', data => { output += data; if (live) process.stdout.write(data); }); child.stderr?.on('data', data => { diagnostics += data; if (live) process.stderr.write(data); });
  // pg_ctl's detached server inherits handles on Windows; 'close' can wait forever.
  child.on('error', reject); child.on('exit', code => code === 0 ? resolve(output) : reject(new Error(output + diagnostics || `Command exited ${code}`)));
});
async function main() {
  const performanceTest = process.argv.includes('--performance');
  const loadTest = process.argv.includes('--load') || performanceTest;
  if (loadTest) {
    const count = Number(process.env.LOAD_RECORDS || 10000);
    if (!Number.isSafeInteger(count) || count < 10 || count > 10000000 || count % 10) throw Error('LOAD_RECORDS must be a multiple of 10, between 10 and 10000000');
    if (count >= 1000000 && process.env.LOAD_LARGE_DATASET !== 'YES') throw Error('Set LOAD_LARGE_DATASET=YES for large datasets');
  }
  const bin = process.env.DOCUMENT_TEST_POSTGRES_BIN;
  if (!bin) throw Error('Set DOCUMENT_TEST_POSTGRES_BIN to a local PostgreSQL bin directory.');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'estatesync-doc-pg-'));
  const port = await new Promise(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const n = server.address().port; server.close(() => resolve(n)); }); });
  const ext = process.platform === 'win32' ? '.exe' : '';
  const pgctl = path.join(bin, `pg_ctl${ext}`), initdb = path.join(bin, `initdb${ext}`);
  const data = path.join(root, 'cluster');
  let started = false;
  try {
    await run(initdb, ['-D', data, '-U', 'documents_test', '-A', 'trust', '--locale=C', '--encoding=UTF8']);
    await run(pgctl, ['-D', data, '-l', path.join(root, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start']); started = true;
    const url = `postgresql://documents_test@127.0.0.1:${port}/postgres?connection_limit=5`;
    // Prisma's binary client waits for its INFO-level startup handshake.
    // An inherited RUST_LOG=warn suppresses that handshake and hangs startup.
    const env = { ...process.env, RUST_LOG: 'info', DATABASE_URL: url, DOCUMENT_TEST_DATABASE_URL: url, DOCUMENT_STORAGE_PATH: path.join(root, 'files'), NODE_ENV: 'test', JWT_SECRET: crypto.randomBytes(32).toString('hex'), DOCUMENT_EXPENSE_RECEIPT_REQUIRED: 'true' };
    const client = new Client({ connectionString: url }); await client.connect();
    try {
      const sql = await run(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { cwd: path.join(__dirname, '..'), env });
      // Establish the old financial schema, then apply the actual shipped upgrade.
      const baseline = sql.split(';').filter(statement => !/"(TransactionDocument|DocumentUpload|DocumentException|AuthSession)"/.test(statement)).filter(statement => !performanceTest || !/CREATE INDEX "(Customer_createdAt_id_idx|Customer_salesOwnerId_createdAt_id_idx|CustomerPayment_customerId_dateOfPayment_idx)"/.test(statement)).join(';');
      await client.query(baseline);
      await client.query(await fs.readFile(path.join(__dirname, '../prisma/upgrades/20260930_transaction_documents.sql'), 'utf8'));
      console.log('Additive document migration applied to isolated PostgreSQL successfully.');
    } finally { await client.end(); }
    const suites = process.argv.includes('--security') ? ['test/security.integration.test.js'] : ['test/documents.unit.test.js', 'test/documents.integration.test.js'];
    await run(process.execPath, ['--test', '--test-timeout=120000', ...suites], { cwd: path.join(__dirname, '..'), env, live: true });
    if (process.argv.includes('--regression') || loadTest) {
      await run(process.execPath, ['prisma/seed.js'], { cwd: path.join(__dirname, '..'), env });
      const dataset = loadTest ? await require('./load_dataset').seedLoadDataset(env) : null;
      if (performanceTest) await run(process.execPath, ['scripts/profile_reads.js'], { cwd: path.join(__dirname, '..'), env, live: true });
      if (performanceTest && process.argv.includes('--profile-only')) return;
      const apiPort = await new Promise(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const n = s.address().port; s.close(() => resolve(n)); }); });
      const apiUrl = `http://127.0.0.1:${apiPort}`;
      const appEnv = { ...env, PORT: String(apiPort), API_BASE_URL: apiUrl, RENDER_EXTERNAL_URL: apiUrl, FRONTEND_URL: '', JWT_REFRESH_SECRET: crypto.randomBytes(32).toString('hex') };
      const app = spawn(process.execPath, ['src/app.js'], { cwd: path.join(__dirname, '..'), env: appEnv, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
      app.stderr.on('data', data => process.stderr.write(data));
      try {
        let ready = false;
        for (let attempt = 0; attempt < 60; attempt++) {
          try { ready = (await fetch(apiUrl, { signal: AbortSignal.timeout(1000) })).ok; } catch { /* Wait for only this new local server. */ }
          if (ready) break;
          await new Promise(resolve => setTimeout(resolve, 250));
        }
        if (!ready) throw Error('Isolated regression API did not start.');
        let workflowError = null;
        try {
          await run(process.execPath, ['scripts/github_action_validation_suite.js'], { cwd: path.join(__dirname, '..'), env: appEnv, live: true });
        } catch (error) {
          if (!loadTest) throw error;
          workflowError = error.message;
        }
        if (loadTest) {
          if (process.argv.includes('--concurrent')) await require('./load_concurrent').runConcurrentLoad(apiUrl, appEnv, dataset, workflowError);
          else await require('./load_probe').runLoadProbe(apiUrl, appEnv, dataset, workflowError);
        }
      } finally { app.kill(); }
    }
  } finally {
    if (started) await run(pgctl, ['-D', data, '-m', 'fast', '-w', 'stop']);
    // Only this mkdtemp-owned directory can be removed by the runner.
    if (root.startsWith(path.join(os.tmpdir(), 'estatesync-doc-pg-'))) await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 });
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
