const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { fail } = require('./policy');

// Provider contract: put, read, exists, removeUnclaimed, list. Keys are opaque and
// generated here, never by callers. No signed/public URL is returned by this provider.
class PrivateLocalStorage {
  constructor(root = process.env.DOCUMENT_STORAGE_PATH) {
    if (!root && (process.env.NODE_ENV === 'production' || process.env.PASSENGER_APP_ENV)) throw fail(503, 'Private document storage is not configured.');
    if (root && !path.isAbsolute(root)) throw fail(503, 'Private document storage requires an absolute path.');
    this.root = path.resolve(root || path.join(__dirname, '../../../private-documents'));
    if (/(^|[\\/])(public|public_html|static|frontend|hbuilds)([\\/]|$)/i.test(this.root)) throw fail(503, 'Document storage must be outside public and deployment directories.');
  }
  location(key) {
    if (!/^[0-9a-f-]{36}\.bin$/.test(key)) throw fail(400, 'Invalid storage identifier.');
    return path.join(this.root, key);
  }
  async put(buffer) {
    await fs.mkdir(this.root, { recursive: true, mode: 0o700 });
    const key = `${crypto.randomUUID()}.bin`;
    await fs.writeFile(this.location(key), buffer, { flag: 'wx', mode: 0o600 });
    return key;
  }
  async read(key) {
    try {
      const location = this.location(key);
      const stat = await fs.lstat(location);
      if (!stat.isFile() || stat.isSymbolicLink()) throw Error('Invalid object');
      return await fs.readFile(location);
    } catch { throw fail(503, 'Document content is temporarily unavailable. Contact support.'); }
  }
  async exists(key) { try { const s = await fs.lstat(this.location(key)); return s.isFile() && !s.isSymbolicLink(); } catch { return false; } }
  async removeUnclaimed(key) { await fs.unlink(this.location(key)).catch(e => { if (e.code !== 'ENOENT') throw e; }); }
  async list() {
    await fs.mkdir(this.root, { recursive: true, mode: 0o700 });
    const entries = await fs.readdir(this.root);
    const result = [];
    for (const key of entries.filter(k => /^[0-9a-f-]{36}\.bin$/.test(k))) {
      const stat = await fs.lstat(this.location(key));
      if (stat.isFile() && !stat.isSymbolicLink()) result.push({ key, modifiedAt: stat.mtime });
    }
    return result;
  }
}
let instance;
const storage = () => instance ||= process.env.DOCUMENT_STORAGE_PROVIDER === 's3'
  ? new (require('./s3').PrivateS3Storage)()
  : process.env.DOCUMENT_STORAGE_PROVIDER === undefined || process.env.DOCUMENT_STORAGE_PROVIDER === 'local'
    ? new PrivateLocalStorage()
    : (() => { throw fail(503, 'Unknown private document storage provider.'); })();
// Optional scanner adapter must export async scan(buffer, metadata) and reject on
// malware or scanner failure. No shell commands or paths come from uploaded data.
async function scan(buffer, metadata) {
  if (process.env.DOCUMENT_SCANNER_PROVIDER === 'clamav' || process.env.DOCUMENT_SCANNER_MODULE) {
    const adapter = process.env.DOCUMENT_SCANNER_PROVIDER === 'clamav'
      ? require('./clamav')
      : require(path.resolve(process.env.DOCUMENT_SCANNER_MODULE));
    const clean = await adapter.scan(buffer, metadata);
    if (clean !== true) throw fail(400, 'Document did not pass the security scan.');
  } else if (process.env.DOCUMENT_SCANNER_REQUIRED === 'true' || process.env.NODE_ENV === 'production' || process.env.PASSENGER_APP_ENV) throw fail(503, 'Document security scanner is not configured.');
}
module.exports = { PrivateLocalStorage, storage, scan };
