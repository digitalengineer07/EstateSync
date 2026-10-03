const net = require('node:net');
const { fail } = require('./policy');

const DEFAULT_PORT = 3310;
const DEFAULT_TIMEOUT_MS = 15000;
const CHUNK_BYTES = 64 * 1024;

function endpoint(env = process.env) {
  const host = env.DOCUMENT_CLAMAV_HOST || '127.0.0.1';
  const port = Number(env.DOCUMENT_CLAMAV_PORT || DEFAULT_PORT);
  const timeout = Number(env.DOCUMENT_CLAMAV_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  if (!host || /[\s\0]/.test(host) || !Number.isInteger(port) || port < 1 || port > 65535 || !Number.isInteger(timeout) || timeout < 1000 || timeout > 120000) {
    throw fail(503, 'Document security scanner configuration is invalid.');
  }
  return { host, port, timeout };
}

function command(payload, config = endpoint()) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: config.host, port: config.port });
    let reply = Buffer.alloc(0);
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error); else resolve(value);
    };
    socket.setTimeout(config.timeout, () => finish(fail(503, 'Document security scanner timed out.')));
    socket.on('error', () => finish(fail(503, 'Document security scanner is unavailable.')));
    socket.on('close', () => { if (!settled) finish(fail(503, 'Document security scanner returned no result.')); });
    socket.on('data', chunk => {
      if (reply.length + chunk.length > 4096) return finish(fail(503, 'Document security scanner returned an invalid result.'));
      reply = Buffer.concat([reply, chunk]);
      const terminator = reply.indexOf(0);
      if (terminator !== -1) finish(null, reply.subarray(0, terminator).toString('utf8'));
    });
    socket.on('connect', async () => {
      try {
        for (const part of payload) {
          if (!socket.write(part)) await new Promise((resolveDrain, rejectDrain) => {
            socket.once('drain', resolveDrain);
            socket.once('close', () => rejectDrain(Error('Scanner connection closed')));
          });
        }
      } catch { finish(fail(503, 'Document security scanner is unavailable.')); }
    });
  });
}

async function ping() {
  const reply = await command([Buffer.from('zPING\0')]);
  if (reply !== 'PONG') throw fail(503, 'Document security scanner health check failed.');
  return true;
}

async function scan(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw fail(400, 'Document content is empty.');
  const payload = [Buffer.from('zINSTREAM\0')];
  for (let offset = 0; offset < buffer.length; offset += CHUNK_BYTES) {
    const chunk = buffer.subarray(offset, Math.min(offset + CHUNK_BYTES, buffer.length));
    const length = Buffer.alloc(4);
    length.writeUInt32BE(chunk.length);
    payload.push(length, chunk);
  }
  payload.push(Buffer.alloc(4));
  const reply = await command(payload);
  if (reply === 'stream: OK') return true;
  if (/^stream: .+ FOUND$/.test(reply)) throw fail(400, 'Document did not pass the security scan.');
  throw fail(503, 'Document security scanner could not complete the scan.');
}

module.exports = { endpoint, ping, scan };
