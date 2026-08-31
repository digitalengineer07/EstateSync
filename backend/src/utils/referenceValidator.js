const prisma = require('../config/db');

/**
 * Validate that a UTR / Bank Reference Number is globally unique across all banking flows:
 * 1. Treasury Bank Inflows / Capital Infusions (WalletTransaction: CAPITAL_INFUSION / BANK_STATEMENT)
 * 2. Customer Collection Payments (CustomerPayment)
 * 3. Customer Cancellation Refunds (Customer.refundReferenceNo & CustomerPayment REFUND_DISBURSED)
 * 4. Land Acquisition Payouts (PropertyPayment)
 *
 * @param {Object} tx - Prisma transaction or client
 * @param {string} referenceNo - The UTR / Cheque / Reference No to validate
 * @returns {Promise<string|null>} - Returns duplicate error message if duplicate found, null if clean
 */
async function checkDuplicateReferenceNo(tx = prisma, referenceNo) {
  if (!referenceNo || typeof referenceNo !== 'string') return null;
  const cleanRef = referenceNo.trim();
  if (!cleanRef) return null;

  // 1. Check Customer Payments (Collections & Refunds)
  const existingCustPay = await tx.customerPayment.findFirst({
    where: {
      referenceNo: { equals: cleanRef, mode: 'insensitive' },
      status: { not: 'REVERSED' }
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

  // 2. Check Customer Cancellation Settlement Records
  const existingRefundCust = await tx.customer.findFirst({
    where: {
      refundReferenceNo: { equals: cleanRef, mode: 'insensitive' }
    },
    select: { customerName: true, plotNo: true }
  });

  if (existingRefundCust) {
    return `Duplicate UTR / Reference Error: Reference No. "${cleanRef}" is already recorded on a cancellation refund for customer "${existingRefundCust.customerName}" (Plot ${existingRefundCust.plotNo}). Duplicate entries are prohibited.`;
  }

  // 3. Check Land Acquisition Payments (Land Owner Payouts)
  const existingPropPay = await tx.propertyPayment.findFirst({
    where: {
      referenceNo: { equals: cleanRef, mode: 'insensitive' },
      status: { not: 'REVERSED' }
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

  // 4. Check Treasury Bank Inflows / Capital Infusions
  const existingInflow = await tx.walletTransaction.findFirst({
    where: {
      OR: [
        { type: 'CAPITAL_INFUSION', referenceId: { equals: cleanRef, mode: 'insensitive' } },
        { referenceType: 'BANK_STATEMENT', referenceId: { equals: cleanRef, mode: 'insensitive' } }
      ],
      status: { not: 'REVERSED' }
    }
  });

  if (existingInflow) {
    return `Duplicate UTR / Reference Error: Reference No. "${cleanRef}" is already recorded on a Corporate Treasury Bank Statement / Capital Infusion. Duplicate entries are prohibited.`;
  }

  return null;
}

module.exports = {
  checkDuplicateReferenceNo
};
