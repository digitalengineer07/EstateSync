const prisma = require('../config/db');
const { postJournalEntry } = require('../utils/accountingHelper');
const { logAudit } = require('../utils/auditLogger');

// Canonical financial balance tolerance across the entire system
const CANONICAL_BALANCE_TOLERANCE = 0.009;

// Configurable employer contribution liability routing map
const EMPLOYER_CONTRIBUTION_PAYABLE_MAP = {
  'PF_EMPLOYER': '2025',  // Employer Statutory Contribution Payable (EPF)
  'ESI_EMPLOYER': '2025'  // Employer Statutory Contribution Payable (ESIC) / Sub-account
};

/**
 * Validates, reconciles, and builds balanced compound journal lines from a locked payroll run snapshot.
 * Zero database writes.
 */
async function buildPayrollJournalPlan({ runId, tx = prisma }) {
  const run = await tx.payrollRun.findUnique({
    where: { id: runId },
    include: {
      payrollPeriod: true,
      accountingPosting: true,
      items: {
        include: {
          lines: true
        }
      }
    }
  });

  if (!run) {
    throw { status: 404, message: 'Payroll Run not found.' };
  }

  // 1. Eligibility Check: Status must be LOCKED
  if (run.status !== 'LOCKED') {
    throw {
      status: 400,
      code: 'PAYROLL_NOT_LOCKED',
      message: `Cannot post payroll run in "${run.status}" status. Only LOCKED payroll runs can be posted to the General Ledger.`
    };
  }

  // 2. Duplicate Check: Must not already have an active posting
  if (run.accountingPosting && run.accountingPosting.status !== 'REVERSED') {
    throw {
      status: 409,
      code: 'PAYROLL_ALREADY_POSTED',
      message: `Payroll run has already been posted to the General Ledger (Journal Entry: ${run.accountingPosting.journalEntryId}).`
    };
  }

  // 3. Accounting Period Validation
  const period = run.payrollPeriod;
  if (!period) {
    throw { status: 400, message: 'Associated Payroll Period is missing.' };
  }
  if (['CLOSED', 'CANCELLED'].includes(period.status)) {
    throw {
      status: 400,
      code: 'ACCOUNTING_PERIOD_CLOSED',
      message: `Associated Payroll Period is in "${period.status}" status. Accounting posting is blocked.`
    };
  }

  if (!run.items || run.items.length === 0) {
    throw {
      status: 400,
      code: 'PAYROLL_ITEMS_EMPTY',
      message: 'No employee payroll items found for this payroll run.'
    };
  }

  // 4. Flatten all lines & separate by source
  const allLines = [];
  for (const item of run.items) {
    for (const line of item.lines) {
      allLines.push(line);
    }
  }

  let salaryEarnings = 0;
  let salaryDeductions = 0;
  let employerContributions = 0;
  let reimbursements = 0;
  let creditAdjustments = 0;
  let debitAdjustments = 0;

  for (const line of allLines) {
    const numAmount = Number(line.amount) || 0;

    // Check for unsupported reimbursement
    if (line.componentType === 'REIMBURSEMENT') {
      throw {
        status: 422,
        code: 'UNSUPPORTED_REIMBURSEMENT_POSTING',
        message: 'Reimbursement posting blocked until accounting mapping is defined.'
      };
    }

    // Check for unsupported penalty
    if (line.componentCode === 'DED_PENALTY') {
      throw {
        status: 422,
        code: 'UNSUPPORTED_PENALTY_ACCOUNTING',
        message: 'Penalty deduction posting blocked: no approved penalty accounting mapping is configured.'
      };
    }

    if (line.source === 'SALARY_STRUCTURE') {
      if (line.componentType === 'EARNING') {
        salaryEarnings = Math.round((salaryEarnings + numAmount) * 100) / 100;
      } else if (line.componentType === 'DEDUCTION') {
        salaryDeductions = Math.round((salaryDeductions + numAmount) * 100) / 100;
      } else if (line.componentType === 'EMPLOYER_CONTRIBUTION') {
        employerContributions = Math.round((employerContributions + numAmount) * 100) / 100;
      }
    } else if (line.source === 'MANUAL_ADJUSTMENT') {
      if (line.componentType === 'EARNING') {
        creditAdjustments = Math.round((creditAdjustments + numAmount) * 100) / 100;
      } else if (line.componentType === 'DEDUCTION') {
        debitAdjustments = Math.round((debitAdjustments + numAmount) * 100) / 100;
      }
    }
  }

  // 5. Pre-Posting Reconciliation Invariants against Run Totals
  const runTotalGross = Number(run.totalGross) || 0;
  const runTotalDeductions = Number(run.totalDeductions) || 0;
  const runTotalEmployerCost = Number(run.totalEmployerCost) || 0;
  const runTotalNet = Number(run.totalNet) || 0;

  if (Math.abs(salaryEarnings - runTotalGross) > CANONICAL_BALANCE_TOLERANCE) {
    throw {
      status: 422,
      code: 'PAYROLL_SNAPSHOT_MISMATCH',
      message: `Reconciliation mismatch: Base salary earnings (₹${salaryEarnings.toFixed(2)}) do not match Payroll Run totalGross (₹${runTotalGross.toFixed(2)}).`
    };
  }

  if (Math.abs(salaryDeductions - runTotalDeductions) > CANONICAL_BALANCE_TOLERANCE) {
    throw {
      status: 422,
      code: 'PAYROLL_SNAPSHOT_MISMATCH',
      message: `Reconciliation mismatch: Base salary deductions (₹${salaryDeductions.toFixed(2)}) do not match Payroll Run totalDeductions (₹${runTotalDeductions.toFixed(2)}).`
    };
  }

  if (Math.abs(employerContributions - runTotalEmployerCost) > CANONICAL_BALANCE_TOLERANCE) {
    throw {
      status: 422,
      code: 'PAYROLL_SNAPSHOT_MISMATCH',
      message: `Reconciliation mismatch: Employer contributions (₹${employerContributions.toFixed(2)}) do not match Payroll Run totalEmployerCost (₹${runTotalEmployerCost.toFixed(2)}).`
    };
  }

  const calculatedNet = Math.round(
    (salaryEarnings + reimbursements + creditAdjustments - salaryDeductions - debitAdjustments) * 100
  ) / 100;

  if (Math.abs(calculatedNet - runTotalNet) > CANONICAL_BALANCE_TOLERANCE) {
    throw {
      status: 422,
      code: 'PAYROLL_SNAPSHOT_MISMATCH',
      message: `Reconciliation mismatch: Calculated net (₹${calculatedNet.toFixed(2)}) does not match Payroll Run totalNet (₹${runTotalNet.toFixed(2)}).`
    };
  }

  // 6. Validate Snapshot GL Accounts in Database
  const requiredGLCodes = new Set();
  for (const line of allLines) {
    if (!line.glAccountCodeSnapshot || !line.glAccountCodeSnapshot.trim()) {
      throw {
        status: 422,
        code: 'MISSING_GL_ACCOUNT_SNAPSHOT',
        message: `Payroll line for component "${line.componentCode}" is missing glAccountCodeSnapshot.`
      };
    }
    requiredGLCodes.add(line.glAccountCodeSnapshot.trim());

    if (line.componentType === 'EMPLOYER_CONTRIBUTION') {
      const payableCode = EMPLOYER_CONTRIBUTION_PAYABLE_MAP[line.componentCode];
      if (!payableCode) {
        throw {
          status: 422,
          code: 'UNSUPPORTED_EMPLOYER_CONTRIBUTION_PAYABLE_MAPPING',
          message: `No statutory liability payable account configured for employer contribution component "${line.componentCode}".`
        };
      }
      requiredGLCodes.add(payableCode);
    }
  }

  // Always require Net Salaries Payable (2010)
  requiredGLCodes.add('2010');

  const dbAccounts = await tx.account.findMany({
    where: { code: { in: Array.from(requiredGLCodes) } }
  });

  const accountMap = new Map(dbAccounts.map(a => [a.code, a]));

  for (const code of requiredGLCodes) {
    const acc = accountMap.get(code);
    if (!acc) {
      throw {
        status: 422,
        code: 'MISSING_GL_ACCOUNT',
        message: `GL Account "${code}" referenced in payroll snapshot does not exist in the Chart of Accounts.`
      };
    }
  }

  // 7. Validate Account Nature
  for (const line of allLines) {
    const acc = accountMap.get(line.glAccountCodeSnapshot.trim());
    if (line.componentType === 'EARNING' && acc.type !== 'EXPENSE') {
      throw {
        status: 422,
        code: 'ACCOUNT_NATURE_MISMATCH',
        message: `Account "${acc.code}" (${acc.name}) has type "${acc.type}", expected "EXPENSE" for earning line "${line.componentCode}".`
      };
    }
    if (line.componentType === 'EMPLOYER_CONTRIBUTION') {
      if (acc.type !== 'EXPENSE') {
        throw {
          status: 422,
          code: 'ACCOUNT_NATURE_MISMATCH',
          message: `Account "${acc.code}" (${acc.name}) has type "${acc.type}", expected "EXPENSE" for employer contribution "${line.componentCode}".`
        };
      }
      const payableCode = EMPLOYER_CONTRIBUTION_PAYABLE_MAP[line.componentCode];
      const payableAcc = accountMap.get(payableCode);
      if (payableAcc && payableAcc.type !== 'LIABILITY') {
        throw {
          status: 422,
          code: 'ACCOUNT_NATURE_MISMATCH',
          message: `Statutory payable account "${payableCode}" has type "${payableAcc.type}", expected "LIABILITY".`
        };
      }
    }
    if (line.componentType === 'DEDUCTION') {
      if (line.componentCode === 'DED_ADVANCE_RECOVERY' || line.componentCode === 'ADVANCE_RECOVERY') {
        if (acc.type !== 'ASSET') {
          throw {
            status: 422,
            code: 'ACCOUNT_NATURE_MISMATCH',
            message: `Account "${acc.code}" (${acc.name}) has type "${acc.type}", expected "ASSET" for advance recovery.`
          };
        }
      } else {
        if (acc.type !== 'LIABILITY') {
          throw {
            status: 422,
            code: 'ACCOUNT_NATURE_MISMATCH',
            message: `Account "${acc.code}" (${acc.name}) has type "${acc.type}", expected "LIABILITY" for deduction "${line.componentCode}".`
          };
        }
      }
    }
  }

  // 8. Build Aggregated Compound Journal Lines
  const debitMap = new Map();  // accountCode -> amount
  const creditMap = new Map(); // accountCode -> amount
  const accountDescriptions = new Map();

  function addDebit(code, amt, desc) {
    if (amt <= 0) return;
    debitMap.set(code, Math.round(((debitMap.get(code) || 0) + amt) * 100) / 100);
    if (!accountDescriptions.has(code)) accountDescriptions.set(code, desc);
  }

  function addCredit(code, amt, desc) {
    if (amt <= 0) return;
    creditMap.set(code, Math.round(((creditMap.get(code) || 0) + amt) * 100) / 100);
    if (!accountDescriptions.has(code)) accountDescriptions.set(code, desc);
  }

  for (const line of allLines) {
    const numAmount = Number(line.amount) || 0;
    if (numAmount <= 0) continue;

    const glCode = line.glAccountCodeSnapshot.trim();

    if (line.componentType === 'EARNING') {
      // Debit Salary / Wage Expense
      addDebit(glCode, numAmount, `Salary Expense: ${line.componentName}`);
    } else if (line.componentType === 'EMPLOYER_CONTRIBUTION') {
      // Dual Entry: Debit Employer Statutory Expense / Credit Employer Statutory Payable
      const payableCode = EMPLOYER_CONTRIBUTION_PAYABLE_MAP[line.componentCode] || '2025';
      addDebit(glCode, numAmount, `Employer Statutory Expense: ${line.componentName}`);
      addCredit(payableCode, numAmount, `Employer Statutory Payable: ${line.componentName}`);
    } else if (line.componentType === 'DEDUCTION') {
      // Credit Statutory Payable or Advance Recovery Asset
      addCredit(glCode, numAmount, `Deduction / Recovery: ${line.componentName}`);
    }
  }

  // Add Credit for Net Salaries Payable (GL 2010)
  if (runTotalNet > 0) {
    addCredit('2010', runTotalNet, `Net Salaries Payable: ${period.year}-${String(period.month).padStart(2, '0')} Run #${run.runNumber}`);
  }

  // 9. Construct Normalized Journal Lines Array
  const journalLines = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (const [code, amt] of debitMap.entries()) {
    const acc = accountMap.get(code);
    journalLines.push({
      accountCode: code,
      accountName: acc?.name || 'Expense Account',
      accountType: acc?.type || 'EXPENSE',
      debit: amt,
      credit: 0,
      description: accountDescriptions.get(code) || 'Payroll Expense'
    });
    totalDebit = Math.round((totalDebit + amt) * 100) / 100;
  }

  for (const [code, amt] of creditMap.entries()) {
    const acc = accountMap.get(code);
    journalLines.push({
      accountCode: code,
      accountName: acc?.name || 'Liability/Asset Account',
      accountType: acc?.type || 'LIABILITY',
      debit: 0,
      credit: amt,
      description: accountDescriptions.get(code) || 'Payroll Obligation / Settlement'
    });
    totalCredit = Math.round((totalCredit + amt) * 100) / 100;
  }

  // 10. Verify Canonical Double-Entry Invariant
  const balanceDelta = Math.abs(totalDebit - totalCredit);
  if (balanceDelta > CANONICAL_BALANCE_TOLERANCE) {
    throw {
      status: 422,
      code: 'JOURNAL_UNBALANCED',
      message: `Double-entry imbalance: Total Debits (₹${totalDebit.toFixed(2)}) must equal Total Credits (₹${totalCredit.toFixed(2)}). Delta = ₹${balanceDelta.toFixed(4)}.`
    };
  }

  return {
    run,
    period,
    reconciliation: {
      salaryEarnings,
      salaryDeductions,
      employerContributions,
      reimbursements,
      creditAdjustments,
      debitAdjustments,
      calculatedNet,
      runTotalGross,
      runTotalDeductions,
      runTotalEmployerCost,
      runTotalNet
    },
    journalLines,
    totalDebit,
    totalCredit,
    isBalanced: balanceDelta < CANONICAL_BALANCE_TOLERANCE
  };
}

