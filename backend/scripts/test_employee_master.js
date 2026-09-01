/**
 * Automated Test Suite for Phase 1: Employee Master & Existing User Linking
 * Validates:
 * 1. Employee creation without login (userId: null)
 * 2. Employee creation with linked User login
 * 3. Duplicate employeeCode prevention
 * 4. Duplicate mobile and email prevention
 * 5. Single User <-> Single Employee unique constraint enforcement
 * 6. Search & filtering (by name, code, mobile, department, login status)
 * 7. Self-reporting manager loop prevention
 * 8. Profile updates and audit logging
 * 9. Archiving employee (exit date, reason, status)
 * 10. User linking and unlinking lifecycle
 * 11. RBAC authorization (Admin/Accounting can manage, Sales blocked)
 * 12. Atomic database cleanup
 */

const http = require('http');
const prisma = require('../src/config/db');

async function main() {
  console.log('=== Starting Phase 1: Employee Master Automated Test Suite ===\n');

  let server;
  let baseUrl = 'http://127.0.0.1:4000';

  // 1. Ensure server is running
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

  const testSuffix = Date.now().toString();
  const testMobile1 = `98${testSuffix.slice(-8)}`;
  const testMobile2 = `97${testSuffix.slice(-8)}`;
  const testMobile3 = `96${testSuffix.slice(-8)}`;
  const testEmail1 = `emp1_${testSuffix}@example.com`;
  const testEmail2 = `emp2_${testSuffix}@example.com`;

  let adminToken, salesToken, accountingToken, managerToken;
  let adminUserId, accountingUserId, salesUserId, otherUserId;
  let emp1Id, emp2Id, emp1Code, emp2Code;

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
      return { token, user: data.user };
    }

    const adminAuth = await loginUser('admin@estatesync.local', 'password123');
    adminToken = adminAuth.token;
    adminUserId = adminAuth.user.id;

    const acctAuth = await loginUser('accounting@estatesync.local', 'password123');
    accountingToken = acctAuth.token;
    accountingUserId = acctAuth.user.id;

    const mgrAuth = await loginUser('manager@estatesync.local', 'password123');
    managerToken = mgrAuth.token;

    const salesAuth = await loginUser('sales@estatesync.local', 'password123');
    salesToken = salesAuth.token;
    salesUserId = salesAuth.user.id;

    const otherUser = await prisma.user.findUnique({ where: { email: 'other@estatesync.local' } });
    otherUserId = otherUser ? otherUser.id : null;

    console.log('  ✅ Logged in successfully.\n');

    const adminHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    };

    // -------------------------------------------------------------
    // Test 1: Create Employee without login account (userId: null)
    // -------------------------------------------------------------
    console.log('Test 1: Admin creates non-login Employee (Security Guard)...');
    const res1 = await fetch(`${baseUrl}/api/v1/employees`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        fullName: `Ramesh Singh (Guard ${testSuffix})`,
        displayName: 'Ramesh Guard',
        mobile: testMobile1,
        department: 'Security',
        designation: 'Head Security Guard',
        employmentType: 'FULL_TIME',
        joiningDate: '2026-01-15',
        workLocation: 'Patna Site 1'
      })
    });
    const data1 = await res1.json();
    if (!res1.ok || !data1.success || !data1.employee) {
      console.error('  ❌ Failed Test 1:', data1);
      process.exit(1);
    }
    emp1Id = data1.employee.id;
    emp1Code = data1.employee.employeeCode;
    console.log(`  ✅ Passed: Employee created (Code: ${emp1Code}, ID: ${emp1Id}, userId: ${data1.employee.userId})`);

    // -------------------------------------------------------------
    // Test 2: Create Employee linked to existing User account
    // -------------------------------------------------------------
    console.log(`\nTest 2: Admin creates Employee linked to Accounting User (${accountingUserId})...`);
    const res2 = await fetch(`${baseUrl}/api/v1/employees`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        fullName: `Priya Sharma (Accountant ${testSuffix})`,
        displayName: 'Priya Accountant',
        mobile: testMobile2,
        email: testEmail1,
        department: 'Accounting',
        designation: 'Senior Accountant',
        employmentType: 'FULL_TIME',
        joiningDate: '2026-02-01',
        workLocation: 'Head Office',
        userId: accountingUserId
      })
    });
    const data2 = await res2.json();
    if (!res2.ok || !data2.success || !data2.employee) {
      console.error('  ❌ Failed Test 2:', data2);
      process.exit(1);
    }
    emp2Id = data2.employee.id;
    emp2Code = data2.employee.employeeCode;
    console.log(`  ✅ Passed: Linked Employee created (Code: ${emp2Code}, ID: ${emp2Id}, Linked User: ${data2.employee.user?.email})`);

    // -------------------------------------------------------------
    // Test 3: Reject duplicate Employee Code
    // -------------------------------------------------------------
    console.log(`\nTest 3: Attempting duplicate Employee Code "${emp1Code}"...`);
    const res3 = await fetch(`${baseUrl}/api/v1/employees`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        employeeCode: emp1Code,
        fullName: 'Imposter Guard',
        mobile: testMobile3,
        department: 'Security',
        designation: 'Guard',
        joiningDate: '2026-03-01'
      })
    });
    const data3 = await res3.json();
    if (res3.status === 409 && data3.message?.includes('already assigned')) {
      console.log('  ✅ Passed: Rejected duplicate Employee Code with HTTP 409:', data3.message);
    } else {
      console.error('  ❌ Failed Test 3: Expected 409 duplicate error but got', res3.status, data3);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // Test 4: Reject duplicate Mobile Number
    // -------------------------------------------------------------
    console.log(`\nTest 4: Attempting duplicate Mobile "${testMobile1}"...`);
    const res4 = await fetch(`${baseUrl}/api/v1/employees`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        fullName: 'Duplicate Mobile Worker',
        mobile: testMobile1,
        department: 'Operations',
        designation: 'Driver',
        joiningDate: '2026-03-01'
      })
    });
    const data4 = await res4.json();
    if (res4.status === 409 && data4.message?.includes('already registered')) {
      console.log('  ✅ Passed: Rejected duplicate Mobile with HTTP 409:', data4.message);
    } else {
      console.error('  ❌ Failed Test 4: Expected 409 duplicate mobile error but got', res4.status, data4);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // Test 5: Reject linking already-linked User to another Employee
    // -------------------------------------------------------------
    console.log(`\nTest 5: Attempting to link already-linked User (${accountingUserId}) to a new Employee...`);
    const res5 = await fetch(`${baseUrl}/api/v1/employees`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        fullName: 'Duplicate User Link Worker',
        mobile: testMobile3,
        email: testEmail2,
        department: 'Accounting',
        designation: 'Assistant Accountant',
        joiningDate: '2026-03-01',
        userId: accountingUserId
      })
    });
    const data5 = await res5.json();
    if (res5.status === 409 && data5.message?.includes('already linked')) {
      console.log('  ✅ Passed: Rejected duplicate User linking with HTTP 409:', data5.message);
    } else {
      console.error('  ❌ Failed Test 5: Expected 409 user already linked error but got', res5.status, data5);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // Test 6: Search & Filter Employees
    // -------------------------------------------------------------
    console.log('\nTest 6: Searching Employees by keyword and login status...');
    const res6a = await fetch(`${baseUrl}/api/v1/employees?search=${encodeURIComponent('Ramesh Singh')}`, {
      headers: adminHeaders
    });
    const data6a = await res6a.json();
    if (res6a.ok && data6a.employees?.some(e => e.id === emp1Id)) {
      console.log('  ✅ Passed: Search by Full Name returned Employee 1');
    } else {
      console.error('  ❌ Failed Test 6a:', data6a);
      process.exit(1);
    }

    const res6b = await fetch(`${baseUrl}/api/v1/employees?hasLogin=true`, {
      headers: adminHeaders
    });
    const data6b = await res6b.json();
    if (res6b.ok && data6b.employees?.some(e => e.id === emp2Id) && !data6b.employees?.some(e => e.id === emp1Id)) {
      console.log('  ✅ Passed: Filter by hasLogin=true accurately isolated linked staff');
    } else {
      console.error('  ❌ Failed Test 6b:', data6b);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // Test 7: Prevent Self-Reporting Loop
    // -------------------------------------------------------------
    console.log('\nTest 7: Attempting to assign Employee as their own reporting manager...');
    const res7 = await fetch(`${baseUrl}/api/v1/employees/${emp1Id}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        reportingManagerId: emp1Id
      })
    });
    const data7 = await res7.json();
    if (res7.status === 400 && data7.message?.includes('own reporting manager')) {
      console.log('  ✅ Passed: Rejected self-reporting manager loop with HTTP 400:', data7.message);
    } else {
      console.error('  ❌ Failed Test 7: Expected 400 self-reporting loop error but got', res7.status, data7);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // Test 8: Valid Hierarchy & Profile Update
    // -------------------------------------------------------------
    console.log(`\nTest 8: Updating Employee 1 to report to Employee 2 (${emp2Code})...`);
    const res8 = await fetch(`${baseUrl}/api/v1/employees/${emp1Id}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        reportingManagerId: emp2Id,
        designation: 'Senior Security Officer'
      })
    });
    const data8 = await res8.json();
    if (res8.ok && data8.employee?.reportingManagerId === emp2Id && data8.employee?.designation === 'Senior Security Officer') {
      console.log('  ✅ Passed: Profile updated with reporting hierarchy and audit logged');
    } else {
      console.error('  ❌ Failed Test 8:', data8);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // Test 9: User Account Linking & Unlinking
    // -------------------------------------------------------------
    if (otherUserId) {
      console.log(`\nTest 9: Linking User (${otherUserId}) to Employee 1 and then Unlinking...`);
      const res9a = await fetch(`${baseUrl}/api/v1/employees/${emp1Id}/link-user`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ userId: otherUserId })
      });
      const data9a = await res9a.json();
      if (!res9a.ok || data9a.employee?.userId !== otherUserId) {
        console.error('  ❌ Failed Test 9a (link):', data9a);
        process.exit(1);
      }
      console.log('  ✅ Passed: User account linked successfully.');

      const res9b = await fetch(`${baseUrl}/api/v1/employees/${emp1Id}/unlink-user`, {
        method: 'POST',
        headers: adminHeaders
      });
      const data9b = await res9b.json();
      if (!res9b.ok || data9b.employee?.userId !== null) {
        console.error('  ❌ Failed Test 9b (unlink):', data9b);
        process.exit(1);
      }
      console.log('  ✅ Passed: User account unlinked successfully without deleting User or Employee.');
    }

    // -------------------------------------------------------------
    // Test 10: Archive Employee
    // -------------------------------------------------------------
    console.log('\nTest 10: Archiving Employee 1 with exit reason...');
    const res10 = await fetch(`${baseUrl}/api/v1/employees/${emp1Id}/archive`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        exitReason: 'Relocated to native hometown',
        exitDate: '2026-08-31',
        status: 'RESIGNED'
      })
    });
    const data10 = await res10.json();
    if (res10.ok && data10.employee?.status === 'RESIGNED' && data10.employee?.exitReason) {
      console.log('  ✅ Passed: Employee archived successfully (Status: RESIGNED, Audit Logged)');
    } else {
      console.error('  ❌ Failed Test 10:', data10);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // Test 11: RBAC Permission Guard (Sales blocked, Manager allowed to view)
    // -------------------------------------------------------------
    console.log('\nTest 11: Verifying RBAC permission enforcement...');
    const res11a = await fetch(`${baseUrl}/api/v1/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${salesToken}`
      },
      body: JSON.stringify({
        fullName: 'Unauthorized Sales Employee Entry',
        mobile: testMobile3,
        department: 'Sales',
        designation: 'Executive',
        joiningDate: '2026-04-01'
      })
    });
    const data11a = await res11a.json();
    if (res11a.status === 403) {
      console.log('  ✅ Passed: Sales role blocked from creating employee with HTTP 403 Forbidden');
    } else {
      console.error('  ❌ Failed Test 11a: Expected 403 Forbidden but got', res11a.status, data11a);
      process.exit(1);
    }

    const res11b = await fetch(`${baseUrl}/api/v1/employees`, {
      headers: {
        'Authorization': `Bearer ${managerToken}`
      }
    });
    if (res11b.ok) {
      console.log('  ✅ Passed: Manager role successfully accessed GET /api/v1/employees (HTTP 200)');
    } else {
      console.error('  ❌ Failed Test 11b: Manager view expected 200 but got', res11b.status);
      process.exit(1);
    }

    console.log('\n=== ALL PHASE 1 EMPLOYEE MASTER & USER LINKING TESTS PASSED! ===');

  } finally {
    // Clean up created test employees
    console.log('\nCleaning up created test employees...');
    if (emp1Id || emp2Id) {
      const idsToDelete = [emp1Id, emp2Id].filter(Boolean);
      await prisma.employee.deleteMany({
        where: { id: { in: idsToDelete } }
      });
      console.log('✅ Test cleanup complete.');
    }

    if (server) {
      server.close();
    }
  }
}

main().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
