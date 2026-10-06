const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSummaryCache } = require('../src/utils/summaryCache');
test('coalesces concurrent summary loads, expires, and invalidates on committed revision', async () => {
  let time = 0, version = 1, calls = 0;
  const cache = createSummaryCache({ now: () => time, ttlMs: 5, revision: async () => version });
  const load = async () => ++calls;
  assert.deepEqual(await Promise.all([cache('admin', load), cache('admin', load)]), [1, 1]);
  assert.equal(await cache('sales', load), 2);
  version++;
  assert.equal(await cache('admin', load), 3);
  time = 6;
  assert.equal(await cache('admin', load), 4);
});
test('failed loads and failed revision reads are not cached', async () => {
  const cache = createSummaryCache({ revision: async () => 1 });
  await assert.rejects(cache('a', async () => { throw Error('failed'); }));
  assert.equal(await cache('a', async () => 42), 42);
  let calls = 0;
  const unavailable = createSummaryCache({ revision: async () => { throw Error('offline'); } });
  await unavailable('a', async () => ++calls);
  await unavailable('a', async () => ++calls);
  assert.equal(calls, 2);
});
test('in-flight old revision cannot overwrite the new revision', async () => {
  let version = 1, release;
  const cache = createSummaryCache({ revision: async () => version });
  const old = cache('a', () => new Promise(resolve => { release = resolve; }));
  await new Promise(resolve => setImmediate(resolve));
  version = 2;
  assert.equal(await cache('a', async () => 'new'), 'new');
  release('old'); await old;
  assert.equal(await cache('a', async () => 'wrong'), 'new');
});
test('a slow cold load is shared even after the TTL duration elapses', async () => {
  let time = 0, release, calls = 0;
  const cache = createSummaryCache({ revision: async () => 1, now: () => time, ttlMs: 5 });
  const first = cache('a', () => { calls++; return new Promise(resolve => { release = resolve; }); });
  await new Promise(resolve => setImmediate(resolve));
  time = 10;
  const second = cache('a', async () => { calls++; return 'duplicate'; });
  release('shared');
  assert.deepEqual(await Promise.all([first, second]), ['shared', 'shared']);
  assert.equal(calls, 1);
});
