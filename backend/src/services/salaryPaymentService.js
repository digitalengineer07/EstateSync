const prisma = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

// Canonical tolerance for financial precision
const FINANCIAL_TOLERANCE = 0.009;

// State transition validation map
const ALLOWED_PAYMENT_TRANSITIONS = {
  'DRAFT': ['PENDING_APPROVAL', 'CANCELLED'],
  'PENDING_APPROVAL': ['APPROVED', 'DRAFT', 'CANCELLED'],
  'APPROVED': ['PROCESSING', 'CANCELLED'],
  'PROCESSING': ['SETTLED', 'FAILED'],
  'SETTLED': ['REVERSED'],
  'FAILED': [],
  'CANCELLED': [],
  'REVERSED': []
};

const ALLOWED_BATCH_TRANSITIONS = {
  'DRAFT': ['PENDING_APPROVAL', 'CANCELLED'],
  'PENDING_APPROVAL': ['APPROVED', 'DRAFT', 'CANCELLED'],
  'APPROVED': ['PROCESSING', 'CANCELLED'],
  'PROCESSING': ['SETTLED', 'PARTIALLY_SETTLED', 'CANCELLED'],
  'SETTLED': [],
  'PARTIALLY_SETTLED': [],
  'CANCELLED': []
};

/**
 * 1. Helper: Generates unique sequential payment identifier
 */
