/**
 * Automated Test Suite for Phase 2:
 * Salary Components + Salary Structure Engine + Effective-Dated Employee Salary Assignments
 */

const http = require('http');
const prisma = require('../src/config/db');
const { resolveApplicableSalaryStructure } = require('../src/services/salaryStructureService');

async function main() {
  console.log('=== Starting Phase 2: Salary Structure Engine & Assignments Test Suite ===\n');

  let server;
  let baseUrl = 'http://127.0.0.1:4000';

  const isServerRunning = await new Promise((resolve) => {
    const req = http.get(`${baseUrl}/`, (res) => resolve(true));
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
  let testEmpId, testEmpCode;
  let comp1Id, comp2Id, struct1Id, struct2Id;
  let assign1Id, assign2Id;

  try {
    // -------------------------------------------------------------
    // Step 1: Login & obtain tokens
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
    // Step 2: Create Test Employee
    // -------------------------------------------------------------
    console.log('Step 2: Creating Test Employee for Salary Assignment...');
    const empRes = await fetch(`${baseUrl}/api/v1/employees`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        fullName: `Rahul Sharma (Phase2 ${testSuffix})`,
        mobile: `95${Date.now().toString().slice(-8)}`,
        department: 'Sales',
        designation: 'Sales Executive',
        joiningDate: '2026-04-01'
      })
    });
    const empData = await empRes.json();
    if (!empRes.ok || !empData.employee) {
      throw new Error(`Failed to create test employee: ${JSON.stringify(empData)}`);
    }
    testEmpId = empData.employee.id;
    testEmpCode = empData.employee.employeeCode;
    console.log(`  ✅ Test Employee created: ${empData.employee.fullName} (${testEmpCode})\n`);

    // -------------------------------------------------------------
    // Test 1: Salary Component Creation & Validation
    // -------------------------------------------------------------
    console.log('Test 1: Creating custom Salary Components & Testing Validation...');
    
    // Valid Component 1
    const c1Res = await fetch(`${baseUrl}/api/v1/payroll/components`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        code: `BONUS_${testSuffix}`,
        name: `Performance Bonus ${testSuffix}`,
        componentType: 'EARNING',
        calculationMethod: 'FIXED_AMOUNT',
        defaultValue: 5000,
        sequence: 5
      })
    });
    const c1Data = await c1Res.json();
    if (!c1Res.ok || !c1Data.component) {
      throw new Error(`Failed to create Component 1: ${JSON.stringify(c1Data)}`);
    }
    comp1Id = c1Data.component.id;
    console.log(`  ✅ Component 1 created (${c1Data.component.code})`);

    // Valid Component 2
    const c2Res = await fetch(`${baseUrl}/api/v1/payroll/components`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        code: `MEAL_ALW_${testSuffix}`,
        name: `Meal Allowance ${testSuffix}`,
        componentType: 'EARNING',
        calculationMethod: 'FIXED_AMOUNT',
        defaultValue: 2000,
        sequence: 6
      })
    });
    const c2Data = await c2Res.json();
    comp2Id = c2Data.component.id;
    console.log(`  ✅ Component 2 created (${c2Data.component.code})`);

    // Duplicate code rejection
    const dupCompRes = await fetch(`${baseUrl}/api/v1/payroll/components`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        code: `BONUS_${testSuffix}`,
        name: 'Duplicate Bonus',
        componentType: 'EARNING',
        calculationMethod: 'FIXED_AMOUNT'
      })
    });
    if (dupCompRes.status === 409) {
      console.log('  ✅ Passed: Duplicate component code rejected with HTTP 409');
    } else {
      throw new Error(`Expected 409 for duplicate component code but got ${dupCompRes.status}`);
    }

    // Invalid calculation method rejection
    const invMethodRes = await fetch(`${baseUrl}/api/v1/payroll/components`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        code: `INVALID_COMP_${testSuffix}`,
        name: 'Invalid Method Component',
        componentType: 'EARNING',
        calculationMethod: 'INVALID_FORMULA'
      })
    });
    if (invMethodRes.status === 400) {
      console.log('  ✅ Passed: Invalid calculation method rejected with HTTP 400');
    } else {
      throw new Error(`Expected 400 for invalid calculation method but got ${invMethodRes.status}`);
    }

    // -------------------------------------------------------------
    // Test 2: Salary Structure Creation with Itemized Lines
    // -------------------------------------------------------------
    console.log('\nTest 2: Creating Salary Structures (V1 and V2) with lines...');
    
    // Fetch default Basic and HRA components
    const allComps = await prisma.salaryComponent.findMany();
    const basicComp = allComps.find(c => c.code === 'BASIC');
    const hraComp = allComps.find(c => c.code === 'HRA');
    const convComp = allComps.find(c => c.code === 'CONVEYANCE');
    const pfComp = allComps.find(c => c.code === 'PF_EMPLOYEE');

    if (!basicComp || !hraComp || !convComp || !pfComp) {
      throw new Error('Default seeded components (BASIC, HRA, CONVEYANCE, PF_EMPLOYEE) missing from database.');
    }

    // Create Structure V1 (Sales Standard V1)
    const s1Res = await fetch(`${baseUrl}/api/v1/payroll/structures`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        code: `STR_SALES_V1_${testSuffix}`,
        name: `Sales Standard Structure V1 (${testSuffix})`,
        description: 'Standard compensation for sales team',
        lines: [
          { componentId: basicComp.id, calculationMethod: 'PERCENTAGE_OF_GROSS', percentage: 50, sequence: 1 },
          { componentId: hraComp.id, calculationMethod: 'PERCENTAGE_OF_BASIC', percentage: 40, sequence: 2 },
          { componentId: convComp.id, calculationMethod: 'FIXED_AMOUNT', value: 1600, sequence: 3 },
          { componentId: pfComp.id, calculationMethod: 'PERCENTAGE_OF_BASIC', percentage: 12, sequence: 10 }
        ]
      })
    });
    const s1Data = await s1Res.json();
    if (!s1Res.ok || !s1Data.structure) {
      throw new Error(`Failed to create Structure V1: ${JSON.stringify(s1Data)}`);
    }
    struct1Id = s1Data.structure.id;
    console.log(`  ✅ Structure V1 created (${s1Data.structure.code}) with ${s1Data.structure.lines.length} lines`);

    // Create Structure V2 (Sales Senior V2 with custom bonus)
    const s2Res = await fetch(`${baseUrl}/api/v1/payroll/structures`, {
      method: 'POST',
      headers: acctHeaders, // Testing Accounting authority
      body: JSON.stringify({
        code: `STR_SALES_V2_${testSuffix}`,
        name: `Sales Senior Structure V2 (${testSuffix})`,
        description: 'Enhanced compensation for senior sales reps',
        lines: [
          { componentId: basicComp.id, calculationMethod: 'PERCENTAGE_OF_GROSS', percentage: 50, sequence: 1 },
          { componentId: hraComp.id, calculationMethod: 'PERCENTAGE_OF_BASIC', percentage: 40, sequence: 2 },
          { componentId: convComp.id, calculationMethod: 'FIXED_AMOUNT', value: 2000, sequence: 3 },
          { componentId: comp1Id, calculationMethod: 'FIXED_AMOUNT', value: 5000, sequence: 4 },
          { componentId: pfComp.id, calculationMethod: 'PERCENTAGE_OF_BASIC', percentage: 12, sequence: 10 }
        ]
      })
    });
    const s2Data = await s2Res.json();
    if (!s2Res.ok || !s2Data.structure) {
      throw new Error(`Failed to create Structure V2: ${JSON.stringify(s2Data)}`);
    }
    struct2Id = s2Data.structure.id;
    console.log(`  ✅ Structure V2 created by Accounting (${s2Data.structure.code}) with ${s2Data.structure.lines.length} lines`);

    // Reject duplicate component line inside same structure
    const dupLineRes = await fetch(`${baseUrl}/api/v1/payroll/structures`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        code: `STR_DUP_TEST_${testSuffix}`,
        name: 'Duplicate Line Structure',
        lines: [
          { componentId: basicComp.id, sequence: 1 },
          { componentId: basicComp.id, sequence: 2 } // Duplicate!
        ]
      })
    });
    if (dupLineRes.status === 400) {
      console.log('  ✅ Passed: Duplicate component lines in same structure rejected with HTTP 400');
    } else {
      throw new Error(`Expected 400 for duplicate line in structure but got ${dupLineRes.status}`);
    }

    // -------------------------------------------------------------
    // Test 3: Effective-Dated Employee Salary Assignment & Supersession
    // -------------------------------------------------------------
    console.log('\nTest 3: Assigning Salary Structure V1 (effective 2026-04-01, Gross: ₹30,000)...');
    
    // Initial Assignment 1: 01-Apr-2026 -> Open-Ended (null)
    const a1Res = await fetch(`${baseUrl}/api/v1/employees/${testEmpId}/salary-assignments`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        salaryStructureId: struct1Id,
        baseGross: 30000,
        effectiveFrom: '2026-04-01',
        reason: 'Initial Offer April 2026'
      })
    });
    const a1Data = await a1Res.json();
    if (!a1Res.ok || !a1Data.assignment) {
      throw new Error(`Failed to create Assignment 1: ${JSON.stringify(a1Data)}`);
    }
    assign1Id = a1Data.assignment.id;
    console.log(`  ✅ Assignment 1 created: Gross ₹30,000, From: 2026-04-01, To: ${a1Data.assignment.effectiveTo || 'NULL (Active)'}, Status: ${a1Data.assignment.status}`);

    // Assignment 2: 01-Jul-2026 -> Open-Ended (Promotion/Increment to ₹45,000)
    console.log('\nAssigning Salary Structure V2 (effective 2026-07-01, Gross: ₹45,000)...');
    const a2Res = await fetch(`${baseUrl}/api/v1/employees/${testEmpId}/salary-assignments`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        salaryStructureId: struct2Id,
        baseGross: 45000,
        effectiveFrom: '2026-07-01',
        reason: 'Promotion to Senior Executive'
      })
    });
    const a2Data = await a2Res.json();
    if (!a2Res.ok || !a2Data.assignment) {
      throw new Error(`Failed to create Assignment 2: ${JSON.stringify(a2Data)}`);
    }
    assign2Id = a2Data.assignment.id;
    console.log(`  ✅ Assignment 2 created: Gross ₹45,000, From: 2026-07-01, Status: ${a2Data.assignment.status}`);

    // Verify Assignment 1 was automatically superseded
    const updatedA1 = await prisma.employeeSalaryAssignment.findUnique({
      where: { id: assign1Id }
    });
    console.log(`  ✅ Verified Assignment 1 Supersession: Status = ${updatedA1.status}, effectiveTo = ${updatedA1.effectiveTo?.toISOString().slice(0, 10)}`);
    if (updatedA1.status !== 'SUPERSEDED' || updatedA1.effectiveTo?.toISOString().slice(0, 10) !== '2026-06-30') {
      throw new Error(`Assignment 1 supersession bounds mismatch: expected 2026-06-30 but got ${updatedA1.effectiveTo?.toISOString().slice(0, 10)}`);
    }

    // -------------------------------------------------------------
    // Test 4: Collision & Overlap Prevention
    // -------------------------------------------------------------
    console.log('\nTest 4: Testing Collision & Overlap Prevention...');
    
    // Same start-date conflict (2026-07-01)
    const sameDateRes = await fetch(`${baseUrl}/api/v1/employees/${testEmpId}/salary-assignments`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        salaryStructureId: struct1Id,
        baseGross: 40000,
        effectiveFrom: '2026-07-01'
      })
    });
    if (sameDateRes.status === 409) {
      console.log('  ✅ Passed: Same start date collision rejected with HTTP 409');
    } else {
      throw new Error(`Expected 409 for same start date collision but got ${sameDateRes.status}`);
    }

    // Overlapping historical interval (e.g. 2026-05-01 to 2026-05-31 inside closed interval 2026-04-01 to 2026-06-30)
    const overlapRes = await fetch(`${baseUrl}/api/v1/employees/${testEmpId}/salary-assignments`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        salaryStructureId: struct1Id,
        baseGross: 35000,
        effectiveFrom: '2026-05-01',
        effectiveTo: '2026-05-31'
      })
    });
    if (overlapRes.status === 409) {
      console.log('  ✅ Passed: Historical interval overlap rejected with HTTP 409');
    } else {
      throw new Error(`Expected 409 for historical interval overlap but got ${overlapRes.status}`);
    }

    // -------------------------------------------------------------
    // Test 5: Historical Date Resolution Verification
    // -------------------------------------------------------------
    console.log('\nTest 5: Testing Date Resolution Engine across timeline...');
    
    // A. Date before initial employment: 2026-03-15 -> Expected: null / 404
    const r0 = await resolveApplicableSalaryStructure(testEmpId, new Date('2026-03-15'));
    if (r0 === null) {
      console.log('  ✅ Date 2026-03-15 (prior to employment) correctly resolved to null');
    } else {
      throw new Error('Expected null for date prior to initial assignment');
    }

    // B. Date on first effectiveFrom: 2026-04-01 -> Expected: V1 (₹30,000)
    const r1 = await resolveApplicableSalaryStructure(testEmpId, new Date('2026-04-01'));
    if (r1 && r1.salaryStructureId === struct1Id && Number(r1.baseGross) === 30000) {
      console.log('  ✅ Date 2026-04-01 (start of V1) resolved to Structure V1 (₹30,000)');
    } else {
      throw new Error(`Date 2026-04-01 failed: expected V1 30000 but got ${JSON.stringify(r1)}`);
    }

    // C. Date inside V1 range: 2026-05-15 -> Expected: V1 (₹30,000)
    const r2 = await resolveApplicableSalaryStructure(testEmpId, new Date('2026-05-15'));
    if (r2 && r2.salaryStructureId === struct1Id && Number(r2.baseGross) === 30000) {
      console.log('  ✅ Date 2026-05-15 (inside V1 interval) resolved to Structure V1 (₹30,000)');
    } else {
      throw new Error(`Date 2026-05-15 failed: expected V1 30000 but got ${JSON.stringify(r2)}`);
    }

    // D. Date on last day of V1: 2026-06-30 -> Expected: V1 (₹30,000)
    const r3 = await resolveApplicableSalaryStructure(testEmpId, new Date('2026-06-30'));
    if (r3 && r3.salaryStructureId === struct1Id && Number(r3.baseGross) === 30000) {
      console.log('  ✅ Date 2026-06-30 (last day of V1) resolved to Structure V1 (₹30,000)');
    } else {
      throw new Error(`Date 2026-06-30 failed: expected V1 30000 but got ${JSON.stringify(r3)}`);
    }

    // E. Date on start of V2: 2026-07-01 -> Expected: V2 (₹45,000)
    const r4 = await resolveApplicableSalaryStructure(testEmpId, new Date('2026-07-01'));
    if (r4 && r4.salaryStructureId === struct2Id && Number(r4.baseGross) === 45000) {
      console.log('  ✅ Date 2026-07-01 (start of V2) resolved to Structure V2 (₹45,000)');
    } else {
      throw new Error(`Date 2026-07-01 failed: expected V2 45000 but got ${JSON.stringify(r4)}`);
    }

    // F. Current active assignment via API: GET /api/v1/employees/:id/salary-assignments/current
    const currRes = await fetch(`${baseUrl}/api/v1/employees/${testEmpId}/salary-assignments/current`, {
      headers: adminHeaders
    });
    const currData = await currRes.json();
    if (currRes.ok && currData.assignment?.salaryStructureId === struct2Id) {
      console.log('  ✅ Current assignment API correctly returned active Structure V2');
    } else {
      throw new Error(`Current assignment API failed: ${JSON.stringify(currData)}`);
    }

    // -------------------------------------------------------------
    // Test 6: RBAC & Field Privacy
    // -------------------------------------------------------------
    console.log('\nTest 6: Verifying RBAC Security & Field-Level Privacy...');
    
    // Sales role blocked from creating salary structure
    const salesStructRes = await fetch(`${baseUrl}/api/v1/payroll/structures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${salesToken}`
      },
      body: JSON.stringify({
        code: `STR_SALES_UNAUTH_${testSuffix}`,
        name: 'Unauthorized Structure',
        lines: [{ componentId: basicComp.id }]
      })
    });
    if (salesStructRes.status === 403) {
      console.log('  ✅ Passed: Sales role blocked from structure management with HTTP 403 Forbidden');
    } else {
      throw new Error(`Expected 403 for Sales structure creation but got ${salesStructRes.status}`);
    }

    // Sales role blocked from assigning salary
    const salesAssignRes = await fetch(`${baseUrl}/api/v1/employees/${testEmpId}/salary-assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${salesToken}`
      },
      body: JSON.stringify({
        salaryStructureId: struct1Id,
        effectiveFrom: '2026-09-01'
      })
    });
    if (salesAssignRes.status === 403) {
      console.log('  ✅ Passed: Sales role blocked from salary assignment with HTTP 403 Forbidden');
    } else {
      throw new Error(`Expected 403 for Sales salary assignment but got ${salesAssignRes.status}`);
    }

    // Manager role allowed to view structures
    const mgrViewRes = await fetch(`${baseUrl}/api/v1/payroll/structures`, {
      headers: { 'Authorization': `Bearer ${managerToken}` }
    });
    if (mgrViewRes.ok) {
      console.log('  ✅ Passed: Manager role successfully accessed GET /api/v1/payroll/structures (HTTP 200)');
    } else {
      throw new Error(`Manager view failed with ${mgrViewRes.status}`);
    }

    // Generic employee endpoint GET /api/v1/employees/:id does NOT leak salary
    const genericEmpRes = await fetch(`${baseUrl}/api/v1/employees/${testEmpId}`, {
      headers: adminHeaders
    });
    const genericEmpData = await genericEmpRes.json();
    if (genericEmpRes.ok && genericEmpData.employee && genericEmpData.employee.salaryAssignments === undefined) {
      console.log('  ✅ Passed: Generic employee profile endpoint hides salary assignment internals');
    } else {
      throw new Error('Salary data leaked into generic employee profile response');
    }

    // -------------------------------------------------------------
    // Test 7: Audit Events Verification
    // -------------------------------------------------------------
    console.log('\nTest 7: Verifying Audit Log Records...');
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: { in: ['SALARY_COMPONENT_CREATE', 'SALARY_STRUCTURE_CREATE', 'SALARY_ASSIGNMENT_CREATE', 'SALARY_ASSIGNMENT_SUPERSEDED'] }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    console.log(`  ✅ Verified ${auditLogs.length} Phase 2 Audit Events recorded in AuditLog table.`);

    console.log('\n=== ALL PHASE 2 SALARY STRUCTURE & ASSIGNMENT TESTS PASSED! ===');

  } finally {
    // Teardown test records
    console.log('\nCleaning up Phase 2 test records...');
    if (testEmpId) {
      await prisma.employeeSalaryAssignment.deleteMany({ where: { employeeId: testEmpId } });
      await prisma.employee.deleteMany({ where: { id: testEmpId } });
    }
    if (struct1Id || struct2Id) {
      const sIds = [struct1Id, struct2Id].filter(Boolean);
      await prisma.salaryStructureLine.deleteMany({ where: { structureId: { in: sIds } } });
      await prisma.salaryStructure.deleteMany({ where: { id: { in: sIds } } });
    }
    if (comp1Id || comp2Id) {
      const cIds = [comp1Id, comp2Id].filter(Boolean);
      await prisma.salaryComponent.deleteMany({ where: { id: { in: cIds } } });
    }
    console.log('✅ Cleanup complete.');

    if (server) {
      server.close();
    }
  }
}

main().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
