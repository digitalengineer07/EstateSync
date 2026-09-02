const prisma = require('../config/db');
const { logAudit } = require('../utils/auditLogger');
const { getPrimaryTreasuryAdmin, getPrimaryTreasuryWallet } = require('../utils/treasuryHelper');
const {
  ensureStandardAccounts,
  postSalaryPaymentSettlementJournal,
  postSalaryPaymentReversalJournal
} = require('../utils/accountingHelper');
const {
  checkDuplicateReferenceNo,
  registerBankReference,
  markReferenceReversed
} = require('../utils/referenceValidator');

// Canonical tolerance for financial precision
const FINANCIAL_TOLERANCE = 0.009;

// State transition validation map
const ALLOWED_PAYMENT_TRANSITIONS = {
  'DRAFT': ['PENDING_APPROVAL', 'CANCELLED'],
  'PENDING_APPROVAL': ['APPROVED', 'DRAFT', 'CANCELLED'],
  'APPROVED': ['PROCESSING', 'SETTLED', 'CANCELLED'],
  'PROCESSING': ['SETTLED', 'FAILED'],
  'SETTLED': ['REVERSED'],
  'FAILED': [],
  'CANCELLED': [],
  'REVERSED': []
};

const ALLOWED_BATCH_TRANSITIONS = {
  'DRAFT': ['PENDING_APPROVAL', 'CANCELLED'],
  'PENDING_APPROVAL': ['APPROVED', 'DRAFT', 'CANCELLED'],
  'APPROVED': ['PROCESSING', 'SETTLED', 'PARTIALLY_SETTLED', 'CANCELLED'],
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

    // Segregation of Duties: Creator cannot approve their own batch
    if (batch.submittedBy && actorEmail && batch.submittedBy.toLowerCase() === actorEmail.toLowerCase()) {
      // Allow if actor is ADMIN
      const actorUser = await tx.user.findUnique({
        where: { email: actorEmail },
        include: { role: true }
      });
      if (!actorUser || actorUser.role?.name !== 'ADMIN') {
        throw {
          status: 403,
          code: 'SEGREGATION_OF_DUTIES_VIOLATION',
          message: 'Segregation of Duties Violation: You cannot approve a payment batch that you submitted.'
        };
      }
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
 * 10. Phase 5B: Settle Single Salary Payment (Atomic Treasury Movement & GL Settlement)
 */
async function settleSalaryPayment({
  paymentId,
  paymentDate,
  referenceNo,
  paymentMode,
  sourceAccountCode = '1010',
  actorEmail,
  actorId,
  req
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. Lock SalaryPayment row
    const lockedPayments = await tx.$queryRaw`
      SELECT id, "paymentNumber", "payrollRunId", "payrollItemId", "employeeId", "salaryPaymentBatchId",
             "amount", "paymentMode", "sourceAccountCode", "status", "journalEntryId", "walletTransactionId", "referenceNo"
      FROM public."SalaryPayment"
      WHERE id = ${paymentId}
      FOR UPDATE
    `;

    if (!lockedPayments || lockedPayments.length === 0) {
      throw { status: 404, code: 'PAYMENT_NOT_FOUND', message: 'Salary Payment not found.' };
    }
    const payment = lockedPayments[0];

    // 2. Validate Payment Status Eligibility (APPROVED or PROCESSING only)
    if (!['APPROVED', 'PROCESSING'].includes(payment.status)) {
      throw {
        status: 400,
        code: 'INVALID_PAYMENT_STATUS_FOR_SETTLEMENT',
        message: `Payment is in "${payment.status}" status. Only APPROVED or PROCESSING payments can be settled.`
      };
    }

    // Guard: Prevent double-settlement
    if (payment.journalEntryId || payment.status === 'SETTLED') {
      throw {
        status: 400,
        code: 'PAYMENT_ALREADY_SETTLED',
        message: `Payment ${payment.paymentNumber} has already been settled under journal ${payment.journalEntryId}.`
      };
    }

    // 3. Lock PayrollItem & Validate Phase 4
    const lockedItems = await tx.$queryRaw`
      SELECT id, "payrollRunId", "employeeId", "netPayable", "employeeNameSnapshot", "employeeCodeSnapshot"
      FROM public."PayrollItem"
      WHERE id = ${payment.payrollItemId}
      FOR UPDATE
    `;

    if (!lockedItems || lockedItems.length === 0) {
      throw { status: 404, code: 'PAYROLL_ITEM_NOT_FOUND', message: 'Associated Payroll Item not found.' };
    }
    const item = lockedItems[0];

    const run = await tx.payrollRun.findUnique({
      where: { id: item.payrollRunId },
      include: { accountingPosting: true }
    });

    if (!run || run.status !== 'LOCKED') {
      throw {
        status: 400,
        code: 'PAYROLL_NOT_LOCKED',
        message: `Associated Payroll Run is in "${run?.status || 'UNKNOWN'}" status. Settlement requires a LOCKED payroll run.`
      };
    }

    if (!run.accountingPosting || run.accountingPosting.status !== 'POSTED') {
      throw {
        status: 400,
        code: 'PAYROLL_NOT_POSTED_TO_GL',
        message: 'Payroll Run has not been posted to General Ledger (Phase 4 accrual required before settlement).'
      };
    }

    const payAmount = Math.round(Number(payment.amount) * 100) / 100;
    const netPayable = Math.round(Number(item.netPayable) * 100) / 100;

    // 4. Recalculate Live Capacity (Exclude current payment's reservation to avoid double counting)
    const settledAgg = await tx.salaryPayment.aggregate({
      where: { payrollItemId: item.id, status: 'SETTLED' },
      _sum: { amount: true }
    });
    const settledSoFar = Math.round(Number(settledAgg._sum.amount || 0) * 100) / 100;

    const otherReservedAgg = await tx.salaryPayment.aggregate({
      where: {
        payrollItemId: item.id,
        status: { in: ['APPROVED', 'PROCESSING'] },
        id: { not: payment.id }
      },
      _sum: { amount: true }
    });
    const otherReserved = Math.round(Number(otherReservedAgg._sum.amount || 0) * 100) / 100;

    const availableCapacity = Math.round((netPayable - settledSoFar - otherReserved) * 100) / 100;
    if (payAmount > availableCapacity + FINANCIAL_TOLERANCE) {
      throw {
        status: 400,
        code: 'OVERPAYMENT_PROHIBITED',
        message: `Settlement amount ₹${payAmount.toFixed(2)} exceeds available capacity ₹${availableCapacity.toFixed(2)} for employee ${item.employeeNameSnapshot}.`
      };
    }

    // 5. Reference / UTR Duplicate Validation & Global Registry Registration
    const cleanRef = (referenceNo || payment.referenceNo || '').trim();
    const effectivePaymentMode = (paymentMode || payment.paymentMode || 'BANK_TRANSFER').toUpperCase();
    const fMode = effectivePaymentMode === 'CASH' ? 'CASH' : 'LIQUID';

    if (cleanRef) {
      // Register in centralized GlobalBankReference registry atomically with concurrency lock
      await registerBankReference(tx, {
        referenceNo: cleanRef,
        module: 'SALARY_PAYMENT',
        sourceTable: 'SalaryPayment',
        sourceRecordId: payment.id,
        amount: payAmount,
        bankName: payment.bankName,
        paymentMode: effectivePaymentMode,
        recordedBy: actorEmail
      });
    }

    // 6. Source Account Validation & Treasury Wallet Lock
    const effectiveSourceCode = sourceAccountCode || payment.sourceAccountCode || '1010';
    const sourceAccount = await tx.account.findUnique({ where: { code: effectiveSourceCode } });
    if (!sourceAccount || sourceAccount.type !== 'ASSET') {
      throw {
        status: 400,
        code: 'INVALID_SOURCE_ACCOUNT',
        message: `Source account "${effectiveSourceCode}" must be a valid active ASSET account.`
      };
    }

    const admin = await getPrimaryTreasuryAdmin(tx);
    if (!admin) {
      throw { status: 500, code: 'TREASURY_ADMIN_NOT_FOUND', message: 'No Master Admin Account found for Corporate Treasury.' };
    }

    const lockedWallets = await tx.$queryRaw`
      SELECT id, "userId", "availableBalanceLiquid", "availableBalanceCash", "totalSpentLiquid", "totalSpentCash"
      FROM public."Wallet"
      WHERE "userId" = ${admin.id}
      FOR UPDATE
    `;

    if (!lockedWallets || lockedWallets.length === 0) {
      throw { status: 500, code: 'TREASURY_WALLET_NOT_FOUND', message: 'Corporate Treasury Wallet not initialized.' };
    }
    const treasuryWallet = lockedWallets[0];

    const balanceField = fMode === 'CASH' ? 'availableBalanceCash' : 'availableBalanceLiquid';
    const spentField = fMode === 'CASH' ? 'totalSpentCash' : 'totalSpentLiquid';
    const currentBalance = Math.round(Number(treasuryWallet[balanceField]) * 100) / 100;

    if (payAmount > currentBalance + FINANCIAL_TOLERANCE) {
      throw {
        status: 400,
        code: 'INSUFFICIENT_TREASURY_FUNDS',
        message: `Corporate Treasury has insufficient ${fMode} funds (Available: ₹${currentBalance.toFixed(2)}, Required: ₹${payAmount.toFixed(2)}).`
      };
    }

    // 7. Deduct from Corporate Treasury Wallet
    await tx.wallet.update({
      where: { id: treasuryWallet.id },
      data: {
        [balanceField]: { decrement: payAmount },
        [spentField]: { increment: payAmount }
      }
    });

    // 8. Create WalletTransaction with COMPLETED status
    const walletTx = await tx.walletTransaction.create({
      data: {
        type: 'SALARY_PAYMENT',
        sourceWalletId: treasuryWallet.id,
        destWalletId: null,
        amount: payAmount,
        fundMode: fMode,
        referenceType: 'SALARY_PAYMENT',
        referenceId: payment.id,
        description: `Salary disbursement of ₹${payAmount.toLocaleString('en-IN')} to ${item.employeeNameSnapshot} (${item.employeeCodeSnapshot}) via ${effectivePaymentMode}`,
        createdBy: actorId || 'SYSTEM',
        status: 'COMPLETED'
      }
    });

    // 9. Post Double-Entry Settlement Journal: Dr 2010 Net Salaries Payable, Cr Source Bank/Cash
    const journal = await postSalaryPaymentSettlementJournal(tx, {
      amount: payAmount,
      employeeName: item.employeeNameSnapshot,
      employeeCode: item.employeeCodeSnapshot,
      paymentNumber: payment.paymentNumber,
      sourceAccountCode: effectiveSourceCode,
      referenceId: payment.id,
      createdBy: actorEmail || 'SYSTEM'
    });

    // 10. Update SalaryPayment to SETTLED
    const settledPayment = await tx.salaryPayment.update({
      where: { id: payment.id },
      data: {
        status: 'SETTLED',
        settledAt: paymentDate ? new Date(paymentDate) : new Date(),
        settledBy: actorEmail || 'SYSTEM',
        journalEntryId: journal.id,
        walletTransactionId: walletTx.id,
        paymentMode: effectivePaymentMode,
        sourceAccountCode: effectiveSourceCode,
        referenceNo: cleanRef || null,
        updatedAt: new Date()
      }
    });

    // 11. Update Parent Batch settlement status if present
    if (payment.salaryPaymentBatchId) {
      const siblingPayments = await tx.salaryPayment.findMany({
        where: { salaryPaymentBatchId: payment.salaryPaymentBatchId }
      });
      const allSettled = siblingPayments.every(p => p.status === 'SETTLED');
      const someSettled = siblingPayments.some(p => p.status === 'SETTLED');
      const newBatchStatus = allSettled ? 'SETTLED' : (someSettled ? 'PARTIALLY_SETTLED' : 'PROCESSING');

      await tx.salaryPaymentBatch.update({
        where: { id: payment.salaryPaymentBatchId },
        data: {
          status: newBatchStatus,
          settledBy: allSettled ? (actorEmail || 'SYSTEM') : undefined,
          updatedAt: new Date()
        }
      });
    }

    // 12. Log Financial Audit Event
    await logAudit({
      actorId,
      actorEmail,
      action: 'SALARY_PAYMENT_SETTLE',
      entityType: 'SALARY_PAYMENT',
      entityId: payment.id,
      newValues: {
        paymentNumber: payment.paymentNumber,
        payrollRunId: payment.payrollRunId,
        employeeId: payment.employeeId,
        amount: payAmount,
        journalEntryId: journal.id,
        journalEntryNumber: journal.entryNumber,
        walletTransactionId: walletTx.id,
        referenceNo: cleanRef || null,
        fundMode: fMode
      },
      req,
      tx
    });

    return {
      success: true,
      message: `Salary Payment ${payment.paymentNumber} settled successfully. Treasury deducted ₹${payAmount.toFixed(2)} and GL journal ${journal.entryNumber} posted.`,
      payment: settledPayment,
      journal,
      walletTransaction: walletTx
    };
  }, { timeout: 30000, maxWait: 10000 });
}

/**
 * 11. Phase 5B: Settle Salary Payment Batch (Processes All Approved Items in Deterministic Order)
 */
async function settleSalaryPaymentBatch({
  batchId,
  paymentDate,
  actorEmail,
  actorId,
  req
}) {
  const batch = await prisma.salaryPaymentBatch.findUnique({
    where: { id: batchId },
    include: { payments: true }
  });

  if (!batch) {
    throw { status: 404, code: 'BATCH_NOT_FOUND', message: 'Salary Payment Batch not found.' };
  }

  if (!['APPROVED', 'PROCESSING', 'PARTIALLY_SETTLED'].includes(batch.status)) {
    throw {
      status: 400,
      code: 'INVALID_STATUS_FOR_SETTLEMENT',
      message: `Cannot settle batch in "${batch.status}" status. Only APPROVED or PROCESSING batches can be settled.`
    };
  }

  // Sort payment IDs deterministically to eliminate deadlocks
  const sortedPayments = [...batch.payments].sort((a, b) => a.id.localeCompare(b.id));
  const settlementResults = [];

  for (const p of sortedPayments) {
    if (['APPROVED', 'PROCESSING'].includes(p.status)) {
      try {
        const res = await settleSalaryPayment({
          paymentId: p.id,
          paymentDate,
          actorEmail,
          actorId,
          req
        });
        settlementResults.push({ paymentId: p.id, status: 'SETTLED', result: res });
      } catch (err) {
        settlementResults.push({ paymentId: p.id, status: 'FAILED', error: err.message || err });
      }
    } else {
      settlementResults.push({ paymentId: p.id, status: p.status, note: 'Skipped (Already settled or cancelled)' });
    }
  }

  // Refresh batch state
  const updatedBatch = await prisma.salaryPaymentBatch.findUnique({
    where: { id: batchId },
    include: { payments: true }
  });

  await logAudit({
    actorId,
    actorEmail,
    action: 'SALARY_BATCH_SETTLE',
    entityType: 'SALARY_PAYMENT_BATCH',
    entityId: batch.id,
    newValues: {
      batchNumber: batch.batchNumber,
      totalPayments: batch.payments.length,
      settledCount: settlementResults.filter(r => r.status === 'SETTLED').length,
      batchStatus: updatedBatch.status
    },
    req
  });

  return {
    success: true,
    message: `Salary Payment Batch ${batch.batchNumber} processed. Outcome: ${updatedBatch.status}`,
    batch: updatedBatch,
    results: settlementResults
  };
}

/**
 * 12. Phase 5B: Reverse Salary Payment Settlement (Admin Only Reversal)
 */
async function reverseSalaryPaymentSettlement({
  paymentId,
  reason,
  actorEmail,
  actorId,
  req
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. Lock SalaryPayment
    const lockedPayments = await tx.$queryRaw`
      SELECT id, "paymentNumber", "payrollRunId", "payrollItemId", "employeeId", "salaryPaymentBatchId",
             "amount", "paymentMode", "sourceAccountCode", "status", "journalEntryId", "walletTransactionId", "reversalReason"
      FROM public."SalaryPayment"
      WHERE id = ${paymentId}
      FOR UPDATE
    `;

    if (!lockedPayments || lockedPayments.length === 0) {
      throw { status: 404, code: 'PAYMENT_NOT_FOUND', message: 'Salary Payment not found.' };
    }
    const payment = lockedPayments[0];

    if (payment.status !== 'SETTLED') {
      throw {
        status: 400,
        code: 'INVALID_STATUS_FOR_REVERSAL',
        message: `Payment is in "${payment.status}" status. Only SETTLED payments can be reversed.`
      };
    }

    if (payment.reversalReason || payment.status === 'REVERSED') {
      throw {
        status: 400,
        code: 'PAYMENT_ALREADY_REVERSED',
        message: `Payment ${payment.paymentNumber} has already been reversed.`
      };
    }

    // 2. Lock PayrollItem
    const lockedItems = await tx.$queryRaw`
      SELECT id, "payrollRunId", "employeeId", "netPayable", "employeeNameSnapshot", "employeeCodeSnapshot"
      FROM public."PayrollItem"
      WHERE id = ${payment.payrollItemId}
      FOR UPDATE
    `;
    const item = lockedItems[0];

    const payAmount = Math.round(Number(payment.amount) * 100) / 100;
    const effectiveSourceCode = payment.sourceAccountCode || '1010';
    const fMode = payment.paymentMode === 'CASH' ? 'CASH' : 'LIQUID';
    const balanceField = fMode === 'CASH' ? 'availableBalanceCash' : 'availableBalanceLiquid';
    const spentField = fMode === 'CASH' ? 'totalSpentCash' : 'totalSpentLiquid';

    // 3. Lock Treasury Wallet & Restore Funds
    const admin = await getPrimaryTreasuryAdmin(tx);
    if (!admin) {
      throw { status: 500, code: 'TREASURY_ADMIN_NOT_FOUND', message: 'No Master Admin Account found for Corporate Treasury.' };
    }

    const lockedWallets = await tx.$queryRaw`
      SELECT id FROM public."Wallet" WHERE "userId" = ${admin.id} FOR UPDATE
    `;
    const treasuryWallet = lockedWallets[0];

    await tx.wallet.update({
      where: { id: treasuryWallet.id },
      data: {
        [balanceField]: { increment: payAmount },
        [spentField]: { decrement: payAmount }
      }
    });

    // 4. Create Reversal WalletTransaction
    const revWalletTx = await tx.walletTransaction.create({
      data: {
        type: 'SALARY_PAYMENT_REVERSAL',
        sourceWalletId: null,
        destWalletId: treasuryWallet.id,
        amount: payAmount,
        fundMode: fMode,
        referenceType: 'SALARY_PAYMENT_REVERSAL',
        referenceId: payment.id,
        description: `Reversal of salary settlement: ${payment.paymentNumber} — ${item.employeeNameSnapshot} (Reason: ${reason || 'Administrative Correction'})`,
        createdBy: actorId || 'SYSTEM',
        status: 'COMPLETED'
      }
    });

    // 5. Post Reversal Double-Entry Journal: Dr Source Bank/Cash, Cr 2010 Net Salaries Payable
    const revJournal = await postSalaryPaymentReversalJournal(tx, {
      amount: payAmount,
      employeeName: item.employeeNameSnapshot,
      employeeCode: item.employeeCodeSnapshot,
      paymentNumber: payment.paymentNumber,
      sourceAccountCode: effectiveSourceCode,
      referenceId: payment.id,
      createdBy: actorEmail || 'SYSTEM',
      reason
    });

    // 6. Update SalaryPayment to REVERSED & Mark Reference Reversed in Registry
    if (payment.referenceNo) {
      await markReferenceReversed(tx, {
        referenceNo: payment.referenceNo,
        sourceRecordId: payment.id,
        reason
      });
    }

    const reversedPayment = await tx.salaryPayment.update({
      where: { id: payment.id },
      data: {
        status: 'REVERSED',
        reversalReason: reason || 'Administrative Reversal',
        updatedAt: new Date()
      }
    });

    // 7. Update Parent Batch status if applicable
    if (payment.salaryPaymentBatchId) {
      const siblingPayments = await tx.salaryPayment.findMany({
        where: { salaryPaymentBatchId: payment.salaryPaymentBatchId }
      });
      const someSettled = siblingPayments.some(p => p.status === 'SETTLED');
      const allReversed = siblingPayments.every(p => p.status === 'REVERSED' || p.status === 'CANCELLED');
      const newBatchStatus = allReversed ? 'CANCELLED' : (someSettled ? 'PARTIALLY_SETTLED' : 'APPROVED');

      await tx.salaryPaymentBatch.update({
        where: { id: payment.salaryPaymentBatchId },
        data: {
          status: newBatchStatus,
          updatedAt: new Date()
        }
      });
    }

    // 8. Audit Log
    await logAudit({
      actorId,
      actorEmail,
      action: 'SALARY_PAYMENT_REVERSE',
      entityType: 'SALARY_PAYMENT',
      entityId: payment.id,
      oldValues: { status: 'SETTLED', journalEntryId: payment.journalEntryId },
      newValues: {
        status: 'REVERSED',
        reversalReason: reason,
        reversalJournalId: revJournal.id,
        reversalJournalNumber: revJournal.entryNumber,
        reversalWalletTxId: revWalletTx.id
      },
      req,
      tx
    });

    return {
      success: true,
      message: `Salary Payment ${payment.paymentNumber} reversed successfully. Treasury restored ₹${payAmount.toFixed(2)} and reversal journal ${revJournal.entryNumber} posted.`,
      payment: reversedPayment,
      reversalJournal: revJournal,
      reversalWalletTransaction: revWalletTx
    };
  }, { timeout: 30000, maxWait: 10000 });
}

