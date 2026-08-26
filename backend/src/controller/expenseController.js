const prisma = require('../config/db');
const { logAudit } = require('../utils/auditLogger');
const { postExpenseJournal, postExpenseReversalJournal } = require('../utils/accountingHelper');

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

    // Fetch user details for category & role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    const category = await prisma.expenseCategory.findUnique({
      where: { id: categoryId }
    });

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
      if (parseFloat(wallet.availableBalance) < expenseAmount) {
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

      // 6. Post Double-Entry Accounting Journal (Debit: Expense Account, Credit: Wallet Account)
      await postExpenseJournal(tx, {
        categoryName: category ? category.name : 'General Expense',
        userRole: user?.role?.name || 'TEAM',
        amount: expenseAmount,
        description: `Expense [${category?.name || 'General'}]: ${description}`,
        referenceId: expense.id,
        createdBy: userId
      });

      // 7. Record Audit Log
      await logAudit({
        actorId: userId,
        actorEmail: req.user.email,
        action: 'EXPENSE_CREATE',
        entityType: 'EXPENSE',
        entityId: expense.id,
        newValues: {
          amount: expenseAmount,
          category: category?.name,
          description,
          walletId: wallet.id
        },
        req,
        tx
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

// Reverse an expense (Admin & Accounting authorized)
exports.reverseExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const actorId = req.user.userId;

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        user: { include: { role: true } },
        category: true,
        wallet: true
      }
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    if (expense.status === 'REVERSED') {
      return res.status(400).json({ success: false, message: 'This expense is already reversed' });
    }

    const expenseAmount = parseFloat(expense.amount);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update expense record to REVERSED
      const updatedExpense = await tx.expense.update({
        where: { id: expense.id },
        data: {
          status: 'REVERSED',
          reversedAt: new Date(),
          reversedBy: actorId,
          reversalReason: reason || 'Administrative reversal & refund'
        }
      });

      // 2. Restore user's wallet balances (re-increment availableBalance, decrement totalSpent)
      const updatedWallet = await tx.wallet.update({
        where: { id: expense.walletId },
        data: {
          availableBalance: { increment: expenseAmount },
          totalSpent: { decrement: expenseAmount }
        }
      });

      // 3. Create EXPENSE_REVERSAL ledger entry
      const transaction = await tx.walletTransaction.create({
        data: {
          type: 'EXPENSE_REVERSAL',
          destWalletId: expense.walletId,
          amount: expenseAmount,
          referenceType: 'EXPENSE_REVERSAL',
          referenceId: expense.id,
          description: `Reversal of Expense #${expense.id.slice(0, 8)}: ${expense.description} (Reason: ${reason || 'Correction'})`,
          createdBy: actorId,
          status: 'COMPLETED'
        }
      });

      // 4. Post Double-Entry Reversal Journal (Debit: Wallet Asset, Credit: Expense Category)
      await postExpenseReversalJournal(tx, {
        categoryName: expense.category?.name || 'General Expense',
        userRole: expense.user?.role?.name || 'TEAM',
        amount: expenseAmount,
        description: `Reversal of Expense: ${expense.description}`,
        referenceId: expense.id,
        createdBy: actorId
      });

      // 5. Audit Log
      await logAudit({
        actorId,
        actorEmail: req.user.email,
        action: 'EXPENSE_REVERSE',
        entityType: 'EXPENSE',
        entityId: expense.id,
        oldValues: { status: 'RECORDED', amount: expenseAmount },
        newValues: { status: 'REVERSED', reason: reason || 'Correction', reversedBy: actorId },
        req,
        tx
      });

      return { expense: updatedExpense, wallet: updatedWallet, transaction };
    });

    res.json({
      success: true,
      message: `Expense of ₹${expenseAmount.toLocaleString()} reversed and wallet balance restored successfully`,
      data: result
    });
  } catch (error) {
    console.error('Error reversing expense:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error reversing expense' });
  }
};

// Get expenses recorded by current user
exports.getMyExpenses = async (req, res) => {
  try {
    const userId = req.user.userId;
    const expenses = await prisma.expense.findMany({
      where: { userId },
      include: {
        category: { select: { id: true, name: true, description: true } }
      },
      orderBy: { date: 'desc' }
    });
    res.json({ success: true, expenses });
  } catch (error) {
    console.error('Error fetching my expenses:', error);
    res.status(500).json({ success: false, message: 'Server error fetching my expenses' });
  }
};

// Get team expenses (for manager)
exports.getTeamExpenses = async (req, res) => {
  try {
    const managerId = req.user.userId;

    const requests = await prisma.fundRequest.findMany({
      where: { managerId },
      select: { requesterId: true }
    });

    const teamUserIds = [...new Set(requests.map(r => r.requesterId))];

    const whereClause = req.user.role === 'ADMIN'
      ? {}
      : teamUserIds.length > 0
        ? { userId: { in: teamUserIds } }
        : { user: { role: { name: { in: ['SALES', 'MARKETING', 'OTHER'] } } } };

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true, role: { select: { name: true } } } },
        category: { select: { id: true, name: true, description: true } }
      },
      orderBy: { date: 'desc' }
    });

    res.json({ success: true, expenses });
  } catch (error) {
    console.error('Error fetching team expenses:', error);
    res.status(500).json({ success: false, message: 'Server error fetching team expenses' });
  }
};

// Get all expenses (for Admin & Accounting)
exports.getAllExpenses = async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: { select: { name: true } } } },
        category: { select: { id: true, name: true, description: true } }
      },
      orderBy: { date: 'desc' }
    });
    res.json({ success: true, expenses });
  } catch (error) {
    console.error('Error fetching all expenses:', error);
    res.status(500).json({ success: false, message: 'Server error fetching all expenses' });
  }
};
