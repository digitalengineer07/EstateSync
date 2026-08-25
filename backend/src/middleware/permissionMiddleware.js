/**
 * Middleware to enforce role-based access control (RBAC).
 * Expects req.user to be populated by verifyJWT middleware.
 * 
 * @param {string} requiredPermission - The permission code needed (e.g. 'fund.allocate')
 */
exports.checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ success: false, message: 'Access denied: No permissions found' });
    }

    if (req.user.role === 'ADMIN') {
      return next();
    }

    const permissions = req.user.permissions || [];
    const required = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];

    const hasPermission = required.some(p => permissions.includes(p));

    if (hasPermission) {
      next();
    } else {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied: Requires ${required.join(' or ')}` 
      });
    }
  };
};
