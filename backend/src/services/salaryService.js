const prisma = require('../config/db');
const { getPrimaryTreasuryWallet } = require('../utils/treasuryHelper');
const { postJournalEntry } = require('../utils/accountingHelper');
const { checkDuplicateReferenceNo, registerBankReference } = require('../utils/referenceValidator');
const { logAudit } = require('../utils/auditLogger');

/**
 * Generate Next Sequential Salary Payment Number (e.g. SAL-202609-0001)
 */
async function generateNextSalaryPaymentNumber(tx, month) {
  const cleanMonth = (month || new Date().toISOString().slice(0, 7)).replace('-', '');
  const prefix = `SAL-${cleanMonth}-`;

  const lastPayment = await tx.$queryRawUnsafe(`
    SELECT "paymentNumber" 
    FROM "EmployeeSalaryPayment"
    WHERE "paymentNumber" LIKE $1
    ORDER BY "paymentNumber" DESC
    LIMIT 1
  `, `${prefix}%`);

  let nextSeq = 1;
  if (lastPayment && lastPayment.length > 0) {
    const parts = lastPayment[0].paymentNumber.split('-');
    const currentSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(currentSeq)) {
      nextSeq = currentSeq + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Update Employee Base Salary and Banking Details (Admin Only)
 */
async function updateEmployeeSalaryConfig({
  employeeId,
  baseSalary,
  bankName,
  bankAccountNo,
  ifscCode,
  upiId,
  paymentMethod,
  actor
}) {
  const numSalary = parseFloat(baseSalary || 0);
  if (isNaN(numSalary) || numSalary < 0) {
    throw { status: 400, message: 'Base salary must be a non-negative number.' };
  }

  const existing = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!existing) {
    throw { status: 404, message: 'Employee not found.' };
  }

  await prisma.$executeRawUnsafe(`
    UPDATE "Employee"
    SET 
      "baseSalary" = $1,
      "bankName" = $2,
      "bankAccountNo" = $3,
      "ifscCode" = $4,
      "upiId" = $5,
      "paymentMethod" = $6,
      "updatedAt" = NOW()
    WHERE "id" = $7
  `, numSalary, bankName || null, bankAccountNo || null, ifscCode ? ifscCode.trim().toUpperCase() : null, upiId || null, paymentMethod || 'BANK_TRANSFER', employeeId);

  await logAudit({
    action: 'EMPLOYEE_SALARY_CONFIG_UPDATE',
    entityType: 'EMPLOYEE',
    entityId: employeeId,
    newValues: {
      employeeCode: existing.employeeCode,
      fullName: existing.fullName,
      baseSalary: numSalary,
      bankName,
      ifscCode,
      paymentMethod
    },
    req: { user: actor }
  });

  return {
    success: true,
    message: `Salary configuration for ${existing.fullName} updated successfully.`,
    baseSalary: numSalary
  };
}

/**
 * Disburse Monthly Salary from Corporate Treasury Wallet (Admin & Accounting)
 * Atomically deducts Treasury liquidity, posts balanced GL journal, and registers bank reference.
 */
async function disburseEmployeeSalary({
  employeeId,
  month,
  amount,
  paymentMode = 'BANK_TRANSFER',
  referenceNo,
  notes,
  actorUser
}) {
  const targetMonth = month ? month.trim() : new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
    throw { status: 400, message: 'Invalid month format. Please use YYYY-MM (e.g. 2026-09).' };
  }
  const [year, m] = targetMonth.split('-').map(Number);
  if (isNaN(year) || isNaN(m) || year < 2020 || year > 2050 || m < 1 || m > 12) {
    throw { status: 400, message: 'Invalid payment month. Year must be between 2020 and 2050, and month between 01 and 12.' };
  }

  // 1. Fetch Employee Details
  const employeeResult = await prisma.$queryRawUnsafe(`
    SELECT "id", "employeeCode", "fullName", "department", "designation", "status", "baseSalary", "bankName", "bankAccountNo", "ifscCode", "upiId"
    FROM "Employee"
    WHERE "id" = $1
  `, employeeId);

  if (!employeeResult || employeeResult.length === 0) {
    throw { status: 404, message: 'Employee not found.' };
  }

  const employee = employeeResult[0];

  if (employee.status !== 'ACTIVE') {
    throw { status: 400, message: `Cannot disburse salary: Employee ${employee.fullName} is ${employee.status}. Only ACTIVE employees are eligible for payout.` };
  }

  // Determine disbursement amount (use provided amount or default to employee baseSalary)
  const rawAmount = amount !== undefined && amount !== null && amount !== '' 
    ? parseFloat(amount) 
    : parseFloat(employee.baseSalary || 0);

  if (isNaN(rawAmount) || rawAmount < 1 || !isFinite(rawAmount)) {
    throw { status: 400, message: 'Disbursement amount must be a valid positive number of at least ₹1. Please configure employee base salary first or provide a valid amount.' };
  }
  const finalAmount = Math.round(rawAmount * 100) / 100;

  const cleanRef = referenceNo ? referenceNo.trim() : null;
  const isCash = (paymentMode || '').toUpperCase() === 'CASH';

  if (!isCash && !cleanRef) {
    throw { status: 400, message: 'Bank Reference / UTR number is strictly required for non-cash salary disbursements.' };
  }

  // 2. Execute Atomic Disbursement Transaction
  const result = await prisma.$transaction(async (tx) => {
    // A. Check duplicate payment for this employee for this month
    const existingPayout = await tx.$queryRawUnsafe(`
      SELECT "id", "paymentNumber", "amount", "paidAt"
      FROM "EmployeeSalaryPayment"
      WHERE "employeeId" = $1 AND "month" = $2 AND "status" = 'PAID'
      LIMIT 1
    `, employeeId, targetMonth);

    if (existingPayout && existingPayout.length > 0) {
      throw {
        status: 409,
        message: `Duplicate Salary Payment Error: Employee ${employee.fullName} (${employee.employeeCode}) has already been paid for ${targetMonth} (Record: ${existingPayout[0].paymentNumber}, Amount: ₹${parseFloat(existingPayout[0].amount).toLocaleString('en-IN')}).`
      };
    }

    // B. Check Duplicate Reference / UTR
    if (!isCash && cleanRef) {
      const dupError = await checkDuplicateReferenceNo(tx, cleanRef);
      if (dupError) {
        throw { status: 400, message: dupError };
      }
    }

    // C. Check Corporate Treasury Wallet Liquidity
    const treasuryWallet = await getPrimaryTreasuryWallet(tx);
    const balanceField = isCash ? 'availableBalanceCash' : 'availableBalanceLiquid';
    const allocatedField = isCash ? 'totalAllocatedCash' : 'totalAllocatedLiquid';
    const spentField = isCash ? 'totalSpentCash' : 'totalSpentLiquid';
    const availableFunds = parseFloat(treasuryWallet[balanceField] || 0);

    if (availableFunds < finalAmount) {
      throw {
        status: 400,
        message: `Insufficient Corporate Treasury Liquidity: Available ${isCash ? 'Cash' : 'Bank'} balance is ₹${availableFunds.toLocaleString('en-IN')}, but required payout is ₹${finalAmount.toLocaleString('en-IN')}.`
      };
    }

    // D. Generate Next Sequential Payment Number
    const paymentNumber = await generateNextSalaryPaymentNumber(tx, targetMonth);

    // E. Deduct from Corporate Treasury Wallet (Atomic Concurrency Guard)
    const updatedWallets = await tx.$queryRawUnsafe(`
      UPDATE "Wallet"
      SET 
        "${balanceField}" = "${balanceField}" - $1,
        "${allocatedField}" = "${allocatedField}" - $1,
        "${spentField}" = "${spentField}" + $1,
        "updatedAt" = NOW()
      WHERE "id" = $2 AND "${balanceField}" >= $1
      RETURNING "id", "${balanceField}"
    `, finalAmount, treasuryWallet.id);

    if (!updatedWallets || updatedWallets.length === 0) {
      throw {
        status: 400,
        message: `Insufficient Corporate Treasury Liquidity: Available ${isCash ? 'Cash' : 'Bank'} balance is insufficient for this payout.`
      };
    }

    // F. Create WalletTransaction Audit Outflow
    const walletTx = await tx.walletTransaction.create({
      data: {
        type: 'SALARY_PAYMENT',
        sourceWalletId: treasuryWallet.id,
        destWalletId: null,
        amount: finalAmount,
        fundMode: isCash ? 'CASH' : 'LIQUID',
        referenceType: 'SALARY_PAYMENT',
        referenceId: paymentNumber,
        description: `Salary Payout (${targetMonth}): ₹${finalAmount.toLocaleString('en-IN')} to ${employee.fullName} (${employee.employeeCode}) via ${paymentMode}`,
        createdBy: actorUser.userId || actorUser.id,
        status: 'COMPLETED'
      }
    });

    // G. Post Balanced Double-Entry General Ledger Journal
    const journal = await postJournalEntry(tx, {
      description: `Salary Disbursement: ${paymentNumber} — ${employee.fullName} (${employee.employeeCode}) for ${targetMonth}`,
      referenceType: 'SALARY_PAYMENT',
      referenceId: paymentNumber,
      createdBy: actorUser.userId || actorUser.id,
      lines: [
        {
          accountCode: '5060',
          debit: finalAmount,
          credit: 0,
          description: `Staff Salary Expense: ${employee.fullName} (${employee.employeeCode}) — ${targetMonth}`
        },
        {
          accountCode: isCash ? '1020' : '1010',
          debit: 0,
          credit: finalAmount,
          description: `Corporate Treasury Outflow: ${paymentNumber}`
        }
      ]
    });

    // H. Insert into EmployeeSalaryPayment
    const paymentRecord = await tx.$queryRawUnsafe(`
      INSERT INTO "EmployeeSalaryPayment" (
        "id", "paymentNumber", "employeeId", "month", "amount", "paymentMode", "referenceNo", "notes",
        "paidAt", "paidBy", "journalEntryId", "walletTransactionId", "status", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, 'PAID', NOW(), NOW()
      )
      RETURNING *
    `, paymentNumber, employeeId, targetMonth, finalAmount, paymentMode, cleanRef, notes || null, actorUser.email || actorUser.name || 'ADMIN', journal.id, walletTx.id);

    const createdPayment = paymentRecord[0];

    // I. Register in GlobalBankReference for external uniqueness
    if (!isCash && cleanRef) {
      await registerBankReference(tx, {
        referenceNo: cleanRef,
        module: 'SALARY_PAYMENT',
        sourceTable: 'EmployeeSalaryPayment',
        sourceRecordId: createdPayment.id,
        amount: finalAmount,
        paymentMode,
        recordedBy: actorUser.email || 'ADMIN'
      });
    }

    return {
      payment: createdPayment,
      journalNumber: journal.entryNumber,
      employeeName: employee.fullName,
      employeeCode: employee.employeeCode,
      amount: finalAmount,
      month: targetMonth,
      remainingTreasuryBalance: availableFunds - finalAmount
    };
  }, { timeout: 15000, maxWait: 10000 });

  // J. Audit Logging
  await logAudit({
    action: 'SALARY_PAYMENT_DISBURSED',
    entityType: 'EMPLOYEE',
    entityId: employeeId,
    newValues: {
      paymentNumber: result.payment.paymentNumber,
      employeeId,
      employeeName: result.employeeName,
      employeeCode: result.employeeCode,
      month: targetMonth,
      amount: finalAmount,
      paymentMode,
      referenceNo: cleanRef,
      journalNumber: result.journalNumber
    },
    req: { user: actorUser }
  });

  return {
    success: true,
    message: `Salary of ₹${finalAmount.toLocaleString('en-IN')} for ${targetMonth} disbursed successfully to ${result.employeeName} (${result.employeeCode}).`,
    data: result
  };
}

