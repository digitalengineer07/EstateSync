const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

const JWT_SECRET = 'super-secret-jwt-key-for-estatesync';

async function generateTestToken(email) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      },
      wallet: true
    }
  });

  if (!user) throw new Error('User not found: ' + email);

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role.name,
    permissions: user.role.permissions.map(rp => rp.permission.code)
  };

  return {
    user,
    token: jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }),
    payload
  };
}

async function verifyFundDeductionLogic() {
  console.log('=== Starting Fund Request Balance Deduction Logic Test ===\n');

  // 1. Ensure admin@estatesync.local has funded treasury wallet if 0
  const localAdmin = await prisma.user.findUnique({
    where: { email: 'admin@estatesync.local' },
    include: { wallet: true }
  });

  if (!localAdmin.wallet || parseFloat(localAdmin.wallet.availableBalance) === 0) {
    console.log('Setting baseline Corporate Treasury funds on admin@estatesync.local...');
    await prisma.wallet.upsert({
      where: { userId: localAdmin.id },
      update: { availableBalance: 5000000, totalAllocated: 5000000 },
      create: { userId: localAdmin.id, availableBalance: 5000000, totalAllocated: 5000000, totalSpent: 0 }
    });
  }

  const adminAuth = await generateTestToken('admin@estatesync.local');
  const salesAuth = await generateTestToken('sales@estatesync.local');
  const managerAuth = await generateTestToken('manager@estatesync.local');

  // Get initial balances
  const preAdminWallet = await prisma.wallet.findUnique({ where: { userId: adminAuth.user.id } });
  const preSalesWallet = await prisma.wallet.findUnique({ where: { userId: salesAuth.user.id } });

  const initialAdminBal = parseFloat(preAdminWallet.availableBalance);
  const initialSalesBal = parseFloat(preSalesWallet.availableBalance);

  console.log(`Initial Admin/Treasury Balance: ₹${initialAdminBal.toLocaleString()}`);
  console.log(`Initial Sales Staff Balance:     ₹${initialSalesBal.toLocaleString()}`);

  // 2. Sales creates a fund request for ₹25,000 addressed to Admin
  const REQUEST_AMOUNT = 25000;
  console.log(`\n1. Sales staff requesting ₹${REQUEST_AMOUNT.toLocaleString()} from Admin...`);
  
  const createRes = await fetch('http://localhost:4000/api/v1/fund-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${salesAuth.token}`
    },
    body: JSON.stringify({
      amount: REQUEST_AMOUNT,
      reason: 'Field site inspection travel & fuel advance',
      managerId: adminAuth.user.id
    })
  });

  const createData = await createRes.json();
  console.log('Create Fund Request Status:', createRes.status, 'ID:', createData.fundRequest?.id);

  if (!createData.fundRequest?.id) {
    throw new Error('Failed to create fund request: ' + JSON.stringify(createData));
  }

  const reqId = createData.fundRequest.id;

  // 3. Admin approves the fund request
  console.log(`\n2. Admin approving Fund Request ${reqId}...`);
  const approveRes = await fetch(`http://localhost:4000/api/v1/fund-requests/${reqId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminAuth.token}`
    }
  });

  const approveData = await approveRes.json();
  console.log('Approve Status:', approveRes.status, approveData.message);

  if (approveRes.status !== 200 || !approveData.success) {
    throw new Error('Approval failed: ' + JSON.stringify(approveData));
  }

  // 4. Fetch Post-Approval Balances
  const postAdminWallet = await prisma.wallet.findUnique({ where: { userId: adminAuth.user.id } });
  const postSalesWallet = await prisma.wallet.findUnique({ where: { userId: salesAuth.user.id } });

  const finalAdminBal = parseFloat(postAdminWallet.availableBalance);
  const finalSalesBal = parseFloat(postSalesWallet.availableBalance);

  console.log(`\nPost-Approval Admin/Treasury Balance: ₹${finalAdminBal.toLocaleString()}`);
  console.log(`Post-Approval Sales Staff Balance:     ₹${finalSalesBal.toLocaleString()}`);

  const adminDiff = initialAdminBal - finalAdminBal;
  const salesDiff = finalSalesBal - initialSalesBal;

  console.log(`Admin/Treasury Balance Change: -₹${adminDiff.toLocaleString()} (Expected: -₹${REQUEST_AMOUNT.toLocaleString()})`);
  console.log(`Sales Staff Balance Change:    +₹${salesDiff.toLocaleString()} (Expected: +₹${REQUEST_AMOUNT.toLocaleString()})`);

  if (adminDiff !== REQUEST_AMOUNT) {
    throw new Error(`CRITICAL LOGIC ERROR: Treasury was NOT deducted by ₹${REQUEST_AMOUNT}! Admin Diff: ${adminDiff}`);
  }

  if (salesDiff !== REQUEST_AMOUNT) {
    throw new Error(`CRITICAL LOGIC ERROR: Sales was NOT credited by ₹${REQUEST_AMOUNT}! Sales Diff: ${salesDiff}`);
  }

  console.log('-> PASS: Main Treasury balance properly DECREASED by ₹25,000 and staff balance INCREASED by ₹25,000!');

  // 5. Verify Dashboard Stats API
  console.log('\n3. Verifying /api/v1/dashboard/admin metrics...');
  const statsRes = await fetch('http://localhost:4000/api/v1/dashboard/admin', {
    headers: { 'Authorization': `Bearer ${adminAuth.token}` }
  });
  const statsData = await statsRes.json();
  console.log('Admin Dashboard Treasury Liquidity:', statsData.stats?.totalOrganizationalFunds);
  console.log('Admin Dashboard Total Allocated to Team:', statsData.stats?.totalAllocated);

  if (parseFloat(statsData.stats?.totalOrganizationalFunds) !== finalAdminBal) {
    throw new Error(`Dashboard stats mismatch! Expected Treasury: ${finalAdminBal}, Got: ${statsData.stats?.totalOrganizationalFunds}`);
  }

  console.log('-> PASS: Dashboard stats match exact Treasury balance!');

  console.log('\n=== ALL FUND DEDUCTION LOGIC VERIFICATION TESTS PASSED! ===');
  process.exit(0);
}

verifyFundDeductionLogic().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