async function generatePaymentNumber(tx = prisma) {
  const dateStr = new Date().toISOString().slice(0, 7).replace(/-/g, '');
  const prefix = `PAY-${dateStr}-`;
  
  const latest = await tx.salaryPayment.findFirst({
    where: { paymentNumber: { startsWith: prefix } },
    orderBy: { paymentNumber: 'desc' }
  });

  let seq = 1;
  if (latest) {
    const parts = latest.paymentNumber.split('-');
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) seq = lastNum + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

/**
 * 2. Helper: Generates unique sequential batch identifier
 */
async function generateBatchNumber(tx = prisma) {
  const dateStr = new Date().toISOString().slice(0, 7).replace(/-/g, '');
  const prefix = `SPB-${dateStr}-`;
  
  const latest = await tx.salaryPaymentBatch.findFirst({
    where: { batchNumber: { startsWith: prefix } },
    orderBy: { batchNumber: 'desc' }
  });

  let seq = 1;
  if (latest) {
    const parts = latest.batchNumber.split('-');
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) seq = lastNum + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

/**
 * 3. Derived Payable Calculator
 * Calculates live settled, reserved, and available payable without mutating PayrollItem
 */
async function getEmployeePayableStatus({ payrollItemId, tx = prisma }) {
  const item = await tx.payrollItem.findUnique({
    where: { id: payrollItemId },
    include: {
      payrollRun: {
        include: {
          accountingPosting: true
        }
      },
      employee: true
    }
  });

  if (!item) {
    throw { status: 404, code: 'PAYROLL_ITEM_NOT_FOUND', message: 'Payroll Item not found.' };
  }

  const netPayable = Math.round(Number(item.netPayable) * 100) / 100;

  // Aggregate settled amounts (Permanently Liquidated)
  const settledAgg = await tx.salaryPayment.aggregate({
    where: {
      payrollItemId,
      status: 'SETTLED'
    },
    _sum: { amount: true }
  });
  const settledAmount = Math.round(Number(settledAgg._sum.amount || 0) * 100) / 100;

  // Aggregate active reserved amounts (APPROVED, PROCESSING)
  const reservedAgg = await tx.salaryPayment.aggregate({
    where: {
      payrollItemId,
      status: { in: ['APPROVED', 'PROCESSING'] }
    },
    _sum: { amount: true }
  });
  const reservedAmount = Math.round(Number(reservedAgg._sum.amount || 0) * 100) / 100;

  const availablePayable = Math.max(0, Math.round((netPayable - settledAmount - reservedAmount) * 100) / 100);
  const outstandingLiability = Math.max(0, Math.round((netPayable - settledAmount) * 100) / 100);

  return {
    payrollItem: item,
    netPayable,
    settledAmount,
    reservedAmount,
    availablePayable,
    outstandingLiability
  };
}

/**
 * 4. Multi-Employee Deterministic Row Locking Engine
 * Acquires SELECT FOR UPDATE locks in sorted order to guarantee zero deadlocks
 */
async function lockAndValidatePayrollItems({ payrollItemIds, tx }) {
  if (!payrollItemIds || payrollItemIds.length === 0) return new Map();

  // Deduplicate and sort IDs deterministically
  const sortedIds = Array.from(new Set(payrollItemIds)).sort();
  const lockedItemsMap = new Map();

  for (const id of sortedIds) {
    // Acquire PostgreSQL engine-level row lock
    const lockedRows = await tx.$queryRaw`
      SELECT id, "payrollRunId", "employeeId", "netPayable", "status"
      FROM public."PayrollItem"
      WHERE id = ${id}
      FOR UPDATE
    `;

    if (!lockedRows || lockedRows.length === 0) {
      throw { status: 404, code: 'PAYROLL_ITEM_NOT_FOUND', message: `Payroll item ${id} not found.` };
    }

    const lockedItem = lockedRows[0];

    // Verify run status and Phase 4 GL posting
    const run = await tx.payrollRun.findUnique({
      where: { id: lockedItem.payrollRunId },
      include: { accountingPosting: true }
    });

    if (!run) {
      throw { status: 404, code: 'PAYROLL_RUN_NOT_FOUND', message: 'Associated Payroll Run not found.' };
    }

    if (run.status !== 'LOCKED') {
      throw {
        status: 400,
        code: 'PAYROLL_NOT_LOCKED',
        message: `Payroll Run is in "${run.status}" status. Disbursements require a LOCKED payroll run.`
      };
    }

    if (!run.accountingPosting || run.accountingPosting.status !== 'POSTED') {
      throw {
        status: 400,
        code: 'PAYROLL_NOT_POSTED_TO_GL',
        message: 'Payroll Run has not been posted to General Ledger (Phase 4 accrual required before settlement).'
      };
    }

    // Calculate live available payable under the row lock
    const payableStatus = await getEmployeePayableStatus({ payrollItemId: id, tx });

    lockedItemsMap.set(id, {
      ...lockedItem,
      run,
      payableStatus
    });
  }

  return lockedItemsMap;
}

/**
 * 5. Create Draft / Pending Approval Salary Payment
 */
async function createSalaryPayment({
  payrollRunId,
  payrollItemId,
  employeeId,
  amount,
  paymentMode = 'BANK_TRANSFER',
  sourceAccountCode = '1010',
  bankName,
  accountNumberMasked,
  ifscCode,
  referenceNo,
  initialStatus = 'DRAFT',
  actorEmail,
  actorId,
  req
}) {
  const numAmount = Math.round(Number(amount) * 100) / 100;
  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
    throw { status: 400, code: 'INVALID_AMOUNT', message: 'A valid positive payment amount is required.' };
  }

  if (!['DRAFT', 'PENDING_APPROVAL'].includes(initialStatus)) {
    throw { status: 400, code: 'INVALID_INITIAL_STATUS', message: 'New payments can only be created in DRAFT or PENDING_APPROVAL status.' };
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Lock and validate parent PayrollItem
    const lockedMap = await lockAndValidatePayrollItems({ payrollItemIds: [payrollItemId], tx });
    const lockedData = lockedMap.get(payrollItemId);

    if (lockedData.payrollRunId !== payrollRunId) {
      throw { status: 400, code: 'RUN_ITEM_MISMATCH', message: 'Payroll Item does not belong to the specified Payroll Run.' };
    }

    if (lockedData.employeeId !== employeeId) {
      throw { status: 400, code: 'ITEM_EMPLOYEE_MISMATCH', message: 'Employee does not match the Payroll Item record.' };
    }

    const { availablePayable } = lockedData.payableStatus;

    if (numAmount > availablePayable + FINANCIAL_TOLERANCE) {
      throw {
        status: 400,
        code: 'OVERPAYMENT_PROHIBITED',
        message: `Payment amount (₹${numAmount.toFixed(2)}) exceeds available payable (₹${availablePayable.toFixed(2)}).`
      };
    }

    const paymentNumber = await generatePaymentNumber(tx);

    const payment = await tx.salaryPayment.create({
      data: {
        paymentNumber,
        payrollRunId,
        payrollItemId,
        employeeId,
        amount: numAmount,
        paymentMode: paymentMode.toUpperCase(),
        sourceAccountCode,
        bankName,
        accountNumberMasked,
        ifscCode,
        referenceNo: referenceNo ? referenceNo.trim() : null,
        status: initialStatus,
        createdBy: actorEmail || 'SYSTEM'
      }
    });

    await logAudit({
      actorId,
      actorEmail,
      action: 'SALARY_PAYMENT_CREATE',
      entityType: 'SALARY_PAYMENT',
      entityId: payment.id,
      newValues: {
        paymentNumber: payment.paymentNumber,
        payrollRunId,
        employeeId,
        amount: numAmount,
        status: payment.status
      },
      req,
      tx
    });

    return {
      success: true,
      message: `Salary Payment ${payment.paymentNumber} created successfully in "${payment.status}" status.`,
      payment,
      payableStatus: lockedData.payableStatus
    };
  });
}

