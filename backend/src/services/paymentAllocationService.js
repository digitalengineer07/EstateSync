const prisma = require('../config/db');
const { postJournalEntry } = require('../utils/accountingHelper');
const { logAudit } = require('../utils/auditLogger');
const { getPrimaryTreasuryAdmin } = require('../utils/treasuryHelper');
const { checkDuplicateReferenceNo, registerBankReference } = require('../utils/referenceValidator');
const { generateNextLedgerEntryNumber } = require('./customerBillingService');

/**
 * Payment Application & Allocation Engine (Phase 7C)
 */

/**
 * Record a Customer Payment Receipt with Automatic or Explicit Demand Allocation
 */
async function recordCustomerReceipt({
  customerId,
  amount,
  paymentMode,
  referenceNo,
  sourceAccount,
  destinationAccount,
  dateOfPayment,
  targetDemandNoteId, // Optional: specific demand note to allocate to
  notes,
  recordedById,
  recordedByEmail
}) {
  const payAmount = parseFloat(amount);
  if (isNaN(payAmount) || payAmount <= 0) {
    throw { status: 400, message: 'Payment amount must be a valid positive number.' };
  }

  if (!paymentMode) {
    throw { status: 400, message: 'Payment mode (CASH, CHEQUE, NEFT, RTGS, UPI, DD) is compulsory.' };
  }

  const cleanRef = referenceNo ? referenceNo.trim() : null;
  if (cleanRef) {
    const dupErr = await checkDuplicateReferenceNo(prisma, cleanRef);
    if (dupErr) {
      throw { status: 400, message: dupErr };
    }
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch and Lock Customer row FOR UPDATE
    const lockedCustomers = await tx.$queryRaw`
      SELECT id, "customerName", "plotNo", "projectLocation", "totalContractValue", "totalPaid", "balanceDue", status
      FROM public."Customer"
      WHERE id = ${customerId}
      FOR UPDATE
    `;

    if (!lockedCustomers || lockedCustomers.length === 0) {
      throw { status: 404, message: 'Customer not found.' };
    }

    const customer = lockedCustomers[0];
    if (customer.status !== 'ACTIVE') {
      throw { status: 400, message: 'Cannot record payments for inactive or cancelled customer accounts.' };
    }

    // 2. Fetch and Lock Corporate Treasury Wallet
    const adminUser = await getPrimaryTreasuryAdmin(tx);
    if (!adminUser || !adminUser.wallet) {
      throw { status: 500, message: 'Corporate Treasury wallet not configured.' };
    }

    const fMode = paymentMode.toUpperCase() === 'CASH' ? 'CASH' : 'LIQUID';
    const balanceField = fMode === 'CASH' ? 'availableBalanceCash' : 'availableBalanceLiquid';
    const allocatedField = fMode === 'CASH' ? 'totalAllocatedCash' : 'totalAllocatedLiquid';

    // 3. Create the CustomerPayment record
    const payment = await tx.customerPayment.create({
      data: {
        customerId: customer.id,
        amount: payAmount,
        paymentMode: paymentMode.toUpperCase(),
        sourceAccount: sourceAccount || 'Client Bank Account',
        destinationAccount: destinationAccount || 'Corporate Treasury Account (1010)',
        referenceNo: cleanRef || null,
        recordedById: recordedById || adminUser.id,
        dateOfPayment: dateOfPayment ? new Date(dateOfPayment) : new Date(),
        status: 'RECORDED'
      }
    });

    // 4. Register in GlobalBankReference (with pure cash bypass)
    if (cleanRef) {
      await registerBankReference(tx, {
        referenceNo: cleanRef,
        module: 'CUSTOMER_PAYMENT',
        sourceTable: 'CustomerPayment',
        sourceRecordId: payment.id,
        amount: payAmount,
        paymentMode: paymentMode.toUpperCase(),
        recordedBy: recordedByEmail || 'SYSTEM'
      });
    }

    // 5. Update Treasury Wallet balance
    const updatedWallet = await tx.wallet.update({
      where: { id: adminUser.wallet.id },
      data: {
        [balanceField]: { increment: payAmount },
        [allocatedField]: { increment: payAmount }
      }
    });

    // 6. Create WalletTransaction
    await tx.walletTransaction.create({
      data: {
        type: 'CUSTOMER_PAYMENT_RECEIVED',
        sourceWalletId: null,
        destWalletId: adminUser.wallet.id,
        amount: payAmount,
        fundMode: fMode,
        referenceType: 'CUSTOMER_PAYMENT',
        referenceId: payment.id,
        description: `Customer payment received from ${customer.customerName} (Plot ${customer.plotNo}) via ${paymentMode.toUpperCase()}`,
        createdBy: recordedById || adminUser.id,
        status: 'COMPLETED'
      }
    });

    // 7. Find Open Demand Notes for Allocation (FIFO order or specific ID)
    let candidateDemandNotes = [];
    if (targetDemandNoteId) {
      const specificDN = await tx.customerDemandNote.findFirst({
        where: { id: targetDemandNoteId, customerId: customer.id, status: { in: ['ISSUED', 'PARTIALLY_PAID'] } }
      });
      if (specificDN) candidateDemandNotes.push(specificDN);
    } else {
      candidateDemandNotes = await tx.customerDemandNote.findMany({
        where: { customerId: customer.id, status: { in: ['ISSUED', 'PARTIALLY_PAID'] } },
        orderBy: { dueDate: 'asc' }
      });
    }

    let remainingToAllocate = payAmount;
    let totalAllocatedToDemands = 0;
    const allocationResults = [];

    for (const dn of candidateDemandNotes) {
      if (remainingToAllocate <= 0.009) break;

      // Lock Demand Note FOR UPDATE
      const lockedDN = await tx.$queryRaw`
        SELECT id, "demandNumber", "totalDemandAmount", "allocatedAmount", "outstandingAmount", status
        FROM public."CustomerDemandNote"
        WHERE id = ${dn.id}
        FOR UPDATE
      `;

      if (!lockedDN || lockedDN.length === 0) continue;
      const demand = lockedDN[0];
      const outstanding = parseFloat(demand.outstandingAmount);

      if (outstanding <= 0.009) continue;

      const allocateThis = Math.min(remainingToAllocate, outstanding);
      const newAllocated = parseFloat(demand.allocatedAmount) + allocateThis;
      const newOutstanding = outstanding - allocateThis;
      const newStatus = newOutstanding <= 0.009 ? 'PAID' : 'PARTIALLY_PAID';

      await tx.customerDemandNote.update({
        where: { id: demand.id },
        data: {
          allocatedAmount: newAllocated,
          outstandingAmount: newOutstanding,
          status: newStatus
        }
      });

      const alloc = await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          demandNoteId: demand.id,
          allocatedAmount: allocateThis,
          allocatedById: recordedById || null
        }
      });

      allocationResults.push(alloc);
      remainingToAllocate -= allocateThis;
      totalAllocatedToDemands += allocateThis;
    }

    const unallocatedAdvance = Math.max(0, remainingToAllocate);

    // 8. Post Double-Entry General Ledger Journals (Phase 7 AR & Advance Matrix)
    // Part A: If allocated to demands: Dr 1010 Bank / Cr 1200 Accounts Receivable
    // Part B: If unallocated advance: Dr 1010 Bank / Cr 2040 Customer Advances
    const glLines = [];
    const bankAccountCode = fMode === 'CASH' ? '1010' : '1010'; // 1010 represents Treasury Liquid/Bank

    if (totalAllocatedToDemands > 0.009) {
      glLines.push(
        { accountCode: bankAccountCode, debit: totalAllocatedToDemands, credit: 0, description: `Receipt against AR: ${customer.customerName}` },
        { accountCode: '1200', debit: 0, credit: totalAllocatedToDemands, description: `Liquidation of AR: ${customer.customerName}` }
      );
    }

    if (unallocatedAdvance > 0.009) {
      glLines.push(
        { accountCode: bankAccountCode, debit: unallocatedAdvance, credit: 0, description: `Advance Receipt: ${customer.customerName}` },
        { accountCode: '2040', debit: 0, credit: unallocatedAdvance, description: `Customer Advance Liability: ${customer.customerName}` }
      );
    }

    const journal = await postJournalEntry(tx, {
      description: `Customer Payment Receipt: ${customer.customerName} (Plot ${customer.plotNo}) — Total: ₹${payAmount.toLocaleString('en-IN')}`,
      referenceType: 'CUSTOMER_PAYMENT',
      referenceId: payment.id,
      createdBy: recordedById || 'SYSTEM',
      lines: glLines
    });

    // 9. Append Customer Sub-Ledger Entry (CREDIT)
    const latestCLE = await tx.customerLedgerEntry.findFirst({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      select: { runningBalance: true }
    });

    const previousRunningBalance = latestCLE ? parseFloat(latestCLE.runningBalance) : 0;
    const newRunningBalance = previousRunningBalance - payAmount;
    const ledgerEntryNumber = await generateNextLedgerEntryNumber(tx);

    const ledgerEntry = await tx.customerLedgerEntry.create({
      data: {
        customerId: customer.id,
        entryNumber: ledgerEntryNumber,
        entryType: unallocatedAdvance > 0 && totalAllocatedToDemands <= 0.009 ? 'CUSTOMER_ADVANCE' : 'PAYMENT_RECEIPT',
        referenceType: 'CustomerPayment',
        referenceId: payment.id,
        debit: 0,
        credit: payAmount,
        runningBalance: newRunningBalance,
        description: `Payment Receipt: ${paymentMode.toUpperCase()} ${cleanRef ? `(Ref: ${cleanRef})` : ''} — Allocated: ₹${totalAllocatedToDemands.toLocaleString('en-IN')}, Advance: ₹${unallocatedAdvance.toLocaleString('en-IN')}`,
        journalEntryId: journal.id,
        accountingPeriodId: journal.accountingPeriodId,
        createdById: recordedById || null
      }
    });

    // 10. Update Customer totalPaid & balanceDue cache
    const updatedCustomer = await tx.customer.update({
      where: { id: customer.id },
      data: {
        totalPaid: parseFloat(customer.totalPaid || 0) + payAmount,
        balanceDue: Math.max(0, parseFloat(customer.balanceDue || 0) - payAmount)
      }
    });

    // 11. Audit Logging
    await logAudit({
      actorId: recordedById,
      actorEmail: recordedByEmail,
      action: 'CUSTOMER_PAYMENT_RECORD',
      entityType: 'CUSTOMER_PAYMENT',
      entityId: payment.id,
      newValues: {
        customerId: customer.id,
        customerName: customer.customerName,
        payAmount,
        paymentMode,
        referenceNo: cleanRef,
        allocatedAmount: totalAllocatedToDemands,
        unallocatedAdvance,
        journalEntryNumber: journal.entryNumber
      },
      tx
    });

    return {
      payment,
      customer: updatedCustomer,
      ledgerEntry,
      journalEntry: journal,
      allocatedAmount: totalAllocatedToDemands,
      unallocatedAdvance,
      allocations: allocationResults
    };
  }, { timeout: 25000 });
}

module.exports = {
  recordCustomerReceipt
};
