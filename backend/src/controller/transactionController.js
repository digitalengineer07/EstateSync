const prisma = require('../config/db');

// Get all transactions (for ADMIN and ACCOUNTING visibility)
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
      take: 100 // limit to last 100 for performance
    });

    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Server error fetching transactions' });
  }
};
