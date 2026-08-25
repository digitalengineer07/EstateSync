const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.expenseCategory.findMany();
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Server error fetching categories' });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const { amount, description, categoryId, date, vendorId, reference } = req.body;
    const userId = req.user.userId;

    if (!amount || !description || !categoryId || !date) {
      return res.status(400).json({ success: false, message: 'Amount, description, category, and date are required' });
    }

    const expenseAmount = parseFloat(amount);
    if (isNaN(expenseAmount) || expenseAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    // Run within a Prisma transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch user's wallet
      const wallet = await tx.wallet.findUnique({
        where: { userId: userId }
      });

      if (!wallet) {
        throw new Error('Wallet not found for user');
      }

      // 2. Check sufficient balance
      if (wallet.availableBalance < expenseAmount) {
        throw new Error('INSUFFICIENT_FUNDS');
      }

      // 3. Update wallet balances
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { decrement: expenseAmount },
          totalSpent: { increment: expenseAmount }
        }
      });

      // 4. Create Expense record
      const expense = await tx.expense.create({
        data: {
          userId: userId,
          walletId: wallet.id,
          categoryId: categoryId,
          amount: expenseAmount,
          description,
          date: new Date(date),
          vendorId,
          reference,
          status: 'RECORDED'
        }
      });

      // 5. Create Ledger Transaction
      await tx.walletTransaction.create({
        data: {
          type: 'EXPENSE',
          sourceWalletId: wallet.id,
          amount: expenseAmount,
          referenceType: 'EXPENSE',
          referenceId: expense.id,
          description: `Expense: ${description}`,
          createdBy: userId,
          status: 'COMPLETED'
        }
      });

      return expense;
    });

    res.status(201).json({ success: true, expense: result, message: 'Expense recorded successfully' });
  } catch (error) {
    if (error.message === 'INSUFFICIENT_FUNDS') {
      return res.status(400).json({ success: false, message: 'Insufficient funds in wallet to cover this expense' });
    }
    console.error('Error creating expense:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error creating expense' });
  }
};