/**
 * 6. Create Salary Payment Batch (Draft)
 */
async function createSalaryPaymentBatch({
  payrollRunId,
  paymentMode = 'BANK_TRANSFER',
  sourceAccountCode = '1010',
  notes,
  payments = [],
  actorEmail,
  actorId,
  req
}) {
  if (!payments || payments.length === 0) {
    throw { status: 400, code: 'EMPTY_PAYMENTS_ARRAY', message: 'Batch requires at least one employee payment line.' };
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Verify Run
    const run = await tx.payrollRun.findUnique({
      where: { id: payrollRunId },
      include: { accountingPosting: true }
    });

    if (!run) {
      throw { status: 404, code: 'PAYROLL_RUN_NOT_FOUND', message: 'Payroll Run not found.' };
    }

    if (run.status !== 'LOCKED') {
      throw {
        status: 400,
        code: 'PAYROLL_NOT_LOCKED',
        message: `Payroll Run is in "${run.status}" status. Only LOCKED runs can be disbursed.`
      };
    }

    if (!run.accountingPosting || run.accountingPosting.status !== 'POSTED') {
      throw {
        status: 400,
        code: 'PAYROLL_NOT_POSTED_TO_GL',
        message: 'Payroll Run has not been posted to General Ledger (Phase 4 accrual required).'
      };
    }

    // 2. Lock and validate all affected PayrollItems deterministically
    const itemIds = payments.map(p => p.payrollItemId);
    const lockedMap = await lockAndValidatePayrollItems({ payrollItemIds: itemIds, tx });

    let calculatedTotal = 0;
    const distinctEmployees = new Set();
    const validatedPaymentsData = [];

    for (const p of payments) {
      const numAmount = Math.round(Number(p.amount) * 100) / 100;
      if (!numAmount || numAmount <= 0) {
        throw { status: 400, code: 'INVALID_LINE_AMOUNT', message: `Invalid amount for payroll item ${p.payrollItemId}.` };
      }

      const lockedData = lockedMap.get(p.payrollItemId);
      if (!lockedData) {
        throw { status: 404, code: 'PAYROLL_ITEM_NOT_FOUND', message: `Payroll item ${p.payrollItemId} not found.` };
      }

      if (lockedData.payrollRunId !== payrollRunId) {
        throw { status: 400, code: 'RUN_ITEM_MISMATCH', message: `Payroll item ${p.payrollItemId} does not belong to run ${payrollRunId}.` };
      }

      if (numAmount > lockedData.payableStatus.availablePayable + FINANCIAL_TOLERANCE) {
        throw {
          status: 400,
          code: 'OVERPAYMENT_PROHIBITED',
          message: `Payment amount ₹${numAmount} for employee ${lockedData.employeeId} exceeds available payable ₹${lockedData.payableStatus.availablePayable}.`
        };
      }

      distinctEmployees.add(lockedData.employeeId);
      calculatedTotal = Math.round((calculatedTotal + numAmount) * 100) / 100;

      validatedPaymentsData.push({
        ...p,
        employeeId: lockedData.employeeId,
        amount: numAmount
      });
    }

    const batchNumber = await generateBatchNumber(tx);

    const batch = await tx.salaryPaymentBatch.create({
      data: {
        batchNumber,
        payrollRunId,
        paymentMode: paymentMode.toUpperCase(),
        sourceAccountCode,
        totalAmount: calculatedTotal,
        totalEmployees: distinctEmployees.size,
        status: 'DRAFT',
        notes,
        submittedBy: actorEmail || 'SYSTEM'
      }
    });

    // Create itemized payments linked to batch
    const createdPayments = [];
    for (const p of validatedPaymentsData) {
      const paymentNumber = await generatePaymentNumber(tx);
      const paymentRecord = await tx.salaryPayment.create({
        data: {
          paymentNumber,
          salaryPaymentBatchId: batch.id,
          payrollRunId,
          payrollItemId: p.payrollItemId,
          employeeId: p.employeeId,
          amount: p.amount,
          paymentMode: (p.paymentMode || paymentMode).toUpperCase(),
          sourceAccountCode,
          bankName: p.bankName,
          accountNumberMasked: p.accountNumberMasked,
          ifscCode: p.ifscCode,
          referenceNo: p.referenceNo ? p.referenceNo.trim() : null,
          status: 'DRAFT',
          createdBy: actorEmail || 'SYSTEM'
        }
      });
      createdPayments.push(paymentRecord);
    }

    await logAudit({
      actorId,
      actorEmail,
      action: 'SALARY_BATCH_CREATE',
      entityType: 'SALARY_PAYMENT_BATCH',
      entityId: batch.id,
      newValues: {
        batchNumber: batch.batchNumber,
        payrollRunId,
        totalAmount: calculatedTotal,
        totalEmployees: distinctEmployees.size,
        status: batch.status
      },
      req,
      tx
    });

    return {
      success: true,
      message: `Salary Payment Batch ${batch.batchNumber} created with ${createdPayments.length} payments.`,
      batch: {
        ...batch,
        payments: createdPayments
      }
    };
  });
}

