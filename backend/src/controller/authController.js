const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'supersecretrefreshkey';

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
  try {
    const { email, password } = req.body;

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

    if (!user) {
      await logAudit({
        actorEmail: email,
        action: 'USER_LOGIN_FAILED',
        entityType: 'USER',
        newValues: { reason: 'User not found' },
        req
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      await logAudit({
        actorId: user.id,
        actorEmail: user.email,
        action: 'USER_LOGIN_FAILED',
        entityType: 'USER',
        entityId: user.id,
        newValues: { reason: 'Incorrect password' },
        req
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

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

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
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

