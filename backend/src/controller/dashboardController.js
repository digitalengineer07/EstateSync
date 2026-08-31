const prisma = require('../config/db');
const { getPrimaryTreasuryWallet } = require('../utils/treasuryHelper');

exports.getWalletStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    const pendingRequests = await prisma.fundRequest.aggregate({
      where: {
        requesterId: userId,
        status: 'PENDING'
      },
      _sum: {
        amount: true
      }
    });

    const myCustomers = await prisma.customer.aggregate({
      where: { salesOwnerId: userId },
      _sum: {
        totalContractValue: true,
        totalPaid: true,
        balanceDue: true,
        refundAmount: true
      },
      _count: { id: true }
    });

    res.json({
      success: true,
      stats: {
        availableBalanceLiquid: wallet.availableBalanceLiquid,
        availableBalanceCash: wallet.availableBalanceCash,
        totalAllocatedLiquid: wallet.totalAllocatedLiquid,
        totalAllocatedCash: wallet.totalAllocatedCash,
        totalSpentLiquid: wallet.totalSpentLiquid,
        totalSpentCash: wallet.totalSpentCash,
        pendingRequestsAmount: pendingRequests._sum.amount || 0,
        customerCount: myCustomers._count.id || 0,
        myContractValue: myCustomers._sum.totalContractValue || 0,
        myCollections: (myCustomers._sum.totalPaid || 0) - (myCustomers._sum.refundAmount || 0),
        myOutstanding: myCustomers._sum.balanceDue || 0
      }
    });
  } catch (error) {
    console.error('Error fetching wallet stats:', error);
    res.status(500).json({ success: false, message: 'Server error fetching wallet stats' });
  }
};

exports.getManagerStats = async (req, res) => {
  try {
    const managerId = req.user.userId;

    const managerWallet = await prisma.wallet.findUnique({
      where: { userId: managerId }
    });

    if (!managerWallet) {
      return res.status(404).json({ success: false, message: 'Manager wallet not found' });
    }

    const pendingApprovals = await prisma.fundRequest.aggregate({
      where: {
        managerId: managerId,
        status: 'PENDING'
      },
      _count: {
        id: true
      },
      _sum: {
        amount: true
      }
    });

    const totalApprovedFunds = await prisma.fundRequest.aggregate({
      where: {
        managerId: managerId,
        status: 'APPROVED'
      },
      _sum: {
        amount: true
      }
    });

    res.json({
      success: true,
      stats: {
        managerAvailableBalanceLiquid: managerWallet.availableBalanceLiquid,
        managerAvailableBalanceCash: managerWallet.availableBalanceCash,
        pendingApprovalsCount: pendingApprovals._count.id || 0,
        pendingApprovalsAmount: pendingApprovals._sum.amount || 0,
        totalTeamApprovedFunds: totalApprovedFunds._sum.amount || 0
      }
    });
  } catch (error) {
    console.error('Error fetching manager stats:', error);
    res.status(500).json({ success: false, message: 'Server error fetching manager stats' });
  }
};

