/**
 * Request Sanitizer Middleware
 * Protects against Prototype Pollution and parameter injection attacks
 * by stripping forbidden keys such as __proto__, constructor, and prototype.
 */

function cleanObject(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 5) return;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'object' && obj[i] !== null) {
        cleanObject(obj[i], depth + 1);
      }
    }
    return;
  }

  for (const key of Object.keys(obj)) {
    // Strip prototype pollution attempts
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      delete obj[key];
      continue;
    }

    if (typeof obj[key] === 'object' && obj[key] !== null) {
      cleanObject(obj[key], depth + 1);
    }
  }
}

exports.sanitizeInput = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      cleanObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      cleanObject(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      cleanObject(req.params);
    }
  } catch (err) {
    console.warn('[Sanitizer Middleware Warning]:', err.message);
  }
  next();
};
