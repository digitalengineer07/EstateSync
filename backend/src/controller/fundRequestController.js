const prisma = require('../config/db');
const { logAudit } = require('../utils/auditLogger');
const { postAllocationJournal } = require('../utils/accountingHelper');

// User creates a request to a manager
exports.createRequest = async (req, res) => {
  try {
    const { amount, reason, managerId } = req.body;
    const requesterId = req.user.userId;

    if (!amount || !reason || !managerId) {
      return res.status(400).json({ success: false, message: 'Amount, reason, and manager ID are required' });
    }

    const reqAmount = parseFloat(amount);
    if (isNaN(reqAmount) || reqAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const fundRequest = await prisma.fundRequest.create({
      data: {
        requesterId,
        managerId,
        amount: reqAmount,
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
      newValues: { amount: reqAmount, reason, managerId },
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
exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const approverId = req.user.userId;

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.fundRequest.findUnique({
        where: { id },
        include: { requester: { include: { role: true } } }
      });
      if (!request) throw new Error('NOT_FOUND');
      if (request.status !== 'PENDING') throw new Error('NOT_PENDING');
      if (request.managerId !== approverId && req.user.role !== 'ADMIN') {
        throw new Error('UNAUTHORIZED');
      }

      const reqAmount = parseFloat(request.amount);

      // 1. Get wallets
      const managerWallet = await tx.wallet.findUnique({ where: { userId: approverId } });
      let requesterWallet = await tx.wallet.findUnique({ where: { userId: request.requesterId } });

      if (!requesterWallet) {
        requesterWallet = await tx.wallet.create({
          data: {
            userId: request.requesterId,
            totalAllocated: 0,
            totalSpent: 0,
            availableBalance: 0
          }
        });
      }

      if (!managerWallet && req.user.role !== 'ADMIN') throw new Error('WALLET_MISSING');

      // 2. Check manager balance (Admin bypasses this check if funding manager directly)
      if (req.user.role !== 'ADMIN' && parseFloat(managerWallet.availableBalance) < reqAmount) {
        throw new Error('INSUFFICIENT_FUNDS');
      }

      // 3. Decrease manager balance (unless Admin)
      if (req.user.role !== 'ADMIN') {
        await tx.wallet.update({
          where: { id: managerWallet.id },
          data: { availableBalance: { decrement: reqAmount } }
        });
      }

      // 4. Increase requester balance and allocated amount
      await tx.wallet.update({
        where: { id: requesterWallet.id },
        data: {
          totalAllocated: { increment: reqAmount },
          availableBalance: { increment: reqAmount }
        }
      });

      // 5. Create Transaction Ledger entry
      const transaction = await tx.walletTransaction.create({
        data: {
          type: 'FUND_ALLOCATION',
          sourceWalletId: req.user.role !== 'ADMIN' ? managerWallet.id : null,
          destWalletId: requesterWallet.id,
          amount: reqAmount,
          referenceType: 'FUND_REQUEST',
          referenceId: request.id,
          description: `Fund request approved: ${request.reason}`,
          createdBy: approverId,
          status: 'COMPLETED'
        }
      });

      // 6. Post Double-Entry Journal Entry (Debit: Team Wallet, Credit: Manager Wallet / Treasury)
      await postAllocationJournal(tx, {
        sourceWalletType: req.user.role === 'ADMIN' ? 'TREASURY' : 'MANAGER',
        recipientWalletType: 'TEAM',
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
          approvedBy: approverId,
          transactionId: transaction.id
        },
        req,
        tx
      });

      return updatedReq;
    });

    res.json({ success: true, message: 'Request approved successfully', request: result });
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ success: false, message: 'Request not found' });
    if (error.message === 'NOT_PENDING') return res.status(400).json({ success: false, message: 'Request is not pending' });
    if (error.message === 'UNAUTHORIZED') return res.status(403).json({ success: false, message: 'Unauthorized' });
    if (error.message === 'WALLET_MISSING') return res.status(400).json({ success: false, message: 'Wallet missing' });
    if (error.message === 'INSUFFICIENT_FUNDS') return res.status(400).json({ success: false, message: 'Insufficient funds in your wallet to approve this request' });
    
    console.error('Approval Error:', error);
    res.status(500).json({ success: false, message: 'Server error during approval' });
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
    const { targetUserId, amount, description } = req.body;
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

    let targetWallet = targetUser.wallet;
    if (!targetWallet) {
      targetWallet = await prisma.wallet.create({
        data: {
          userId: targetUser.id,
          totalAllocated: 0,
          totalSpent: 0,
          availableBalance: 0
        }
      });
    }

    const adminWallet = await prisma.wallet.findUnique({
      where: { userId: adminId }
    });

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update target wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: targetWallet.id },
        data: {
          totalAllocated: { increment: allocAmount },
          availableBalance: { increment: allocAmount }
        }
      });

      // 2. Create immutable transaction entry
      const transaction = await tx.walletTransaction.create({
        data: {
          type: 'FUND_ALLOCATION',
          sourceWalletId: adminWallet?.id || null,
          destWalletId: targetWallet.id,
          amount: allocAmount,
          referenceType: 'DIRECT_ALLOCATION',
          referenceId: null,
          description: description || `Direct fund allocation to ${targetUser.name} (${targetUser.role.name})`,
          createdBy: adminId,
          status: 'COMPLETED'
        }
      });

      // 3. Post Double-Entry Journal (Debit: Manager/User Wallet, Credit: Treasury Bank)
      const recipientType = targetUser.role.name === 'MANAGER' ? 'MANAGER' : 'TEAM';
      await postAllocationJournal(tx, {
        sourceWalletType: 'TREASURY',
        recipientWalletType: recipientType,
        amount: allocAmount,
        description: `Direct Fund Allocation to ${targetUser.name} (${targetUser.role.name}) - ${description || 'Operational Budget'}`,
        referenceId: transaction.id,
        createdBy: adminId
      });

      // 4. Record Audit Log
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
          description
        },
        req,
        tx
      });

      return { wallet: updatedWallet, transaction };
    });

    res.status(200).json({
      success: true,
      message: `Successfully allocated ₹${allocAmount.toLocaleString()} to ${targetUser.name}`,
      data: result
    });
  } catch (error) {
    console.error('Direct Allocation Error:', error);
    res.status(500).json({ success: false, message: 'Server error during fund allocation' });
  }
};
