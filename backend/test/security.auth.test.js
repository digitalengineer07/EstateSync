const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { checkPermission } = require('../src/middleware/permissionMiddleware');

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test('permission guard rejects an unverified admin claim', async () => {
  const req = { user: { userId: 'user-1', role: 'ADMIN', permissions: ['user.manage'] } };
  const res = response();
  let permitted = false;
  await checkPermission('user.manage')(req, res, () => { permitted = true; });
  assert.equal(permitted, false);
  assert.equal(res.statusCode, 403);
});

test('a demoted JWT holder gets current database permissions, not old token claims', async () => {
  const { createVerifyJWT } = require('../src/middleware/authMiddleware');
  const token = jwt.sign({ userId: 'user-1', role: 'ADMIN', permissions: ['user.manage'] }, process.env.JWT_SECRET || 'supersecretjwtkey', { expiresIn: '1h' });
  const db = { user: { findUnique: async () => ({ id: 'user-1', email: 'staff@example.com', name: 'Staff', isActive: true, role: { name: 'SALES', permissions: [] } }) } };
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = response();
  let permitted = false;
  await createVerifyJWT(db)(req, res, () => { permitted = true; });
  assert.equal(permitted, true);
  assert.equal(req.user.role, 'SALES');
  assert.deepEqual(req.user.permissions, []);
});

test('deactivated accounts and database outages fail closed on every request', async () => {
  const { createVerifyJWT } = require('../src/middleware/authMiddleware');
  const token = jwt.sign({ userId: 'user-1', role: 'ADMIN' }, process.env.JWT_SECRET || 'supersecretjwtkey', { expiresIn: '1h' });
  const req = () => ({ headers: { authorization: `Bearer ${token}` } });
  let nextCalled = false;
  const disabled = { user: { findUnique: async () => ({ id: 'user-1', isActive: false, role: { name: 'ADMIN', permissions: [] } }) } };
  const denied = response();
  await createVerifyJWT(disabled)(req(), denied, () => { nextCalled = true; });
  assert.equal(denied.statusCode, 403);
  assert.equal(nextCalled, false);

  const unavailable = { user: { findUnique: async () => { throw Error('connection unavailable'); } } };
  const failure = response();
  const oldError = console.error;
  console.error = () => {};
  try { await createVerifyJWT(unavailable)(req(), failure, () => { nextCalled = true; }); }
  finally { console.error = oldError; }
  assert.equal(failure.statusCode, 503);
  assert.equal(nextCalled, false);
});

test('production rejects missing, weak and reused JWT signing secrets', () => {
  const { authSecrets } = require('../src/middleware/authSecrets');
  assert.throws(() => authSecrets({ NODE_ENV: 'production' }));
  assert.throws(() => authSecrets({ NODE_ENV: 'production', JWT_SECRET: 'short', JWT_REFRESH_SECRET: 'another-short' }));
  const strong = 'a'.repeat(32);
  assert.throws(() => authSecrets({ NODE_ENV: 'production', JWT_SECRET: strong, JWT_REFRESH_SECRET: strong }));
  assert.deepEqual(authSecrets({ NODE_ENV: 'production', JWT_SECRET: strong, JWT_REFRESH_SECRET: 'b'.repeat(32) }), { access: strong, refresh: 'b'.repeat(32) });
});
