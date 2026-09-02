/**
 * Automated Test Suite for Phase 5A:
 * Salary Payment Domain, Schema, Reservation & PostgreSQL Concurrency Engine
 */

const prisma = require('../src/config/db');
const { ensureStandardAccounts } = require('../src/utils/accountingHelper');
const { postPayrollRunToLedger } = require('../src/services/payrollAccountingService');
const {
  getEmployeePayableStatus,
  createSalaryPayment,
  createSalaryPaymentBatch,
  approveSalaryPaymentBatch,
  cancelSalaryPaymentBatch,
  transitionPaymentStatus,
  getPayrollPaymentSummary,
  ALLOWED_PAYMENT_TRANSITIONS
} = require('../src/services/salaryPaymentService');

async function main() {
  console.log('=== Starting Phase 5A: Salary Payment Reservation & Concurrency Engine Test Suite ===\n');

  const testSuffix = Date.now().toString().slice(-6);
  let structId;
  let empAId, empACode, empBId, empBCode;
  let periodId, runId, lockedRunId;
  let unpostedPeriodId, unpostedRunId;
  let itemAId, itemBId;

  try {
    // -------------------------------------------------------------
    // Setup Phase: Chart of Accounts, Structures, Employees, Runs
    // -------------------------------------------------------------
    console.log('Setup: Initializing Chart of Accounts, Employees & Payroll Runs...');
    await ensureStandardAccounts(prisma);

    const allComps = await prisma.salaryComponent.findMany();
    const basicComp = allComps.find(c => c.code === 'BASIC');
    const hraComp = allComps.find(c => c.code === 'HRA');
    const pfEmpComp = allComps.find(c => c.code === 'PF_EMPLOYEE');
    const pfEmprComp = allComps.find(c => c.code === 'PF_EMPLOYER');

    // Create Structure
    const struct = await prisma.salaryStructure.create({
      data: {
        code: `STR_P5A_${testSuffix}`,
        name: `Payroll Phase 5A Structure (${testSuffix})`,
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

    // Create Employee A (Base Gross: ₹50,000, Basic: ₹25,000, HRA: ₹10,000, PF: ₹3,000, Net: ₹32,000)
    const empA = await prisma.employee.create({
      data: {
        employeeCode: `EMP5A1_${testSuffix}`,
        fullName: `Rajesh Kumar (P5A ${testSuffix})`,
        mobile: `93${Date.now().toString().slice(-8)}`,
        department: 'Operations',
        designation: 'Operations Lead',
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

    // Create Employee B (Base Gross: ₹40,000, Basic: ₹20,000, HRA: ₹8,000, PF: ₹2,400, Net: ₹25,600)
    const empB = await prisma.employee.create({
      data: {
        employeeCode: `EMP5A2_${testSuffix}`,
        fullName: `Sneha Reddy (P5A ${testSuffix})`,
        mobile: `92${Date.now().toString().slice(-8)}`,
        department: 'Finance',
        designation: 'Staff Accountant',
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
        totalGross: 63000, // (25k + 10k) + (20k + 8k)
        totalDeductions: 5400, // 3000 + 2400
        totalNet: 57600, // 32000 + 25600
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

    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@estatesync.local' } });

    // Post Run to GL (Phase 4 requirement)
    await postPayrollRunToLedger({
      runId: lockedRunId,
      actorEmail: 'admin@estatesync.local',
      actorId: adminUser ? adminUser.id : null
    });

    console.log(`  ✅ Setup complete. Locked & Posted Payroll Run ready (Total Net: ₹57,600).\n`);

    // -------------------------------------------------------------
    // Test 1: Create DRAFT Salary Payment
    // -------------------------------------------------------------
    console.log('Test 1: Creating DRAFT Salary Payment...');
    const draftRes = await createSalaryPayment({
      payrollRunId: lockedRunId,
      payrollItemId: itemAId,
      employeeId: empAId,
      amount: 12000,
      initialStatus: 'DRAFT',
      actorEmail: 'accounting@estatesync.local'
    });

    if (!draftRes.success || draftRes.payment.status !== 'DRAFT') {
      throw new Error(`Failed to create DRAFT payment: ${JSON.stringify(draftRes)}`);
    }
    console.log(`  ✅ Passed: DRAFT payment created (Number: ${draftRes.payment.paymentNumber}, Amount: ₹${draftRes.payment.amount})`);

    // -------------------------------------------------------------
    // Test 2 & Test 5: Verify DRAFT does NOT reserve available payable
    // -------------------------------------------------------------
    console.log('\nTest 2 & 5: Verifying DRAFT does NOT reserve available payable...');
    const statusAfterDraft = await getEmployeePayableStatus({ payrollItemId: itemAId });
    console.log(`  - Net Payable: ₹${statusAfterDraft.netPayable}`);
    console.log(`  - Settled: ₹${statusAfterDraft.settledAmount}`);
    console.log(`  - Reserved: ₹${statusAfterDraft.reservedAmount}`);
    console.log(`  - Available: ₹${statusAfterDraft.availablePayable}`);

    if (statusAfterDraft.availablePayable !== 32000 || statusAfterDraft.reservedAmount !== 0) {
      throw new Error(`DRAFT unexpectedly reserved funds! Available: ${statusAfterDraft.availablePayable}`);
    }
    console.log('  ✅ Passed: DRAFT payment did not reduce available payable (Available remains ₹32,000).');

    // -------------------------------------------------------------
    // Test 3 & Test 6: Submit for Approval (PENDING_APPROVAL) & Check Reservation
    // -------------------------------------------------------------
    console.log('\nTest 3 & 6: Testing PENDING_APPROVAL Status & Reservation Behavior...');
    const pendingPayment = await transitionPaymentStatus({
      paymentId: draftRes.payment.id,
      targetStatus: 'PENDING_APPROVAL'
    });

    const statusAfterPending = await getEmployeePayableStatus({ payrollItemId: itemAId });
    if (statusAfterPending.availablePayable !== 32000 || statusAfterPending.reservedAmount !== 0) {
      throw new Error(`PENDING_APPROVAL unexpectedly reserved funds! Available: ${statusAfterPending.availablePayable}`);
    }
    console.log('  ✅ Passed: PENDING_APPROVAL does not reserve payable (Available remains ₹32,000).');

    // -------------------------------------------------------------
    // Test 4 & Test 7: Approve Payment (APPROVED reserves funds)
    // -------------------------------------------------------------
    console.log('\nTest 4 & 7: Testing APPROVED Status & Fund Reservation...');
    const approvedPayment = await transitionPaymentStatus({
      paymentId: pendingPayment.id,
      targetStatus: 'APPROVED',
      actorEmail: 'admin@estatesync.local'
    });

    const statusAfterApproved = await getEmployeePayableStatus({ payrollItemId: itemAId });
    console.log(`  - Net Payable: ₹${statusAfterApproved.netPayable}`);
    console.log(`  - Settled: ₹${statusAfterApproved.settledAmount}`);
    console.log(`  - Reserved: ₹${statusAfterApproved.reservedAmount}`);
    console.log(`  - Available: ₹${statusAfterApproved.availablePayable}`);

    if (statusAfterApproved.reservedAmount !== 12000 || statusAfterApproved.availablePayable !== 20000) {
      throw new Error(`APPROVED failed to reserve funds properly! Reserved: ${statusAfterApproved.reservedAmount}`);
    }
    console.log('  ✅ Passed: APPROVED status actively reserves ₹12,000 (Available decreases to ₹20,000).');

    // -------------------------------------------------------------
    // Test 8: PROCESSING Status (In-Flight retains active reservation)
    // -------------------------------------------------------------
    console.log('\nTest 8: Testing PROCESSING Status (In-Flight Reservation)...');
    const procPayment = await transitionPaymentStatus({
      paymentId: approvedPayment.id,
      targetStatus: 'PROCESSING'
    });

    const statusAfterProc = await getEmployeePayableStatus({ payrollItemId: itemAId });
    if (statusAfterProc.reservedAmount !== 12000 || statusAfterProc.availablePayable !== 20000) {
      throw new Error(`PROCESSING failed to retain reservation! Reserved: ${statusAfterProc.reservedAmount}`);
    }
    console.log('  ✅ Passed: PROCESSING status retains active ₹12,000 reservation.');

    // -------------------------------------------------------------
    // Test 9: SETTLED Status (Becomes Financially Paid & Reduces Outstanding)
    // -------------------------------------------------------------
    console.log('\nTest 9: Testing SETTLED Status (Liquidating Liability)...');
    const settledPayment = await transitionPaymentStatus({
      paymentId: procPayment.id,
      targetStatus: 'SETTLED',
      actorEmail: 'admin@estatesync.local'
    });

    const statusAfterSettled = await getEmployeePayableStatus({ payrollItemId: itemAId });
    console.log(`  - Net Payable: ₹${statusAfterSettled.netPayable}`);
    console.log(`  - Settled: ₹${statusAfterSettled.settledAmount}`);
    console.log(`  - Reserved: ₹${statusAfterSettled.reservedAmount}`);
    console.log(`  - Available: ₹${statusAfterSettled.availablePayable}`);
    console.log(`  - Outstanding Liability: ₹${statusAfterSettled.outstandingLiability}`);

    if (
      statusAfterSettled.settledAmount !== 12000 ||
      statusAfterSettled.reservedAmount !== 0 ||
      statusAfterSettled.availablePayable !== 20000 ||
      statusAfterSettled.outstandingLiability !== 20000
    ) {
      throw new Error(`SETTLED calculations incorrect: ${JSON.stringify(statusAfterSettled)}`);
    }
    console.log('  ✅ Passed: SETTLED permanently liquidates ₹12,000 liability (Outstanding: ₹20,000, Available: ₹20,000).');

    // -------------------------------------------------------------
    // Test 10: FAILED Status Releases Reservation
    // -------------------------------------------------------------
    console.log('\nTest 10: Testing FAILED Status Releases Reservation...');
    // Create a 2nd payment of ₹10,000, approve it, move to PROCESSING, then FAIL it
    const failDraft = await createSalaryPayment({
      payrollRunId: lockedRunId,
      payrollItemId: itemAId,
      employeeId: empAId,
      amount: 10000,
      initialStatus: 'DRAFT'
    });
    await transitionPaymentStatus({ paymentId: failDraft.payment.id, targetStatus: 'PENDING_APPROVAL' });
    await transitionPaymentStatus({ paymentId: failDraft.payment.id, targetStatus: 'APPROVED' });
    await transitionPaymentStatus({ paymentId: failDraft.payment.id, targetStatus: 'PROCESSING' });

    // Available before failure should be 20000 - 10000 = 10000
    const beforeFailStatus = await getEmployeePayableStatus({ payrollItemId: itemAId });
    if (beforeFailStatus.availablePayable !== 10000) {
      throw new Error(`Expected available 10000 before failure, got ${beforeFailStatus.availablePayable}`);
    }

    // Now fail the payment
    await transitionPaymentStatus({
      paymentId: failDraft.payment.id,
      targetStatus: 'FAILED',
      failureReason: 'Bank account number invalid'
    });

    const afterFailStatus = await getEmployeePayableStatus({ payrollItemId: itemAId });
    if (afterFailStatus.availablePayable !== 20000 || afterFailStatus.reservedAmount !== 0) {
      throw new Error(`FAILED did not release reservation properly! ${JSON.stringify(afterFailStatus)}`);
    }
    console.log('  ✅ Passed: FAILED payment released reservation; available payable restored to ₹20,000.');

    // -------------------------------------------------------------
    // Test 11: CANCELLED Status Releases Reservation
    // -------------------------------------------------------------
    console.log('\nTest 11: Testing CANCELLED Status Releases Reservation...');
    const cancelDraft = await createSalaryPayment({
      payrollRunId: lockedRunId,
      payrollItemId: itemAId,
      employeeId: empAId,
      amount: 15000,
      initialStatus: 'DRAFT'
    });
    await transitionPaymentStatus({ paymentId: cancelDraft.payment.id, targetStatus: 'PENDING_APPROVAL' });
    await transitionPaymentStatus({ paymentId: cancelDraft.payment.id, targetStatus: 'APPROVED' });

    // Cancel the approved payment
    await transitionPaymentStatus({
      paymentId: cancelDraft.payment.id,
      targetStatus: 'CANCELLED',
      failureReason: 'Cancelled by Payroll Manager'
    });

    const afterCancelStatus = await getEmployeePayableStatus({ payrollItemId: itemAId });
    if (afterCancelStatus.availablePayable !== 20000 || afterCancelStatus.reservedAmount !== 0) {
      throw new Error(`CANCELLED did not release reservation properly! ${JSON.stringify(afterCancelStatus)}`);
    }
    console.log('  ✅ Passed: CANCELLED payment released reservation; available payable remains ₹20,000.');

    // -------------------------------------------------------------
    // Test 12: REVERSED Status Restores Available Payable
    // -------------------------------------------------------------
    console.log('\nTest 12: Testing REVERSED Status Restores Available Payable...');
    // Settle a new payment of ₹5,000 on Employee A
    const revDraft = await createSalaryPayment({
      payrollRunId: lockedRunId,
      payrollItemId: itemAId,
      employeeId: empAId,
      amount: 5000,
      initialStatus: 'DRAFT'
    });
    await transitionPaymentStatus({ paymentId: revDraft.payment.id, targetStatus: 'PENDING_APPROVAL' });
    await transitionPaymentStatus({ paymentId: revDraft.payment.id, targetStatus: 'APPROVED' });
    await transitionPaymentStatus({ paymentId: revDraft.payment.id, targetStatus: 'PROCESSING' });
    await transitionPaymentStatus({ paymentId: revDraft.payment.id, targetStatus: 'SETTLED' });

    // Settled total is now 12000 + 5000 = 17000; Available = 15000
    const beforeRevStatus = await getEmployeePayableStatus({ payrollItemId: itemAId });
    if (beforeRevStatus.settledAmount !== 17000 || beforeRevStatus.availablePayable !== 15000) {
      throw new Error(`Pre-reversal state mismatch: ${JSON.stringify(beforeRevStatus)}`);
    }

    // Reverse the ₹5,000 settlement
    await transitionPaymentStatus({
      paymentId: revDraft.payment.id,
      targetStatus: 'REVERSED',
      failureReason: 'Reversal test'
    });

    const afterRevStatus = await getEmployeePayableStatus({ payrollItemId: itemAId });
    console.log(`  - After Reversal: Settled = ₹${afterRevStatus.settledAmount}, Available = ₹${afterRevStatus.availablePayable}, Outstanding = ₹${afterRevStatus.outstandingLiability}`);

    if (afterRevStatus.settledAmount !== 12000 || afterRevStatus.availablePayable !== 20000 || afterRevStatus.outstandingLiability !== 20000) {
      throw new Error(`REVERSED did not restore available payable! ${JSON.stringify(afterRevStatus)}`);
    }
    console.log('  ✅ Passed: REVERSED payment restored available payable back to ₹20,000 without mutating PayrollItem.');

    // -------------------------------------------------------------
    // Test 13: Overpayment Attempt Rejection
    // -------------------------------------------------------------
    console.log('\nTest 13: Testing Overpayment Block...');
    try {
      // Employee A currently has ₹20,000 available. Attempting to pay ₹25,000 must fail.
      await createSalaryPayment({
        payrollRunId: lockedRunId,
        payrollItemId: itemAId,
        employeeId: empAId,
        amount: 25000,
        initialStatus: 'DRAFT'
      });
      throw new Error('Overpayment unexpectedly succeeded!');
    } catch (err) {
      if (err.code === 'OVERPAYMENT_PROHIBITED' || err.status === 400) {
        console.log(`  ✅ Passed: Overpayment rejected with expected error: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Test 14 & 15: Concurrency Engine (Simultaneous Approvals & Double Spend Guard)
    // -------------------------------------------------------------
    console.log('\nTest 14 & 15: Testing Concurrency Row-Locking & Double Spend Prevention...');
    // Employee B has netPayable = ₹25,600, currently 0 settled, 0 reserved (Available: ₹25,600)
    // Create Batch 1 requesting ₹20,000 on Employee B
    const batch1Res = await createSalaryPaymentBatch({
      payrollRunId: lockedRunId,
      notes: 'Batch 1 (Concurrent Test)',
      payments: [{ payrollItemId: itemBId, amount: 20000 }]
    });

    // Create Batch 2 requesting ₹20,000 on Employee B (Total requested = ₹40,000, which exceeds ₹25,600)
    const batch2Res = await createSalaryPaymentBatch({
      payrollRunId: lockedRunId,
      notes: 'Batch 2 (Concurrent Test)',
      payments: [{ payrollItemId: itemBId, amount: 20000 }]
    });

    console.log('  - Launching simultaneous approval requests for Batch 1 (₹20,000) and Batch 2 (₹20,000)...');
    
    // Execute both approval requests simultaneously via Promise.allSettled
    const [res1, res2] = await Promise.allSettled([
      approveSalaryPaymentBatch({ batchId: batch1Res.batch.id, actorEmail: 'admin@estatesync.local' }),
      approveSalaryPaymentBatch({ batchId: batch2Res.batch.id, actorEmail: 'admin@estatesync.local' })
    ]);

    const successes = [res1, res2].filter(r => r.status === 'fulfilled');
    const failures = [res1, res2].filter(r => r.status === 'rejected');

    console.log(`  - Concurrency Results: ${successes.length} Succeeded, ${failures.length} Rejected.`);

    if (successes.length !== 1 || failures.length !== 1) {
      throw new Error(`Concurrency failure! Expected exactly 1 success and 1 failure, but got ${successes.length} successes.`);
    }

    const rejectionReason = failures[0].reason;
    console.log(`  - Rejection code: ${rejectionReason.code}, message: "${rejectionReason.message}"`);

    if (rejectionReason.code !== 'CONCURRENT_OVERPAYMENT_BLOCKED') {
      throw new Error(`Expected CONCURRENT_OVERPAYMENT_BLOCKED but got ${rejectionReason.code}`);
    }

    const statusBAfterRace = await getEmployeePayableStatus({ payrollItemId: itemBId });
    if (statusBAfterRace.reservedAmount !== 20000 || statusBAfterRace.availablePayable !== 5600) {
      throw new Error(`Employee B state corrupted after race: ${JSON.stringify(statusBAfterRace)}`);
    }
    console.log('  ✅ Passed: Exactly 1 approval succeeded; 2nd request received CONCURRENT_OVERPAYMENT_BLOCKED. Zero over-reservation.');

    // -------------------------------------------------------------
    // Test 16 & 17: Multiple Partial Payments across Multiple Employees
    // -------------------------------------------------------------
    console.log('\nTest 16 & 17: Testing Multiple Partial Payments across Multiple Employees...');
    // Employee A has available = ₹20,000
    // Employee B has available = ₹5,600
    // Create multi-employee batch: Emp A (₹10,000), Emp B (₹5,600) -> Total ₹15,600
    const multiBatchRes = await createSalaryPaymentBatch({
      payrollRunId: lockedRunId,
      notes: 'Multi-Employee Tranche',
      payments: [
        { payrollItemId: itemAId, amount: 10000 },
        { payrollItemId: itemBId, amount: 5600 }
      ]
    });

    await approveSalaryPaymentBatch({ batchId: multiBatchRes.batch.id, actorEmail: 'admin@estatesync.local' });

    const statusAAfterMulti = await getEmployeePayableStatus({ payrollItemId: itemAId });
    const statusBAfterMulti = await getEmployeePayableStatus({ payrollItemId: itemBId });

    if (statusAAfterMulti.availablePayable !== 10000 || statusAAfterMulti.reservedAmount !== 10000) {
      throw new Error(`Emp A multi-batch reservation mismatch: ${JSON.stringify(statusAAfterMulti)}`);
    }
    if (statusBAfterMulti.availablePayable !== 0 || statusBAfterMulti.reservedAmount !== 25600) {
      throw new Error(`Emp B multi-batch reservation mismatch: ${JSON.stringify(statusBAfterMulti)}`);
    }
    console.log('  ✅ Passed: Multi-employee batch reserved correctly (Emp A Available: ₹10,000, Emp B Available: ₹0).');

    // -------------------------------------------------------------
    // Test 18: Batch Total Reconciliation
    // -------------------------------------------------------------
    console.log('\nTest 18: Verifying Batch Total Reconciliation & Read-Only Summary...');
    const summary = await getPayrollPaymentSummary(lockedRunId);
    console.log(`  - Run Total Net: ₹${summary.totals.totalNet}`);
    console.log(`  - Total Settled: ₹${summary.totals.totalSettled}`);
    console.log(`  - Total Reserved: ₹${summary.totals.totalReserved}`);
    console.log(`  - Total Available: ₹${summary.totals.totalAvailable}`);
    console.log(`  - Total Outstanding: ₹${summary.totals.totalOutstanding}`);

    // Invariant: totalNet == totalSettled + totalReserved + totalAvailable
    const computedSum = summary.totals.totalSettled + summary.totals.totalReserved + summary.totals.totalAvailable;
    if (Math.abs(computedSum - summary.totals.totalNet) > 0.009) {
      throw new Error(`Summary totals do not reconcile! Net=${summary.totals.totalNet}, Sum=${computedSum}`);
    }
    console.log('  ✅ Passed: Total Net (₹57,600) = Settled (₹12,000) + Reserved (₹35,600) + Available (₹10,000).');

    // -------------------------------------------------------------
    // Test 19: Locked Payroll Run Required
    // -------------------------------------------------------------
    console.log('\nTest 19: Verifying Locked Payroll Run Gate...');
    // Create an unlocked DRAFT run
    const unlockedPeriod = await prisma.payrollPeriod.create({
      data: {
        year: 2026,
        month: 9,
        periodStart: new Date('2026-09-01'),
        periodEnd: new Date('2026-09-30'),
        status: 'OPEN'
      }
    });
    unpostedPeriodId = unlockedPeriod.id;

    const unlockedRun = await prisma.payrollRun.create({
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
    unpostedRunId = unlockedRun.id;

    try {
      await createSalaryPayment({
        payrollRunId: unlockedRun.id,
        payrollItemId: unlockedRun.items[0].id,
        employeeId: empAId,
        amount: 10000
      });
      throw new Error('Payment creation on unlocked run unexpectedly succeeded!');
    } catch (err) {
      if (err.code === 'PAYROLL_NOT_LOCKED') {
        console.log(`  ✅ Passed: Payment on non-locked run rejected with PAYROLL_NOT_LOCKED.`);
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Test 20: Phase 4 GL Accrual Posting Required
    // -------------------------------------------------------------
    console.log('\nTest 20: Verifying Phase 4 GL Accrual Posting Gate...');
    // Update run to LOCKED but without Phase 4 accounting posting
    await prisma.payrollRun.update({
      where: { id: unlockedRun.id },
      data: { status: 'LOCKED' }
    });

    try {
      await createSalaryPayment({
        payrollRunId: unlockedRun.id,
        payrollItemId: unlockedRun.items[0].id,
        employeeId: empAId,
        amount: 10000
      });
      throw new Error('Payment creation without Phase 4 posting unexpectedly succeeded!');
    } catch (err) {
      if (err.code === 'PAYROLL_NOT_POSTED_TO_GL') {
        console.log(`  ✅ Passed: Payment on unposted run rejected with PAYROLL_NOT_POSTED_TO_GL.`);
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Test 21 & 22: Verify PayrollItem & PayrollRun Snapshots Remain 100% Immutable
    // -------------------------------------------------------------
    console.log('\nTest 21 & 22: Verifying Immutability of PayrollItem & PayrollRun...');
    const itemAAfter = await prisma.payrollItem.findUnique({ where: { id: itemAId } });
    const runAfter = await prisma.payrollRun.findUnique({ where: { id: lockedRunId } });

    if (Number(itemAAfter.netPayable) !== 32000 || Number(itemAAfter.grossEarnings) !== 35000) {
      throw new Error('PayrollItem was mutated during payment operations!');
    }
    if (Number(runAfter.totalNet) !== 57600 || Number(runAfter.totalGross) !== 63000) {
      throw new Error('PayrollRun was mutated during payment operations!');
    }
    console.log('  ✅ Passed: PayrollItem.netPayable (₹32,000) and PayrollRun.totalNet (₹57,600) remained 100% immutable.');

    // -------------------------------------------------------------
    // Test 23: Illegal State Transitions Rejected
    // -------------------------------------------------------------
    console.log('\nTest 23: Testing Rejection of Illegal State Transitions...');
    
    // Attempt FAILED -> SETTLED (must fail)
    try {
      await transitionPaymentStatus({
        paymentId: failDraft.payment.id, // currently in FAILED status
        targetStatus: 'SETTLED'
      });
      throw new Error('Illegal transition FAILED -> SETTLED unexpectedly succeeded!');
    } catch (err) {
      if (err.code === 'ILLEGAL_STATE_TRANSITION') {
        console.log(`  ✅ Passed: FAILED -> SETTLED rejected with ILLEGAL_STATE_TRANSITION.`);
      } else {
        throw err;
      }
    }

    // Attempt CANCELLED -> SETTLED (must fail)
    try {
      await transitionPaymentStatus({
        paymentId: cancelDraft.payment.id, // currently in CANCELLED status
        targetStatus: 'SETTLED'
      });
      throw new Error('Illegal transition CANCELLED -> SETTLED unexpectedly succeeded!');
    } catch (err) {
      if (err.code === 'ILLEGAL_STATE_TRANSITION') {
        console.log(`  ✅ Passed: CANCELLED -> SETTLED rejected with ILLEGAL_STATE_TRANSITION.`);
      } else {
        throw err;
      }
    }

    // Attempt REVERSED -> REVERSED (must fail)
    try {
      await transitionPaymentStatus({
        paymentId: revDraft.payment.id, // currently in REVERSED status
        targetStatus: 'REVERSED'
      });
      throw new Error('Illegal transition REVERSED -> REVERSED unexpectedly succeeded!');
    } catch (err) {
      if (err.code === 'ILLEGAL_STATE_TRANSITION') {
        console.log(`  ✅ Passed: REVERSED -> REVERSED rejected with ILLEGAL_STATE_TRANSITION.`);
      } else {
        throw err;
      }
    }

    console.log('\n=== ALL PHASE 5A SALARY PAYMENT RESERVATION & CONCURRENCY TESTS PASSED! ===');

  } finally {
    console.log('\nCleaning up Phase 5A test records...');
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
  }
}

main().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
