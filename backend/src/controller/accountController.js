const prisma = require('../config/db');
const { ensureStandardAccounts } = require('../utils/accountingHelper');

/**
 * Get Chart of Accounts with calculated balances
 */
exports.getAccounts = async (req, res) => {
  try {
    await ensureStandardAccounts(prisma);

    const accounts = await prisma.account.findMany({
      include: {
        journalLines: {
          select: { debit: true, credit: true }
        }
      },
      orderBy: { code: 'asc' }
    });

    const formattedAccounts = accounts.map(acc => {
      const totalDebit = acc.journalLines.reduce((accDebit, line) => accDebit + parseFloat(line.debit || 0), 0);
      const totalCredit = acc.journalLines.reduce((accCredit, line) => accCredit + parseFloat(line.credit || 0), 0);
      
      // Asset / Expense: Normal Debit balance = Debit - Credit
      // Liability / Equity / Revenue: Normal Credit balance = Credit - Debit
      let balance = 0;
      if (['ASSET', 'EXPENSE'].includes(acc.type)) {
        balance = totalDebit - totalCredit;
      } else {
        balance = totalCredit - totalDebit;
      }

      return {
        id: acc.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
        description: acc.description,
        totalDebit,
        totalCredit,
        balance,
        createdAt: acc.createdAt
      };
    });

    res.json({
      success: true,
      accounts: formattedAccounts
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ success: false, message: 'Server error fetching Chart of Accounts' });
  }
};
