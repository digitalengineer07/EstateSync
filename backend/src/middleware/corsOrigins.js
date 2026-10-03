function createOriginValidator(env = process.env) {
  const allowed = new Set([
    'https://estatesync.devoxa.in',
    'https://www.estatesync.devoxa.in',
  ]);
  if (env.NODE_ENV !== 'production') {
    for (const port of [3000, 3001, 3002]) allowed.add(`http://localhost:${port}`);
    allowed.add('http://127.0.0.1:3000');
  }
  for (const entry of (env.CORS_ORIGIN || '').split(',')) {
    const value = entry.trim();
    if (!value) continue;
    try {
      const parsed = new URL(value);
      if (!['https:', 'http:'].includes(parsed.protocol) || parsed.origin !== value || parsed.username || parsed.password) throw Error('invalid');
      allowed.add(value);
    } catch { throw Error('CORS_ORIGIN must contain exact http(s) origins separated by commas.'); }
  }
  return origin => !origin || allowed.has(origin);
}

module.exports = { createOriginValidator };
