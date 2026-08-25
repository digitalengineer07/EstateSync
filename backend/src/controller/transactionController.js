const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all transactions (for ADMIN visibility)
exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await prisma.walletTransaction.findMany({
      include: {
        sourceWallet: {
          include: { user: { select: { name: true, email: true } } }
        },
        destWallet: {
          include: { user: { select: { name: true, email: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // limit to last 100 for performance on MVP
    });

    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Server error fetching transactions' });
  }
};
