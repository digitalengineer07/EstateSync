const crypto = require('node:crypto');
const prisma = require('../config/db');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
function createIdempotencyMiddleware(db = prisma) { return async (req, res, next) => {
  const key = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
  if (key === undefined) return next(); // Preserve clients that do not retry writes.
  if (typeof key !== 'string' || !key.trim() || key.length > 128) return res.status(400).json({ success: false, message: 'Invalid idempotency key' });
  const keyString = key.trim();
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });
  const endpoint = `${req.method} ${req.originalUrl || req.url}`;
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(canonical(req.body ?? {}))).digest('hex');
  try {
    let cached = await db.idempotencyKey.findUnique({ where: { key: keyString } });
    if (cached && cached.expiresAt <= new Date()) {
      await db.idempotencyKey.deleteMany({ where: { key: keyString, expiresAt: { lte: new Date() } } });
      cached = null;
    }
    if (cached) {
      if (cached.userId !== userId || cached.endpoint !== endpoint || cached.responseBody?.fingerprint !== fingerprint || cached.responseStatus === 0) {
        return res.status(409).json({ success: false, message: 'Request key is in use or belongs to different request data' });
      }
      return res.status(cached.responseStatus).json({ ...cached.responseBody.result, _idempotentReplay: true, _originalCreatedAt: cached.createdAt });
    }
    await db.idempotencyKey.create({ data: { key: keyString, userId, endpoint, responseStatus: 0, responseBody: { fingerprint }, expiresAt: new Date(Date.now() + 86400000) } });
    const originalJson = res.json.bind(res);
    res.json = body => {
      const status = res.statusCode;
      // The outer transaction commits the business write and cached result together.
      db.idempotencyKey.update({ where: { key: keyString }, data: { responseStatus: status, responseBody: { fingerprint, result: JSON.parse(JSON.stringify(body)) } } })
        .then(() => originalJson(body))
        .catch(error => { console.error('Idempotency result failed:', error); res.status(503); originalJson({ success: false, message: 'Request safety check failed. Please retry.' }); });
      return res;
    };
    return next();
  } catch (error) {
    return res.status(error.code === 'P2002' ? 409 : 503).json({ success: false, message: error.code === 'P2002' ? 'Request is already being processed' : 'Request safety check is temporarily unavailable' });
  }
}; }
module.exports = createIdempotencyMiddleware();
module.exports.createIdempotencyMiddleware = createIdempotencyMiddleware;
