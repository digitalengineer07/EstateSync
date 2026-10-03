/** Check current database-backed permissions populated by verifyJWT. */
exports.checkPermission = requiredPermission => (req, res, next) => {
  if (!req.authVerified || !req.user) return res.status(403).json({ success: false, message: 'Access denied: Authentication state not verified' });

  const required = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
  if (req.user.role === 'ADMIN' || required.some(code => req.user.permissions.includes(code))) return next();
  return res.status(403).json({ success: false, message: `Access denied: Requires ${required.join(' or ')}` });
};
