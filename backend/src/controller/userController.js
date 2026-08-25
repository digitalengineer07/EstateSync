const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
            availableBalance: true,
            totalAllocated: true,
            totalSpent: true
          }
        }
      }
    });
    res.json({ success: true, managers });
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
        role: {
          select: { name: true }
        },
        wallet: {
          select: {
            availableBalance: true,
            totalAllocated: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, users });
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
      await tx.wallet.create({
        data: {
          userId: user.id,
          totalAllocated: 0,
          totalSpent: 0,
          availableBalance: 0
        }
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
