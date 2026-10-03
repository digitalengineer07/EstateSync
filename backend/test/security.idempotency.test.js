const { test } = require('node:test');
const assert = require('node:assert/strict');

test('a cached mutation response cannot be replayed by another user or endpoint', async () => {
  const { createIdempotencyMiddleware } = require('../src/middleware/idempotencyMiddleware');
  const db = { idempotencyKey: { findUnique: async () => ({ userId: 'owner', endpoint: 'POST /api/v1/customers', responseStatus: 201, responseBody: { success: true, customer: { id: 'private' } }, expiresAt: new Date(Date.now() + 60000), createdAt: new Date() }) } };
  const req = { headers: { 'idempotency-key': 'same-key' }, user: { userId: 'attacker' }, method: 'POST', originalUrl: '/api/v1/customers' };
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  let nextCalled = false;
  await createIdempotencyMiddleware(db)(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 409);
  assert.equal(JSON.stringify(res.body).includes('private'), false);
});
