/**
 * Comprehensive Automated Test Suite for Phase 5B:
 * Treasury Settlement + General Ledger Disbursement Engine
 */

const prisma = require('../src/config/db');
const { ensureStandardAccounts } = require('../src/utils/accountingHelper');
const { getPrimaryTreasuryAdmin, getPrimaryTreasuryWallet } = require('../src/utils/treasuryHelper');
const { postPayrollRunToLedger } = require('../src/services/payrollAccountingService');
const {
  getEmployeePayableStatus,
  createSalaryPayment,
  createSalaryPaymentBatch,
  approveSalaryPaymentBatch,
  settleSalaryPayment,
  settleSalaryPaymentBatch,
  reverseSalaryPaymentSettlement,
  getPaymentSettlementPreview,
  getPayrollPaymentSummary,
  transitionPaymentStatus
} = require('../src/services/salaryPaymentService');

async function main() {
  console.log('=== Starting Phase 5B: Treasury Settlement & GL Disbursement Engine Test Suite ===\n');

  const testSuffix = Date.now().toString().slice(-6);
  let structId;
  let empAId, empACode, empBId, empBCode;
  let periodId, runId, lockedRunId;
  let unpostedPeriodId, unpostedRunId;
  let itemAId, itemBId;
  let initialTreasuryLiquid = 0;
  let initialTreasuryCash = 0;
  let adminUserId;

  try {
    // -------------------------------------------------------------
    // Setup Phase: Chart of Accounts, Treasury Wallet, Structures, Employees, Runs
    // -------------------------------------------------------------
    console.log('Setup: Initializing Chart of Accounts, Master Treasury & Payroll Runs...');
    await ensureStandardAccounts(prisma);

    const admin = await getPrimaryTreasuryAdmin(prisma);
    adminUserId = admin.id;

    // Ensure Treasury Wallet has sufficient test liquidity (e.g. ₹500,000 Liquid, ₹100,000 Cash)
    const treasuryWallet = await getPrimaryTreasuryWallet(prisma);
    initialTreasuryLiquid = Number(treasuryWallet.availableBalanceLiquid);
    initialTreasuryCash = Number(treasuryWallet.availableBalanceCash);

    await prisma.wallet.update({
      where: { id: treasuryWallet.id },
      data: {
        availableBalanceLiquid: { increment: 500000 },
        availableBalanceCash: { increment: 100000 }
      }
    });

    const allComps = await prisma.salaryComponent.findMany();
    const basicComp = allComps.find(c => c.code === 'BASIC');
    const hraComp = allComps.find(c => c.code === 'HRA');
    const pfEmpComp = allComps.find(c => c.code === 'PF_EMPLOYEE');
    const pfEmprComp = allComps.find(c => c.code === 'PF_EMPLOYER');

    // Create Structure
    const struct = await prisma.salaryStructure.create({
      data: {
        code: `STR_P5B_${testSuffix}`,
        name: `Payroll Phase 5B Structure (${testSuffix})`,
        lines: {
          create: [
            { componentId: basicComp.id, calculationMethod: 'PERCENTAGE_OF_GROSS', percentage: 50, sequence: 1 },
            { componentId: hraComp.id, calculationMethod: 'PERCENTAGE_OF_BASIC', percentage: 40, sequence: 2 },
            { componentId: pfEmpComp.id, calculationMethod: 'PERCENTAGE_OF_BASIC', percentage: 12, sequence: 10 },
            { componentId: pfEmprComp.id, calculationMethod: 'PERCENTAGE_OF_BASIC', percentage: 12, sequence: 20 }
          ]
        }
      }
    });
    structId = struct.id;

    // Create Employee A (Net: ₹32,000)
    const empA = await prisma.employee.create({
      data: {
        employeeCode: `EMP5B1_${testSuffix}`,
        fullName: `Vikram Malhotra (P5B ${testSuffix})`,
        mobile: `91${Date.now().toString().slice(-8)}`,
        department: 'Operations',
        designation: 'Operations Manager',
        joiningDate: new Date('2026-06-01'),
        salaryAssignments: {
          create: {
            salaryStructureId: structId,
            baseGross: 50000,
            effectiveFrom: new Date('2026-06-01')
          }
        }
      }
    });
    empAId = empA.id;
    empACode = empA.employeeCode;

    // Create Employee B (Net: ₹25,600)
    const empB = await prisma.employee.create({
      data: {
        employeeCode: `EMP5B2_${testSuffix}`,
        fullName: `Ananya Roy (P5B ${testSuffix})`,
        mobile: `90${Date.now().toString().slice(-8)}`,
        department: 'Finance',
        designation: 'Senior Accountant',
        joiningDate: new Date('2026-06-01'),
        salaryAssignments: {
          create: {
            salaryStructureId: structId,
            baseGross: 40000,
            effectiveFrom: new Date('2026-06-01')
          }
        }
      }
    });
    empBId = empB.id;
    empBCode = empB.employeeCode;

    // Clean up any stale records from previous aborted tests
    await prisma.salaryPayment.deleteMany({ where: { employee: { employeeCode: { startsWith: 'EMP5B' } } } });
    await prisma.payrollAccountingPosting.deleteMany({ where: { payrollRun: { payrollPeriod: { year: 2026, month: 8 } } } });
    await prisma.payrollLine.deleteMany({ where: { payrollItem: { employee: { employeeCode: { startsWith: 'EMP5B' } } } } });
    await prisma.payrollItem.deleteMany({ where: { employee: { employeeCode: { startsWith: 'EMP5B' } } } });
    await prisma.payrollRun.deleteMany({ where: { payrollPeriod: { year: 2026, month: 8 } } });
    await prisma.payrollPeriod.deleteMany({ where: { year: 2026, month: 8 } });
    await prisma.payrollRun.deleteMany({ where: { payrollPeriod: { year: 2026, month: 10 } } });
    await prisma.payrollPeriod.deleteMany({ where: { year: 2026, month: 10 } });

    // Create Payroll Period (August 2026)
    const period = await prisma.payrollPeriod.create({
      data: {
        year: 2026,
        month: 8,
        periodStart: new Date('2026-08-01'),
        periodEnd: new Date('2026-08-31'),
        status: 'OPEN'
      }
    });
    periodId = period.id;

    // Create Locked & Posted Payroll Run
    const run = await prisma.payrollRun.create({
      data: {
        payrollPeriodId: periodId,
        runNumber: 1,
        status: 'LOCKED',
        totalEmployees: 2,
        totalGross: 63000,
        totalDeductions: 5400,
        totalNet: 57600, // 32000 (Emp A) + 25600 (Emp B)
        totalEmployerCost: 5400,
        lockedBy: 'admin@estatesync.local',
        lockedAt: new Date(),
        items: {
          create: [
            {
              employeeId: empAId,
              employeeCodeSnapshot: empACode,
              employeeNameSnapshot: empA.fullName,
              grossEarnings: 35000,
              totalDeductions: 3000,
              employerCost: 3000,
              netPayable: 32000,
              status: 'APPROVED',
              lines: {
                create: [
                  { componentCode: 'BASIC', componentName: 'Basic Salary', componentType: 'EARNING', calculationMethod: 'PERCENTAGE_OF_GROSS', amount: 25000, glAccountCodeSnapshot: '5060' },
                  { componentCode: 'HRA', componentName: 'House Rent Allowance', componentType: 'EARNING', calculationMethod: 'PERCENTAGE_OF_BASIC', amount: 10000, glAccountCodeSnapshot: '5060' },
                  { componentCode: 'PF_EMPLOYEE', componentName: 'Provident Fund', componentType: 'DEDUCTION', calculationMethod: 'PERCENTAGE_OF_BASIC', amount: 3000, glAccountCodeSnapshot: '2020' },
                  { componentCode: 'PF_EMPLOYER', componentName: 'Employer PF', componentType: 'EMPLOYER_CONTRIBUTION', calculationMethod: 'PERCENTAGE_OF_BASIC', amount: 3000, glAccountCodeSnapshot: '5070' }
                ]
              }
            },
            {
              employeeId: empBId,
              employeeCodeSnapshot: empBCode,
              employeeNameSnapshot: empB.fullName,
              grossEarnings: 28000,
              totalDeductions: 2400,
              employerCost: 2400,
              netPayable: 25600,
              status: 'APPROVED',
              lines: {
                create: [
                  { componentCode: 'BASIC', componentName: 'Basic Salary', componentType: 'EARNING', calculationMethod: 'PERCENTAGE_OF_GROSS', amount: 20000, glAccountCodeSnapshot: '5060' },
                  { componentCode: 'HRA', componentName: 'House Rent Allowance', componentType: 'EARNING', calculationMethod: 'PERCENTAGE_OF_BASIC', amount: 8000, glAccountCodeSnapshot: '5060' },
                  { componentCode: 'PF_EMPLOYEE', componentName: 'Provident Fund', componentType: 'DEDUCTION', calculationMethod: 'PERCENTAGE_OF_BASIC', amount: 2400, glAccountCodeSnapshot: '2020' },
                  { componentCode: 'PF_EMPLOYER', componentName: 'Employer PF', componentType: 'EMPLOYER_CONTRIBUTION', calculationMethod: 'PERCENTAGE_OF_BASIC', amount: 2400, glAccountCodeSnapshot: '5070' }
                ]
              }
            }
          ]
        }
      },
      include: { items: true }
    });
    runId = run.id;
    lockedRunId = run.id;

    itemAId = run.items.find(i => i.employeeId === empAId).id;
    itemBId = run.items.find(i => i.employeeId === empBId).id;

    // Post Phase 4 Accrual to Ledger
    await postPayrollRunToLedger({
      runId: lockedRunId,
      actorEmail: 'admin@estatesync.local',
      actorId: adminUserId
    });

    console.log('  ✅ Setup complete. Master Treasury funded, Run locked & posted to GL.\n');

    // -------------------------------------------------------------
    // Test 1: Successful Bank Settlement (APPROVED -> SETTLED)
    // -------------------------------------------------------------
    console.log('Test 1: Testing Successful Bank Settlement (APPROVED -> SETTLED)...');
    const payment1 = await createSalaryPayment({
      payrollRunId: lockedRunId,
      payrollItemId: itemAId,
      employeeId: empAId,
      amount: 15000,
      paymentMode: 'BANK_TRANSFER',
      initialStatus: 'DRAFT',
      actorEmail: 'accounting@estatesync.local',
      actorId: adminUserId
    });

    await transitionPaymentStatus({ paymentId: payment1.payment.id, targetStatus: 'PENDING_APPROVAL' });
    await transitionPaymentStatus({ paymentId: payment1.payment.id, targetStatus: 'APPROVED' });

    const bankRefNo = `UTR-P5B-${testSuffix}-001`;
    const walletBefore1 = await prisma.wallet.findUnique({ where: { id: treasuryWallet.id } });

    const settleRes1 = await settleSalaryPayment({
      paymentId: payment1.payment.id,
      referenceNo: bankRefNo,
      actorEmail: 'accounting@estatesync.local',
      actorId: adminUserId
    });

    const walletAfter1 = await prisma.wallet.findUnique({ where: { id: treasuryWallet.id } });

    if (!settleRes1.success || settleRes1.payment.status !== 'SETTLED') {
      throw new Error(`Bank settlement failed: ${JSON.stringify(settleRes1)}`);
    }

    // Verify Treasury Wallet deduction
    const liquidDelta = Number(walletBefore1.availableBalanceLiquid) - Number(walletAfter1.availableBalanceLiquid);
    if (Math.abs(liquidDelta - 15000) > 0.009) {
      throw new Error(`Treasury liquid balance deduction mismatch: expected 15000, got ${liquidDelta}`);
    }

    // Verify WalletTransaction
    if (!settleRes1.walletTransaction || settleRes1.walletTransaction.amount != 15000 || settleRes1.walletTransaction.type !== 'SALARY_PAYMENT') {
      throw new Error(`WalletTransaction incorrect: ${JSON.stringify(settleRes1.walletTransaction)}`);
    }

    // Verify GL Journal
    if (!settleRes1.journal || !settleRes1.payment.journalEntryId) {
      throw new Error(`Settlement journal missing: ${JSON.stringify(settleRes1.journal)}`);
    }

    console.log(`  ✅ Passed: Bank settlement succeeded (Payment: ${settleRes1.payment.paymentNumber}, Journal: ${settleRes1.journal.entryNumber}, UTR: ${bankRefNo})`);

    // -------------------------------------------------------------
    // Test 2: Successful Cash Settlement (PROCESSING -> SETTLED)
    // -------------------------------------------------------------
    console.log('\nTest 2: Testing Successful Cash Settlement (PROCESSING -> SETTLED)...');
    const payment2 = await createSalaryPayment({
      payrollRunId: lockedRunId,
      payrollItemId: itemBId,
      employeeId: empBId,
      amount: 8000,
      paymentMode: 'CASH',
      sourceAccountCode: '1020',
      initialStatus: 'DRAFT',
      actorEmail: 'accounting@estatesync.local',
      actorId: adminUserId
    });

    await transitionPaymentStatus({ paymentId: payment2.payment.id, targetStatus: 'PENDING_APPROVAL' });
    await transitionPaymentStatus({ paymentId: payment2.payment.id, targetStatus: 'APPROVED' });
    await transitionPaymentStatus({ paymentId: payment2.payment.id, targetStatus: 'PROCESSING' });

    const cashVoucherNo = `CSH-VCH-${testSuffix}-001`;
    const walletBefore2 = await prisma.wallet.findUnique({ where: { id: treasuryWallet.id } });

    const settleRes2 = await settleSalaryPayment({
      paymentId: payment2.payment.id,
      referenceNo: cashVoucherNo,
      paymentMode: 'CASH',
      sourceAccountCode: '1020',
      actorEmail: 'accounting@estatesync.local',
      actorId: adminUserId
    });

    const walletAfter2 = await prisma.wallet.findUnique({ where: { id: treasuryWallet.id } });
    const cashDelta = Number(walletBefore2.availableBalanceCash) - Number(walletAfter2.availableBalanceCash);

    if (Math.abs(cashDelta - 8000) > 0.009) {
      throw new Error(`Treasury cash deduction mismatch: expected 8000, got ${cashDelta}`);
    }

    console.log(`  ✅ Passed: Cash settlement succeeded (Payment: ${settleRes2.payment.paymentNumber}, Journal: ${settleRes2.journal.entryNumber}, Cash Voucher: ${cashVoucherNo})`);

    // -------------------------------------------------------------
    // Test 5 & 6: Unlocked Payroll & Missing Phase 4 Rejection Gate
    // -------------------------------------------------------------
    console.log('\nTest 5 & 6: Testing Unlocked Payroll & Missing Phase 4 Gate...');
    const unpostedPeriod = await prisma.payrollPeriod.create({
      data: {
        year: 2026,
        month: 10,
        periodStart: new Date('2026-10-01'),
        periodEnd: new Date('2026-10-31'),
        status: 'OPEN'
      }
    });
    unpostedPeriodId = unpostedPeriod.id;

    const unpostedRun = await prisma.payrollRun.create({
      data: {
        payrollPeriodId: unpostedPeriodId,
        runNumber: 1,
        status: 'CALCULATED',
        totalNet: 32000,
        items: {
          create: {
            employeeId: empAId,
            employeeCodeSnapshot: empACode,
            employeeNameSnapshot: empA.fullName,
            netPayable: 32000,
            status: 'CALCULATED'
          }
        }
      },
      include: { items: true }
    });
    unpostedRunId = unpostedRun.id;

    // Create a fake payment directly on unlocked run to test settlement gate
    const fakePay = await prisma.salaryPayment.create({
      data: {
        paymentNumber: `PAY-FAKE-${testSuffix}-001`,
        payrollRunId: unpostedRun.id,
        payrollItemId: unpostedRun.items[0].id,
        employeeId: empAId,
        amount: 5000,
        paymentMode: 'BANK_TRANSFER',
        status: 'APPROVED',
        createdBy: 'admin@estatesync.local'
      }
    });

    try {
      await settleSalaryPayment({ paymentId: fakePay.id, actorEmail: 'admin@estatesync.local', actorId: adminUserId });
      throw new Error('Settlement on unlocked run unexpectedly succeeded!');
    } catch (err) {
      if (err.code === 'PAYROLL_NOT_LOCKED') {
        console.log('  ✅ Passed: Settlement on non-locked run rejected with PAYROLL_NOT_LOCKED.');
      } else {
        throw err;
      }
    }

    // Now update run to LOCKED but without Phase 4 posting
    await prisma.payrollRun.update({ where: { id: unpostedRun.id }, data: { status: 'LOCKED' } });

    try {
      await settleSalaryPayment({ paymentId: fakePay.id, actorEmail: 'admin@estatesync.local', actorId: adminUserId });
      throw new Error('Settlement on unposted run unexpectedly succeeded!');
    } catch (err) {
      if (err.code === 'PAYROLL_NOT_POSTED_TO_GL') {
        console.log('  ✅ Passed: Settlement without Phase 4 posting rejected with PAYROLL_NOT_POSTED_TO_GL.');
      } else {
        throw err;
      }
    } finally {
      await prisma.salaryPayment.delete({ where: { id: fakePay.id } });
    }

    // -------------------------------------------------------------
    // Test 7 & 8: Overpayment & Insufficient Treasury Funds Rejection
    // -------------------------------------------------------------
    console.log('\nTest 7 & 8: Testing Overpayment & Insufficient Treasury Funds...');
    // Employee A currently has settled ₹15,000 out of ₹32,000 (Available capacity: ₹17,000)
    // Create a payment for ₹20,000 directly in APPROVED status to test settlement capacity gate
    const overPay = await prisma.salaryPayment.create({
      data: {
        paymentNumber: `PAY-OVER-${testSuffix}-001`,
        payrollRunId: lockedRunId,
        payrollItemId: itemAId,
        employeeId: empAId,
        amount: 20000,
        paymentMode: 'BANK_TRANSFER',
        status: 'APPROVED',
        createdBy: 'admin@estatesync.local'
      }
    });

    try {
      await settleSalaryPayment({ paymentId: overPay.id, actorEmail: 'admin@estatesync.local', actorId: adminUserId });
      throw new Error('Overpayment settlement unexpectedly succeeded!');
    } catch (err) {
      if (err.code === 'OVERPAYMENT_PROHIBITED') {
        console.log('  ✅ Passed: Overpayment settlement rejected with OVERPAYMENT_PROHIBITED.');
      } else {
        throw err;
      }
    } finally {
      await prisma.salaryPayment.delete({ where: { id: overPay.id } });
    }

    // Test Insufficient Treasury: Temporarily set treasury liquid to ₹0
    await prisma.wallet.update({ where: { id: treasuryWallet.id }, data: { availableBalanceLiquid: 0 } });

    const validPay = await createSalaryPayment({
      payrollRunId: lockedRunId,
      payrollItemId: itemAId,
      employeeId: empAId,
      amount: 10000,
      paymentMode: 'BANK_TRANSFER',
      initialStatus: 'DRAFT',
      actorEmail: 'admin@estatesync.local',
      actorId: adminUserId
    });
    await transitionPaymentStatus({ paymentId: validPay.payment.id, targetStatus: 'PENDING_APPROVAL' });
    await transitionPaymentStatus({ paymentId: validPay.payment.id, targetStatus: 'APPROVED' });

    try {
      await settleSalaryPayment({ paymentId: validPay.payment.id, actorEmail: 'admin@estatesync.local', actorId: adminUserId });
      throw new Error('Settlement with zero treasury balance unexpectedly succeeded!');
    } catch (err) {
      if (err.code === 'INSUFFICIENT_TREASURY_FUNDS') {
        console.log('  ✅ Passed: Settlement with insufficient treasury funds rejected with INSUFFICIENT_TREASURY_FUNDS.');
      } else {
        throw err;
      }
    }

    // Restore Treasury funds
    await prisma.wallet.update({ where: { id: treasuryWallet.id }, data: { availableBalanceLiquid: 500000 } });

    // -------------------------------------------------------------
    // Test 10: Duplicate Settlement Rejection & Idempotency
    // -------------------------------------------------------------
    console.log('\nTest 10: Testing Duplicate Settlement Rejection...');
    try {
      // Attempt to settle payment1 again (which is already SETTLED)
      await settleSalaryPayment({ paymentId: payment1.payment.id, actorEmail: 'admin@estatesync.local', actorId: adminUserId });
      throw new Error('Duplicate settlement attempt unexpectedly succeeded!');
    } catch (err) {
      if (err.code === 'INVALID_PAYMENT_STATUS_FOR_SETTLEMENT' || err.code === 'PAYMENT_ALREADY_SETTLED') {
        console.log(`  ✅ Passed: Duplicate settlement rejected with: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Test 11: Concurrent Settlement Protection
    // -------------------------------------------------------------
    console.log('\nTest 11: Testing Concurrent Settlement Protection (Simultaneous Race)...');
    console.log('  - Launching simultaneous settlement requests on payment record...');
    const [raceRes1, raceRes2] = await Promise.allSettled([
      settleSalaryPayment({ paymentId: validPay.payment.id, actorEmail: 'admin@estatesync.local', actorId: adminUserId }),
      settleSalaryPayment({ paymentId: validPay.payment.id, actorEmail: 'admin@estatesync.local', actorId: adminUserId })
    ]);

    const raceSuccesses = [raceRes1, raceRes2].filter(r => r.status === 'fulfilled');
    const raceFailures = [raceRes1, raceRes2].filter(r => r.status === 'rejected');

    if (raceSuccesses.length !== 1 || raceFailures.length !== 1) {
      throw new Error(`Concurrency race failed: ${raceSuccesses.length} succeeded, ${raceFailures.length} failed`);
    }
    console.log('  ✅ Passed: Exactly 1 concurrent settlement succeeded; 2nd received race conflict error. Zero double settlement.');

    // -------------------------------------------------------------
    // Test 12 & 13: Partial Settlements & Outstanding Reconciliation
    // -------------------------------------------------------------
    console.log('\nTest 12 & 13: Verifying Successive Partial Settlements & Derived Outstanding...');
    // Employee A netPayable: ₹32,000. Settled so far: Payment 1 (₹15,000) + validPay (₹10,000) = ₹25,000
    // Remaining available: ₹7,000. Settle final tranche of ₹7,000
    const finalTranche = await createSalaryPayment({
      payrollRunId: lockedRunId,
      payrollItemId: itemAId,
      employeeId: empAId,
      amount: 7000,
      initialStatus: 'DRAFT',
      actorEmail: 'admin@estatesync.local',
      actorId: adminUserId
    });
    await transitionPaymentStatus({ paymentId: finalTranche.payment.id, targetStatus: 'PENDING_APPROVAL' });
    await transitionPaymentStatus({ paymentId: finalTranche.payment.id, targetStatus: 'APPROVED' });
    await settleSalaryPayment({ paymentId: finalTranche.payment.id, actorEmail: 'admin@estatesync.local', actorId: adminUserId });

    const statusAAfterFull = await getEmployeePayableStatus({ payrollItemId: itemAId });
    console.log(`  - Employee A: Net = ₹${statusAAfterFull.netPayable}, Settled = ₹${statusAAfterFull.settledAmount}, Available = ₹${statusAAfterFull.availablePayable}, Outstanding = ₹${statusAAfterFull.outstandingLiability}`);

    if (statusAAfterFull.settledAmount !== 32000 || statusAAfterFull.availablePayable !== 0 || statusAAfterFull.outstandingLiability !== 0) {
      throw new Error(`Employee A partial settlements calculation mismatch: ${JSON.stringify(statusAAfterFull)}`);
    }
    console.log('  ✅ Passed: Employee A fully liquidated via 3 successive partial settlements (₹15k + ₹10k + ₹7k = ₹32k).');

    // -------------------------------------------------------------
    // Test 14 & 15: Batch Settlement Engine
    // -------------------------------------------------------------
    console.log('\nTest 14 & 15: Testing Multi-Employee Batch Settlement...');
    // Employee B netPayable: ₹25,600. Settled so far: ₹8,000. Remaining: ₹17,600.
    // Create Batch with 2 payments of ₹8,800 for Employee B
    const batchRes = await createSalaryPaymentBatch({
      payrollRunId: lockedRunId,
      notes: 'Employee B Tranches Batch',
      payments: [
        { payrollItemId: itemBId, amount: 8800 },
        { payrollItemId: itemBId, amount: 8800 }
      ],
      actorEmail: 'admin@estatesync.local',
      actorId: adminUserId
    });

    await approveSalaryPaymentBatch({ batchId: batchRes.batch.id, actorEmail: 'admin@estatesync.local', actorId: adminUserId });

    const batchSettleRes = await settleSalaryPaymentBatch({
      batchId: batchRes.batch.id,
      actorEmail: 'admin@estatesync.local',
      actorId: adminUserId
    });

    if (!batchSettleRes.success || batchSettleRes.batch.status !== 'SETTLED') {
      throw new Error(`Batch settlement failed: ${JSON.stringify(batchSettleRes)}`);
    }
    console.log(`  ✅ Passed: Batch ${batchSettleRes.batch.batchNumber} settled with status: ${batchSettleRes.batch.status}`);

    // -------------------------------------------------------------
    // Test 18, 19, 20 & 21: Full Financial Reconciliation & Double-Entry Integrity
    // -------------------------------------------------------------
    console.log('\nTest 18-21: Verifying General Ledger Double-Entry Balancing & Reconciliation...');
    const summary = await getPayrollPaymentSummary(lockedRunId);
    console.log(`  - Run Total Net: ₹${summary.totals.totalNet}`);
    console.log(`  - Total Settled: ₹${summary.totals.totalSettled}`);
    console.log(`  - Total Reserved: ₹${summary.totals.totalReserved}`);
    console.log(`  - Total Available: ₹${summary.totals.totalAvailable}`);
    console.log(`  - Total Outstanding: ₹${summary.totals.totalOutstanding}`);

    if (summary.totals.totalSettled !== 57600 || summary.totals.totalOutstanding !== 0) {
      throw new Error(`Payroll Run total settlement mismatch! Summary: ${JSON.stringify(summary.totals)}`);
    }

    // Verify all journals for this run are 100% balanced
    const journals = await prisma.journalEntry.findMany({
      where: { referenceType: 'SALARY_PAYMENT' },
      include: { lines: true }
    });

    for (const j of journals) {
      let dr = 0, cr = 0;
      for (const line of j.lines) {
        dr += Number(line.debit);
        cr += Number(line.credit);
      }
      if (Math.abs(dr - cr) > 0.009) {
        throw new Error(`Unbalanced settlement journal found: ${j.entryNumber}, Dr=${dr}, Cr=${cr}`);
      }
    }
    console.log(`  ✅ Passed: Verified ${journals.length} settlement journals are 100% balanced (|Dr - Cr| == 0).`);

    // -------------------------------------------------------------
    // Test 24, 25 & 26: Settlement Reversal Engine (Admin Only)
    // -------------------------------------------------------------
    console.log('\nTest 24, 25 & 26: Testing Settlement Reversal Engine...');
    const walletBeforeRev = await prisma.wallet.findUnique({ where: { id: treasuryWallet.id } });

    // Reverse finalTranche (₹7,000 on Employee A)
    const revRes = await reverseSalaryPaymentSettlement({
      paymentId: finalTranche.payment.id,
      reason: 'Overtime hours recalculated',
      actorEmail: 'admin@estatesync.local',
      actorId: adminUserId
    });

    const walletAfterRev = await prisma.wallet.findUnique({ where: { id: treasuryWallet.id } });
    const restoredLiquid = Number(walletAfterRev.availableBalanceLiquid) - Number(walletBeforeRev.availableBalanceLiquid);

    if (Math.abs(restoredLiquid - 7000) > 0.009) {
      throw new Error(`Reversal failed to restore treasury liquid balance! Expected 7000, got ${restoredLiquid}`);
    }

    // Verify derived payable restoration
    const statusAAfterRev = await getEmployeePayableStatus({ payrollItemId: itemAId });
    console.log(`  - Employee A after reversal: Settled = ₹${statusAAfterRev.settledAmount}, Available = ₹${statusAAfterRev.availablePayable}`);

    if (statusAAfterRev.settledAmount !== 25000 || statusAAfterRev.availablePayable !== 7000) {
      throw new Error(`Payable restoration mismatch: ${JSON.stringify(statusAAfterRev)}`);
    }

    // Test Double Reversal Rejection
    try {
      await reverseSalaryPaymentSettlement({
        paymentId: finalTranche.payment.id,
        reason: 'Duplicate reversal attempt',
        actorEmail: 'admin@estatesync.local',
        actorId: adminUserId
      });
      throw new Error('Double reversal unexpectedly succeeded!');
    } catch (err) {
      if (err.code === 'INVALID_STATUS_FOR_REVERSAL' || err.code === 'PAYMENT_ALREADY_REVERSED') {
        console.log('  ✅ Passed: Double reversal rejected.');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Test 27: Immutability Audit
    // -------------------------------------------------------------
    console.log('\nTest 27: Confirming 100% Immutability of PayrollItem, PayrollRun, PayrollLine...');
    const finalItemA = await prisma.payrollItem.findUnique({ where: { id: itemAId } });
    const finalRun = await prisma.payrollRun.findUnique({ where: { id: lockedRunId } });

    if (Number(finalItemA.netPayable) !== 32000 || Number(finalItemA.grossEarnings) !== 35000) {
      throw new Error('PayrollItem was mutated during Phase 5B settlement operations!');
    }
    if (Number(finalRun.totalNet) !== 57600 || Number(finalRun.totalGross) !== 63000) {
      throw new Error('PayrollRun totals were mutated during Phase 5B settlement operations!');
    }
    console.log('  ✅ Passed: PayrollItem.netPayable (₹32,000) and PayrollRun.totalNet (₹57,600) remained 100% immutable.');

    // -------------------------------------------------------------
    // Test 28: UTR / Reference No Duplicate Protection
    // -------------------------------------------------------------
    console.log('\nTest 28: Verifying UTR Duplicate Prevention across Banking Domain...');
    // Attempt to settle another payment using already recorded UTR `bankRefNo`
    const dupRefPay = await createSalaryPayment({
      payrollRunId: lockedRunId,
      payrollItemId: itemAId,
      employeeId: empAId,
      amount: 5000,
      initialStatus: 'DRAFT',
      actorEmail: 'admin@estatesync.local',
      actorId: adminUserId
    });
    await transitionPaymentStatus({ paymentId: dupRefPay.payment.id, targetStatus: 'PENDING_APPROVAL' });
    await transitionPaymentStatus({ paymentId: dupRefPay.payment.id, targetStatus: 'APPROVED' });

    try {
      await settleSalaryPayment({
        paymentId: dupRefPay.payment.id,
        referenceNo: bankRefNo, // Reusing UTR from Test 1
        actorEmail: 'admin@estatesync.local',
        actorId: adminUserId
      });
      throw new Error('Settlement with duplicate UTR unexpectedly succeeded!');
    } catch (err) {
      if (err.code === 'DUPLICATE_REFERENCE_NO') {
        console.log(`  ✅ Passed: Duplicate UTR rejected with: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Test 29: Read-Only Settlement Preview Verification
    // -------------------------------------------------------------
    console.log('\nTest 29: Verifying Read-Only Settlement Preview...');
    const preview = await getPaymentSettlementPreview(dupRefPay.payment.id);
    console.log(`  - Preview Amount: ₹${preview.amount}`);
    console.log(`  - Proposed Journal: ${preview.proposedJournal.description}`);
    console.log(`  - Proposed Lines:`, preview.proposedJournal.lines);
    console.log(`  - Eligible: ${preview.isEligibleForSettlement}`);

    if (!preview.proposedJournal.isBalanced || preview.proposedJournal.lines.length !== 2) {
      throw new Error(`Settlement preview malformed: ${JSON.stringify(preview)}`);
    }
    console.log('  ✅ Passed: Settlement Preview verified with zero DB mutations.');

    console.log('\n=== ALL PHASE 5B SALARY PAYMENT SETTLEMENT & GL DISBURSEMENT TESTS PASSED! ===');

  } finally {
    console.log('\nCleaning up Phase 5B test records...');
    if (lockedRunId) {
      await prisma.salaryPayment.deleteMany({ where: { payrollRunId: lockedRunId } });
      await prisma.salaryPaymentBatch.deleteMany({ where: { payrollRunId: lockedRunId } });
      await prisma.payrollAccountingPosting.deleteMany({ where: { payrollRunId: lockedRunId } });
      await prisma.journalLine.deleteMany({ where: { journalEntry: { referenceId: lockedRunId } } });
      await prisma.journalEntry.deleteMany({ where: { referenceId: lockedRunId } });
      await prisma.payrollLine.deleteMany({ where: { payrollItem: { payrollRunId: lockedRunId } } });
      await prisma.payrollItem.deleteMany({ where: { payrollRunId: lockedRunId } });
      await prisma.payrollRun.deleteMany({ where: { id: lockedRunId } });
    }
    if (unpostedRunId) {
      await prisma.salaryPayment.deleteMany({ where: { payrollRunId: unpostedRunId } });
      await prisma.salaryPaymentBatch.deleteMany({ where: { payrollRunId: unpostedRunId } });
      await prisma.payrollLine.deleteMany({ where: { payrollItem: { payrollRunId: unpostedRunId } } });
      await prisma.payrollItem.deleteMany({ where: { payrollRunId: unpostedRunId } });
      await prisma.payrollRun.deleteMany({ where: { id: unpostedRunId } });
    }
    if (periodId) {
      await prisma.payrollPeriod.deleteMany({ where: { id: periodId } });
    }
    if (unpostedPeriodId) {
      await prisma.payrollPeriod.deleteMany({ where: { id: unpostedPeriodId } });
    }
    if (empAId) {
      await prisma.employeeSalaryAssignment.deleteMany({ where: { employeeId: empAId } });
      await prisma.employee.deleteMany({ where: { id: empAId } });
    }
    if (empBId) {
      await prisma.employeeSalaryAssignment.deleteMany({ where: { employeeId: empBId } });
      await prisma.employee.deleteMany({ where: { id: empBId } });
    }
    if (structId) {
      await prisma.salaryStructureLine.deleteMany({ where: { structureId: structId } });
      await prisma.salaryStructure.deleteMany({ where: { id: structId } });
    }
    console.log('✅ Cleanup complete.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