/**
 * 7. Approve Salary Payment Batch (Executes Atomic Row Locking & Establishes Reservation)
 */
async function approveSalaryPaymentBatch({
  batchId,
  actorEmail,
  actorId,
  req
}) {
  return await prisma.$transaction(async (tx) => {
    const batch = await tx.salaryPaymentBatch.findUnique({
      where: { id: batchId },
      include: {
        payments: true
      }
    });

    if (!batch) {
      throw { status: 404, code: 'BATCH_NOT_FOUND', message: 'Salary Payment Batch not found.' };
    }

    // Validate state transition
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(batch.status)) {
      throw {
        status: 400,
        code: 'INVALID_STATUS_FOR_APPROVAL',
        message: `Cannot approve batch in "${batch.status}" status. Only DRAFT or PENDING_APPROVAL batches can be approved.`
      };
    }

    // Lock all affected PayrollItems in deterministic order
    const itemIds = batch.payments.map(p => p.payrollItemId);
    const lockedMap = await lockAndValidatePayrollItems({ payrollItemIds: itemIds, tx });

    // Validate reservation capacity under lock
    for (const p of batch.payments) {
      const lockedData = lockedMap.get(p.payrollItemId);
      const requestedAmount = Number(p.amount);
      const currentAvailable = lockedData.payableStatus.availablePayable;

      if (requestedAmount > currentAvailable + FINANCIAL_TOLERANCE) {
        throw {
          status: 409,
          code: 'CONCURRENT_OVERPAYMENT_BLOCKED',
          message: `Approval blocked: Payment amount ₹${requestedAmount.toFixed(2)} exceeds available payable ₹${currentAvailable.toFixed(2)} for employee ${p.employeeId}.`
        };
      }
    }

    // Transition batch and all its payment lines to APPROVED (Active Reservation Established)
    const updatedBatch = await tx.salaryPaymentBatch.update({
      where: { id: batch.id },
      data: {
        status: 'APPROVED',
        approvedBy: actorEmail || 'SYSTEM',
        updatedAt: new Date()
      }
    });

    await tx.salaryPayment.updateMany({
      where: { salaryPaymentBatchId: batch.id },
      data: {
        status: 'APPROVED',
        approvedBy: actorEmail || 'SYSTEM',
        updatedAt: new Date()
      }
    });

    await logAudit({
      actorId,
      actorEmail,
      action: 'SALARY_BATCH_APPROVE',
      entityType: 'SALARY_PAYMENT_BATCH',
      entityId: batch.id,
      oldValues: { status: batch.status },
      newValues: { status: 'APPROVED', approvedBy: actorEmail },
      req,
      tx
    });

    return {
      success: true,
      message: `Salary Payment Batch ${batch.batchNumber} successfully APPROVED and funds reserved.`,
      batch: updatedBatch
    };
  });
}

