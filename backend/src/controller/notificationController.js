const prisma = require('../config/db');

/**
 * Format relative time (e.g. "5m ago", "2h ago", "1d ago")
 */
function getRelativeTime(date) {
  if (!date) return 'Just now';
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/**
 * Format INR number with Indian comma separation
 */
function formatAmount(val) {
  if (!val) return '0';
  const num = Math.abs(parseFloat(val));
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/**
 * GET /api/v1/notifications
 * Live notification aggregator tailored to the authenticated user's role.
 * Read-only: Does NOT mutate or interfere with any accounting or transaction logic.
 */
exports.getNotifications = async (req, res) => {
  try {
    const userRole = (typeof req.user?.role === 'object' ? req.user?.role?.name : req.user?.role) || '';
    const userId = req.user?.userId || req.user?.id;

    const notifications = [];

    // 1. Customer Collections (Admin & Accounting)
    if (['ADMIN', 'ACCOUNTING'].includes(userRole)) {
      try {
        const payments = await prisma.customerPayment.findMany({
          take: 6,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: {
              select: {
                customerName: true,
                plotNo: true,
                projectLocation: true,
              },
            },
          },
        });

        for (const p of payments) {
          const custName = p.customer?.customerName || 'Customer';
          const plot = p.customer?.plotNo ? `Plot #${p.customer.plotNo}` : '';
          const project = p.customer?.projectLocation ? ` (${p.customer.projectLocation})` : '';
          const ref = p.referenceNo ? ` [Ref: ${p.referenceNo}]` : '';

          notifications.push({
            id: `payment-${p.id}`,
            title: 'Customer Collection Received',
            desc: `₹${formatAmount(p.amount)} received from ${custName} for ${plot}${project}${ref}.`,
            timestamp: p.createdAt,
            time: getRelativeTime(p.createdAt),
            category: 'Collections',
            link: userRole === 'ADMIN' ? '/dashboards/admin?tab=customers' : '/dashboards/accounting?tab=collections',
            targetTab: userRole === 'ADMIN' ? 'customers' : 'collections',
          });
        }
      } catch (err) {
        console.warn('Notification fetch error (payments):', err.message);
      }
    }

    // 2. Fund Requests & Approvals
    try {
      if (userRole === 'MANAGER') {
        // Manager sees pending requests from team members
        const pendingRequests = await prisma.fundRequest.findMany({
          where: { status: 'PENDING' },
          take: 6,
          orderBy: { createdAt: 'desc' },
          include: {
            requester: { select: { name: true, email: true } },
          },
        });

        for (const fr of pendingRequests) {
          const reqName = fr.requester?.name || fr.requester?.email || 'Team member';
          notifications.push({
            id: `fr-${fr.id}`,
            title: 'New Fund Request Pending',
            desc: `₹${formatAmount(fr.amount)} requested by ${reqName} for "${fr.reason}".`,
            timestamp: fr.createdAt,
            time: getRelativeTime(fr.createdAt),
            category: 'Approvals',
            link: '/dashboards/manager?tab=approvals',
            targetTab: 'approvals',
          });
        }
      } else if (userRole === 'ADMIN') {
        // Admin sees all incoming or approved fund requests
        const requests = await prisma.fundRequest.findMany({
          take: 6,
          orderBy: { createdAt: 'desc' },
          include: {
            requester: { select: { name: true } },
          },
        });

        for (const fr of requests) {
          const reqName = fr.requester?.name || 'Staff';
          const isApproved = fr.status === 'APPROVED';
          const isPending = fr.status === 'PENDING';

          notifications.push({
            id: `fr-${fr.id}`,
            title: isPending ? 'Fund Request Pending' : isApproved ? 'Fund Request Approved' : 'Fund Request Status',
            desc: `₹${formatAmount(fr.amount)} (${fr.status}) for ${reqName} - "${fr.reason}".`,
            timestamp: fr.updatedAt || fr.createdAt,
            time: getRelativeTime(fr.updatedAt || fr.createdAt),
            category: 'Approvals',
            link: '/dashboards/admin?tab=requests',
            targetTab: 'requests',
          });
        }
      } else {
        // Regular employees / staff see status of their own requests
        if (userId) {
          const myRequests = await prisma.fundRequest.findMany({
            where: { requesterId: userId },
            take: 5,
            orderBy: { updatedAt: 'desc' },
          });

          for (const fr of myRequests) {
            const isApproved = fr.status === 'APPROVED';
            const isRejected = fr.status === 'REJECTED';

            notifications.push({
              id: `my-fr-${fr.id}`,
              title: isApproved ? 'Fund Request Approved' : isRejected ? 'Fund Request Rejected' : 'Fund Request Submitted',
              desc: `Your request of ₹${formatAmount(fr.amount)} for "${fr.reason}" is ${fr.status.toLowerCase()}.`,
              timestamp: fr.updatedAt || fr.createdAt,
              time: getRelativeTime(fr.updatedAt || fr.createdAt),
              category: 'Approvals',
              link: '/dashboards/wallet',
              targetTab: 'wallet',
            });
          }
        }
      }
    } catch (err) {
      console.warn('Notification fetch error (fundRequests):', err.message);
    }

    // 3. Corporate Treasury & Capital Inflows (Admin & Accounting)
    if (['ADMIN', 'ACCOUNTING'].includes(userRole)) {
      try {
        const treasuryLogs = await prisma.auditLog.findMany({
          where: {
            action: { in: ['BANK_INFLOW_RECORD', 'CAPITAL_INFUSION', 'TREASURY_DISBURSEMENT', 'PAYROLL_RUN_DISBURSE'] },
          },
          take: 4,
          orderBy: { createdAt: 'desc' },
        });

        for (const log of treasuryLogs) {
          const isPayroll = log.action.includes('PAYROLL');
          const isDisburse = log.action.includes('DISBURSE');
          const title = isPayroll
            ? 'Corporate Payroll Disbursed'
            : isDisburse
            ? 'Corporate Treasury Disbursement'
            : 'Corporate Treasury Inflow';

          let desc = 'Treasury transaction recorded and balanced with bank statement.';
          if (log.newValues && typeof log.newValues === 'object') {
            const amt = log.newValues.amount || log.newValues.totalAmount;
            const bank = log.newValues.bankName;
            if (amt) {
              desc = `₹${formatAmount(amt)} ${isDisburse ? 'disbursed' : 'credited'}${bank ? ` via ${bank}` : ''}.`;
            }
          }

          notifications.push({
            id: `audit-${log.id}`,
            title,
            desc,
            timestamp: log.createdAt,
            time: getRelativeTime(log.createdAt),
            category: 'Treasury',
            link: userRole === 'ADMIN' ? '/dashboards/admin?tab=treasury' : '/dashboards/accounting?tab=treasury',
            targetTab: 'treasury',
          });
        }
      } catch (err) {
        console.warn('Notification fetch error (treasury):', err.message);
      }
    }

    // 4. Expense Submissions (Accounting, Manager, Admin)
    if (['ADMIN', 'ACCOUNTING', 'MANAGER'].includes(userRole)) {
      try {
        const expenses = await prisma.expense.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { name: true, email: true } },
          },
        });

        for (const exp of expenses) {
          const staffName = exp.user?.name || exp.user?.email || 'Field Staff';
          notifications.push({
            id: `exp-${exp.id}`,
            title: 'Expense Submission Filed',
            desc: `₹${formatAmount(exp.amount)} submitted by ${staffName} for "${exp.description || 'Site Expense'}".`,
            timestamp: exp.createdAt,
            time: getRelativeTime(exp.createdAt),
            category: 'Expenses',
            link: userRole === 'MANAGER'
              ? '/dashboards/manager?tab=expenses'
              : userRole === 'ACCOUNTING'
              ? '/dashboards/accounting?tab=wallets'
              : '/dashboards/admin?tab=transactions',
            targetTab: userRole === 'MANAGER' ? 'expenses' : (userRole === 'ACCOUNTING' ? 'wallets' : 'transactions'),
          });
        }
      } catch (err) {
        console.warn('Notification fetch error (expenses):', err.message);
      }
    }

    // 5. Accounting Period Status (Admin & Accounting)
    if (['ADMIN', 'ACCOUNTING'].includes(userRole)) {
      try {
        const now = new Date();
        const activePeriod =
          (await prisma.accountingPeriod.findFirst({
            where: {
              status: 'OPEN',
              startDate: { lte: now },
              endDate: { gte: now },
            },
          })) ||
          (await prisma.accountingPeriod.findFirst({
            where: { status: 'OPEN' },
            orderBy: { startDate: 'asc' },
          }));

        if (activePeriod) {
          notifications.push({
            id: `period-${activePeriod.id}`,
            title: 'Accounting Period Active',
            desc: `${activePeriod.periodName} reconciliation cycle open for entry submission and review.`,
            timestamp: activePeriod.startDate || activePeriod.createdAt || new Date(),
            time: getRelativeTime(activePeriod.startDate || activePeriod.createdAt),
            category: 'Period',
            link: userRole === 'ADMIN' ? '/dashboards/admin?tab=ledger' : '/dashboards/accounting?tab=ledger',
            targetTab: 'ledger',
          });
        }
      } catch (err) {
        console.warn('Notification fetch error (period):', err.message);
      }
    }

    // Sort combined events chronologically (newest first)
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit to top 15 most relevant notifications
    const finalNotifications = notifications.slice(0, 15);

    res.json({
      success: true,
      notifications: finalNotifications,
      total: finalNotifications.length,
    });
  } catch (error) {
    console.error('Error in getNotifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message,
    });
  }
};
