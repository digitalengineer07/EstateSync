const prisma = require('../config/db');
const { postCapitalInfusionJournal } = require('../utils/accountingHelper');
const { logAudit } = require('../utils/auditLogger');
const { getPrimaryTreasuryAdmin } = require('../utils/treasuryHelper');

/**
 * Record Bank Statement Transaction / Capital Infusion into Main Organization Treasury
 * Accessible by: ACCOUNTING, ADMIN
 */
exports.recordBankInflow = async (req, res) => {
  try {
    const {
      amount,
      bankName,
      accountNo,
      inflowType = 'CAPITAL_INFUSION', // 'CAPITAL_INFUSION', 'DIRECTOR_LOAN', 'BANK_INTEREST', 'OTHER'
      paymentMode = 'RTGS', // 'RTGS', 'NEFT', 'CHEQUE', 'IMPS', 'UPI', 'WIRE', 'CASH'
      referenceNo, // UTR, Cheque No, Bank Trans ID
      transactionDate,
      narration
    } = req.body;

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount is required' });
    }

    if (!bankName || !referenceNo) {
      return res.status(400).json({ success: false, message: 'Bank Name and UTR / Reference Number are required' });
    }

    // Execute atomic financial transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Locate Master Admin User / Treasury Wallet
      const adminUser = await getPrimaryTreasuryAdmin(tx);

      if (!adminUser) {
        throw new Error('No Master Admin Account found to receive treasury funds.');
      }

      let adminWallet = adminUser.wallet;
      if (!adminWallet) {
        adminWallet = await tx.wallet.create({
          data: {
            userId: adminUser.id,
            availableBalance: 0,
            totalAllocated: 0,
            totalSpent: 0
          }
        });
      }

      // 2. Increment Admin Wallet Balance and Total Inflows
      const updatedAdminWallet = await tx.wallet.update({
        where: { id: adminWallet.id },
        data: {
          availableBalance: { increment: parsedAmount },
          totalAllocated: { increment: parsedAmount }
        }
      });

      // 3. Create Immutable Wallet Transaction Record
      const txnDescription = `Bank Statement Inflow [${bankName} / ${paymentMode} Ref: ${referenceNo}]: ${narration || 'Capital Deposit into Primary Treasury'}`;

      const walletTxn = await tx.walletTransaction.create({
        data: {
          type: 'CAPITAL_INFUSION',
          amount: parsedAmount,
          destWalletId: adminWallet.id,
          referenceType: 'BANK_STATEMENT',
          referenceId: referenceNo,
          description: txnDescription,
          createdBy: req.user?.email || 'Accountant',
          status: 'COMPLETED'
        }
      });

      // 4. Generate Balanced Double-Entry General Ledger Voucher (Dr: 1010 | Cr: 3010/3020/4020)
      const journalEntry = await postCapitalInfusionJournal(tx, {
        amount: parsedAmount,
        inflowType,
        bankName: accountNo ? `${bankName} (${accountNo})` : bankName,
        referenceNo,
        description: narration,
        referenceId: walletTxn.id,
        createdBy: req.user?.email || 'Accountant'
      });

      // 5. Create Audit Trail Entry
      await logAudit({
        actorId: req.user?.userId || req.user?.id,
        actorEmail: req.user?.email,
        action: 'TREASURY_INFLOW_RECORDED',
        entityType: 'WALLET_TRANSACTION',
        entityId: walletTxn.id,
        newValues: {
          amount: parsedAmount,
          bankName,
          accountNo,
          paymentMode,
          referenceNo,
          inflowType,
          narration,
          journalEntryNumber: journalEntry.entryNumber,
          newAdminBalance: updatedAdminWallet.availableBalance
        }
      });

      return {
        walletTxn,
        journalEntry,
        updatedAdminWallet
      };
    }, {
      maxWait: 10000,
      timeout: 20000
    });

    return res.status(201).json({
      success: true,
      message: `Successfully recorded ₹${parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} bank inflow into Corporate Treasury.`,
      transaction: result.walletTxn,
      journalEntry: result.journalEntry,
      availableTreasuryBalance: result.updatedAdminWallet.availableBalance
    });
  } catch (error) {
    console.error('Error recording bank inflow:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to record bank inflow'
    });
  }
};

/**
 * Get all Treasury & Bank Inflow records
 */
exports.getTreasuryInflows = async (req, res) => {
  try {
    const inflows = await prisma.walletTransaction.findMany({
      where: {
        OR: [
          { type: 'CAPITAL_INFUSION' },
          { referenceType: 'BANK_STATEMENT' }
        ]
      },
      include: {
        destWallet: {
          include: {
            user: {
              select: { name: true, email: true, role: { select: { name: true } } }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      inflows
    });
  } catch (error) {
    console.error('Error fetching treasury inflows:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch treasury inflows'
    });
  }
};