/**
 * 8. Cancel Salary Payment / Batch (Releases Reservation)
 */
async function cancelSalaryPaymentBatch({
  batchId,
  reason,
  actorEmail,
  actorId,
  req
}) {
  return await prisma.$transaction(async (tx) => {
    const batch = await tx.salaryPaymentBatch.findUnique({
      where: { id: batchId },
      include: { payments: true }
    });

    if (!batch) {
      throw { status: 404, code: 'BATCH_NOT_FOUND', message: 'Salary Payment Batch not found.' };
    }

    if (!['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(batch.status)) {
      throw {
        status: 400,
        code: 'INVALID_STATUS_FOR_CANCELLATION',
        message: `Cannot cancel batch in "${batch.status}" status. Only unexecuted batches can be cancelled.`
      };
    }

    const updatedBatch = await tx.salaryPaymentBatch.update({
      where: { id: batch.id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${batch.notes || ''} | Cancelled: ${reason}` : batch.notes,
        updatedAt: new Date()
      }
    });

    await tx.salaryPayment.updateMany({
      where: { salaryPaymentBatchId: batch.id },
      data: {
        status: 'CANCELLED',
        failureReason: reason || 'Batch cancelled by user',
        updatedAt: new Date()
      }
    });

    await logAudit({
      actorId,
      actorEmail,
      action: 'SALARY_BATCH_CANCEL',
      entityType: 'SALARY_PAYMENT_BATCH',
      entityId: batch.id,
      oldValues: { status: batch.status },
      newValues: { status: 'CANCELLED', reason },
      req,
      tx
    });

    return {
      success: true,
      message: `Salary Payment Batch ${batch.batchNumber} cancelled. Any reserved liability has been released.`,
      batch: updatedBatch
    };
  });
}

/**
 * 9. Direct Transition Helper for State Machine Tests (Internal/Domain Guard)
 */
async function transitionPaymentStatus({
  paymentId,
  targetStatus,
  failureReason,
  actorEmail,
  actorId,
  tx = prisma
}) {
  const payment = await tx.salaryPayment.findUnique({
    where: { id: paymentId }
  });

  if (!payment) {
    throw { status: 404, code: 'PAYMENT_NOT_FOUND', message: 'Salary Payment not found.' };
  }

  const allowed = ALLOWED_PAYMENT_TRANSITIONS[payment.status] || [];
  if (!allowed.includes(targetStatus)) {
    throw {
      status: 400,
      code: 'ILLEGAL_STATE_TRANSITION',
      message: `Illegal state transition from "${payment.status}" to "${targetStatus}". Allowed: [${allowed.join(', ')}].`
    };
  }

  const updated = await tx.salaryPayment.update({
    where: { id: payment.id },
    data: {
      status: targetStatus,
      failureReason: failureReason || payment.failureReason,
      settledAt: targetStatus === 'SETTLED' ? new Date() : payment.settledAt,
      settledBy: targetStatus === 'SETTLED' ? (actorEmail || 'SYSTEM') : payment.settledBy,
      updatedAt: new Date()
    }
  });

  return updated;
}

/**
 * 10. Get Complete Payment Summary for a Payroll Run (Read-Only Preview)
 */
async function getPayrollPaymentSummary(payrollRunId) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: payrollRunId },
    include: {
      payrollPeriod: true,
      accountingPosting: true,
      items: {
        include: {
          employee: true,
          salaryPayments: true
        }
      },
      paymentBatches: {
        include: {
          payments: true
        }
      }
    }
  });

  if (!run) {
    throw { status: 404, code: 'PAYROLL_RUN_NOT_FOUND', message: 'Payroll Run not found.' };
  }

  const runTotalNet = Math.round(Number(run.totalNet) * 100) / 100;
  let totalSettled = 0;
  let totalReserved = 0;

  const itemSummaries = [];

  for (const item of run.items) {
    const net = Math.round(Number(item.netPayable) * 100) / 100;
    
    let itemSettled = 0;
    let itemReserved = 0;

    for (const p of item.salaryPayments) {
      const amt = Math.round(Number(p.amount) * 100) / 100;
      if (p.status === 'SETTLED') {
        itemSettled = Math.round((itemSettled + amt) * 100) / 100;
      } else if (['APPROVED', 'PROCESSING'].includes(p.status)) {
        itemReserved = Math.round((itemReserved + amt) * 100) / 100;
      }
    }

    const itemAvailable = Math.max(0, Math.round((net - itemSettled - itemReserved) * 100) / 100);
    const itemOutstanding = Math.max(0, Math.round((net - itemSettled) * 100) / 100);

    totalSettled = Math.round((totalSettled + itemSettled) * 100) / 100;
    totalReserved = Math.round((totalReserved + itemReserved) * 100) / 100;

    itemSummaries.push({
      payrollItemId: item.id,
      employeeId: item.employeeId,
      employeeCode: item.employeeCodeSnapshot,
      employeeName: item.employeeNameSnapshot,
      netPayable: net,
      settledAmount: itemSettled,
      reservedAmount: itemReserved,
      availablePayable: itemAvailable,
      outstandingLiability: itemOutstanding,
      paymentsCount: item.salaryPayments.length
    });
  }

  const totalAvailable = Math.max(0, Math.round((runTotalNet - totalSettled - totalReserved) * 100) / 100);
  const totalOutstanding = Math.max(0, Math.round((runTotalNet - totalSettled) * 100) / 100);

  return {
    payrollRunId: run.id,
    period: `${run.payrollPeriod.year}-${String(run.payrollPeriod.month).padStart(2, '0')}`,
    runNumber: run.runNumber,
    runStatus: run.status,
    isPostedToGL: run.accountingPosting?.status === 'POSTED',
    totals: {
      totalNet: runTotalNet,
      totalSettled,
      totalReserved,
      totalAvailable,
      totalOutstanding
    },
    batchesCount: run.paymentBatches.length,
    items: itemSummaries
  };
}

module.exports = {
  getEmployeePayableStatus,
  lockAndValidatePayrollItems,
  createSalaryPayment,
  createSalaryPaymentBatch,
  approveSalaryPaymentBatch,
  cancelSalaryPaymentBatch,
  transitionPaymentStatus,
  getPayrollPaymentSummary,
  ALLOWED_PAYMENT_TRANSITIONS,
  ALLOWED_BATCH_TRANSITIONS
};
