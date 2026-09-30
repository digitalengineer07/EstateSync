const rateLimit = require('express-rate-limit');

/**
 * Global API Rate Limiter
 * Applied across all routes as a baseline against automated scraping & volumetric DoS.
 */
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1500, // 1500 requests per 15 min per IP (generous for active multi-panel dashboards)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP address. Please slow down and try again later.',
  },
});

/**
 * Authentication Route Rate Limiter
 * Strictly limits login, register, and token refresh requests to mitigate brute-force credential stuffing.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP address. Please wait 15 minutes before trying again.',
  },
});

/**
 * Sensitive Admin Security Actions Limiter
 * Limits password resets, status changes, and role assignments to prevent automated takeover attempts.
 */
const sensitiveAdminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many administrative security actions requested. Please wait a few minutes.',
  },
});

/**
 * Financial & Ledger Mutation Limiter
 * Guards high-impact financial transactions (allocations, payouts, collections).
 */
const financialMutationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 transactions per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Transaction request limit reached for this minute. Please wait a moment.',
  },
});

module.exports = {
  globalApiLimiter,
  authLimiter,
  sensitiveAdminLimiter,
  financialMutationLimiter,
};
