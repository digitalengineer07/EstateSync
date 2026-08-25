/**
 * Middleware to enforce role-based access control (RBAC).
 * Expects req.user to be populated by verifyJWT middleware.
 * 
 * @param {string} requiredPermission - The permission code needed (e.g. 'fund.allocate')
 */
exports.checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(403).json({ success: false, message: 'Access denied: No permissions found' });
    }

    if (req.user.permissions.includes(requiredPermission)) {
      next();
    } else {
      return res.status(403).json({ success: false, message: `Access denied: Requires ${requiredPermission}` });
    }
  };
};
