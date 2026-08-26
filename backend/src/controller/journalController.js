const prisma = require('../config/db');

/**
 * Get Double-Entry General Ledger Journals
 */
exports.getJournals = async (req, res) => {
  try {
    const { status, referenceType } = req.query;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (referenceType) whereClause.referenceType = referenceType;

    const journals = await prisma.journalEntry.findMany({
      where: whereClause,
      include: {
        lines: {
          include: {
            account: {
              select: { id: true, code: true, name: true, type: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Verify debit = credit integrity for the entire ledger
    let overallDebit = 0;
    let overallCredit = 0;

    const formattedJournals = journals.map(j => {
      let entryDebit = 0;
      let entryCredit = 0;
      j.lines.forEach(l => {
        entryDebit += parseFloat(l.debit || 0);
        entryCredit += parseFloat(l.credit || 0);
      });

      overallDebit += entryDebit;
      overallCredit += entryCredit;

      return {
        ...j,
        totalDebit: entryDebit,
        totalCredit: entryCredit,
        isBalanced: Math.abs(entryDebit - entryCredit) < 0.01
      };
    });

    res.json({
      success: true,
      journals: formattedJournals,
      meta: {
        totalEntries: journals.length,
        overallDebit,
        overallCredit,
        ledgerBalanced: Math.abs(overallDebit - overallCredit) < 0.01
      }
    });
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    res.status(500).json({ success: false, message: 'Server error fetching General Ledger Journals' });
  }
};
