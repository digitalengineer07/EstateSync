const prisma = require('../config/db');
const { logAudit } = require('../utils/auditLogger');
const { postAllocationJournal } = require('../utils/accountingHelper');
const { getPrimaryTreasuryWallet } = require('../utils/treasuryHelper');

// User creates a request to a manager
exports.createRequest = async (req, res) => {
  try {
    const { amount, reason, managerId, fundMode } = req.body;
    const requesterId = req.user.userId;

    if (!amount || !reason || !managerId) {
      return res.status(400).json({ success: false, message: 'Amount, reason, and manager ID are required' });
    }
    
    const validFundMode = ['LIQUID', 'CASH'].includes(fundMode) ? fundMode : 'LIQUID';

    const reqAmount = parseFloat(amount);
    if (isNaN(reqAmount) || reqAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const fundRequest = await prisma.fundRequest.create({
      data: {
        requesterId,
        managerId,
        amount: reqAmount,
        fundMode: validFundMode,
        reason,
        status: 'PENDING'
      }
    });

    await logAudit({
      actorId: requesterId,
      actorEmail: req.user.email,
      action: 'FUND_REQUEST_CREATE',
      entityType: 'FUND_REQUEST',
      entityId: fundRequest.id,
      newValues: { amount: reqAmount, fundMode: validFundMode, reason, managerId },
      req
    });

    res.status(201).json({ success: true, fundRequest, message: 'Fund request submitted successfully' });
  } catch (error) {
    console.error('Error creating fund request:', error);
    res.status(500).json({ success: false, message: 'Server error creating fund request' });
  }
};

// Get requests made by the current user
exports.getMyRequests = async (req, res) => {
  try {
    const userId = req.user.userId;
    const requests = await prisma.fundRequest.findMany({
      where: { requesterId: userId },
      include: {
        manager: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching requests' });
  }
};

// Get requests assigned to the current manager
exports.getIncomingRequests = async (req, res) => {
  try {
    const managerId = req.user.userId;
    const requests = await prisma.fundRequest.findMany({
      where: { managerId: managerId },
      include: {
        requester: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching incoming requests' });
  }
};

// Get ALL requests (for ADMIN)
exports.getAllRequests = async (req, res) => {
  try {
    const requests = await prisma.fundRequest.findMany({
      include: {
        requester: { select: { name: true, email: true } },
        manager: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching all requests' });
  }
};

// Approve a request
// Approve a request
exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const approverId = req.user.userId;
    const isApproverAdmin = req.user.role === 'ADMIN';

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.fundRequest.findUnique({
        where: { id },
        include: {
          requester: { include: { role: true, wallet: true } },
          manager: { include: { role: true, wallet: true } }
        }
      });
      if (!request) throw new Error('NOT_FOUND');
      if (request.status !== 'PENDING') throw new Error('NOT_PENDING');
      if (request.managerId !== approverId && !isApproverAdmin) {
        throw new Error('UNAUTHORIZED');
      }

      const reqAmount = parseFloat(request.amount);
      if (isNaN(reqAmount) || reqAmount <= 0) throw new Error('INVALID_AMOUNT');
      
      const fMode = request.fundMode || 'LIQUID';
      const balanceField = fMode === 'CASH' ? 'availableBalanceCash' : 'availableBalanceLiquid';

      // 1. Identify Source Wallet (Entity releasing the funds)
      let sourceWallet;
      let sourceWalletType;

      if (isApproverAdmin) {
        // Admin approves -> Released from Corporate Treasury (Primary Treasury Wallet)
        sourceWallet = await getPrimaryTreasuryWallet(tx);

        if (parseFloat(sourceWallet[balanceField]) < reqAmount) {
          throw new Error('INSUFFICIENT_FUNDS');
        }

        sourceWalletType = 'TREASURY';
      } else {
        // Manager approves -> Released from Manager Float
        sourceWallet = await tx.wallet.findUnique({ where: { userId: approverId } });
        if (!sourceWallet) throw new Error('WALLET_MISSING');
        if (parseFloat(sourceWallet[balanceField]) < reqAmount) {
          throw new Error('INSUFFICIENT_FUNDS');
        }
        sourceWalletType = 'MANAGER';
      }

      // 2. Identify / Create Requester Wallet
      let requesterWallet = await tx.wallet.findUnique({ where: { userId: request.requesterId } });
      if (!requesterWallet) {
        requesterWallet = await tx.wallet.create({
          data: {
            userId: request.requesterId,
            totalAllocatedLiquid: 0,
            totalAllocatedCash: 0,
            totalSpentLiquid: 0,
            totalSpentCash: 0,
            availableBalanceLiquid: 0,
            availableBalanceCash: 0
          }
        });
      }

      // 3. Decrement Source Wallet Balance (CRITICAL: Minus from Approver / Treasury)
      const updatedSourceWallet = await tx.wallet.update({
        where: { id: sourceWallet.id },
        data: {
          [balanceField]: { decrement: reqAmount }
        }
      });

      const totalAllocatedField = fMode === 'CASH' ? 'totalAllocatedCash' : 'totalAllocatedLiquid';
      // 4. Increment Requester Wallet Balance and Total Allocated (Plus to Requester)
      const updatedRequesterWallet = await tx.wallet.update({
        where: { id: requesterWallet.id },
        data: {
          [totalAllocatedField]: { increment: reqAmount },
          [balanceField]: { increment: reqAmount }
        }
      });

      // 5. Create Transaction Ledger entry
      const transaction = await tx.walletTransaction.create({
        data: {
          type: 'FUND_ALLOCATION',
          sourceWalletId: sourceWallet.id,
          destWalletId: requesterWallet.id,
          amount: reqAmount,
          fundMode: fMode,
          referenceType: 'FUND_REQUEST',
          referenceId: request.id,
          description: `Fund request approved: ${request.reason}`,
          createdBy: approverId,
          status: 'COMPLETED'
        }
      });

      // 6. Post Double-Entry Journal Entry
      const recipientType = request.requester?.role?.name === 'MANAGER' ? 'MANAGER' : 'TEAM';
      await postAllocationJournal(tx, {
        sourceWalletType,
        recipientWalletType: recipientType,
        amount: reqAmount,
        description: `Fund Request Approval for ${request.requester.name} (${request.reason})`,
        referenceId: request.id,
        createdBy: approverId
      });

      // 7. Update request status
      const updatedReq = await tx.fundRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedBy: approverId,
          approvedAt: new Date()
        }
      });

      // 8. Record Audit Log
      await logAudit({
        actorId: approverId,
        actorEmail: req.user.email,
        action: 'FUND_REQUEST_APPROVE',
        entityType: 'FUND_REQUEST',
        entityId: request.id,
        newValues: {
          status: 'APPROVED',
          amount: reqAmount,
          fundMode: fMode,
          approvedBy: approverId,
          sourceWalletId: sourceWallet.id,
          sourceBalanceAfter: parseFloat(updatedSourceWallet[balanceField]),
          requesterBalanceAfter: parseFloat(updatedRequesterWallet[balanceField]),
          transactionId: transaction.id
        },
        req,
        tx
      });

      return updatedReq;
    }, { timeout: 20000 });

    res.json({ success: true, message: 'Request approved successfully', request: result });
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ success: false, message: 'Request not found' });
    if (error.message === 'NOT_PENDING') return res.status(400).json({ success: false, message: 'Request is not pending' });
    if (error.message === 'UNAUTHORIZED') return res.status(403).json({ success: false, message: 'Unauthorized to approve this request' });
    if (error.message === 'WALLET_MISSING') return res.status(400).json({ success: false, message: 'Source wallet missing' });
    if (error.message === 'INSUFFICIENT_FUNDS') {
      return res.status(400).json({
        success: false,
        message: req.user.role === 'ADMIN'
          ? 'Insufficient Corporate Treasury balance to approve this fund request. Record a bank capital inflow first.'
          : 'Insufficient Manager wallet balance to approve this fund request. Please request a fund top-up from Admin.'
      });
    }
    
    console.error('Approval Error:', error);
    res.status(500).json({ success: false, message: 'Server error during approval: ' + error.message });
  }
};

// Reject a request
exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const rejecterId = req.user.userId;

    const request = await prisma.fundRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Request is not pending' });
    if (request.managerId !== rejecterId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const updated = await prisma.fundRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedBy: rejecterId,
        rejectedAt: new Date(),
        comments
      }
    });

    await logAudit({
      actorId: rejecterId,
      actorEmail: req.user.email,
      action: 'FUND_REQUEST_REJECT',
      entityType: 'FUND_REQUEST',
      entityId: request.id,
      newValues: { status: 'REJECTED', comments },
      req
    });

    res.json({ success: true, message: 'Request rejected', request: updated });
  } catch (error) {
    console.error('Rejection Error:', error);
    res.status(500).json({ success: false, message: 'Server error during rejection' });
  }
};

