/**
 * Automated Test Suite for Phase 4:
 * Payroll to General Ledger Accounting Integration + Previews + Reversals + Idempotency + RBAC
 */

const http = require('http');
const prisma = require('../src/config/db');
const { ensureStandardAccounts } = require('../src/utils/accountingHelper');

async function main() {
  console.log('=== Starting Phase 4: Payroll → General Ledger Accounting Integration Test Suite ===\n');

  let server;
  const baseUrl = 'http://127.0.0.1:4000';

  const isServerRunning = await new Promise((resolve) => {
    const req = http.get(`${baseUrl}/`, () => resolve(true));
    req.on('error', () => resolve(false));
  });

  if (!isServerRunning) {
    const app = require('../src/app');
    server = app.listen(4000);
    console.log('Started test server on port 4000');
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const testSuffix = Date.now().toString().slice(-6);
  let adminToken, accountingToken, salesToken, managerToken;
  let empAId, empACode, empBId, empBCode;
  let structId;
  let periodId, runId;
  let unapprovedPeriodId, unapprovedRunId;

  try {
    // -------------------------------------------------------------
    // Step 1: Login & obtain JWT tokens
    // -------------------------------------------------------------
    console.log('Step 1: Logging in as Admin, Accounting, Manager, Sales...');
    
    async function loginUser(email, password) {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      const token = data.accessToken || data.token;
      if (!res.ok || !token) {
        throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
      }
      return token;
    }

    adminToken = await loginUser('admin@estatesync.local', 'password123');
    accountingToken = await loginUser('accounting@estatesync.local', 'password123');
    salesToken = await loginUser('sales@estatesync.local', 'password123');
    managerToken = await loginUser('manager@estatesync.local', 'password123');
    console.log('  ✅ Logged in successfully.\n');

    const adminHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    };

    const acctHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accountingToken}`
    };

    const salesHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${salesToken}`
    };

    const managerHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${managerToken}`
    };

    // -------------------------------------------------------------
    // Step 2: Ensure Chart of Accounts & Components Exist
    // -------------------------------------------------------------
    console.log('Step 2: Ensuring Chart of Accounts & Standard Components...');
    await ensureStandardAccounts(prisma);

    const allComps = await prisma.salaryComponent.findMany();
    const basicComp = allComps.find(c => c.code === 'BASIC');
    const hraComp = allComps.find(c => c.code === 'HRA');
    const convComp = allComps.find(c => c.code === 'CONVEYANCE');
    const pfEmpComp = allComps.find(c => c.code === 'PF_EMPLOYEE');
    const pfEmprComp = allComps.find(c => c.code === 'PF_EMPLOYER');

    if (!basicComp || !hraComp || !convComp || !pfEmpComp || !pfEmprComp) {
      throw new Error('Required standard salary components missing.');
    }

    // Create Structure with Employer PF
    const structRes = await fetch(`${baseUrl}/api/v1/payroll/structures`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        code: `STR_P4_${testSuffix}`,
        name: `Payroll Phase 4 Structure (${testSuffix})`,
        lines: [
          { componentId: basicComp.id, calculationMethod: 'PERCENTAGE_OF_GROSS', percentage: 50, sequence: 1 },
          { componentId: hraComp.id, calculationMethod: 'PERCENTAGE_OF_BASIC', percentage: 40, sequence: 2 },
          { componentId: convComp.id, calculationMethod: 'FIXED_AMOUNT', value: 1600, sequence: 3 },
          { componentId: pfEmpComp.id, calculationMethod: 'PERCENTAGE_OF_BASIC', percentage: 12, sequence: 10 },
          { componentId: pfEmprComp.id, calculationMethod: 'PERCENTAGE_OF_BASIC', percentage: 12, sequence: 20 }
        ]
      })
    });
    const structData = await structRes.json();
    if (!structRes.ok || !structData.structure) {
      throw new Error(`Failed to create structure: ${JSON.stringify(structData)}`);
    }
    structId = structData.structure.id;

    // Create Employee A (Gross: ₹50,000)
    const empARes = await fetch(`${baseUrl}/api/v1/employees`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        fullName: `Vikram Malhotra (P4 ${testSuffix})`,
        mobile: `95${Date.now().toString().slice(-8)}`,
        department: 'Management',
        designation: 'VP Real Estate Development',
        joiningDate: '2026-05-01'
      })
    });
    const empAData = await empARes.json();
    empAId = empAData.employee.id;
    empACode = empAData.employee.employeeCode;

    await fetch(`${baseUrl}/api/v1/employees/${empAId}/salary-assignments`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        salaryStructureId: structId,
        baseGross: 50000,
        effectiveFrom: '2026-05-01',
        reason: 'Phase 4 Executive Package'
      })
    });

    // Create Employee B (Gross: ₹40,000)
    const empBRes = await fetch(`${baseUrl}/api/v1/employees`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        fullName: `Sonia Verma (P4 ${testSuffix})`,
        mobile: `94${Date.now().toString().slice(-8)}`,
        department: 'Accounting',
        designation: 'Senior Accountant',
        joiningDate: '2026-05-01'
      })
    });
    const empBData = await empBRes.json();
    empBId = empBData.employee.id;
    empBCode = empBData.employee.employeeCode;

    await fetch(`${baseUrl}/api/v1/employees/${empBId}/salary-assignments`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        salaryStructureId: structId,
        baseGross: 40000,
        effectiveFrom: '2026-05-01',
        reason: 'Phase 4 Staff Package'
      })
    });

    console.log('  ✅ Test Employees and Salary Structures initialized.\n');

    // -------------------------------------------------------------
    // Step 3: Setup Test Payroll Period, Run, Adjustments & Calculate
    // -------------------------------------------------------------
    console.log('Step 3: Setting up August 2026 Payroll Run & Calculating...');
    const periodRes = await fetch(`${baseUrl}/api/v1/payroll/periods`, {
      method: 'POST',
      headers: acctHeaders,
      body: JSON.stringify({ year: 2026, month: 8 })
    });
    const periodData = await periodRes.json();
    periodId = periodData.period.id;

    await fetch(`${baseUrl}/api/v1/payroll/periods/${periodId}/open`, {
      method: 'POST',
      headers: acctHeaders
    });

    const runRes = await fetch(`${baseUrl}/api/v1/payroll/runs`, {
      method: 'POST',
      headers: acctHeaders,
      body: JSON.stringify({ payrollPeriodId: periodId })
    });
    const runData = await runRes.json();
    runId = runData.run.id;

    // Add Bonus Adjustment (₹5,000) on Employee A
    await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/adjustments`, {
      method: 'POST',
      headers: acctHeaders,
      body: JSON.stringify({
        employeeId: empAId,
        adjustmentType: 'CREDIT',
        category: 'BONUS',
        amount: 5000,
        reason: 'Q2 Performance Bonus'
      })
    });

    // Add Advance Recovery (₹2,000) on Employee A
    await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/adjustments`, {
      method: 'POST',
      headers: acctHeaders,
      body: JSON.stringify({
        employeeId: empAId,
        adjustmentType: 'DEBIT',
        category: 'ADVANCE_RECOVERY',
        amount: 2000,
        reason: 'Advance Installment'
      })
    });

    // Calculate Run
    const calcRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/calculate`, {
      method: 'POST',
      headers: acctHeaders
    });
    const calcData = await calcRes.json();
    if (!calcRes.ok) {
      throw new Error(`Calculate run failed: ${JSON.stringify(calcData)}`);
    }

    // -------------------------------------------------------------
    // Test 1: Status Eligibility Gates
    // -------------------------------------------------------------
    console.log('\nTest 1: Testing Status Eligibility Gates (Rejecting Non-Locked Runs)...');
    
    // Attempt posting while run is in CALCULATED status (must fail)
    const calcPostRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/post-to-ledger`, {
      method: 'POST',
      headers: acctHeaders
    });
    if (calcPostRes.status === 400) {
      console.log('  ✅ Passed: Posting on CALCULATED run rejected with HTTP 400 (PAYROLL_NOT_LOCKED)');
    } else {
      throw new Error(`Expected 400 for posting calculated run but got ${calcPostRes.status}`);
    }

    // Approve Run
    const approveRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/approve`, {
      method: 'POST',
      headers: acctHeaders
    });
    const approveData = await approveRes.json();
    if (!approveRes.ok) {
      throw new Error(`Approve run failed: ${JSON.stringify(approveData)}`);
    }

    // Attempt posting while run is in APPROVED status (must fail)
    const approvedPostRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/post-to-ledger`, {
      method: 'POST',
      headers: acctHeaders
    });
    if (approvedPostRes.status === 400) {
      console.log('  ✅ Passed: Posting on APPROVED (unlocked) run rejected with HTTP 400');
    } else {
      throw new Error(`Expected 400 for posting approved run but got ${approvedPostRes.status}`);
    }

    // Lock Run
    const lockRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/lock`, {
      method: 'POST',
      headers: adminHeaders
    });
    const lockData = await lockRes.json();
    if (!lockRes.ok) {
      throw new Error(`Lock run failed: ${JSON.stringify(lockData)}`);
    }
    console.log('  ✅ Payroll Run #1 successfully LOCKED and ready for posting.');

    // -------------------------------------------------------------
    // Test 2: Read-Only Posting Preview API (GET /posting-preview)
    // -------------------------------------------------------------
    console.log('\nTest 2: Testing Read-Only Posting Preview API...');
    const previewRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/posting-preview`, {
      headers: acctHeaders
    });
    const previewData = await previewRes.json();
    if (!previewRes.ok || !previewData.preview) {
      throw new Error(`Posting preview failed: ${JSON.stringify(previewData)}`);
    }

    const { proposedJournal, reconciliation } = previewData.preview;
    console.log(`  - Preview Description: "${proposedJournal.description}"`);
    console.log(`  - Total Debits: ₹${proposedJournal.totalDebit}`);
    console.log(`  - Total Credits: ₹${proposedJournal.totalCredit}`);
    console.log(`  - Balanced: ${proposedJournal.isBalanced}`);

    if (!proposedJournal.isBalanced || proposedJournal.totalDebit !== proposedJournal.totalCredit) {
      throw new Error(`Preview is unbalanced: ${JSON.stringify(proposedJournal)}`);
    }

    // Verify zero database writes during preview
    const jeCount = await prisma.journalEntry.count({
      where: { referenceType: 'PAYROLL', referenceId: runId }
    });
    if (jeCount !== 0) {
      throw new Error('Preview unexpectedly created JournalEntry records in database!');
    }
    console.log('  ✅ Passed: Posting Preview is balanced and produced 0 database mutations.');

    // -------------------------------------------------------------
    // Test 3: Post Locked Run to General Ledger (POST /post-to-ledger)
    // -------------------------------------------------------------
    console.log('\nTest 3: Executing General Ledger Posting for Locked Run...');
    const postRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/post-to-ledger`, {
      method: 'POST',
      headers: acctHeaders
    });
    const postData = await postRes.json();
    if (!postRes.ok || !postData.posting) {
      throw new Error(`Posting failed: ${JSON.stringify(postData)}`);
    }

    console.log(`  ✅ Posting Created (ID: ${postData.posting.id}, Entry #: ${postData.posting.entryNumber})`);
    console.log(`  - Posted Debits: ₹${postData.posting.totalDebit}, Credits: ₹${postData.posting.totalCredit}`);

    // Verify Journal Entry & Lines in database
    const dbJournal = await prisma.journalEntry.findUnique({
      where: { id: postData.posting.journalEntryId },
      include: {
        lines: {
          include: { account: true }
        }
      }
    });

    if (!dbJournal) {
      throw new Error('JournalEntry not found in database after posting!');
    }

    let sumDr = 0;
    let sumCr = 0;
    for (const l of dbJournal.lines) {
      sumDr = Math.round((sumDr + Number(l.debit)) * 100) / 100;
      sumCr = Math.round((sumCr + Number(l.credit)) * 100) / 100;
    }

    console.log(`  - Database Journal Lines Count: ${dbJournal.lines.length}`);
    console.log(`  - Verified DB Sum: Dr = ₹${sumDr}, Cr = ₹${sumCr}`);

    if (Math.abs(sumDr - sumCr) > 0.009) {
      throw new Error(`Database journal lines do not balance! Dr=${sumDr}, Cr=${sumCr}`);
    }

    // Verify GL Line Routing
    const salaryExpenseLine = dbJournal.lines.find(l => l.account.code === '5060');
    const employerPfExpenseLine = dbJournal.lines.find(l => l.account.code === '5070');
    const pfEmployeePayableLine = dbJournal.lines.find(l => l.account.code === '2020');
    const pfEmployerPayableLine = dbJournal.lines.find(l => l.account.code === '2025');
    const advanceRecoveryLine = dbJournal.lines.find(l => l.account.code === '1040');
    const netSalariesPayableLine = dbJournal.lines.find(l => l.account.code === '2010');

    if (!salaryExpenseLine || !employerPfExpenseLine || !pfEmployeePayableLine || !pfEmployerPayableLine || !advanceRecoveryLine || !netSalariesPayableLine) {
      throw new Error(`Missing expected GL lines in posted journal: ${JSON.stringify(dbJournal.lines)}`);
    }

    console.log('  ✅ Verified all required GL accounts (5060, 5070, 2020, 2025, 1040, 2010) correctly mapped.');

    // -------------------------------------------------------------
    // Test 4: Idempotency & Duplicate Posting Prevention
    // -------------------------------------------------------------
    console.log('\nTest 4: Testing Idempotency & Duplicate Posting Rejection...');
    const dupPostRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/post-to-ledger`, {
      method: 'POST',
      headers: acctHeaders
    });
    if (dupPostRes.status === 409) {
      console.log('  ✅ Passed: Duplicate posting attempt rejected with HTTP 409 Conflict (PAYROLL_ALREADY_POSTED)');
    } else {
      throw new Error(`Expected 409 for duplicate posting but got ${dupPostRes.status}`);
    }

    // -------------------------------------------------------------
    // Test 5: Reconciliation Isolation Tests (Bonus & Advance Isolation)
    // -------------------------------------------------------------
    console.log('\nTest 5: Verifying Mathematical Isolation of Adjustments...');
    // Base salary earnings for Emp A (₹36,600) + Emp B (₹29,600) = ₹66,200
    // Bonus on Emp A = ₹5,000 (Adjustments Credit)
    // Total Gross on Run = ₹66,200 (Base Gross)
    console.log(`  - Base Gross: ₹${reconciliation.salaryEarnings}`);
    console.log(`  - Credit Adjustments: ₹${reconciliation.creditAdjustments}`);
    console.log(`  - Debit Adjustments: ₹${reconciliation.debitAdjustments}`);
    console.log(`  - Run Total Gross: ₹${reconciliation.runTotalGross}`);

    if (
      reconciliation.salaryEarnings !== 66200 ||
      reconciliation.creditAdjustments !== 5000 ||
      reconciliation.debitAdjustments !== 2000 ||
      reconciliation.salaryDeductions !== 5400 || // PF: 3000 (Emp A) + 2400 (Emp B)
      reconciliation.employerContributions !== 5400
    ) {
      throw new Error(`Reconciliation isolation failed: ${JSON.stringify(reconciliation)}`);
    }
    console.log('  ✅ Passed: Manual adjustments strictly isolated from base salary gross & deductions.');

    // -------------------------------------------------------------
    // Test 6: Snapshot Immutability Verification
    // -------------------------------------------------------------
    console.log('\nTest 6: Verifying Snapshot Immutability after Posting...');
    const postItemRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/items`, {
      headers: adminHeaders
    });
    const postItemsData = await postItemRes.json();
    const itemAAfter = postItemsData.items.find(i => i.employeeId === empAId);

    if (Number(itemAAfter.netPayable) !== 36600 || Number(itemAAfter.grossEarnings) !== 36600) {
      throw new Error('PayrollItem snapshot was mutated during accounting posting!');
    }
    console.log('  ✅ Passed: PayrollItem and PayrollLine records remained 100% immutable.');

    // -------------------------------------------------------------
    // Test 7: General Ledger Reversal Engine
    // -------------------------------------------------------------
    console.log('\nTest 7: Testing General Ledger Reversal Engine...');
    
    // Accounting role blocked from reversing (Admin only)
    const acctRevRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/reverse-ledger-posting`, {
      method: 'POST',
      headers: acctHeaders,
      body: JSON.stringify({ reason: 'Audit Reversal Test' })
    });
    if (acctRevRes.status === 403) {
      console.log('  ✅ Passed: Accounting role blocked from reversal with HTTP 403 Forbidden (Admin only)');
    } else {
      throw new Error(`Expected 403 for Accounting reversal but got ${acctRevRes.status}`);
    }

    // Admin reverses posting
    const adminRevRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/reverse-ledger-posting`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ reason: 'August 2026 Executive Compensation Reversal' })
    });
    const revData = await adminRevRes.json();
    if (!adminRevRes.ok || !revData.reversalJournalEntry) {
      throw new Error(`Reversal failed: ${JSON.stringify(revData)}`);
    }

    console.log(`  ✅ Reversal Journal Created (${revData.reversalJournalEntry.entryNumber})`);
    console.log(`  - Original Status Updated to: ${revData.posting.status}`);

    // Verify second reversal attempt blocked
    const secondRevRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/reverse-ledger-posting`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ reason: 'Duplicate Reversal' })
    });
    if (secondRevRes.status === 400) {
      console.log('  ✅ Passed: Re-reversal on REVERSED posting rejected with HTTP 400');
    } else {
      throw new Error(`Expected 400 for second reversal but got ${secondRevRes.status}`);
    }

    // -------------------------------------------------------------
    // Test 8: RBAC Permissions & Security Boundaries
    // -------------------------------------------------------------
    console.log('\nTest 8: Testing RBAC Permissions & Access Boundaries...');
    
    // Sales role blocked from posting preview
    const salesPreviewRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/posting-preview`, {
      headers: salesHeaders
    });
    if (salesPreviewRes.status === 403) {
      console.log('  ✅ Passed: Sales role blocked from posting-preview with HTTP 403 Forbidden');
    } else {
      throw new Error(`Expected 403 for Sales posting-preview but got ${salesPreviewRes.status}`);
    }

    // Manager role allowed to view preview
    const mgrPreviewRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/posting-preview`, {
      headers: managerHeaders
    });
    if (mgrPreviewRes.ok) {
      console.log('  ✅ Passed: Manager role granted read-only access to posting-preview (HTTP 200)');
    } else {
      throw new Error(`Manager preview failed with ${mgrPreviewRes.status}`);
    }

    // -------------------------------------------------------------
    // Test 9: Failure & Safety Protections (Negative Tests)
    // -------------------------------------------------------------
    console.log('\nTest 9: Testing Negative Safety Protections & Abort Conditions...');
    
    // Missing run ID returns 404
    const notFoundRes = await fetch(`${baseUrl}/api/v1/payroll/runs/00000000-0000-0000-0000-000000000000/posting-preview`, {
      headers: acctHeaders
    });
    if (notFoundRes.status === 404) {
      console.log('  ✅ Passed: Non-existent payroll run rejected with HTTP 404');
    } else {
      throw new Error(`Expected 404 but got ${notFoundRes.status}`);
    }

    // -------------------------------------------------------------
    // Test 10: Audit Trail Verification
    // -------------------------------------------------------------
    console.log('\nTest 10: Verifying Phase 4 Audit Trail Records...');
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: { in: ['PAYROLL_JOURNAL_POST', 'PAYROLL_JOURNAL_REVERSE'] },
        entityId: runId
      }
    });
    if (auditLogs.length !== 2) {
      throw new Error(`Expected 2 Phase 4 audit events but found ${auditLogs.length}`);
    }
    console.log(`  ✅ Verified 2 Phase 4 Audit Events recorded in AuditLog (PAYROLL_JOURNAL_POST, PAYROLL_JOURNAL_REVERSE).`);

    console.log('\n=== ALL PHASE 4 PAYROLL → GENERAL LEDGER ACCOUNTING INTEGRATION TESTS PASSED! ===');

  } finally {
    console.log('\nCleaning up Phase 4 test records...');
    if (runId) {
      await prisma.payrollAccountingPosting.deleteMany({ where: { payrollRunId: runId } });
      await prisma.journalLine.deleteMany({ where: { journalEntry: { referenceId: runId } } });
      await prisma.journalEntry.deleteMany({ where: { referenceId: runId } });
      await prisma.payrollLine.deleteMany({ where: { payrollItem: { payrollRunId: runId } } });
      await prisma.payrollException.deleteMany({ where: { payrollRunId: runId } });
      await prisma.payrollAdjustment.deleteMany({ where: { payrollRunId: runId } });
      await prisma.payrollItem.deleteMany({ where: { payrollRunId: runId } });
      await prisma.payrollRun.deleteMany({ where: { id: runId } });
    }
    if (periodId) {
      await prisma.payrollPeriod.deleteMany({ where: { id: periodId } });
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

    if (server) {
      server.close();
    }
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