/**
 * 1. Read-Only Preview of General Ledger Posting for a Locked Payroll Run
 */
async function generatePayrollPostingPreview(runId) {
  const plan = await buildPayrollJournalPlan({ runId });

  return {
    payrollRunId: plan.run.id,
    period: `${plan.period.year}-${String(plan.period.month).padStart(2, '0')}`,
    runNumber: plan.run.runNumber,
    status: plan.run.status,
    totalEmployees: plan.run.totalEmployees,
    totals: {
      totalGross: plan.run.totalGross,
      totalDeductions: plan.run.totalDeductions,
      totalNet: plan.run.totalNet,
      totalEmployerCost: plan.run.totalEmployerCost
    },
    reconciliation: plan.reconciliation,
    proposedJournal: {
      description: `Payroll Expense Posting — ${plan.period.year}-${String(plan.period.month).padStart(2, '0')} — Run #${plan.run.runNumber}`,
      referenceType: 'PAYROLL',
      referenceId: plan.run.id,
      totalDebit: plan.totalDebit,
      totalCredit: plan.totalCredit,
      isBalanced: plan.isBalanced,
      lines: plan.journalLines
    }
  };
}

/**
 * 2. Post a Locked Payroll Run to the General Ledger
 * Atomic interactive transaction.
 */