/**
 * 13. Phase 5B: Read-Only Settlement Preview
 */
async function getPaymentSettlementPreview(paymentId) {
  const payment = await prisma.salaryPayment.findUnique({
    where: { id: paymentId },
    include: {
      payrollRun: {
        include: {
          payrollPeriod: true,
          accountingPosting: true
        }
      },
      payrollItem: true,
      employee: true
    }
  });

  if (!payment) {
    throw { status: 404, code: 'PAYMENT_NOT_FOUND', message: 'Salary Payment not found.' };
  }

  const payableStatus = await getEmployeePayableStatus({ payrollItemId: payment.payrollItemId });
  const admin = await getPrimaryTreasuryAdmin(prisma);
  const wallet = admin?.wallet;

  const fMode = payment.paymentMode === 'CASH' ? 'CASH' : 'LIQUID';
  const treasuryBalance = fMode === 'CASH' ? Number(wallet?.availableBalanceCash || 0) : Number(wallet?.availableBalanceLiquid || 0);

  const payAmount = Number(payment.amount);

  return {
    paymentId: payment.id,
    paymentNumber: payment.paymentNumber,
    status: payment.status,
    amount: payAmount,
    paymentMode: payment.paymentMode,
    fundMode: fMode,
    sourceAccountCode: payment.sourceAccountCode,
    employee: {
      id: payment.employee.id,
      name: payment.employee.fullName,
      code: payment.employee.employeeCode
    },
    payable: {
      netPayable: payableStatus.netPayable,
      settledAmount: payableStatus.settledAmount,
      reservedAmount: payableStatus.reservedAmount,
      availablePayable: payableStatus.availablePayable,
      outstandingLiability: payableStatus.outstandingLiability
    },
    treasury: {
      fundMode: fMode,
      availableBalance: treasuryBalance,
      isSufficient: treasuryBalance >= payAmount
    },
    proposedJournal: {
      description: `Salary Disbursement: ${payment.paymentNumber} — ${payment.employee.fullName}`,
      lines: [
        { accountCode: '2010', accountName: 'Net Salaries Payable', debit: payAmount, credit: 0 },
        { accountCode: payment.sourceAccountCode || '1010', accountName: 'Corporate Treasury / Bank', debit: 0, credit: payAmount }
      ],
      isBalanced: true
    },
    isEligibleForSettlement: ['APPROVED', 'PROCESSING'].includes(payment.status) && treasuryBalance >= payAmount && payment.payrollRun.status === 'LOCKED' && payment.payrollRun.accountingPosting?.status === 'POSTED'
  };
}

/**
 * 14. Get Complete Payment Summary for a Payroll Run (Read-Only Preview)
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
  settleSalaryPayment,
  settleSalaryPaymentBatch,
  reverseSalaryPaymentSettlement,
  getPaymentSettlementPreview,
  getPayrollPaymentSummary,
  ALLOWED_PAYMENT_TRANSITIONS,
  ALLOWED_BATCH_TRANSITIONS
};
