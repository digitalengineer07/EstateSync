const prisma = require('../config/db');

/**
 * Idempotency Middleware
 * Prevents double-spending, duplicate allocations, or repeated requests
 * when the client supplies an `Idempotency-Key` or `x-idempotency-key` header.
 */
function idempotencyMiddleware(req, res, next) {
  const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];

  // If no idempotency key was supplied by the client, proceed normally
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return next();
  }

  const keyString = idempotencyKey.trim();
  const userId = req.user?.userId || 'ANONYMOUS';
  const endpoint = `${req.method} ${req.originalUrl || req.url}`;

  // 1. Check if this key was already processed
  prisma.idempotencyKey.findUnique({
    where: { key: keyString }
  }).then((cached) => {
    if (cached) {
      // Replay stored response directly
      return res.status(cached.responseStatus).json({
        ...cached.responseBody,
        _idempotentReplay: true,
        _originalCreatedAt: cached.createdAt
      });
    }

    // 2. Intercept response to store for subsequent calls
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // Only cache successful or intended business errors (status < 500)
      if (res.statusCode < 500) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        prisma.idempotencyKey.create({
          data: {
            key: keyString,
            userId,
            endpoint,
            responseStatus: res.statusCode,
            responseBody: body,
            expiresAt
          }
        }).catch((err) => {
          console.error('Failed to save idempotency key:', err);
        });
      }

      return originalJson(body);
    };

    next();
  }).catch((err) => {
    console.error('Idempotency lookup error:', err);
    next();
  });
}

module.exports = idempotencyMiddleware;
