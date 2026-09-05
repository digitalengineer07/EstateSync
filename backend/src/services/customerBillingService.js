const prisma = require('../config/db');
const { postJournalEntry } = require('../utils/accountingHelper');
const { logAudit } = require('../utils/auditLogger');

/**
 * Customer Demand Note & Milestone Billing Service (Phase 7B)
 */

/**
 * Generate a sequential Demand Note / Invoice number for today
 * Format: DN-YYYYMM-XXXX
 */
async function generateNextDemandNumber(tx, date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const prefix = `DN-${y}${m}-`;

  const latest = await tx.customerDemandNote.findFirst({
    where: { demandNumber: { startsWith: prefix } },
    orderBy: { demandNumber: 'desc' },
    select: { demandNumber: true }
  });

  let nextSeq = 1;
  if (latest) {
    const parts = latest.demandNumber.split('-');
    const currentNum = parseInt(parts[2], 10);
    if (!isNaN(currentNum)) {
      nextSeq = currentNum + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Generate a sequential Customer Ledger Entry number
 * Format: CLE-YYYYMM-XXXX
 */
async function generateNextLedgerEntryNumber(tx, date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const prefix = `CLE-${y}${m}-`;

  const latest = await tx.customerLedgerEntry.findFirst({
    where: { entryNumber: { startsWith: prefix } },
    orderBy: { entryNumber: 'desc' },
    select: { entryNumber: true }
  });

  let nextSeq = 1;
  if (latest) {
    const parts = latest.entryNumber.split('-');
    const currentNum = parseInt(parts[2], 10);
    if (!isNaN(currentNum)) {
      nextSeq = currentNum + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Issue a Customer Milestone Demand Note
 */
async function issueDemandNote({
  customerId,
  milestoneId,
  customAmount,
  customDueDate,
  notes,
  issuedById,
  issuedByEmail
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch and Lock Customer row FOR UPDATE
    const lockedCustomers = await tx.$queryRaw`
      SELECT id, "customerName", "plotNo", "projectLocation", "totalContractValue", "totalPaid", "balanceDue", "paymentPlanId", status
      FROM public."Customer"
      WHERE id = ${customerId}
      FOR UPDATE
    `;

    if (!lockedCustomers || lockedCustomers.length === 0) {
      throw { status: 404, message: 'Customer not found.' };
    }

    const customer = lockedCustomers[0];
    if (customer.status !== 'ACTIVE') {
      throw { status: 400, message: 'Cannot issue demand notes to inactive or cancelled customer accounts.' };
    }

    const contractValue = parseFloat(customer.totalContractValue || 0);

    // 2. Resolve Milestone details if milestoneId provided
    let milestoneName = 'Milestone Installment Demand';
    let sequence = 1;
    let dueDays = 15;
    let isTaxable = false;
    let principalAmount = 0;

    if (milestoneId) {
      const milestone = await tx.paymentPlanMilestone.findUnique({
        where: { id: milestoneId },
        include: { plan: true }
      });

      if (!milestone) {
        throw { status: 404, message: 'Payment plan milestone not found.' };
      }

      // Check if demand note already issued for this customer on this milestone
      const existingDN = await tx.customerDemandNote.findFirst({
        where: {
          customerId: customer.id,
          milestoneId: milestone.id,
          status: { not: 'CANCELLED' }
        }
      });

      if (existingDN) {
        throw {
          status: 409,
          message: `Demand Note "${existingDN.demandNumber}" has already been issued for Milestone "${milestone.name}". Multiple active demand notes cannot be issued for the same milestone.`
        };
      }

      milestoneName = milestone.name;
      sequence = milestone.sequence;
      dueDays = milestone.dueDaysAfterTrigger || 15;
      isTaxable = milestone.isTaxable;

      if (milestone.calculationType === 'PERCENTAGE' && milestone.percentage) {
        principalAmount = Math.round(((parseFloat(milestone.percentage) / 100) * contractValue) * 100) / 100;
      } else if (milestone.fixedAmount) {
        principalAmount = parseFloat(milestone.fixedAmount);
      }
    }

    if (customAmount) {
      principalAmount = parseFloat(customAmount);
    }

    if (isNaN(principalAmount) || principalAmount <= 0) {
      throw { status: 400, message: 'Demand note principal amount must be a valid positive number.' };
    }

    // Advisory Transaction Lock to eliminate double-issue races
    const lockKey = `DN_${customer.id}_${sequence}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    // 3. Compute Due Date
    let dueDate = customDueDate ? new Date(customDueDate) : new Date();
    if (!customDueDate) {
      dueDate.setDate(dueDate.getDate() + dueDays);
    }

    // 4. Calculate Tax (if applicable)
    let taxAmount = 0;
    const totalDemand = principalAmount + taxAmount;

    // 5. Generate Sequential Numbers
    const demandNumber = await generateNextDemandNumber(tx);
    const ledgerEntryNumber = await generateNextLedgerEntryNumber(tx);

    // 6. Post Double-Entry Journal (Phase 7 AR Accrual)
    // Dr 1200 Accounts Receivable — Customer Control
    // Cr 2040 Customer Advances & Unearned Booking Revenue
    const journal = await postJournalEntry(tx, {
      description: `Customer Demand Note: ${customer.customerName} (Plot ${customer.plotNo}, ${milestoneName}) — ${demandNumber}`,
      referenceType: 'CUSTOMER_DEMAND_NOTE',
      referenceId: demandNumber,
      createdBy: issuedById || 'SYSTEM',
      lines: [
        {
          accountCode: '1200',
          debit: totalDemand,
          credit: 0,
          description: `Customer Receivable: ${customer.customerName} (${demandNumber})`
        },
        {
          accountCode: '2040',
          debit: 0,
          credit: totalDemand,
          description: `Unearned Booking Liability: ${customer.customerName} (${milestoneName})`
        }
      ]
    });

    // 7. Calculate Customer Sub-Ledger Running Balance
    const latestCLE = await tx.customerLedgerEntry.findFirst({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      select: { runningBalance: true }
    });

    const previousRunningBalance = latestCLE ? parseFloat(latestCLE.runningBalance) : 0;
    const newRunningBalance = previousRunningBalance + totalDemand;

    // 8. Create Customer Demand Note Record
    const demandNote = await tx.customerDemandNote.create({
      data: {
        demandNumber,
        customerId: customer.id,
        milestoneId: milestoneId || null,
        milestoneName,
        sequence,
        dueDate,
        principalAmount,
        taxAmount,
        totalDemandAmount: totalDemand,
        allocatedAmount: 0,
        outstandingAmount: totalDemand,
        status: 'ISSUED',
        journalEntryId: journal.id,
        issuedById: issuedById || null
      }
    });

    // 9. Append Immutable Customer Sub-Ledger Entry (DEBIT)
    const ledgerEntry = await tx.customerLedgerEntry.create({
      data: {
        customerId: customer.id,
        entryNumber: ledgerEntryNumber,
        entryType: 'DEMAND_NOTE',
        referenceType: 'CustomerDemandNote',
        referenceId: demandNote.id,
        debit: totalDemand,
        credit: 0,
        runningBalance: newRunningBalance,
        description: `Demand Note Issued: ${milestoneName} (${demandNumber})`,
        journalEntryId: journal.id,
        accountingPeriodId: journal.accountingPeriodId,
        createdById: issuedById || null
      }
    });

    // 10. Audit Logging
    await logAudit({
      actorId: issuedById,
      actorEmail: issuedByEmail,
      action: 'CUSTOMER_DEMAND_ISSUE',
      entityType: 'CUSTOMER_DEMAND_NOTE',
      entityId: demandNote.id,
      newValues: {
        demandNumber,
        customerId: customer.id,
        customerName: customer.customerName,
        totalDemandAmount: totalDemand,
        milestoneName,
        dueDate: dueDate.toISOString(),
        journalEntryNumber: journal.entryNumber
      },
      tx
    });

    return {
      demandNote,
      ledgerEntry,
      journalEntry: journal
    };
  }, { timeout: 20000 });
}

/**
 * Cancel an Issued Demand Note with Symmetric GL Reversal
 */
async function cancelDemandNote({
  demandNoteId,
  reason,
  cancelledById,
  cancelledByEmail
}) {
  if (!reason || !reason.trim() || reason.trim().length < 10) {
    throw { status: 400, message: 'A detailed mandatory cancellation reason (minimum 10 characters) is required.' };
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch & Lock Demand Note FOR UPDATE
    const lockedNotes = await tx.$queryRaw`
      SELECT id, "demandNumber", "customerId", "milestoneName", "totalDemandAmount", "allocatedAmount", "outstandingAmount", status, "journalEntryId"
      FROM public."CustomerDemandNote"
      WHERE id = ${demandNoteId}
      FOR UPDATE
    `;

    if (!lockedNotes || lockedNotes.length === 0) {
      throw { status: 404, message: 'Demand note not found.' };
    }

    const note = lockedNotes[0];

    if (note.status === 'CANCELLED') {
      throw { status: 400, message: 'Demand note is already cancelled.' };
    }

    const allocated = parseFloat(note.allocatedAmount || 0);
    if (allocated > 0) {
      throw {
        status: 400,
        message: `Cannot cancel Demand Note "${note.demandNumber}": ₹${allocated.toLocaleString('en-IN')} has already been allocated from customer payments. De-allocate receipts before cancelling.`
      };
    }

    const demandAmount = parseFloat(note.totalDemandAmount);

    // 2. Fetch Customer Details
    const customer = await tx.customer.findUnique({
      where: { id: note.customerId }
    });

    // 3. Post Symmetric Double-Entry Reversal Journal in current OPEN period
    // Dr 2040 Customer Advances & Unearned Revenue
    // Cr 1200 Accounts Receivable — Customer Control
    const reversalJournal = await postJournalEntry(tx, {
      description: `Cancellation Reversal: Demand Note ${note.demandNumber} (${customer ? customer.customerName : 'Customer'}) — Reason: ${reason.trim()}`,
      referenceType: 'DEMAND_NOTE_CANCELLATION',
      referenceId: note.id,
      createdBy: cancelledById || 'SYSTEM',
      lines: [
        {
          accountCode: '2040',
          debit: demandAmount,
          credit: 0,
          description: `Reversal of Unearned Booking Liability (${note.demandNumber})`
        },
        {
          accountCode: '1200',
          debit: 0,
          credit: demandAmount,
          description: `Reversal of Customer Receivable (${note.demandNumber})`
        }
      ]
    });

    // 4. Update Demand Note Status
    const updatedNote = await tx.customerDemandNote.update({
      where: { id: note.id },
      data: {
        status: 'CANCELLED',
        outstandingAmount: 0,
        cancelledAt: new Date(),
        cancelledReason: reason.trim()
      }
    });

    // 5. Append Customer Sub-Ledger Entry (CREDIT: Liquidation)
    const latestCLE = await tx.customerLedgerEntry.findFirst({
      where: { customerId: note.customerId },
      orderBy: { createdAt: 'desc' },
      select: { runningBalance: true }
    });

    const previousRunningBalance = latestCLE ? parseFloat(latestCLE.runningBalance) : 0;
    const newRunningBalance = previousRunningBalance - demandAmount;
    const ledgerEntryNumber = await generateNextLedgerEntryNumber(tx);

    const ledgerEntry = await tx.customerLedgerEntry.create({
      data: {
        customerId: note.customerId,
        entryNumber: ledgerEntryNumber,
        entryType: 'CREDIT_NOTE',
        referenceType: 'CustomerDemandNote',
        referenceId: note.id,
        debit: 0,
        credit: demandAmount,
        runningBalance: newRunningBalance,
        description: `Demand Note Cancelled: ${note.demandNumber} — ${reason.trim()}`,
        journalEntryId: reversalJournal.id,
        accountingPeriodId: reversalJournal.accountingPeriodId,
        createdById: cancelledById || null
      }
    });

    // 6. Audit Logging
    await logAudit({
      actorId: cancelledById,
      actorEmail: cancelledByEmail,
      action: 'CUSTOMER_DEMAND_CANCEL',
      entityType: 'CUSTOMER_DEMAND_NOTE',
      entityId: note.id,
      newValues: {
        demandNumber: note.demandNumber,
        customerId: note.customerId,
        reason: reason.trim(),
        reversalJournalNumber: reversalJournal.entryNumber
      },
      tx
    });

    return {
      demandNote: updatedNote,
      reversalJournal,
      ledgerEntry
    };
  }, { timeout: 20000 });
}

/**
 * List Demand Notes with filtering
 */
async function listDemandNotes({ customerId, status } = {}) {
  const where = {};
  if (customerId) where.customerId = customerId;
  if (status) where.status = status;

  return await prisma.customerDemandNote.findMany({
    where,
    include: {
      customer: {
        select: { id: true, customerName: true, plotNo: true, projectLocation: true }
      },
      milestone: {
        select: { id: true, name: true, sequence: true, calculationType: true }
      },
      allocations: {
        include: {
          payment: {
            select: { id: true, amount: true, paymentMode: true, referenceNo: true, dateOfPayment: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

module.exports = {
  issueDemandNote,
  cancelDemandNote,
  listDemandNotes,
  generateNextDemandNumber,
  generateNextLedgerEntryNumber
};
