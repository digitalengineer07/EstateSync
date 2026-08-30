const prisma = require('../config/db');

/**
 * Middleware to enforce role-based access control (RBAC).
 * Expects req.user to be populated by verifyJWT middleware.
 * 
 * Supports fast-path JWT verification with automatic live DB fallback
 * to guarantee real-time permission sync for active sessions.
 * 
 * @param {string|string[]} requiredPermission - The permission code needed (e.g. 'fund.request' or ['customer.view', 'customer.view_all'])
 */
exports.checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ success: false, message: 'Access denied: No permissions found' });
    }

    if (req.user.role === 'ADMIN') {
      return next();
    }

    let permissions = req.user.permissions || [];
    const required = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];

    let hasPermission = required.some(p => permissions.includes(p));

    // If not found in JWT payload (e.g. token issued before DB permission update),
    // query live permissions from database so existing sessions don't get blocked
    if (!hasPermission && req.user.userId) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: req.user.userId },
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        });

        if (user && user.role) {
          permissions = user.role.permissions.map(rp => rp.permission.code);
          req.user.permissions = permissions;
          req.user.role = user.role.name;
          hasPermission = required.some(p => permissions.includes(p));
        }
      } catch (err) {
        console.error('Permission check live DB fallback error:', err);
      }
    }

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
