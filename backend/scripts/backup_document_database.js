// Create a private, restorable custom-format backup before document schema rollout.
require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const url = new URL(process.env.DATABASE_URL);
const bin = process.env.DOCUMENT_PG_BIN || '';
const executable = name => bin ? path.join(bin, process.platform === 'win32' ? `${name}.exe` : name) : name;
const backupDir = path.resolve(__dirname, '../backups');
fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
const output = path.join(backupDir, `before-documents-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`);
const env = {
  ...process.env,
  PGHOST: url.hostname,
  PGPORT: url.port || '5432',
  PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password),
  PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
  PGSSLMODE: 'verify-full',
  PGSSLROOTCERT: process.env.DOCUMENT_PG_CA_BUNDLE || 'system'
};

function run(name, args) {
  const result = spawnSync(executable(name), args, { env, stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8', timeout: 15 * 60 * 1000 });
  if (result.error || result.status !== 0) throw Error(`${name} failed: ${(result.stderr || result.error?.message || '').trim().slice(0, 500)}`);
}

async function main() {
  fs.closeSync(fs.openSync(output, 'wx', 0o600));
  run('pg_dump', ['--format=custom', '--no-owner', '--no-acl', '--file', output, '--no-password']);
  const marker = Buffer.alloc(5);
  const fd = fs.openSync(output, 'r');
  try { fs.readSync(fd, marker, 0, 5, 0); } finally { fs.closeSync(fd); }
  if (fs.statSync(output).size < 100 || marker.toString() !== 'PGDMP') throw Error('Backup archive is incomplete.');
  run('pg_restore', ['--list', output]);
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(output)) hash.update(chunk);
  const digest = hash.digest('hex');
  console.log(JSON.stringify({ backup: output, bytes: fs.statSync(output).size, sha256: digest, validatedBy: 'pg_restore --list' }));
}

main().catch(error => {
  console.error('Database backup failed:', error.message);
  process.exitCode = 1;
});