async function postPayrollRunToLedger({
  runId,
  actorEmail,
  actorId,
  req
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. Build and validate journal plan inside transaction
    const plan = await buildPayrollJournalPlan({ runId, tx });

    // 2. Call existing canonical accountingHelper.postJournalEntry
    const journalDescription = `Payroll Expense Posting — ${plan.period.year}-${String(plan.period.month).padStart(2, '0')} — Run #${plan.run.runNumber}`;

    const journalEntry = await postJournalEntry(tx, {
      description: journalDescription,
      referenceType: 'PAYROLL',
      referenceId: plan.run.id,
      createdBy: actorEmail || 'SYSTEM',
      lines: plan.journalLines.map(l => ({
        accountCode: l.accountCode,
        debit: l.debit,
        credit: l.credit,
        description: l.description
      }))
    });

    // 3. Create PayrollAccountingPosting 1-to-1 linkage record
    const posting = await tx.payrollAccountingPosting.create({
      data: {
        payrollRunId: plan.run.id,
        journalEntryId: journalEntry.id,
        status: 'POSTED',
        postedGross: plan.run.totalGross,
        postedDeductions: plan.run.totalDeductions,
        postedNet: plan.run.totalNet,
        postedEmployerCost: plan.run.totalEmployerCost,
        totalDebit: plan.totalDebit,
        totalCredit: plan.totalCredit,
        postedBy: actorEmail || 'SYSTEM'
      }
    });

    // 4. Record PAYROLL_JOURNAL_POST Audit Event
    await logAudit({
      actorId,
      actorEmail,
      action: 'PAYROLL_JOURNAL_POST',
      entityType: 'PAYROLL_RUN',
      entityId: plan.run.id,
      oldValues: { posted: false },
      newValues: {
        posted: true,
        journalEntryId: journalEntry.id,
        entryNumber: journalEntry.entryNumber,
        totalDebit: plan.totalDebit,
        totalCredit: plan.totalCredit,
        postedBy: actorEmail
      },
      req,
      tx
    });

    return {
      success: true,
      message: 'Payroll Run successfully posted to General Ledger.',
      posting: {
        id: posting.id,
        payrollRunId: posting.payrollRunId,
        journalEntryId: posting.journalEntryId,
        entryNumber: journalEntry.entryNumber,
        status: posting.status,
        totalDebit: posting.totalDebit,
        totalCredit: posting.totalCredit,
        postedAt: posting.postedAt,
        postedBy: posting.postedBy
      },
      journalEntry
    };
  }, {
    maxWait: 15000,
    timeout: 60000
  });
}

