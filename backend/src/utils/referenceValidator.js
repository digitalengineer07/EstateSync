const prisma = require('../config/db');

/**
 * Normalize bank reference / UTR string:
 * - Trims leading/trailing whitespace
 * - Converts to uppercase for deterministic collation
 */
function normalizeReferenceNo(referenceNo) {
  if (!referenceNo || typeof referenceNo !== 'string') return null;
  const clean = referenceNo.trim().toUpperCase();
  return clean.length > 0 ? clean : null;
}

/**
 * Validate that a UTR / Bank Reference Number is globally unique across all banking flows:
 * 1. GlobalBankReference centralized registry
 * 2. Treasury Bank Inflows / Capital Infusions (WalletTransaction: CAPITAL_INFUSION / BANK_STATEMENT)
 * 3. Customer Collection Payments (CustomerPayment)
 * 4. Customer Cancellation Refunds (Customer.refundReferenceNo & CustomerPayment REFUND_DISBURSED)
 * 5. Land Acquisition Payouts (PropertyPayment)
 * 6. Salary Disbursements (SalaryPayment)
 *
 * @param {Object} tx - Prisma transaction or client
 * @param {string} referenceNo - The UTR / Cheque / Reference No to validate
 * @param {string|null} excludeSourceRecordId - Optional ID to exclude (e.g. current in-flight transaction record)
 * @returns {Promise<string|null>} - Returns duplicate error message if duplicate found, null if clean
 */
async function checkDuplicateReferenceNo(tx = prisma, referenceNo, excludeSourceRecordId = null) {
  const cleanRef = normalizeReferenceNo(referenceNo);
  if (!cleanRef) return null;

  // 1. Fast-Path: Check Centralized GlobalBankReference Registry
  const existingGlobal = await tx.globalBankReference.findUnique({
    where: { referenceNo: cleanRef }
  });

  if (existingGlobal && (!excludeSourceRecordId || existingGlobal.sourceRecordId !== String(excludeSourceRecordId))) {
    return `Duplicate UTR / Reference Error: Reference No. "${cleanRef}" is already recorded in ${existingGlobal.module} (Record: ${existingGlobal.sourceRecordId}, Status: ${existingGlobal.status}). Duplicate external banking entries are strictly prohibited.`;
  }

  // 2. Fallback: Check Customer Payments (Collections & Refunds)
  const existingCustPay = await tx.customerPayment.findFirst({
    where: {
      referenceNo: { equals: cleanRef, mode: 'insensitive' },
      status: { not: 'REVERSED' },
      id: excludeSourceRecordId ? { not: String(excludeSourceRecordId) } : undefined
    },
    include: {
      customer: { select: { customerName: true, plotNo: true } }
    }
  });

  if (existingCustPay) {
    const custInfo = existingCustPay.customer
      ? `customer "${existingCustPay.customer.customerName}" (Plot ${existingCustPay.customer.plotNo})`
      : 'a customer account';
    return `Duplicate UTR / Reference Error: Reference No. "${cleanRef}" is already recorded on a customer transaction for ${custInfo}. Duplicate entries are prohibited.`;
  }

  // 3. Fallback: Check Customer Cancellation Settlement Records
  const existingRefundCust = await tx.customer.findFirst({
    where: {
      refundReferenceNo: { equals: cleanRef, mode: 'insensitive' },
      id: excludeSourceRecordId ? { not: String(excludeSourceRecordId) } : undefined
    },
    select: { customerName: true, plotNo: true }
  });

  if (existingRefundCust) {
    return `Duplicate UTR / Reference Error: Reference No. "${cleanRef}" is already recorded on a cancellation refund for customer "${existingRefundCust.customerName}" (Plot ${existingRefundCust.plotNo}). Duplicate entries are prohibited.`;
  }

  // 4. Fallback: Check Land Acquisition Payments (Land Owner Payouts)
  const existingPropPay = await tx.propertyPayment.findFirst({
    where: {
      referenceNo: { equals: cleanRef, mode: 'insensitive' },
      status: { not: 'REVERSED' },
      id: excludeSourceRecordId ? { not: String(excludeSourceRecordId) } : undefined
    },
    include: {
      property: { select: { landOwnerName: true, plotNo: true, khataNo: true } }
    }
  });

  if (existingPropPay) {
    const ownerInfo = existingPropPay.property
      ? `land owner "${existingPropPay.property.landOwnerName}" (Plot ${existingPropPay.property.plotNo}, Khata ${existingPropPay.property.khataNo})`
      : 'a land acquisition parcel';
    return `Duplicate UTR / Reference Error: Reference No. "${cleanRef}" is already recorded on a land payout for ${ownerInfo}. Duplicate entries are prohibited.`;
  }

  // 5. Fallback: Check Treasury Bank Inflows / Capital Infusions
  const existingInflow = await tx.walletTransaction.findFirst({
    where: {
      OR: [
        { type: 'CAPITAL_INFUSION', referenceId: { equals: cleanRef, mode: 'insensitive' } },
        { referenceType: 'BANK_STATEMENT', referenceId: { equals: cleanRef, mode: 'insensitive' } }
      ],
      status: { not: 'REVERSED' },
      id: excludeSourceRecordId ? { not: String(excludeSourceRecordId) } : undefined
    }
  });

  if (existingInflow) {
    return `Duplicate UTR / Reference Error: Reference No. "${cleanRef}" is already recorded on a Corporate Treasury Bank Statement / Capital Infusion. Duplicate entries are prohibited.`;
  }

  // 6. Fallback: Check Salary Disbursements (SalaryPayment)
  const existingSalaryPay = await tx.salaryPayment.findFirst({
    where: {
      referenceNo: { equals: cleanRef, mode: 'insensitive' },
      status: { in: ['APPROVED', 'PROCESSING', 'SETTLED'] },
      id: excludeSourceRecordId ? { not: String(excludeSourceRecordId) } : undefined
    },
    include: {
      employee: { select: { fullName: true, employeeCode: true } }
    }
  });

  if (existingSalaryPay) {
    const empInfo = existingSalaryPay.employee
      ? `employee "${existingSalaryPay.employee.fullName}" (${existingSalaryPay.employee.employeeCode})`
      : 'a staff salary payment';
    return `Duplicate UTR / Reference Error: Reference No. "${cleanRef}" is already recorded on a salary disbursement for ${empInfo}. Duplicate entries are prohibited.`;
  }

  return null;
}