// Direct fund allocation by Admin to any user/manager
exports.directAllocateFunds = async (req, res) => {
  try {
    const { targetUserId, amount, description, fundMode } = req.body;
    const adminId = req.user.userId;

    if (!targetUserId || !amount) {
      return res.status(400).json({ success: false, message: 'Target user and amount are required' });
    }

    const allocAmount = parseFloat(amount);
    if (isNaN(allocAmount) || allocAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { wallet: true, role: true }
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const fMode = ['LIQUID', 'CASH'].includes(fundMode) ? fundMode : 'LIQUID';
      const balanceField = fMode === 'CASH' ? 'availableBalanceCash' : 'availableBalanceLiquid';
      const totalAllocatedField = fMode === 'CASH' ? 'totalAllocatedCash' : 'totalAllocatedLiquid';

      // 1. Identify Unified Master Treasury Source Wallet
      const adminWallet = await getPrimaryTreasuryWallet(tx);

      if (parseFloat(adminWallet[balanceField]) < allocAmount) {
        throw new Error('INSUFFICIENT_FUNDS');
      }

      // 2. Decrement from Admin Treasury Wallet (Minus from Treasury)
      const updatedAdminWallet = await tx.wallet.update({
        where: { id: adminWallet.id },
        data: {
          [balanceField]: { decrement: allocAmount }
        }
      });

      // 3. Fetch/Create Target Wallet & Increment (Plus to Target)
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

      const updatedTargetWallet = await tx.wallet.update({
        where: { id: targetWallet.id },
        data: {
          [totalAllocatedField]: { increment: allocAmount },
          [balanceField]: { increment: allocAmount }
        }
      });

      // 4. Create immutable transaction entry
      const transaction = await tx.walletTransaction.create({
        data: {
          type: 'FUND_ALLOCATION',
          sourceWalletId: adminWallet.id,
          destWalletId: targetWallet.id,
          amount: allocAmount,
          fundMode: fMode,
          referenceType: 'DIRECT_ALLOCATION',
          referenceId: null,
          description: description || `Direct fund allocation to ${targetUser.name} (${targetUser.role.name})`,
          createdBy: adminId,
          status: 'COMPLETED'
        }
      });

      // 5. Post Double-Entry Journal (Debit: Manager/User Wallet, Credit: Treasury Bank)
      const recipientType = targetUser.role.name === 'MANAGER' ? 'MANAGER' : 'TEAM';
      await postAllocationJournal(tx, {
        sourceWalletType: 'TREASURY',
        recipientWalletType: recipientType,
        amount: allocAmount,
        description: `Direct Fund Allocation to ${targetUser.name} (${targetUser.role.name}) - ${description || 'Operational Budget'}`,
        referenceId: transaction.id,
        createdBy: adminId
      });

      // 6. Record Audit Log
      await logAudit({
        actorId: adminId,
        actorEmail: req.user.email,
        action: 'FUND_DIRECT_ALLOCATE',
        entityType: 'WALLET',
        entityId: targetWallet.id,
        newValues: {
          targetUser: targetUser.name,
          targetRole: targetUser.role.name,
          amount: allocAmount,
          fundMode: fMode,
          description,
          sourceBalanceAfter: parseFloat(updatedAdminWallet[balanceField]),
          targetBalanceAfter: parseFloat(updatedTargetWallet[balanceField])
        },
        req,
        tx
      });

      return { wallet: updatedTargetWallet, transaction };
    }, { timeout: 20000 });

    res.status(200).json({
      success: true,
      message: `Successfully allocated ₹${allocAmount.toLocaleString()} to ${targetUser.name}`,
      data: result
    });
  } catch (error) {
    if (error.message === 'INSUFFICIENT_FUNDS') {
      return res.status(400).json({
        success: false,
        message: 'Insufficient treasury funds in Corporate Treasury wallet to allocate this amount. Record a bank capital inflow first.'
      });
    }
    console.error('Direct Allocation Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during fund allocation' });
  }
};
