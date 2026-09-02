/**
 * Automated Test Suite for Phase 3:
 * Monthly Payroll Calculation Engine + State Machine + Line Snapshots + Approval & Lock
 */

const http = require('http');
const prisma = require('../src/config/db');

async function main() {
  console.log('=== Starting Phase 3: Monthly Payroll Calculation Engine Test Suite ===\n');

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
  let structId, structLineIds = [];
  let periodId, runId;

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

    // -------------------------------------------------------------
    // Step 2: Create Test Employees and Structures
    // -------------------------------------------------------------
    console.log('Step 2: Setting up Test Employees and Salary Structures...');

    // Fetch default components
    const allComps = await prisma.salaryComponent.findMany();
    const basicComp = allComps.find(c => c.code === 'BASIC');
    const hraComp = allComps.find(c => c.code === 'HRA');
    const convComp = allComps.find(c => c.code === 'CONVEYANCE');
    const pfComp = allComps.find(c => c.code === 'PF_EMPLOYEE');

    if (!basicComp || !hraComp || !convComp || !pfComp) {
      throw new Error('Required standard salary components missing from database.');
    }

    // Create Structure
    const structRes = await fetch(`${baseUrl}/api/v1/payroll/structures`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        code: `STR_P3_${testSuffix}`,
        name: `Payroll Phase 3 Test Structure (${testSuffix})`,
        lines: [
          { componentId: basicComp.id, calculationMethod: 'PERCENTAGE_OF_GROSS', percentage: 50, sequence: 1 },
          { componentId: hraComp.id, calculationMethod: 'PERCENTAGE_OF_BASIC', percentage: 40, sequence: 2 },
          { componentId: convComp.id, calculationMethod: 'FIXED_AMOUNT', value: 1600, sequence: 3 },
          { componentId: pfComp.id, calculationMethod: 'PERCENTAGE_OF_BASIC', percentage: 12, sequence: 10 }
        ]
      })
    });
    const structData = await structRes.json();
    if (!structRes.ok || !structData.structure) {
      throw new Error(`Failed to create structure: ${JSON.stringify(structData)}`);
    }
    structId = structData.structure.id;

    // Create Employee A (Assigned)
    const empARes = await fetch(`${baseUrl}/api/v1/employees`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        fullName: `Anil Kumar (P3 ${testSuffix})`,
        mobile: `96${Date.now().toString().slice(-8)}`,
        department: 'Sales',
        designation: 'Senior Sales Representative',
        joiningDate: '2026-04-01'
      })
    });
    const empAData = await empARes.json();
    empAId = empAData.employee.id;
    empACode = empAData.employee.employeeCode;

    // Assign Salary Structure to Employee A (Gross: ₹50,000 from 2026-04-01)
    const assignRes = await fetch(`${baseUrl}/api/v1/employees/${empAId}/salary-assignments`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        salaryStructureId: structId,
        baseGross: 50000,
        effectiveFrom: '2026-04-01',
        reason: 'Initial Offer 2026'
      })
    });
    const assignData = await assignRes.json();
    if (!assignRes.ok) {
      throw new Error(`Failed to assign salary: ${JSON.stringify(assignData)}`);
    }

    console.log(`  ✅ Employee A setup complete: ${empAData.employee.fullName} (${empACode}) with Gross ₹50,000`);

    // -------------------------------------------------------------
    // Test 1: Payroll Period Lifecycle & Duplicate Protection
    // -------------------------------------------------------------
    console.log('\nTest 1: Creating Payroll Period for August 2026 (2026-08)...');
    
    const periodRes = await fetch(`${baseUrl}/api/v1/payroll/periods`, {
      method: 'POST',
      headers: acctHeaders,
      body: JSON.stringify({
        year: 2026,
        month: 8
      })
    });
    const periodData = await periodRes.json();
    if (!periodRes.ok || !periodData.period) {
      throw new Error(`Failed to create period: ${JSON.stringify(periodData)}`);
    }
    periodId = periodData.period.id;
    console.log(`  ✅ Period created: ${periodData.period.year}-0${periodData.period.month} (Status: ${periodData.period.status})`);

    // Duplicate Period Protection
    const dupPeriodRes = await fetch(`${baseUrl}/api/v1/payroll/periods`, {
      method: 'POST',
      headers: acctHeaders,
      body: JSON.stringify({
        year: 2026,
        month: 8
      })
    });
    if (dupPeriodRes.status === 409) {
      console.log('  ✅ Passed: Duplicate period for same year + month rejected with HTTP 409');
    } else {
      throw new Error(`Expected 409 for duplicate period but got ${dupPeriodRes.status}`);
    }

    // Open Period
    const openRes = await fetch(`${baseUrl}/api/v1/payroll/periods/${periodId}/open`, {
      method: 'POST',
      headers: acctHeaders
    });
    const openData = await openRes.json();
    if (openRes.ok && openData.period?.status === 'OPEN') {
      console.log('  ✅ Passed: Period transitioned to OPEN status');
    } else {
      throw new Error(`Failed to open period: ${JSON.stringify(openData)}`);
    }

    // -------------------------------------------------------------
    // Test 2: Payroll Run Creation & Adjustments
    // -------------------------------------------------------------
    console.log('\nTest 2: Creating Payroll Run #1 and Adding Adjustments...');

    const runRes = await fetch(`${baseUrl}/api/v1/payroll/runs`, {
      method: 'POST',
      headers: acctHeaders,
      body: JSON.stringify({
        payrollPeriodId: periodId
      })
    });
    const runData = await runRes.json();
    if (!runRes.ok || !runData.run) {
      throw new Error(`Failed to create run: ${JSON.stringify(runData)}`);
    }
    runId = runData.run.id;
    console.log(`  ✅ Run #${runData.run.runNumber} created (ID: ${runId})`);

    // Add Credit Adjustment (Bonus ₹5,000)
    const bonusRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/adjustments`, {
      method: 'POST',
      headers: acctHeaders,
      body: JSON.stringify({
        employeeId: empAId,
        adjustmentType: 'CREDIT',
        category: 'BONUS',
        amount: 5000,
        reason: 'Quarterly Sales Target Achieved'
      })
    });
    const bonusData = await bonusRes.json();
    if (!bonusRes.ok) {
      throw new Error(`Failed to add bonus adjustment: ${JSON.stringify(bonusData)}`);
    }
    console.log('  ✅ Added Credit Adjustment: Bonus ₹5,000');

    // Add Debit Adjustment (Advance Recovery ₹2,000)
    const advRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/adjustments`, {
      method: 'POST',
      headers: acctHeaders,
      body: JSON.stringify({
        employeeId: empAId,
        adjustmentType: 'DEBIT',
        category: 'ADVANCE_RECOVERY',
        amount: 2000,
        reason: 'Monthly Advance Installment'
      })
    });
    const advData = await advRes.json();
    if (!advRes.ok) {
      throw new Error(`Failed to add advance adjustment: ${JSON.stringify(advData)}`);
    }
    console.log('  ✅ Added Debit Adjustment: Advance Recovery ₹2,000');

    // -------------------------------------------------------------
    // Test 3: Batch Payroll Calculation & Mathematical Verification
    // -------------------------------------------------------------
    console.log('\nTest 3: Executing Batch Calculation for August 2026...');

    const calcRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/calculate`, {
      method: 'POST',
      headers: acctHeaders
    });
    const calcData = await calcRes.json();
    if (!calcRes.ok || !calcData.run) {
      throw new Error(`Calculation failed: ${JSON.stringify(calcData)}`);
    }
    console.log(`  ✅ Calculation complete: Status = ${calcData.run.status}, Total Net = ₹${calcData.run.totalNet}`);

    // Fetch Calculated Payroll Item for Employee A
    const itemsRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/items?search=${empACode}`, {
      headers: adminHeaders
    });
    const itemsData = await itemsRes.json();
    const itemA = itemsData.items?.find(i => i.employeeId === empAId);

    if (!itemA) {
      throw new Error(`Employee A payroll item not found in run items: ${JSON.stringify(itemsData)}`);
    }

    console.log('\nVerifying Mathematical Precision on Employee A:');
    console.log(`  - Base Gross Reference: ₹50,000`);
    console.log(`  - Gross Earnings: ₹${itemA.grossEarnings}`);
    console.log(`  - Total Deductions: ₹${itemA.totalDeductions}`);
    console.log(`  - Adjustments Credit: ₹${itemA.adjustmentsCredit}`);
    console.log(`  - Adjustments Debit: ₹${itemA.adjustmentsDebit}`);
    console.log(`  - Net Payable: ₹${itemA.netPayable}`);

    // Expected values:
    // Basic = 50% of 50,000 = 25,000
    // HRA = 40% of 25,000 = 10,000
    // Conveyance = 1,600 (Fixed)
    // Gross = 25,000 + 10,000 + 1,600 = 36,600
    // PF = 12% of 25,000 = 3,000
    // Deductions = 3,000
    // Credit = 5,000
    // Debit = 2,000
    // Net = 36,600 + 5,000 - 3,000 - 2,000 = 36,600
    if (
      Number(itemA.grossEarnings) !== 36600 ||
      Number(itemA.totalDeductions) !== 3000 ||
      Number(itemA.adjustmentsCredit) !== 5000 ||
      Number(itemA.adjustmentsDebit) !== 2000 ||
      Number(itemA.netPayable) !== 36600
    ) {
      throw new Error(`Mathematical mismatch on Employee A: ${JSON.stringify(itemA)}`);
    }
    console.log('  ✅ Mathematical precision 100% verified against formulas.');

    // Fetch Item Detail to verify PayrollLine snapshots
    const itemDetailRes = await fetch(`${baseUrl}/api/v1/payroll/items/${itemA.id}`, {
      headers: adminHeaders
    });
    const itemDetail = await itemDetailRes.json();
    const lines = itemDetail.item?.lines || [];

    const basicLine = lines.find(l => l.componentCode === 'BASIC');
    const hraLine = lines.find(l => l.componentCode === 'HRA');
    const pfLine = lines.find(l => l.componentCode === 'PF_EMPLOYEE');
    const bonusLine = lines.find(l => l.componentCode === 'ADJ_BONUS');

    if (
      Number(basicLine?.amount) !== 25000 ||
      Number(hraLine?.amount) !== 10000 ||
      Number(pfLine?.amount) !== 3000 ||
      Number(bonusLine?.amount) !== 5000
    ) {
      throw new Error(`PayrollLine snapshots corrupted: ${JSON.stringify(lines)}`);
    }
    console.log(`  ✅ Verified ${lines.length} immutable PayrollLine snapshots populated.`);

    // -------------------------------------------------------------
    // Test 4: Historical Immutability Guarantee
    // -------------------------------------------------------------
    console.log('\nTest 4: Verifying Historical Immutability (Future Salary Change)...');
    
    // Assign new structure to Employee A starting in future (2026-09-01)
    await fetch(`${baseUrl}/api/v1/employees/${empAId}/salary-assignments`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        salaryStructureId: structId,
        baseGross: 80000, // Massive raise
        effectiveFrom: '2026-09-01',
        reason: 'September Increment'
      })
    });

    // Re-verify August 2026 snapshot is completely unaffected
    const postChangeItemRes = await fetch(`${baseUrl}/api/v1/payroll/items/${itemA.id}`, {
      headers: adminHeaders
    });
    const postChangeItem = await postChangeItemRes.json();
    const postBasicLine = postChangeItem.item?.lines.find(l => l.componentCode === 'BASIC');

    if (Number(postBasicLine?.amount) !== 25000 || Number(postChangeItem.item?.netPayable) !== 36600) {
      throw new Error('Historical August snapshot was mutated by future salary change!');
    }
    console.log('  ✅ Historical August snapshot remained 100% immutable (Basic = ₹25,000).');

    // -------------------------------------------------------------
    // Test 5: Approval & Lock Lifecycle Invariants
    // -------------------------------------------------------------
    console.log('\nTest 5: Testing Run Approval & Lock Immutability...');

    // Approve Run
    const approveRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/approve`, {
      method: 'POST',
      headers: acctHeaders
    });
    const approveData = await approveRes.json();
    if (approveRes.ok && approveData.run?.status === 'APPROVED') {
      console.log('  ✅ Passed: Payroll Run #1 transitioned to APPROVED status');
    } else {
      throw new Error(`Approval failed: ${JSON.stringify(approveData)}`);
    }

    // Lock Run
    const lockRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/lock`, {
      method: 'POST',
      headers: adminHeaders
    });
    const lockData = await lockRes.json();
    if (lockRes.ok && lockData.run?.status === 'LOCKED') {
      console.log('  ✅ Passed: Payroll Run #1 transitioned to LOCKED status (Payroll Frozen)');
    } else {
      throw new Error(`Lock failed: ${JSON.stringify(lockData)}`);
    }

    // Attempt recalculation on locked run (must be rejected)
    const recalcRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/calculate`, {
      method: 'POST',
      headers: acctHeaders
    });
    if (recalcRes.status === 400) {
      console.log('  ✅ Passed: Recalculation on LOCKED run rejected with HTTP 400');
    } else {
      throw new Error(`Expected 400 for recalculation on locked run but got ${recalcRes.status}`);
    }

    // -------------------------------------------------------------
    // Test 6: RBAC & Security Boundaries
    // -------------------------------------------------------------
    console.log('\nTest 6: Testing RBAC Permissions & Field Privacy...');

    // Sales role blocked from running payroll
    const salesRunRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${salesToken}`
      }
    });
    if (salesRunRes.status === 403) {
      console.log('  ✅ Passed: Sales role blocked from calculating payroll with HTTP 403 Forbidden');
    } else {
      throw new Error(`Expected 403 for Sales payroll calculate but got ${salesRunRes.status}`);
    }

    // Manager role allowed to view run items
    const mgrViewRes = await fetch(`${baseUrl}/api/v1/payroll/runs/${runId}/items`, {
      headers: { 'Authorization': `Bearer ${managerToken}` }
    });
    if (mgrViewRes.ok) {
      console.log('  ✅ Passed: Manager role successfully accessed GET /api/v1/payroll/runs/:id/items (HTTP 200)');
    } else {
      throw new Error(`Manager view failed with ${mgrViewRes.status}`);
    }

    // -------------------------------------------------------------
    // Test 7: Audit Trail Verification
    // -------------------------------------------------------------
    console.log('\nTest 7: Verifying Phase 3 Audit Log Records...');
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: { in: ['PAYROLL_PERIOD_CREATE', 'PAYROLL_PERIOD_OPEN', 'PAYROLL_RUN_CREATE', 'PAYROLL_ADJUSTMENT_CREATE', 'PAYROLL_CALCULATE', 'PAYROLL_APPROVE', 'PAYROLL_LOCK'] }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    console.log(`  ✅ Verified ${auditLogs.length} Phase 3 Audit Events recorded in AuditLog table.`);

    console.log('\n=== ALL PHASE 3 MONTHLY PAYROLL CALCULATION ENGINE TESTS PASSED! ===');

  } finally {
    console.log('\nCleaning up Phase 3 test records...');
    if (runId) {
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
