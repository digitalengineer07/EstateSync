const prisma = require('../config/db');

/**
 * Customer Ledger, Aging & GL Reconciliation Service (Phase 7D)
 */

/**
 * Get Customer Statement of Account
 */
async function getCustomerStatement({ customerId, startDate, endDate }) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      salesOwner: { select: { id: true, name: true, email: true } },
      paymentPlan: { select: { id: true, name: true } }
    }
  });

  if (!customer) {
    throw { status: 404, message: 'Customer not found.' };
  }

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  // Calculate Opening Balance prior to startDate
  let openingBalance = 0;
  if (start) {
    const priorEntries = await prisma.customerLedgerEntry.findMany({
      where: {
        customerId,
        postingDate: { lt: start }
      },
      select: { debit: true, credit: true }
    });

    for (const e of priorEntries) {
      openingBalance += (parseFloat(e.debit) - parseFloat(e.credit));
    }
  }

  // Fetch entries in date range
  const where = { customerId };
  if (start && end) {
    where.postingDate = { gte: start, lte: end };
  } else if (start) {
    where.postingDate = { gte: start };
  } else if (end) {
    where.postingDate = { lte: end };
  }

  const entries = await prisma.customerLedgerEntry.findMany({
    where,
    orderBy: { postingDate: 'asc' }
  });

  let totalDebits = 0;
  let totalCredits = 0;
  let running = openingBalance;

  const statementLines = entries.map(e => {
    const d = parseFloat(e.debit);
    const c = parseFloat(e.credit);
    totalDebits += d;
    totalCredits += c;
    running += (d - c);

    return {
      id: e.id,
      entryNumber: e.entryNumber,
      postingDate: e.postingDate,
      entryType: e.entryType,
      referenceType: e.referenceType,
      referenceId: e.referenceId,
      description: e.description,
      debit: d,
      credit: c,
      balance: running
    };
  });

  const closingBalance = openingBalance + totalDebits - totalCredits;

  return {
    customer: {
      id: customer.id,
      name: customer.customerName,
      contact: customer.customerContact,
      plotNo: customer.plotNo,
      projectLocation: customer.projectLocation,
      totalContractValue: parseFloat(customer.totalContractValue),
      paymentPlan: customer.paymentPlan?.name || 'CUSTOM'
    },
    statementPeriod: {
      startDate: start ? start.toISOString().slice(0, 10) : 'ALL',
      endDate: end ? end.toISOString().slice(0, 10) : 'ALL'
    },
    openingBalance,
    totalDebits,
    totalCredits,
    closingBalance,
    netPosition: closingBalance > 0 ? 'RECEIVABLE_DUE' : (closingBalance < 0 ? 'ADVANCE_CREDIT' : 'SETTLED'),
    lines: statementLines
  };
}

/**
 * Generate Accounts Receivable (AR) Aging Report
 * Buckets: Current (<= 0 days overdue), 1-30 days, 31-60 days, 61-90 days, 90+ days
 */
async function getARAgingReport({ asOfDate = new Date() } = {}) {
  const evalDate = new Date(asOfDate);

  // Fetch all open demand notes (ISSUED or PARTIALLY_PAID)
  const openDemands = await prisma.customerDemandNote.findMany({
    where: {
      status: { in: ['ISSUED', 'PARTIALLY_PAID'] },
      outstandingAmount: { gt: 0 }
    },
    include: {
      customer: {
        select: { id: true, customerName: true, plotNo: true, projectLocation: true, customerContact: true }
      }
    },
    orderBy: { dueDate: 'asc' }
  });

  const summary = {
    current: 0,
    days1to30: 0,
    days31to60: 0,
    days61to90: 0,
    days90Plus: 0,
    totalOutstanding: 0,
    totalDemandsCount: openDemands.length
  };

  const customerAgingMap = new Map();

  for (const dn of openDemands) {
    const outstanding = parseFloat(dn.outstandingAmount);
    const dueDate = new Date(dn.dueDate);
    const diffMs = evalDate.getTime() - dueDate.getTime();
    const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let bucket = 'current';
    if (daysOverdue <= 0) {
      bucket = 'current';
      summary.current += outstanding;
    } else if (daysOverdue <= 30) {
      bucket = 'days1to30';
      summary.days1to30 += outstanding;
    } else if (daysOverdue <= 60) {
      bucket = 'days31to60';
      summary.days31to60 += outstanding;
    } else if (daysOverdue <= 90) {
      bucket = 'days61to90';
      summary.days61to90 += outstanding;
    } else {
      bucket = 'days90Plus';
      summary.days90Plus += outstanding;
    }

    summary.totalOutstanding += outstanding;

    // Customer grouping
    const custId = dn.customer.id;
    if (!customerAgingMap.has(custId)) {
      customerAgingMap.set(custId, {
        customer: dn.customer,
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        days90Plus: 0,
        totalOutstanding: 0,
        demandNotes: []
      });
    }

    const cGroup = customerAgingMap.get(custId);
    cGroup[bucket] += outstanding;
    cGroup.totalOutstanding += outstanding;
    cGroup.demandNotes.push({
      demandNumber: dn.demandNumber,
      milestoneName: dn.milestoneName,
      dueDate: dn.dueDate,
      daysOverdue,
      totalDemandAmount: parseFloat(dn.totalDemandAmount),
      outstandingAmount: outstanding,
      bucket
    });
  }

  return {
    asOfDate: evalDate.toISOString().slice(0, 10),
    summary: {
      current: Math.round(summary.current * 100) / 100,
      days1to30: Math.round(summary.days1to30 * 100) / 100,
      days31to60: Math.round(summary.days31to60 * 100) / 100,
      days61to90: Math.round(summary.days61to90 * 100) / 100,
      days90Plus: Math.round(summary.days90Plus * 100) / 100,
      totalOutstanding: Math.round(summary.totalOutstanding * 100) / 100,
      openDemandsCount: summary.totalDemandsCount
    },
    byCustomer: Array.from(customerAgingMap.values())
  };
}

