const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const JWT_SECRET = require('./authSecrets').authSecrets().access;

// JWTs establish identity only. Current activation, role and permissions are
// loaded from the database for every protected request.
const createVerifyJWT = (db = prisma) => async (req, res, next) => {
  const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '');
  if (!match) return res.status(401).json({ success: false, message: 'Authentication required' });

  let decoded;
  try {
    decoded = jwt.verify(match[1], JWT_SECRET, { algorithms: ['HS256'] });
  } catch (error) {
    return res.status(401).json({ success: false, message: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token' });
  }
  const userId = decoded.userId;
  if (typeof userId !== 'string' || !userId) return res.status(401).json({ success: false, message: 'Invalid token' });

  let user;
  try {
    user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, isActive: true, passwordHash: true,
        role: { select: { name: true, permissions: { select: { permission: { select: { code: true } } } } } },
      },
    });
  } catch (error) {
    console.error('Authentication state lookup failed:', error);
    return res.status(503).json({ success: false, message: 'Authentication is temporarily unavailable' });
  }
  if (!user) return res.status(401).json({ success: false, message: 'User account not found' });
  if (!user.isActive) return res.status(403).json({ success: false, isDeactivated: true, message: 'Your account has been deactivated. Please contact your system administrator.' });
  if (!require('../utils/authVersion').matchesVersion(user, decoded.authVersion)) return res.status(401).json({ success: false, message: 'Please sign in again' });
  if (!user.role) return res.status(403).json({ success: false, message: 'Account role is unavailable' });

  req.user = {
    userId: user.id,
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role.name,
    permissions: user.role.permissions.map(item => item.permission.code),
  };
  req.authVerified = true;
  next();
};

exports.createVerifyJWT = createVerifyJWT;
exports.verifyJWT = createVerifyJWT();
// Retained for existing call sites; there is no longer a status cache.
exports.invalidateUserAuthCache = () => {};
