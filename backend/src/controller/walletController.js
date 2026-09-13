const prisma = require('../config/db');
const { logAudit } = require('../utils/auditLogger');
const { postWalletAdjustmentJournal } = require('../utils/accountingHelper');
const { getPrimaryTreasuryWallet } = require('../utils/treasuryHelper');

/**
 * 1. Adjust / Edit User Wallet Balance Directly (Admin Only)
 * POST /api/v1/wallets/adjust
 * 
 * Invariants Enforced:
 * - Resulting balance cannot be negative (no overdraft).
 * - Increases draw liquidity from Corporate Treasury; Decreases return liquidity to Corporate Treasury.
 * - Posts balanced Double-Entry General Ledger journal entry.
 * - Creates immutable 'ADJUSTMENT' WalletTransaction record.
 * - Permanent AuditLog snapshot with old and new values.
 */
exports.adjustWalletBalance = async (req, res) => {
  try {
    const {
      targetUserId,
      fundMode = 'LIQUID',
      adjustmentType = 'SET_BALANCE', // 'SET_BALANCE', 'INCREASE', 'DECREASE'
      targetBalance,
      amount,
      reason
    } = req.body;

    const adminId = req.user.userId;
    const adminEmail = req.user.email;

    // Authorization check
    if (req.user.role !== 'ADMIN' && !(req.user.permissions || []).includes('fund.allocate')) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only Administrators are authorized to manually edit or adjust wallet balances.'
      });
    }

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Target user ID is required.' });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: 'A detailed adjustment reason (minimum 5 characters) is mandatory for financial audit compliance.'
      });
    }

    const cleanFundMode = ['LIQUID', 'CASH'].includes(fundMode?.toUpperCase()) ? fundMode.toUpperCase() : 'LIQUID';
    const balanceField = cleanFundMode === 'CASH' ? 'availableBalanceCash' : 'availableBalanceLiquid';
    const allocatedField = cleanFundMode === 'CASH' ? 'totalAllocatedCash' : 'totalAllocatedLiquid';

    // 1. Fetch Target User
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { wallet: true, role: true }
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user not found.' });
    }

    const cleanReason = reason.trim();

    // 2. Execute Atomic Balance Adjustment
    const result = await prisma.$transaction(async (tx) => {
      // Fetch or initialize target wallet
      let targetWallet = await tx.wallet.findUnique({ where: { userId: targetUser.id } });
      if (!targetWallet) {
        targetWallet = await tx.wallet.create({
          data: {
            userId: targetUser.id,
            totalAllocatedLiquid: 0,
            totalAllocatedCash: 0,
            totalSpentLiquid: 0,
            totalSpentCash: 0,
            availableBalanceLiquid: 0,
            availableBalanceCash: 0
          }
        });
      }

      const currentBalance = parseFloat(targetWallet[balanceField] || 0);
      let delta = 0;

      if (adjustmentType === 'SET_BALANCE') {
        const parsedTarget = parseFloat(targetBalance);
        if (isNaN(parsedTarget) || parsedTarget < 0) {
          throw { status: 400, message: 'Target balance must be a valid non-negative number.' };
        }
        delta = parsedTarget - currentBalance;
      } else if (adjustmentType === 'INCREASE') {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          throw { status: 400, message: 'Top-up amount must be a positive number.' };
        }
        delta = parsedAmount;
      } else if (adjustmentType === 'DECREASE') {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          throw { status: 400, message: 'Deduction amount must be a positive number.' };
        }
        delta = -parsedAmount;
      } else {
        throw { status: 400, message: 'Invalid adjustment type. Supported: SET_BALANCE, INCREASE, DECREASE.' };
      }

      // Check if any change occurred
      if (Math.abs(delta) < 0.009) {
        throw { status: 400, message: 'No balance change detected. Target balance is identical to the current balance.' };
      }

      const calculatedNewBalance = currentBalance + delta;
      if (calculatedNewBalance < -0.009) {
        throw {
          status: 400,
          message: `Deduction exceeds available balance. Current balance is ₹${currentBalance.toLocaleString('en-IN')}, requested deduction is ₹${Math.abs(delta).toLocaleString('en-IN')}.`
        };
      }

      // Identify Corporate Treasury Source/Dest Wallet
      const treasuryWallet = await getPrimaryTreasuryWallet(tx);

      let updatedTargetWallet;
      let updatedTreasuryWallet;
      let walletTxn;
      const absDelta = Math.abs(delta);
      const recipientType = targetUser.role?.name === 'MANAGER' ? 'MANAGER' : 'TEAM';

      if (delta > 0) {
        // --- CASE 1: TOP-UP / INCREASE (Funds drawn from Treasury) ---
        const availableTreasury = parseFloat(treasuryWallet[balanceField] || 0);
        if (availableTreasury < delta) {
          throw {
            status: 400,
            message: `Insufficient Corporate Treasury liquidity. Treasury possesses ₹${availableTreasury.toLocaleString('en-IN')} in ${cleanFundMode}, but ₹${delta.toLocaleString('en-IN')} is required.`
          };
        }

        // Decrement Treasury
        updatedTreasuryWallet = await tx.wallet.update({
          where: { id: treasuryWallet.id },
          data: {
            [balanceField]: { decrement: delta }
          }
        });

        // Increment Target Wallet
        updatedTargetWallet = await tx.wallet.update({
          where: { id: targetWallet.id },
          data: {
            [balanceField]: { increment: delta },
            [allocatedField]: { increment: delta }
          }
        });

        // Create Transaction Record
        walletTxn = await tx.walletTransaction.create({
          data: {
            type: 'ADJUSTMENT',
            sourceWalletId: treasuryWallet.id,
            destWalletId: targetWallet.id,
            amount: delta,
            fundMode: cleanFundMode,
            referenceType: 'ADMIN_ADJUSTMENT',
            referenceId: `ADJ-TOP-${Date.now().toString().slice(-6)}`,
            description: `Admin Balance Top-up: ${cleanReason} (₹${currentBalance.toFixed(2)} → ₹${calculatedNewBalance.toFixed(2)})`,
            createdBy: adminId,
            status: 'COMPLETED'
          }
        });

        // Post Double-Entry Journal
        await postWalletAdjustmentJournal(tx, {
          targetWalletType: recipientType,
          direction: 'INCREASE',
          amount: delta,
          description: `Top-up for ${targetUser.name}: ${cleanReason}`,
          referenceId: walletTxn.id,
          createdBy: adminEmail
        });

      } else {
        // --- CASE 2: CLAWBACK / DECREASE (Funds returned to Treasury) ---
        // Decrement Target Wallet
        updatedTargetWallet = await tx.wallet.update({
          where: { id: targetWallet.id },
          data: {
            [balanceField]: { decrement: absDelta },
            [allocatedField]: { decrement: absDelta }
          }
        });

        // Increment Treasury (Funds recovered into master reserve)
        updatedTreasuryWallet = await tx.wallet.update({
          where: { id: treasuryWallet.id },
          data: {
            [balanceField]: { increment: absDelta }
          }
        });

        // Create Transaction Record
        walletTxn = await tx.walletTransaction.create({
          data: {
            type: 'ADJUSTMENT',
            sourceWalletId: targetWallet.id,
            destWalletId: treasuryWallet.id,
            amount: absDelta,
            fundMode: cleanFundMode,
            referenceType: 'ADMIN_ADJUSTMENT',
            referenceId: `ADJ-CLAW-${Date.now().toString().slice(-6)}`,
            description: `Admin Balance Deduction: ${cleanReason} (₹${currentBalance.toFixed(2)} → ₹${calculatedNewBalance.toFixed(2)})`,
            createdBy: adminId,
            status: 'COMPLETED'
          }
        });

        // Post Double-Entry Journal
        await postWalletAdjustmentJournal(tx, {
          targetWalletType: recipientType,
          direction: 'DECREASE',
          amount: absDelta,
          description: `Clawback from ${targetUser.name}: ${cleanReason}`,
          referenceId: walletTxn.id,
          createdBy: adminEmail
        });
      }

      // Record Audit Log
      await logAudit({
        actorId: adminId,
        actorEmail: adminEmail,
        action: 'WALLET_BALANCE_ADJUST',
        entityType: 'WALLET',
        entityId: targetWallet.id,
        oldValues: {
          targetUserName: targetUser.name,
          targetUserEmail: targetUser.email,
          fundMode: cleanFundMode,
          previousBalance: currentBalance
        },
        newValues: {
          newBalance: calculatedNewBalance,
          delta,
          adjustmentType,
          reason: cleanReason,
          transactionId: walletTxn.id
        },
        req,
        tx
      });

      return {
        targetUser: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role?.name
        },
        fundMode: cleanFundMode,
        previousBalance: currentBalance,
        newBalance: calculatedNewBalance,
        delta,
        transaction: walletTxn,
        updatedWallet: updatedTargetWallet
      };
    }, { timeout: 20000 });

    res.status(200).json({
      success: true,
      message: `Wallet balance for ${targetUser.name} successfully updated to ₹${result.newBalance.toLocaleString('en-IN')}.`,
      data: result
    });

  } catch (error) {
    console.error('Wallet Adjustment Error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error adjusting wallet balance'
    });
  }
};

