const { test } = require('node:test');
const assert = require('node:assert/strict');

test('CORS allows only exact configured origins and rejects hostname lookalikes', () => {
  const { createOriginValidator } = require('../src/middleware/corsOrigins');
  const allowed = createOriginValidator({ NODE_ENV: 'production', CORS_ORIGIN: 'https://app.example.com' });
  assert.equal(allowed('https://app.example.com'), true);
  assert.equal(allowed('https://localhost.attacker.com'), false);
  assert.equal(allowed('https://127.0.0.1.attacker.com'), false);
  assert.equal(allowed('https://evil.devoxa.in'), false);
  assert.equal(allowed('https://app.example.com.attacker.com'), false);
});
