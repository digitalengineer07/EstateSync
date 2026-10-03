const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { logAudit } = require('../utils/auditLogger');
const { isRestricted, recordFailedAttempt, recordSuccess } = require('../utils/loginRateLimiter');
const { validatePassword } = require('../utils/passwordValidator');

const { access: JWT_SECRET, refresh: JWT_REFRESH_SECRET } = require('../middleware/authSecrets').authSecrets();

const generateTokens = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role.name,
    permissions: user.role.permissions.map(rp => rp.permission.code)
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  return { accessToken, refreshToken };
};

exports.login = async (req, res) => {
  console.log('[Login Route] Started login request for email:', req.body.email);
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // 1. Check Login Rate Limiter (IP & Account level brute-force protection)
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const restriction = isRestricted(clientIp, email);

    if (restriction.restricted) {
      await logAudit({
        actorEmail: email,
        action: 'USER_LOGIN_BLOCKED_RATE_LIMIT',
        entityType: 'USER',
        newValues: {
          reason: `Temporarily restricted due to repeated failed login attempts (${restriction.reason})`,
          retryMinutes: restriction.retryMinutes,
          clientIp,
        },
        req,
      });

      return res.status(429).json({
        success: false,
        message: `Too many failed login attempts. This ${
          restriction.reason === 'account' ? 'account' : 'IP address'
        } is temporarily restricted for ${restriction.retryMinutes} minute(s). Please try again later.`,
        retryAfterMinutes: restriction.retryMinutes,
      });
    }

    console.log('[Login Route] Querying Prisma for user...');
    const user = await prisma.user.findUnique({
      where: { email },
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
    console.log('[Login Route] Prisma query finished. User found:', !!user);

    if (!user) {
      const failStatus = recordFailedAttempt(clientIp, email);
      await logAudit({
        actorEmail: email,
        action: 'USER_LOGIN_FAILED',
        entityType: 'USER',
        newValues: { reason: 'User not found', attemptsLeft: failStatus.attemptsLeft },
        req
      });

      if (failStatus.restricted) {
        return res.status(429).json({
          success: false,
          message: 'Too many failed login attempts. This account / IP is now temporarily restricted for 15 minutes.',
          retryAfterMinutes: 15,
        });
      }

      return res.status(401).json({
        success: false,
        message: `Invalid credentials. (${failStatus.attemptsLeft} attempt(s) remaining before temporary lockout)`,
        attemptsLeft: failStatus.attemptsLeft,
      });
    }

    // 2. Check Account Activation Status
    if (user.isActive === false) {
      await logAudit({
        actorId: user.id,
        actorEmail: user.email,
        action: 'USER_LOGIN_BLOCKED_DEACTIVATED',
        entityType: 'USER',
        entityId: user.id,
        newValues: { reason: 'User account is deactivated by administrator' },
        req
      });

      return res.status(403).json({
        success: false,
        isDeactivated: true,
        message: 'Your account has been deactivated. Please contact your system administrator or support.',
      });
    }

    console.log('[Login Route] Comparing passwords with bcrypt...');
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    console.log('[Login Route] Bcrypt compare finished:', isValidPassword);
    
    if (!isValidPassword) {
      const failStatus = recordFailedAttempt(clientIp, email);
      await logAudit({
        actorId: user.id,
        actorEmail: user.email,
        action: 'USER_LOGIN_FAILED',
        entityType: 'USER',
        entityId: user.id,
        newValues: { reason: 'Incorrect password', attemptsLeft: failStatus.attemptsLeft },
        req
      });

      if (failStatus.restricted) {
        return res.status(429).json({
          success: false,
          message: 'Too many failed login attempts. This account / IP is now temporarily restricted for 15 minutes.',
          retryAfterMinutes: 15,
        });
      }

      return res.status(401).json({
        success: false,
        message: `Invalid credentials. (${failStatus.attemptsLeft} attempt(s) remaining before temporary lockout)`,
        attemptsLeft: failStatus.attemptsLeft,
      });
    }

    // Login succeeded: Clear failed attempts tracking for this IP & email
    recordSuccess(clientIp, email);

    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token in express-session
    req.session.refreshToken = refreshToken;
    req.session.userId = user.id;

    // Log successful login
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: user.id,
      newValues: { role: user.role.name },
      req
    });

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        isActive: user.isActive,
        permissions: user.role.permissions.map(rp => rp.permission.code)
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Refresh token required' });
    }

    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    
    // Check if the token exists in the session
    const storedToken = req.session.refreshToken;
    
    if (!storedToken || storedToken !== token) {
      return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isActive === false) {
      if (req.session) {
        req.session.destroy(() => {});
      }
      return res.status(403).json({
        success: false,
        isDeactivated: true,
        message: 'Your account has been deactivated. Please contact your system administrator.',
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    
    // Update session with new refresh token
    req.session.refreshToken = newRefreshToken;

    res.json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error(error);
    res.status(403).json({ success: false, message: 'Invalid refresh token' });
  }
};

exports.logout = async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (userId) {
      await logAudit({
        actorId: userId,
        action: 'USER_LOGOUT',
        entityType: 'USER',
        entityId: userId,
        req
      });
    }

    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Logout failed' });
      }
      res.clearCookie('connect.sid');
      return res.json({ success: true, message: 'Logged out successfully' });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation password do not match',
      });
    }

    // 8-character rule and rejection of weak / common passwords
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.error,
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password',
      });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: user identity not found',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found',
      });
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      await logAudit({
        actorId: user.id,
        actorEmail: user.email,
        action: 'USER_PASSWORD_CHANGE_FAILED',
        entityType: 'USER',
        entityId: user.id,
        newValues: { reason: 'Incorrect current password' },
        req,
      });
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: 'USER_PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: user.id,
      req,
    });

    return res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to change password',
    });
  }
};

