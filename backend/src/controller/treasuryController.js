const prisma = require('../config/db');
const { postCapitalInfusionJournal } = require('../utils/accountingHelper');
const { logAudit } = require('../utils/auditLogger');
const { getPrimaryTreasuryAdmin } = require('../utils/treasuryHelper');
const { checkDuplicateReferenceNo, registerBankReference } = require('../utils/referenceValidator');

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

    let cleanRef = referenceNo && typeof referenceNo === 'string' ? referenceNo.trim() : null;
    let effectiveBankName = bankName ? bankName.trim() : '';

    if (paymentMode !== 'CASH') {
      if (!effectiveBankName || !cleanRef) {
        return res.status(400).json({ success: false, message: 'Bank Name and UTR / Reference Number are required' });
      }
    } else {
      if (!effectiveBankName) {
        effectiveBankName = 'Cash In Hand';
      }
      if (!cleanRef) {
        cleanRef = `CASH-DEP-${String(Date.now()).slice(-4)}`;
      }
    }

    // Check for duplicate UTR / Reference Number across system if reference is provided
    if (cleanRef) {
      const duplicateErr = await checkDuplicateReferenceNo(prisma, cleanRef);
      if (duplicateErr) {
        return res.status(400).json({ success: false, message: duplicateErr });
      }
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
            availableBalanceLiquid: 0,
            availableBalanceCash: 0,
            totalAllocatedLiquid: 0,
            totalAllocatedCash: 0,
            totalSpentLiquid: 0,
            totalSpentCash: 0
          }
        });
      }

      const fMode = paymentMode === 'CASH' ? 'CASH' : 'LIQUID';
      const balanceField = fMode === 'CASH' ? 'availableBalanceCash' : 'availableBalanceLiquid';
      const allocatedField = fMode === 'CASH' ? 'totalAllocatedCash' : 'totalAllocatedLiquid';

      // 2. Increment Admin Wallet Balance and Total Inflows
      const updatedAdminWallet = await tx.wallet.update({
        where: { id: adminWallet.id },
        data: {
          [balanceField]: { increment: parsedAmount },
          [allocatedField]: { increment: parsedAmount }
        }
      });

      // 3. Create Immutable Wallet Transaction Record
      const txnDescription = paymentMode === 'CASH'
        ? `Cash Deposit Inflow [${effectiveBankName}]: ${narration || 'Physical Cash Deposit into Primary Treasury'}`
        : `Bank Statement Inflow [${effectiveBankName} / ${paymentMode} Ref: ${cleanRef}]: ${narration || 'Capital Deposit into Primary Treasury'}`;

      const walletTxn = await tx.walletTransaction.create({
        data: {
          type: 'CAPITAL_INFUSION',
          amount: parsedAmount,
          fundMode: fMode,
          destWalletId: adminWallet.id,
          referenceType: 'BANK_STATEMENT',
          referenceId: cleanRef,
          description: txnDescription,
          createdBy: req.user?.email || 'Accountant',
          status: 'COMPLETED'
        }
      });

      if (cleanRef) {
        await registerBankReference(tx, {
          referenceNo: cleanRef,
          module: 'TREASURY_INFLOW',
          sourceTable: 'WalletTransaction',
          sourceRecordId: walletTxn.id,
          amount: parsedAmount,
          bankName: effectiveBankName,
          paymentMode: paymentMode.toUpperCase(),
          recordedBy: req.user?.email || 'Accountant'
        });
      }

      // 4. Generate Balanced Double-Entry General Ledger Voucher (Dr: 1010 | Cr: 3010/3020/4020)
      const journalEntry = await postCapitalInfusionJournal(tx, {
        amount: parsedAmount,
        inflowType,
        bankName: accountNo ? `${effectiveBankName} (${accountNo})` : effectiveBankName,
        referenceNo: cleanRef,
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
          fundMode: fMode,
          narration,
          journalEntryNumber: journalEntry.entryNumber,
          newAdminBalance: updatedAdminWallet[balanceField]
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
      availableTreasuryBalanceLiquid: result.updatedAdminWallet.availableBalanceLiquid,
      availableTreasuryBalanceCash: result.updatedAdminWallet.availableBalanceCash
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

    // Resolve users so createdBy shows readable email instead of raw UUID
    const users = await prisma.user.findMany({
      select: { id: true, email: true }
    });
    const userMap = new Map(users.map(u => [u.id, u.email]));

    const formattedInflows = inflows.map(i => ({
      ...i,
      createdBy: userMap.get(i.createdBy) || i.createdBy || 'System'
    }));

    return res.json({
      success: true,
      inflows: formattedInflows
    });
  } catch (error) {
    console.error('Error fetching treasury inflows:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch treasury inflows'
    });
  }
};

/**
 * Get unified Treasury Cashflow (Inflows + Outflows)
 * GET /api/v1/treasury/cashflow
 */
exports.getTreasuryCashflow = async (req, res) => {
  try {
    const { filter } = req.query; // 'all', 'inflow', 'outflow'

    const INFLOW_TYPES = ['CAPITAL_INFUSION', 'CUSTOMER_PAYMENT_RECEIVED'];
    const OUTFLOW_TYPES = ['LAND_ACQUISITION_PAYMENT', 'SALARY_PAYMENT', 'FUND_ALLOCATION'];

    let typeFilter = [...INFLOW_TYPES, ...OUTFLOW_TYPES];
    if (filter === 'inflow') typeFilter = INFLOW_TYPES;
    if (filter === 'outflow') typeFilter = OUTFLOW_TYPES;

    const transactions = await prisma.walletTransaction.findMany({
      where: {
        type: { in: typeFilter }
      },
      include: {
        sourceWallet: {
          include: { user: { select: { name: true, email: true } } }
        },
        destWallet: {
          include: { user: { select: { name: true, email: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Resolve users so createdBy shows readable email instead of raw UUID
    const users = await prisma.user.findMany({
      select: { id: true, email: true }
    });
    const userMap = new Map(users.map(u => [u.id, u.email]));

    let totalInflow = 0;
    let totalOutflow = 0;

    const items = transactions.map((t) => {
      const isInflow = INFLOW_TYPES.includes(t.type);
      const amt = parseFloat(t.amount || 0);

      if (isInflow) {
        totalInflow += amt;
      } else {
        totalOutflow += amt;
      }

      let categoryLabel = 'Corporate Flow';
      if (t.type === 'CAPITAL_INFUSION') categoryLabel = 'Capital Infusion';
      else if (t.type === 'CUSTOMER_PAYMENT_RECEIVED') categoryLabel = 'Customer Collection';
      else if (t.type === 'LAND_ACQUISITION_PAYMENT') categoryLabel = 'Land Payout';
      else if (t.type === 'SALARY_PAYMENT') categoryLabel = 'Salary Disbursement';
      else if (t.type === 'FUND_ALLOCATION') categoryLabel = 'Manager Top-Up';

      const resolvedCreatedBy = userMap.get(t.createdBy) || t.createdBy || 'System';

      return {
        ...t,
        createdBy: resolvedCreatedBy,
        direction: isInflow ? 'INFLOW' : 'OUTFLOW',
        categoryLabel
      };
    });

    return res.json({
      success: true,
      items,
      summary: {
        totalInflow,
        totalOutflow,
        netCashflow: totalInflow - totalOutflow,
        totalCount: items.length
      }
    });
  } catch (error) {
    console.error('Error fetching treasury cashflow:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch treasury cashflow' });
  }
};