/**
 * 2. Get Overview of All Wallets (Admin & Accounting)
 * GET /api/v1/wallets/overview
 */
exports.getWalletOverview = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: true,
        wallet: true
      },
      orderBy: { name: 'asc' }
    });

    let totalLiquidAllocated = 0;
    let totalCashAllocated = 0;
    let totalLiquidBalance = 0;
    let totalCashBalance = 0;
    let totalLiquidSpent = 0;
    let totalCashSpent = 0;

    const wallets = users.map(u => {
      const w = u.wallet || {};
      const lAlloc = parseFloat(w.totalAllocatedLiquid || 0);
      const cAlloc = parseFloat(w.totalAllocatedCash || 0);
      const lBal = parseFloat(w.availableBalanceLiquid || 0);
      const cBal = parseFloat(w.availableBalanceCash || 0);
      const lSpent = parseFloat(w.totalSpentLiquid || 0);
      const cSpent = parseFloat(w.totalSpentCash || 0);

      totalLiquidAllocated += lAlloc;
      totalCashAllocated += cAlloc;
      totalLiquidBalance += lBal;
      totalCashBalance += cBal;
      totalLiquidSpent += lSpent;
      totalCashSpent += cSpent;

      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        role: u.role?.name,
        walletId: w.id || null,
        availableBalanceLiquid: lBal,
        availableBalanceCash: cBal,
        totalAllocatedLiquid: lAlloc,
        totalAllocatedCash: cAlloc,
        totalSpentLiquid: lSpent,
        totalSpentCash: cSpent,
        totalBalance: lBal + cBal
      };
    });

    res.json({
      success: true,
      summary: {
        totalWallets: wallets.length,
        totalLiquidAllocated,
        totalCashAllocated,
        totalLiquidBalance,
        totalCashBalance,
        totalLiquidSpent,
        totalCashSpent,
        totalCompanyBalance: totalLiquidBalance + totalCashBalance
      },
      wallets
    });
  } catch (error) {
    console.error('Wallet Overview Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching wallet overview' });
  }
};