/**
 * 3. Reverse a Posted Payroll Journal Entry
 * Creates exact symmetric opposite entry and updates status to REVERSED.
 */
async function reversePayrollPosting({
  runId,
  reason,
  actorEmail,
  actorId,
  req
}) {
  const trimmedReason = reason ? reason.trim() : '';
  if (!trimmedReason) {
    throw { status: 400, message: 'A valid reason is required to reverse a payroll general ledger posting.' };
  }

  return await prisma.$transaction(async (tx) => {
    const posting = await tx.payrollAccountingPosting.findUnique({
      where: { payrollRunId: runId },
      include: {
        payrollRun: {
          include: { payrollPeriod: true }
        },
        journalEntry: {
          include: {
            lines: {
              include: { account: true }
            }
          }
        }
      }
    });

    if (!posting) {
      throw { status: 404, message: 'No accounting posting found for this payroll run.' };
    }

    if (posting.status !== 'POSTED') {
      throw {
        status: 400,
        message: `Cannot reverse payroll posting in status "${posting.status}". Only active POSTED entries can be reversed.`
      };
    }

    const originalJournal = posting.journalEntry;
    if (!originalJournal) {
      throw { status: 400, message: 'Original Journal Entry is missing.' };
    }

    // Generate exact symmetric opposite journal lines
    const reversalLines = originalJournal.lines.map(l => ({
      accountCode: l.account.code,
      debit: Number(l.credit) || 0,
      credit: Number(l.debit) || 0,
      description: `Reversal of ${originalJournal.entryNumber}: ${l.description || 'Payroll Entry'}`
    }));

    // Post reversal journal entry via canonical helper
    const reversalDescription = `Reversal of Payroll Posting (${originalJournal.entryNumber}): ${trimmedReason}`;
    const reversalJournal = await postJournalEntry(tx, {
      description: reversalDescription,
      referenceType: 'PAYROLL_REVERSAL',
      referenceId: runId,
      createdBy: actorEmail || 'SYSTEM',
      lines: reversalLines
    });

    // Mark original journal entry as REVERSED
    await tx.journalEntry.update({
      where: { id: originalJournal.id },
      data: { status: 'REVERSED' }
    });

    // Update posting record with reversal reference
    const updatedPosting = await tx.payrollAccountingPosting.update({
      where: { id: posting.id },
      data: {
        status: 'REVERSED',
        reversalJournalEntryId: reversalJournal.id,
        updatedAt: new Date()
      }
    });

    // Log PAYROLL_JOURNAL_REVERSE Audit Event
    await logAudit({
      actorId,
      actorEmail,
      action: 'PAYROLL_JOURNAL_REVERSE',
      entityType: 'PAYROLL_RUN',
      entityId: runId,
      oldValues: { status: 'POSTED', journalEntryId: originalJournal.id },
      newValues: {
        status: 'REVERSED',
        reversalJournalEntryId: reversalJournal.id,
        reversalEntryNumber: reversalJournal.entryNumber,
        reason: trimmedReason,
        reversedBy: actorEmail
      },
      req,
      tx
    });

    return {
      success: true,
      message: 'Payroll General Ledger posting successfully reversed.',
      posting: updatedPosting,
      originalJournalEntryNumber: originalJournal.entryNumber,
      reversalJournalEntry: reversalJournal
    };
  }, {
    maxWait: 15000,
    timeout: 60000
  });
}

/**
 * 4. Get Payroll Accounting Posting Details
 */
async function getPayrollAccountingPosting(runId) {
  const posting = await prisma.payrollAccountingPosting.findUnique({
    where: { payrollRunId: runId },
    include: {
      journalEntry: {
        include: {
          lines: {
            include: {
              account: {
                select: { id: true, code: true, name: true, type: true }
              }
            }
          }
        }
      },
      reversalJournalEntry: {
        include: {
          lines: {
            include: {
              account: {
                select: { id: true, code: true, name: true, type: true }
              }
            }
          }
        }
      }
    }
  });

  return posting;
}

module.exports = {
  buildPayrollJournalPlan,
  generatePayrollPostingPreview,
  postPayrollRunToLedger,
  reversePayrollPosting,
  getPayrollAccountingPosting
};