/**
 * Get Salary Payment History for an Employee
 */
async function getEmployeeSalaryPayments(employeeId) {
  const payments = await prisma.$queryRawUnsafe(`
    SELECT 
      p."id",
      p."paymentNumber",
      p."month",
      p."amount",
      p."paymentMode",
      p."referenceNo",
      p."notes",
      p."paidAt",
      p."paidBy",
      p."status",
      j."entryNumber" as "journalNumber"
    FROM "EmployeeSalaryPayment" p
    LEFT JOIN "JournalEntry" j ON p."journalEntryId" = j."id"
    WHERE p."employeeId" = $1
    ORDER BY p."paidAt" DESC
  `, employeeId);

  return payments;
}

/**
 * Get Enterprise Monthly Salary Dashboard Summary
 */
async function getSalarySummary(month) {
  const targetMonth = month ? month.trim() : new Date().toISOString().slice(0, 7);

  const activeEmployees = await prisma.$queryRawUnsafe(`
    SELECT 
      COUNT(*) as "activeCount",
      COALESCE(SUM("baseSalary"), 0) as "totalBaseSalary"
    FROM "Employee"
    WHERE "status" = 'ACTIVE'
  `);

  const monthlyDisbursements = await prisma.$queryRawUnsafe(`
    SELECT 
      COUNT(DISTINCT "employeeId") as "paidEmployeesCount",
      COALESCE(SUM("amount"), 0) as "totalDisbursed"
    FROM "EmployeeSalaryPayment"
    WHERE "month" = $1 AND "status" = 'PAID'
  `, targetMonth);

  const treasuryWallet = await getPrimaryTreasuryWallet();

  const activeCount = parseInt(activeEmployees[0].activeCount || 0, 10);
  const totalBaseSalary = parseFloat(activeEmployees[0].totalBaseSalary || 0);
  const paidEmployeesCount = parseInt(monthlyDisbursements[0].paidEmployeesCount || 0, 10);
  const totalDisbursed = parseFloat(monthlyDisbursements[0].totalDisbursed || 0);

  return {
    month: targetMonth,
    totalActiveEmployees: activeCount,
    totalMonthlyPayrollLiability: totalBaseSalary,
    paidEmployeesCount,
    totalDisbursedThisMonth: totalDisbursed,
    pendingEmployeesCount: Math.max(0, activeCount - paidEmployeesCount),
    treasuryAvailableLiquid: parseFloat(treasuryWallet.availableBalanceLiquid || 0),
    treasuryAvailableCash: parseFloat(treasuryWallet.availableBalanceCash || 0)
  };
}

module.exports = {
  updateEmployeeSalaryConfig,
  disburseEmployeeSalary,
  getEmployeeSalaryPayments,
  getSalarySummary
};
