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

async function verifyManagerDeduction() {
  console.log('=== Starting Manager Team Float Deduction Test ===\n');

  // 1. Give Manager ₹50,000 float from Admin
  const managerUser = await prisma.user.findUnique({ where: { email: 'manager@estatesync.local' } });
  await prisma.wallet.upsert({
    where: { userId: managerUser.id },
    update: { availableBalance: 50000, totalAllocated: 50000 },
    create: { userId: managerUser.id, availableBalance: 50000, totalAllocated: 50000, totalSpent: 0 }
  });

  const managerAuth = await generateTestToken('manager@estatesync.local');
  const salesAuth = await generateTestToken('sales@estatesync.local');

  const preManagerWallet = await prisma.wallet.findUnique({ where: { userId: managerAuth.user.id } });
  const preSalesWallet = await prisma.wallet.findUnique({ where: { userId: salesAuth.user.id } });

  const initialManagerBal = parseFloat(preManagerWallet.availableBalance);
  const initialSalesBal = parseFloat(preSalesWallet.availableBalance);

  console.log(`Initial Manager Float Balance: ₹${initialManagerBal.toLocaleString()}`);
  console.log(`Initial Sales Staff Balance:   ₹${initialSalesBal.toLocaleString()}`);

  // 2. Sales staff requests ₹15,000 from Manager
  const REQ_AMT = 15000;
  console.log(`\n1. Sales staff requesting ₹${REQ_AMT.toLocaleString()} from Sales Manager...`);
  const createRes = await fetch('http://localhost:4000/api/v1/fund-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${salesAuth.token}`
    },
    body: JSON.stringify({
      amount: REQ_AMT,
      reason: 'Client site transport expense',
      managerId: managerAuth.user.id
    })
  });
  const createData = await createRes.json();
  const reqId = createData.fundRequest.id;

  // 3. Manager approves
  console.log(`2. Manager approving request ${reqId}...`);
  const approveRes = await fetch(`http://localhost:4000/api/v1/fund-requests/${reqId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${managerAuth.token}`
    }
  });
  const approveData = await approveRes.json();
  console.log('Approve Status:', approveRes.status, approveData.message);

  // 4. Verify post balances
  const postManagerWallet = await prisma.wallet.findUnique({ where: { userId: managerAuth.user.id } });
  const postSalesWallet = await prisma.wallet.findUnique({ where: { userId: salesAuth.user.id } });

  const finalManagerBal = parseFloat(postManagerWallet.availableBalance);
  const finalSalesBal = parseFloat(postSalesWallet.availableBalance);

  console.log(`Post Manager Balance: ₹${finalManagerBal.toLocaleString()} (Change: -₹${(initialManagerBal - finalManagerBal).toLocaleString()})`);
  console.log(`Post Sales Balance:   ₹${finalSalesBal.toLocaleString()} (Change: +₹${(finalSalesBal - initialSalesBal).toLocaleString()})`);

  if (initialManagerBal - finalManagerBal !== REQ_AMT) {
    throw new Error('Manager balance was NOT deducted properly!');
  }
  if (finalSalesBal - initialSalesBal !== REQ_AMT) {
    throw new Error('Sales balance was NOT incremented properly!');
  }

  console.log('-> PASS: Manager float deducted and staff credited accurately!\n');

  // 5. Test Insufficient Balance: Sales requests ₹100,000 from Manager (who only has ₹35,000 left)
  console.log('3. Testing Insufficient Balance guard...');
  const createOverRes = await fetch('http://localhost:4000/api/v1/fund-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${salesAuth.token}`
    },
    body: JSON.stringify({
      amount: 100000,
      reason: 'Excess request test',
      managerId: managerAuth.user.id
    })
  });
  const createOverData = await createOverRes.json();
  const overReqId = createOverData.fundRequest.id;

  const approveOverRes = await fetch(`http://localhost:4000/api/v1/fund-requests/${overReqId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${managerAuth.token}`
    }
  });
  const approveOverData = await approveOverRes.json();
  console.log('Excess request approval response:', approveOverRes.status, approveOverData.message);

  if (approveOverRes.status === 400 && approveOverData.message?.includes('Insufficient')) {
    console.log('-> PASS: Insufficient funds error correctly prevented over-allocation!\n');
  } else {
    throw new Error('FAILED: Over-allocation should have been blocked!');
  }

  console.log('=== ALL MANAGER DEDUCTION TESTS PASSED! ===');
  process.exit(0);
}

verifyManagerDeduction().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
