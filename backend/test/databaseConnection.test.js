const { test } = require('node:test');
const assert = require('node:assert/strict');
const { databaseUrlWithDefaults, isDatabaseUnavailable } = require('../src/utils/databaseConnection');
test('Neon connection defaults are bounded and retain credentials and TLS settings', () => {
  const url = new URL(databaseUrlWithDefaults('postgresql://user:p%40ss@ep-example.neon.tech/db?sslmode=require'));
  assert.equal(url.password, 'p%40ss');
  assert.equal(url.searchParams.get('sslmode'), 'require');
  assert.equal(url.searchParams.get('connect_timeout'), '15');
  assert.equal(url.searchParams.get('pool_timeout'), '20');
  assert.equal(url.searchParams.get('connection_limit'), '5');
});
test('explicit connection settings are retained without duplicate parameters', () => {
  const url = new URL(databaseUrlWithDefaults('postgresql://user@ep-example.neon.tech/db?connect_timeout=25&pool_timeout=30&connection_limit=3'));
  assert.equal(url.searchParams.get('connect_timeout'), '25');
  assert.equal(url.searchParams.getAll('pool_timeout').length, 1);
  assert.equal(url.searchParams.get('pool_timeout'), '30');
  assert.equal(url.searchParams.get('connection_limit'), '3');
  const local = new URL(databaseUrlWithDefaults('postgresql://user@127.0.0.1/db'));
  assert.equal(local.searchParams.has('connect_timeout'), false);
  assert.equal(local.searchParams.get('pool_timeout'), '10');
});
test('connectivity and pool errors are distinguished from validation/constraint errors', () => {
  assert.equal(isDatabaseUnavailable({ errorCode: 'P1001' }), true);
  assert.equal(isDatabaseUnavailable({ code: 'P2024' }), true);
  assert.equal(isDatabaseUnavailable({ code: 'P2002' }), false);
  assert.equal(isDatabaseUnavailable(Error('arbitrary error')), false);
});
test('outages return safe 503 JSON through the actual response safety middleware', () => {
  const { responseSafety } = require('../src/middleware/responseSafety');
  const { errorHandler } = require('../src/middleware/errorMiddleware');
  const headers = {}; let body;
  const res = { statusCode: 200, setHeader(k,v) { headers[k]=v; }, status(code) { this.statusCode=code; return this; }, json(value) { body=value; } };
  responseSafety({}, res, () => {});
  errorHandler({ code: 'P1001', message: 'private database host/password/path' }, { originalUrl: '/api/v1/auth/refresh' }, res, () => {});
  assert.equal(res.statusCode, 503);
  assert.equal(headers['Retry-After'], '5');
  assert.equal(body.code, 'DATABASE_UNAVAILABLE');
  assert.match(body.message, /temporarily unavailable/);
  assert.doesNotMatch(JSON.stringify(body), /private|password/);
});
