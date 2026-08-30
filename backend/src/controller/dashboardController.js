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
        availableBalance: wallet.availableBalance,
        totalAllocated: wallet.totalAllocated,
        totalSpent: wallet.totalSpent,
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
        managerAvailableBalance: managerWallet.availableBalance,
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
    const treasuryBalance = parseFloat(treasuryWallet.availableBalance || 0);

    // 2. Sum of operational funds allocated to staff & managers (excluding Admin)
    const teamWallets = await prisma.wallet.aggregate({
      where: {
        user: { role: { name: { not: 'ADMIN' } } }
      },
      _sum: {
        totalAllocated: true,
        availableBalance: true,
        totalSpent: true
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
    const totalAllocated = Number(teamWallets._sum.totalAllocated || 0);
    const totalSpent = Number(teamWallets._sum.totalSpent || 0);
    const utilizationRate = totalAllocated > 0 ? ((totalSpent / totalAllocated) * 100).toFixed(1) : '0.0';

    res.json({
      success: true,
      stats: {
        totalOrganizationalFunds: treasuryBalance,
        totalAllocated,
        totalTeamBalance: parseFloat(teamWallets._sum.availableBalance || 0),
        totalSpent,
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
    const treasuryBalance = parseFloat(treasuryWallet.availableBalance || 0);

    const teamWallets = await prisma.wallet.aggregate({
      where: {
        user: { role: { name: { not: 'ADMIN' } } }
      },
      _sum: {
        totalAllocated: true,
        availableBalance: true,
        totalSpent: true
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
    const totalAllocated = Number(teamWallets._sum.totalAllocated || 0);
    const totalSpent = Number(teamWallets._sum.totalSpent || 0);
    const utilizationRate = totalAllocated > 0 ? ((totalSpent / totalAllocated) * 100).toFixed(1) : '0.0';

    res.json({
      success: true,
      stats: {
        totalOrganizationalFunds: treasuryBalance,
        totalAllocated,
        totalTeamBalance: parseFloat(teamWallets._sum.availableBalance || 0),
        totalSpent,
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
