const bcrypt = require('bcrypt');
const prisma = require('../config/db');
const { logAudit } = require('../utils/auditLogger');
const { validatePassword } = require('../utils/passwordValidator');
const { clearRestrictionForAccount } = require('../utils/loginRateLimiter');
const { invalidateUserAuthCache } = require('../middleware/authMiddleware');
const canViewWallets = req => req.user.role === 'ADMIN' || req.user.permissions?.some(p => ['wallet.view_all','fund.allocate','accounting.view'].includes(p));

exports.getRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        description: true
      }
    });
    res.json({ success: true, roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ success: false, message: 'Server error fetching roles' });
  }
};

exports.getManagers = async (req, res) => {
  try {
    const currentUserId = req.user?.userId;
    const managers = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          name: { in: ['MANAGER', 'ADMIN'] }
        },
        ...(currentUserId ? { id: { not: currentUserId } } : {})
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: {
          select: { name: true }
        },
        wallet: {
          select: {
            availableBalanceLiquid: true,
            availableBalanceCash: true,
            totalAllocatedLiquid: true,
            totalAllocatedCash: true,
            totalSpentLiquid: true,
            totalSpentCash: true
          }
        }
      }
    });
    res.json({ success: true, managers: canViewWallets(req) ? managers : managers.map(({ wallet, ...user }) => user) });
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({ success: false, message: 'Server error fetching managers' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        role: {
          select: { name: true }
        },
        wallet: {
          select: {
            id: true,
            availableBalanceLiquid: true,
            availableBalanceCash: true,
            totalAllocatedLiquid: true,
            totalAllocatedCash: true,
            totalSpentLiquid: true,
            totalSpentCash: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, users: canViewWallets(req) ? users : users.map(({ wallet, ...user }) => user) });
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ success: false, message: 'Server error fetching users' });
  }
};

exports.registerUser = async (req, res) => {
  try {
    const { email, password, name, roleId } = req.body;

    if (!email || !password || !name || !roleId) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Verify role exists
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return res.status(400).json({ success: false, message: 'Invalid role selected' });
    }

    // Enforce 8-character and strong password rules
    const passwordValidation = validatePassword(password, { userEmail: email, userName: name });
    if (!passwordValidation.isValid) {
      return res.status(400).json({ success: false, message: passwordValidation.error });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user and wallet in a transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          roleId
        }
      });

      // Every user needs a wallet in EstateSync
      const wallet = await tx.wallet.create({
        data: {
          userId: user.id,
          totalAllocatedLiquid: 0,
          totalAllocatedCash: 0,
          totalSpentLiquid: 0,
          totalSpentCash: 0,
          availableBalanceLiquid: 0,
          availableBalanceCash: 0
        }
      });

      await logAudit({
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        action: 'USER_REGISTER',
        entityType: 'USER',
        entityId: user.id,
        newValues: { email, name, role: role.name, walletId: wallet.id },
        req,
        tx
      });

      return user;
    });

    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: role.name
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

/**
 * Admin Reset Password Controller
 * Allows an authorized administrator to reset any user account password
 * without needing or knowing the user's current password.
 */
exports.adminResetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'New password is required' });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirm password do not match' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    // Enforce 8-character rule and rejection of weak / common passwords
    const validation = validatePassword(newPassword, {
      userEmail: targetUser.email,
      userName: targetUser.name,
    });

    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: targetUser.id },
      data: { passwordHash },
    });

    // If target account was temporarily restricted due to failed attempts, lift the lockout
    clearRestrictionForAccount(targetUser.email);

    await logAudit({
      actorId: req.user?.userId,
      actorEmail: req.user?.email,
      action: 'ADMIN_RESET_USER_PASSWORD',
      entityType: 'USER',
      entityId: targetUser.id,
      newValues: {
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        targetUserName: targetUser.name,
        targetUserRole: targetUser.role?.name,
        resetByAdminEmail: req.user?.email,
      },
      req,
    });

    res.json({
      success: true,
      message: `Password for ${targetUser.name} (${targetUser.email}) has been successfully reset.`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
      },
    });
  } catch (error) {
    console.error('Error resetting user password by admin:', error);
    res.status(500).json({ success: false, message: 'Server error resetting password' });
  }
};

/**
 * Admin Toggle User Account Status (Activate / Deactivate)
 * Allows authorized administrators to activate or deactivate any user account.
 * When deactivated, the user cannot sign in.
 * When re-activated, the user can sign in again.
 */
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Invalid or missing "isActive" boolean status' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    // Prevent self-deactivation by the acting administrator
    if (req.user?.userId === targetUser.id && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own administrator account.',
      });
    }

    // Update status in database
    const updatedUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        role: {
          select: { name: true }
        }
      }
    });

    // Immediately invalidate in-memory auth cache so status change takes effect instantly
    invalidateUserAuthCache(targetUser.id);

    // If re-activating, also clear any active rate limiting lockout
    if (isActive) {
      clearRestrictionForAccount(targetUser.email);
    }

    // Audit log
    await logAudit({
      actorId: req.user?.userId,
      actorEmail: req.user?.email,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: targetUser.id,
      newValues: {
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        targetUserName: targetUser.name,
        targetUserRole: targetUser.role?.name,
        isActive,
        updatedByAdminEmail: req.user?.email,
      },
      req,
    });

    res.json({
      success: true,
      message: `User account for ${targetUser.name} (${targetUser.email}) has been ${isActive ? 'activated' : 'deactivated'} successfully.`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error toggling user account status:', error);
    res.status(500).json({ success: false, message: 'Server error updating user status' });
  }
};