exports.getAdminStats = async (req, res) => {
  try {
    // 1. Get Unified Single Source of Truth Corporate Treasury Wallet
    const treasuryWallet = await getPrimaryTreasuryWallet();
    const treasuryBalanceLiquid = parseFloat(treasuryWallet.availableBalanceLiquid || 0);
    const treasuryBalanceCash = parseFloat(treasuryWallet.availableBalanceCash || 0);

    // 2. Sum of operational funds allocated to staff & managers (excluding Admin)
    const teamWallets = await prisma.wallet.aggregate({
      where: {
        user: { role: { name: { not: 'ADMIN' } } }
      },
      _sum: {
        totalAllocatedLiquid: true,
        totalAllocatedCash: true,
        availableBalanceLiquid: true,
        availableBalanceCash: true,
        totalSpentLiquid: true,
        totalSpentCash: true
      },
      _count: { id: true }
    });

    const allExpenses = await prisma.expense.aggregate({
      where: { status: 'RECORDED' },
      _sum: {
        amount: true
      },
      _count: { id: true }
    });

    const customerAgg = await prisma.customer.aggregate({
      _sum: {
        totalContractValue: true,
        totalPaid: true,
        balanceDue: true,
        refundAmount: true
      },
      _count: { id: true }
    });

    const propertyAgg = await prisma.propertyAcquisition.aggregate({
      _sum: {
        totalLandValue: true,
        totalPaidToOwner: true,
        balanceRemaining: true
      },
      _count: { id: true }
    });

    const pendingRequests = await prisma.fundRequest.aggregate({
      where: { status: 'PENDING' },
      _sum: { amount: true },
      _count: { id: true }
    });

    const userCount = await prisma.user.count();
    const totalAllocatedLiquid = Number(teamWallets._sum.totalAllocatedLiquid || 0);
    const totalAllocatedCash = Number(teamWallets._sum.totalAllocatedCash || 0);
    const totalAllocated = totalAllocatedLiquid + totalAllocatedCash;
    const totalSpentLiquid = Number(teamWallets._sum.totalSpentLiquid || 0);
    const totalSpentCash = Number(teamWallets._sum.totalSpentCash || 0);
    const totalSpent = totalSpentLiquid + totalSpentCash;
    const utilizationRate = totalAllocated > 0 ? ((totalSpent / totalAllocated) * 100).toFixed(1) : '0.0';

    res.json({
      success: true,
      stats: {
        totalOrganizationalFundsLiquid: treasuryBalanceLiquid,
        totalOrganizationalFundsCash: treasuryBalanceCash,
        totalAllocatedLiquid,
        totalAllocatedCash,
        totalTeamBalanceLiquid: parseFloat(teamWallets._sum.availableBalanceLiquid || 0),
        totalTeamBalanceCash: parseFloat(teamWallets._sum.availableBalanceCash || 0),
        totalSpentLiquid,
        totalSpentCash,
        totalRecordedExpenses: Number(allExpenses._sum.amount || 0),
        totalExpenses: Number(allExpenses._sum.amount || 0),
        expenseCount: allExpenses._count.id || 0,
        totalWallets: teamWallets._count.id || 0,
        activeUsers: userCount,
        pendingRequestsAmount: Number(pendingRequests._sum.amount || 0),
        pendingRequestsCount: pendingRequests._count.id || 0,
        budgetUtilization: `${utilizationRate}%`,
        totalCustomers: customerAgg._count.id || 0,
        totalCustomerContracts: Number(customerAgg._sum.totalContractValue || 0),
        totalCustomerCollections: Number(customerAgg._sum.totalPaid || 0) - Number(customerAgg._sum.refundAmount || 0),
        totalCustomerReceivables: Number(customerAgg._sum.balanceDue || 0),
        totalProperties: propertyAgg._count.id || 0,
        totalLandValuation: Number(propertyAgg._sum.totalLandValue || 0),
        totalLandPayouts: Number(propertyAgg._sum.totalPaidToOwner || 0),
        totalLandLiabilities: Number(propertyAgg._sum.balanceRemaining || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ success: false, message: 'Server error fetching admin stats' });
  }
};

exports.getAccountingStats = async (req, res) => {
  try {
    const treasuryWallet = await getPrimaryTreasuryWallet();
    const treasuryBalanceLiquid = parseFloat(treasuryWallet.availableBalanceLiquid || 0);
    const treasuryBalanceCash = parseFloat(treasuryWallet.availableBalanceCash || 0);

    const teamWallets = await prisma.wallet.aggregate({
      where: {
        user: { role: { name: { not: 'ADMIN' } } }
      },
      _sum: {
        totalAllocatedLiquid: true,
        totalAllocatedCash: true,
        availableBalanceLiquid: true,
        availableBalanceCash: true,
        totalSpentLiquid: true,
        totalSpentCash: true
      },
      _count: {
        id: true
      }
    });

    const allExpenses = await prisma.expense.aggregate({
      where: { status: 'RECORDED' },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    const customerAgg = await prisma.customer.aggregate({
      _sum: {
        totalContractValue: true,
        totalPaid: true,
        balanceDue: true,
        refundAmount: true
      },
      _count: { id: true }
    });

    const propertyAgg = await prisma.propertyAcquisition.aggregate({
      _sum: {
        totalLandValue: true,
        totalPaidToOwner: true,
        balanceRemaining: true
      },
      _count: { id: true }
    });

    const pendingRequests = await prisma.fundRequest.aggregate({
      where: { status: 'PENDING' },
      _sum: { amount: true },
      _count: { id: true }
    });

    const userCount = await prisma.user.count();
    const totalAllocatedLiquid = Number(teamWallets._sum.totalAllocatedLiquid || 0);
    const totalAllocatedCash = Number(teamWallets._sum.totalAllocatedCash || 0);
    const totalAllocated = totalAllocatedLiquid + totalAllocatedCash;
    const totalSpentLiquid = Number(teamWallets._sum.totalSpentLiquid || 0);
    const totalSpentCash = Number(teamWallets._sum.totalSpentCash || 0);
    const totalSpent = totalSpentLiquid + totalSpentCash;
    const utilizationRate = totalAllocated > 0 ? ((totalSpent / totalAllocated) * 100).toFixed(1) : '0.0';

    res.json({
      success: true,
      stats: {
        totalOrganizationalFundsLiquid: treasuryBalanceLiquid,
        totalOrganizationalFundsCash: treasuryBalanceCash,
        totalAllocatedLiquid,
        totalAllocatedCash,
        totalTeamBalanceLiquid: parseFloat(teamWallets._sum.availableBalanceLiquid || 0),
        totalTeamBalanceCash: parseFloat(teamWallets._sum.availableBalanceCash || 0),
        totalSpentLiquid,
        totalSpentCash,
        totalRecordedExpenses: Number(allExpenses._sum.amount || 0),
        totalExpenses: Number(allExpenses._sum.amount || 0),
        expenseCount: allExpenses._count.id || 0,
        totalWallets: teamWallets._count.id || 0,
        activeUsers: userCount,
        pendingRequestsAmount: Number(pendingRequests._sum.amount || 0),
        pendingRequestsCount: pendingRequests._count.id || 0,
        budgetUtilization: `${utilizationRate}%`,
        totalCustomers: customerAgg._count.id || 0,
        totalCustomerContracts: Number(customerAgg._sum.totalContractValue || 0),
        totalCustomerCollections: Number(customerAgg._sum.totalPaid || 0) - Number(customerAgg._sum.refundAmount || 0),
        totalCustomerReceivables: Number(customerAgg._sum.balanceDue || 0),
        totalProperties: propertyAgg._count.id || 0,
        totalLandValuation: Number(propertyAgg._sum.totalLandValue || 0),
        totalLandPayouts: Number(propertyAgg._sum.totalPaidToOwner || 0),
        totalLandLiabilities: Number(propertyAgg._sum.balanceRemaining || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching accounting stats:', error);
    res.status(500).json({ success: false, message: 'Server error fetching accounting stats' });
  }
};