/**
 * Atomically registers a verified external banking reference into GlobalBankReference.
 * Must be executed INSIDE the calling transaction (tx) to guarantee ACID atomicity.
 */
async function registerBankReference(tx, {
  referenceNo,
  module,
  sourceTable,
  sourceRecordId,
  amount,
  bankName,
  paymentMode,
  recordedBy
}) {
  const cleanRef = normalizeReferenceNo(referenceNo);
  if (!cleanRef) return null;

  // Pure cash transactions without banking instruments bypass GlobalBankReference
  const normMode = (paymentMode || '').toUpperCase();
  if (normMode === 'CASH' && (cleanRef.startsWith('CSH-') || cleanRef.startsWith('CASH-') || cleanRef === 'CASH')) {
    return null;
  }

  // 1. Acquire PostgreSQL Advisory Transaction Lock on the Reference String
  // This serializes concurrent requests checking the same reference without deadlocks.
  try {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cleanRef}))`;
  } catch (lockErr) {
    // If raw query unavailable on mock/pooler, continue to DB constraint
    console.warn('Advisory lock skipped:', lockErr.message);
  }

  // 2. Check for duplicate reference (excluding the current in-flight record if it was already inserted in this tx)
  const dupError = await checkDuplicateReferenceNo(tx, cleanRef, sourceRecordId);
  if (dupError) {
    throw {
      status: 400,
      code: 'DUPLICATE_REFERENCE_NO',
      message: dupError
    };
  }

  // 3. Insert into GlobalBankReference
  try {
    const record = await tx.globalBankReference.create({
      data: {
        referenceNo: cleanRef,
        module,
        sourceTable,
        sourceRecordId: String(sourceRecordId),
        amount: Math.round(Number(amount || 0) * 100) / 100,
        bankName: bankName || null,
        paymentMode: (paymentMode || 'BANK_TRANSFER').toUpperCase(),
        status: 'ACTIVE',
        recordedBy: String(recordedBy || 'SYSTEM')
      }
    });
    return record;
  } catch (err) {
    if (err.code === 'P2002' || err.message?.includes('Unique constraint failed')) {
      throw {
        status: 400,
        code: 'DUPLICATE_REFERENCE_NO',
        message: `Duplicate UTR / Reference Error: Reference No. "${cleanRef}" is already recorded in another transaction. Concurrency collision prevented.`
      };
    }
    throw err;
  }
}

/**
 * Marks an existing GlobalBankReference as REVERSED upon authorized financial reversal.
 * Note: Reference remains registered to prevent reuse.
 */
async function markReferenceReversed(tx, {
  referenceNo,
  sourceRecordId,
  reason
}) {
  const cleanRef = normalizeReferenceNo(referenceNo);
  if (!cleanRef) return null;

  const existing = await tx.globalBankReference.findFirst({
    where: {
      OR: [
        { referenceNo: cleanRef },
        { sourceRecordId: String(sourceRecordId) }
      ]
    }
  });

  if (existing) {
    return await tx.globalBankReference.update({
      where: { id: existing.id },
      data: {
        status: 'REVERSED',
        reversalReason: reason || 'Financial Reversal',
        updatedAt: new Date()
      }
    });
  }

  return null;
}

module.exports = {
  normalizeReferenceNo,
  checkDuplicateReferenceNo,
  registerBankReference,
  markReferenceReversed
};
