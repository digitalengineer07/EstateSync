const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const sharp = require('sharp');
const { PDFDocument, PDFName } = require('pdf-lib');
const { validateFile } = require('../src/services/documents/files');
const P = require('../src/services/documents/policy');
const A = require('../src/services/documents/sources');
const { PrivateLocalStorage } = require('../src/services/documents/storage');
const clamav = require('../src/services/documents/clamav');
const { PrivateS3Storage } = require('../src/services/documents/s3');
const { Readable } = require('node:stream');
const png = () => sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).png().toBuffer();
test('accepts valid PNG and computes a deterministic SHA-256', async () => {
  const bytes = await png(); const a = await validateFile(bytes, 'receipt.png', 'image/png');
  const b = await validateFile(bytes, 'receipt.png', 'image/png');
  assert.equal(a.sha256.length, 64); assert.equal(a.sha256, b.sha256); assert.equal(a.fileSize, bytes.length);
});
for (const [format, mime] of [['jpeg', 'image/jpeg'], ['webp', 'image/webp']]) test(`accepts fully decoded ${format} evidence`, async () => {
  const buffer = await sharp(await png()).toFormat(format).toBuffer();
  assert.equal((await validateFile(buffer, `receipt.${format}`, mime)).mimeType, mime);
});
test('mandatory scanner configuration fails closed when unavailable', async () => {
  const required = process.env.DOCUMENT_SCANNER_REQUIRED, modulePath = process.env.DOCUMENT_SCANNER_MODULE;
  process.env.DOCUMENT_SCANNER_REQUIRED = 'true'; delete process.env.DOCUMENT_SCANNER_MODULE;
  try { await assert.rejects(require('../src/services/documents/storage').scan(await png(), {}), { statusCode: 503 }); }
  finally {
    if (required === undefined) delete process.env.DOCUMENT_SCANNER_REQUIRED; else process.env.DOCUMENT_SCANNER_REQUIRED = required;
    if (modulePath !== undefined) process.env.DOCUMENT_SCANNER_MODULE = modulePath;
  }
});
test('Passenger production uploads fail closed without a scanner', async () => {
  const passenger = process.env.PASSENGER_APP_ENV;
  process.env.PASSENGER_APP_ENV = 'production';
  try { await assert.rejects(require('../src/services/documents/storage').scan(await png(), {}), { statusCode: 503 }); }
  finally { if (passenger === undefined) delete process.env.PASSENGER_APP_ENV; else process.env.PASSENGER_APP_ENV = passenger; }
});
test('ClamAV INSTREAM scans bytes and rejects malware or scanner errors', async t => {
  let verdict = 'stream: OK';
  const server = net.createServer(socket => {
    let incoming = Buffer.alloc(0);
    socket.on('data', chunk => {
      incoming = Buffer.concat([incoming, chunk]);
      if (incoming.equals(Buffer.from('zPING\0'))) { socket.end(Buffer.from('PONG\0')); return; }
      if (!incoming.subarray(0, 10).equals(Buffer.from('zINSTREAM\0'))) return;
      let offset = 10;
      while (incoming.length >= offset + 4) {
        const length = incoming.readUInt32BE(offset); offset += 4;
        if (!length) { socket.end(Buffer.from(`${verdict}\0`)); return; }
        if (incoming.length < offset + length) return;
        offset += length;
      }
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const host = process.env.DOCUMENT_CLAMAV_HOST, port = process.env.DOCUMENT_CLAMAV_PORT;
  process.env.DOCUMENT_CLAMAV_HOST = '127.0.0.1';
  process.env.DOCUMENT_CLAMAV_PORT = String(server.address().port);
  try {
    assert.equal(await clamav.ping(), true);
    assert.equal(await clamav.scan(await png()), true);
    verdict = 'stream: Eicar-Signature FOUND';
    await assert.rejects(clamav.scan(await png()), { statusCode: 400 });
    verdict = 'stream: scan failed ERROR';
    await assert.rejects(clamav.scan(await png()), { statusCode: 503 });
  } finally {
    if (host === undefined) delete process.env.DOCUMENT_CLAMAV_HOST; else process.env.DOCUMENT_CLAMAV_HOST = host;
    if (port === undefined) delete process.env.DOCUMENT_CLAMAV_PORT; else process.env.DOCUMENT_CLAMAV_PORT = port;
  }
});
for (const [name, mime] of [['bill.exe', 'image/png'], ['bill.svg', 'image/svg+xml'], ['bill.png', 'image/jpeg'], ['../bill.png', 'image/png'], ['bill\n.png', 'image/png']]) test(`rejects invalid filename/type ${JSON.stringify(name)}`, async () => assert.rejects(validateFile(await png(), name, mime), { statusCode: 400 }));
test('rejects empty files', async () => assert.rejects(validateFile(Buffer.alloc(0), 'x.png', 'image/png'), { statusCode: 400 }));
test('rejects size overflow', async () => assert.rejects(validateFile(Buffer.alloc(P.MAX_BYTES + 1), 'x.png', 'image/png'), { statusCode: 413 }));
test('rejects MIME spoofing', async () => assert.rejects(validateFile(Buffer.from('<html>malicious</html>'), 'x.png', 'image/png'), { statusCode: 400 }));
test('rejects truncated image with valid magic bytes', async () => assert.rejects(validateFile((await png()).subarray(0, 20), 'x.png', 'image/png'), { statusCode: 400 }));
test('accepts parsed PDF and rejects corrupt PDF', async () => {
  const pdf = await PDFDocument.create(); pdf.addPage();
  await validateFile(Buffer.from(await pdf.save()), 'receipt.pdf', 'application/pdf');
  await assert.rejects(validateFile(Buffer.from('%PDF-1.7\ninvalid\n%%EOF'), 'receipt.pdf', 'application/pdf'), { statusCode: 400 });
});
test('rejects active actions inside nested PDF dictionaries', async () => {
  const pdf = await PDFDocument.create(); const page = pdf.addPage();
  page.node.set(PDFName.of('Annots'), pdf.context.obj([{ Type: 'Annot', Subtype: 'Link', Rect: [0, 0, 100, 100], A: { S: 'JavaScript', JS: 'alert(1)' } }]));
  await assert.rejects(validateFile(Buffer.from(await pdf.save()), 'active.pdf', 'application/pdf'), { statusCode: 400 });
});
for (const type of ['EXPENSE', 'CUSTOMER_PAYMENT', 'BANK_INFLOW', 'LAND_PAYOUT', 'REFUND', 'WALLET_ALLOCATION', 'PROPERTY']) test(`source policy ${type} rejects unrelated document type`, () => assert.throws(() => P.documentType(type, 'EXECUTABLE'), { statusCode: 400 }));
test('rejects invalid source type, inherited keys and IDs', () => { for (const value of ['unknown', '__proto__', 'constructor']) assert.throws(() => P.sourceType(value)); assert.throws(() => P.uuid('EXP-12')); });
test('expense policy requires receipt by default, is configurable, and payment policies share central rules', () => {
  assert.deepEqual(P.requiredGroups('EXPENSE', 'CASH', {}), [['EXPENSE_RECEIPT', 'INVOICE']]);
  assert.deepEqual(P.requiredGroups('EXPENSE', 'CASH', { DOCUMENT_EXPENSE_RECEIPT_REQUIRED: 'false' }), []);
  assert.equal(P.requiredGroups('REFUND', 'CHEQUE', { DOCUMENT_BANK_PROOF_REQUIRED: 'true', DOCUMENT_CHEQUE_FRONT_REQUIRED: 'true' }).length, 2);
});
test('missing, pending, verified, rejected, replacement and exception states', () => {
  const doc = { documentType: 'EXPENSE_RECEIPT', status: 'PENDING_REVIEW' };
  assert.equal(P.evidenceState('EXPENSE', 'CASH', [], null), 'DOCUMENT_MISSING');
  assert.equal(P.evidenceState('EXPENSE', 'CASH', [doc], null), 'DOCUMENT_PENDING');
  assert.equal(P.evidenceState('EXPENSE', 'CASH', [{ ...doc, status: 'VERIFIED' }], null), 'DOCUMENT_VERIFIED');
  assert.equal(P.evidenceState('EXPENSE', 'CASH', [{ ...doc, status: 'REJECTED' }], null), 'DOCUMENT_REJECTED');
  assert.equal(P.evidenceState('EXPENSE', 'CASH', [{ ...doc, status: 'REPLACED' }], null), 'DOCUMENT_MISSING');
  assert.equal(P.evidenceState('EXPENSE', 'CASH', [], { status: 'PENDING_REVIEW' }), 'EXCEPTION_PENDING');
});
test('receipt exceptions cannot waive separate bank proof requirements', () => {
  const original = process.env.DOCUMENT_BANK_PROOF_REQUIRED;
  process.env.DOCUMENT_BANK_PROOF_REQUIRED = 'true';
  try {
    for (const status of ['VERIFIED', 'PENDING_REVIEW']) {
      assert.equal(P.evidenceState('EXPENSE', 'NEFT', [], { status }), 'DOCUMENT_MISSING');
    }
    assert.equal(P.evidenceState('EXPENSE', 'NEFT', [{ documentType: 'PAYMENT_PROOF', status: 'VERIFIED' }], { status: 'VERIFIED' }), 'EXCEPTION_APPROVED');
  } finally { if (original === undefined) delete process.env.DOCUMENT_BANK_PROOF_REQUIRED; else process.env.DOCUMENT_BANK_PROOF_REQUIRED = original; }
});
for (const role of ['SALES', 'MARKETING', 'MANAGER', 'OTHER']) test(`${role} cannot review or access cheque documents even if granted a review permission`, () => {
  const actor = { role, permissions: ['document.review', 'document.sensitive'] };
  assert.throws(() => A.capability(actor, 'review'), { statusCode: 403 });
  assert.throws(() => A.sensitive(actor, 'CHEQUE_FRONT'), { statusCode: 403 });
});
test('private provider rejects traversal, stores exact bytes with opaque keys', async t => {
  assert.throws(() => new PrivateLocalStorage('relative-documents'), { statusCode: 503 });
  assert.throws(() => new PrivateLocalStorage(path.join(os.tmpdir(), 'hbuilds', 'current', 'documents')), { statusCode: 503 });
  const passenger = process.env.PASSENGER_APP_ENV, configuredRoot = process.env.DOCUMENT_STORAGE_PATH;
  process.env.PASSENGER_APP_ENV = 'production';
  delete process.env.DOCUMENT_STORAGE_PATH;
  try { assert.throws(() => new PrivateLocalStorage(), { statusCode: 503 }); }
  finally {
    if (passenger === undefined) delete process.env.PASSENGER_APP_ENV; else process.env.PASSENGER_APP_ENV = passenger;
    if (configuredRoot === undefined) delete process.env.DOCUMENT_STORAGE_PATH; else process.env.DOCUMENT_STORAGE_PATH = configuredRoot;
  }
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'estatesync-doc-unit-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new PrivateLocalStorage(root);
  assert.throws(() => store.location('../secret'), { statusCode: 400 });
  const bytes = await png(); const key = await store.put(bytes);
  assert.match(key, /^[0-9a-f-]{36}\.bin$/); assert.deepEqual(await store.read(key), bytes);
});
test('private S3 provider stores, retrieves, lists and removes exact bytes without public URLs', async () => {
  const objects = new Map();
  const calls = [];
  const client = { async send(command) {
    const name = command.constructor.name;
    const { Bucket, Key } = command.input;
    assert.equal(Bucket, 'private-test-bucket');
    calls.push(name);
    if (name === 'PutObjectCommand') { objects.set(Key, Buffer.from(command.input.Body)); return {}; }
    if (name === 'GetObjectCommand') {
      if (!objects.has(Key)) throw Object.assign(Error('missing'), { name: 'NoSuchKey' });
      return { Body: Readable.from([objects.get(Key)]) };
    }
    if (name === 'HeadObjectCommand') {
      if (!objects.has(Key)) throw Object.assign(Error('missing'), { name: 'NotFound' });
      return {};
    }
    if (name === 'DeleteObjectCommand') { objects.delete(Key); return {}; }
    if (name === 'ListObjectsV2Command') return { Contents: [...objects.keys()].map(key => ({ Key: key, LastModified: new Date() })) };
    throw Error(`Unexpected ${name}`);
  } };
  const config = { DOCUMENT_S3_BUCKET: 'private-test-bucket', DOCUMENT_S3_REGION: 'auto', DOCUMENT_S3_ENDPOINT: 'https://example.r2.cloudflarestorage.com', DOCUMENT_S3_ACCESS_KEY_ID: 'test', DOCUMENT_S3_SECRET_ACCESS_KEY: 'test' };
  const store = new PrivateS3Storage(config, client);
  const bytes = await png();
  const key = await store.put(bytes);
  assert.match(key, /^[0-9a-f-]{36}\.bin$/);
  assert.deepEqual(await store.read(key), bytes);
  assert.equal(await store.exists(key), true);
  assert.deepEqual((await store.list()).map(item => item.key), [key]);
  await store.removeUnclaimed(key);
  assert.equal(await store.exists(key), false);
  assert.ok(calls.includes('PutObjectCommand') && calls.includes('GetObjectCommand'));
  await assert.rejects(store.read(key), { statusCode: 503 });
  await assert.rejects(store.read('../secret'), { statusCode: 400 });
  assert.throws(() => new PrivateS3Storage({ ...config, DOCUMENT_S3_ENDPOINT: 'http://example.com' }, client), { statusCode: 503 });
  assert.throws(() => new PrivateS3Storage({ ...config, DOCUMENT_S3_SECRET_ACCESS_KEY: '' }, client), { statusCode: 503 });
});
test('private S3 provider paginates and fails closed on storage errors', async () => {
  const config = { DOCUMENT_S3_BUCKET: 'private-test-bucket', DOCUMENT_S3_REGION: 'auto', DOCUMENT_S3_ACCESS_KEY_ID: 'test', DOCUMENT_S3_SECRET_ACCESS_KEY: 'test' };
  let calls = 0;
  const client = { async send(command) {
    if (command.constructor.name === 'ListObjectsV2Command') {
      calls++;
      return calls === 1
        ? { IsTruncated: true, NextContinuationToken: 'next', Contents: [{ Key: 'not-a-document', LastModified: new Date() }] }
        : { IsTruncated: false, Contents: [{ Key: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.bin', LastModified: new Date() }] };
    }
    throw Error('storage unavailable');
  } };
  const store = new PrivateS3Storage(config, client);
  assert.equal((await store.list()).length, 1);
  assert.equal(calls, 2);
  await assert.rejects(store.exists('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.bin'), { statusCode: 503 });
  await assert.rejects(store.put(Buffer.from('x')), { statusCode: 503 });
});
