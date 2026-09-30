const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

// High-speed in-memory cache for user active status to avoid DB bottleneck on every API call
// Key: userId, Value: { isActive: boolean, expiresAt: number }
const userActiveCache = new Map();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Invalidates the cached status of a user immediately
 * (e.g. called when an admin activates or deactivates an account).
 */
function invalidateUserAuthCache(userId) {
  if (userId) {
    userActiveCache.delete(String(userId));
  }
}

/**
 * Middleware to verify JWT and ensure the user account is actively enabled.
 * If an account has been deactivated by an admin, access is immediately revoked.
 */
exports.verifyJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Real-Time Account Activation Check
    const userId = decoded.userId || decoded.id;
    if (userId) {
      const now = Date.now();
      let isActive = true;

      if (userActiveCache.has(userId) && userActiveCache.get(userId).expiresAt > now) {
        isActive = userActiveCache.get(userId).isActive;
      } else {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, isActive: true },
        });

        if (!user) {
          return res.status(401).json({ success: false, message: 'User account not found' });
        }

        isActive = user.isActive !== false;
        userActiveCache.set(userId, { isActive, expiresAt: now + CACHE_TTL_MS });
      }

      if (!isActive) {
        return res.status(403).json({
          success: false,
          isDeactivated: true,
          message: 'Your account has been deactivated. Please contact your system administrator.',
        });
      }
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

exports.invalidateUserAuthCache = invalidateUserAuthCache;