/**
 * Automated Sub-Ledger to General Ledger Control Account Reconciliation
 */
async function getARReconciliationReport() {
  // 1. Calculate Customer Sub-Ledger Net Positions
  // A. Outstanding Receivables from active Demand Notes
  const activeDemands = await prisma.customerDemandNote.findMany({
    where: {
      status: { in: ['ISSUED', 'PARTIALLY_PAID'] },
      customer: { status: 'ACTIVE' }
    },
    select: { outstandingAmount: true, totalDemandAmount: true }
  });

  const subledgerReceivablesTotal = activeDemands.reduce(
    (acc, d) => acc + parseFloat(d.outstandingAmount || 0),
    0
  );

  // B. Total Active Billed Demands (Unearned Booking Revenue)
  const allNonCancelledDemands = await prisma.customerDemandNote.findMany({
    where: {
      status: { not: 'CANCELLED' },
      customer: { status: 'ACTIVE' }
    },
    select: { totalDemandAmount: true }
  });
  const totalBilledDemands = allNonCancelledDemands.reduce(
    (acc, d) => acc + parseFloat(d.totalDemandAmount || 0),
    0
  );

  // C. Unallocated Customer Advances (from customer running balances / excess receipts)
  const allCustomers = await prisma.customer.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, customerName: true, plotNo: true }
  });

  let subledgerUnallocatedAdvancesTotal = 0;
  const customerBreakdown = [];

  for (const c of allCustomers) {
    const entries = await prisma.customerLedgerEntry.findMany({
      where: { customerId: c.id },
      select: { debit: true, credit: true }
    });

    let net = 0;
    for (const e of entries) {
      net += (parseFloat(e.debit) - parseFloat(e.credit));
    }

    if (net > 0.009) {
      customerBreakdown.push({ customer: c, position: 'RECEIVABLE', amount: net });
    } else if (net < -0.009) {
      const adv = Math.abs(net);
      subledgerUnallocatedAdvancesTotal += adv;
      customerBreakdown.push({ customer: c, position: 'ADVANCE', amount: adv });
    }
  }

  // Total Sub-Ledger Advances & Unearned = Billed Demands + Unallocated Advance Deposits
  const subledgerAdvancesTotal = totalBilledDemands + subledgerUnallocatedAdvancesTotal;

  // 2. Fetch General Ledger Control Accounts Balances
  // Account 1200 (Accounts Receivable — ASSET)
  const arAccount = await prisma.account.findUnique({
    where: { code: '1200' },
    include: { journalLines: { select: { debit: true, credit: true } } }
  });

  let gl1200Balance = 0;
  if (arAccount) {
    const drSum = arAccount.journalLines.reduce((acc, l) => acc + parseFloat(l.debit), 0);
    const crSum = arAccount.journalLines.reduce((acc, l) => acc + parseFloat(l.credit), 0);
    gl1200Balance = drSum - crSum; // Normal Debit Balance
  }

  // Account 2040 (Customer Advances & Unearned — LIABILITY)
  const advanceAccount = await prisma.account.findUnique({
    where: { code: '2040' },
    include: { journalLines: { select: { debit: true, credit: true } } }
  });

  let gl2040Balance = 0;
  if (advanceAccount) {
    const drSum = advanceAccount.journalLines.reduce((acc, l) => acc + parseFloat(l.debit), 0);
    const crSum = advanceAccount.journalLines.reduce((acc, l) => acc + parseFloat(l.credit), 0);
    gl2040Balance = crSum - drSum; // Normal Credit Balance
  }

  // 3. Compute Discrepancies
  const arDiscrepancy = Math.abs(subledgerReceivablesTotal - gl1200Balance);
  const advanceDiscrepancy = Math.abs(subledgerAdvancesTotal - gl2040Balance);

  return {
    reconciliationTimestamp: new Date().toISOString(),
    accountsReceivable: {
      controlAccountCode: '1200',
      controlAccountName: arAccount ? arAccount.name : 'Accounts Receivable — Customer Control',
      glControlBalance: Math.round(gl1200Balance * 100) / 100,
      subledgerReceivablesSum: Math.round(subledgerReceivablesTotal * 100) / 100,
      discrepancy: Math.round(arDiscrepancy * 100) / 100,
      isReconciled: arDiscrepancy < 0.01
    },
    customerAdvances: {
      controlAccountCode: '2040',
      controlAccountName: advanceAccount ? advanceAccount.name : 'Customer Advances & Unearned Booking Revenue',
      glControlBalance: Math.round(gl2040Balance * 100) / 100,
      subledgerAdvancesSum: Math.round(subledgerAdvancesTotal * 100) / 100,
      unearnedBilledDemands: Math.round(totalBilledDemands * 100) / 100,
      unallocatedAdvances: Math.round(subledgerUnallocatedAdvancesTotal * 100) / 100,
      discrepancy: Math.round(advanceDiscrepancy * 100) / 100,
      isReconciled: advanceDiscrepancy < 0.01
    },
    overallReconciled: arDiscrepancy < 0.01 && advanceDiscrepancy < 0.01,
    customerBreakdown
  };
}

module.exports = {
  getCustomerStatement,
  getARAgingReport,
  getARReconciliationReport
};
