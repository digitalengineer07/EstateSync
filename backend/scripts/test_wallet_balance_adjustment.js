require('dotenv').config();
const prisma = require('../src/config/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions.map(rp => rp.permission.code)
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function runTests() {
  console.log('=== STARTING WALLET BALANCE ADJUSTMENT ENGINE INTEGRATION TESTS ===\n');

  try {
    // 1. Fetch Admin User
    const adminUser = await prisma.user.findFirst({
      where: { role: { name: 'ADMIN' } },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } }
          }
        },
        wallet: true
      }
    });

    if (!adminUser) {
      throw new Error('Admin user not found in database.');
    }

    // 2. Fetch a non-admin user (Manager or Sales)
    let testUser = await prisma.user.findFirst({
      where: { role: { name: { in: ['MANAGER', 'SALES'] } } },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } }
          }
        },
        wallet: true
      }
    });

    if (!testUser) {
      throw new Error('Test non-admin user not found in database.');
    }

    console.log(`Admin User: ${adminUser.name} (${adminUser.email})`);
    console.log(`Test Target User: ${testUser.name} (${testUser.email}) — Role: ${testUser.role.name}\n`);

    const adminToken = createToken(adminUser);
    const nonAdminToken = createToken(testUser);

    const BASE_URL = 'http://127.0.0.1:4000';

    // Helper fetch wrapper
    async function postAdjust(body, token, key = `adj-key-${Date.now()}-${Math.random()}`) {
      const res = await fetch(`${BASE_URL}/api/v1/wallets/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Idempotency-Key': key
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      return { status: res.status, data };
    }

    // Ensure test user has a wallet
    let testWallet = await prisma.wallet.findUnique({ where: { userId: testUser.id } });
    if (!testWallet) {
      testWallet = await prisma.wallet.create({
        data: {
          userId: testUser.id,
          availableBalanceLiquid: 1000,
          totalAllocatedLiquid: 1000
        }
      });
    }

    const initialBal = parseFloat(testWallet.availableBalanceLiquid || 0);
    console.log(`Initial Target Liquid Balance: ₹${initialBal.toLocaleString('en-IN')}`);

    // --- TEST 1: Unauthorized access by non-admin ---
    console.log('\n--- TEST 1: Non-Admin authorization rejection ---');
    const t1 = await postAdjust({
      targetUserId: testUser.id,
      adjustmentType: 'INCREASE',
      amount: 500,
      reason: 'Unauthorized test adjustment'
    }, nonAdminToken);

    if (t1.status === 403) {
      console.log('✅ PASS: Non-admin rejected with HTTP 403 Forbidden.');
    } else {
      throw new Error(`TEST 1 Failed: Expected HTTP 403, got ${t1.status}: ${JSON.stringify(t1.data)}`);
    }

    // --- TEST 2: Missing or short reason rejection ---
    console.log('\n--- TEST 2: Short reason validation ---');
    const t2 = await postAdjust({
      targetUserId: testUser.id,
      adjustmentType: 'INCREASE',
      amount: 500,
      reason: 'Bad'
    }, adminToken);

    if (t2.status === 400 && t2.data.message.includes('minimum 5 characters')) {
      console.log('✅ PASS: Short reason rejected with HTTP 400 validation error.');
    } else {
      throw new Error(`TEST 2 Failed: Expected HTTP 400 validation error, got ${t2.status}: ${JSON.stringify(t2.data)}`);
    }

    // --- TEST 3: Admin increases balance (Top-up via SET_BALANCE) ---
    const targetTopUp = initialBal + 5000;
    console.log(`\n--- TEST 3: Admin increases balance (SET_BALANCE: ₹${initialBal} -> ₹${targetTopUp}) ---`);
    const t3 = await postAdjust({
      targetUserId: testUser.id,
      fundMode: 'LIQUID',
      adjustmentType: 'SET_BALANCE',
      targetBalance: targetTopUp,
      reason: 'CI Test: Quarterly field travel allocation increase'
    }, adminToken);

    if (t3.status === 200 && t3.data.success) {
      console.log(`✅ PASS: Wallet balance increased successfully to ₹${t3.data.data.newBalance}`);
      console.log(`   Delta: +₹${t3.data.data.delta}`);
      console.log(`   Transaction ID: ${t3.data.data.transaction.id}`);

      // Verify wallet in DB
      const dbWallet = await prisma.wallet.findUnique({ where: { userId: testUser.id } });
      if (Math.abs(parseFloat(dbWallet.availableBalanceLiquid) - targetTopUp) > 0.01) {
        throw new Error(`DB verification failed: Expected ₹${targetTopUp}, found ₹${dbWallet.availableBalanceLiquid}`);
      }
      console.log('✅ PASS: Database wallet balance verified.');

      // Verify Journal Entry
      const je = await prisma.journalEntry.findFirst({
        where: { referenceId: t3.data.data.transaction.id },
        include: { lines: true }
      });
      if (!je) throw new Error('Journal entry not found for adjustment transaction!');
      let totalDr = 0, totalCr = 0;
      je.lines.forEach(l => {
        totalDr += parseFloat(l.debit);
        totalCr += parseFloat(l.credit);
      });
      if (Math.abs(totalDr - totalCr) > 0.01 || Math.abs(totalDr - 5000) > 0.01) {
        throw new Error(`Journal mismatch: Dr ${totalDr} vs Cr ${totalCr}`);
      }
      console.log(`✅ PASS: Double-Entry Journal verified (${je.entryNumber}): Dr ₹${totalDr} === Cr ₹${totalCr}`);
    } else {
      throw new Error(`TEST 3 Failed: ${JSON.stringify(t3.data)}`);
    }

    // --- TEST 4: Admin decreases balance (Clawback via DECREASE) ---
    console.log('\n--- TEST 4: Admin decreases balance (DECREASE by ₹2,000) ---');
    const t4 = await postAdjust({
      targetUserId: testUser.id,
      fundMode: 'LIQUID',
      adjustmentType: 'DECREASE',
      amount: 2000,
      reason: 'CI Test: Clawback of unused travel float to Treasury'
    }, adminToken);

    if (t4.status === 200 && t4.data.success) {
      console.log(`✅ PASS: Wallet balance decreased to ₹${t4.data.data.newBalance}`);
      console.log(`   Delta: ₹${t4.data.data.delta}`);

      const expectedAfterClawback = targetTopUp - 2000;
      const dbWallet = await prisma.wallet.findUnique({ where: { userId: testUser.id } });
      if (Math.abs(parseFloat(dbWallet.availableBalanceLiquid) - expectedAfterClawback) > 0.01) {
        throw new Error(`DB verification failed: Expected ₹${expectedAfterClawback}, found ₹${dbWallet.availableBalanceLiquid}`);
      }
      console.log('✅ PASS: Database wallet balance verified after clawback.');
    } else {
      throw new Error(`TEST 4 Failed: ${JSON.stringify(t4.data)}`);
    }

    // --- TEST 5: Negative balance rejection ---
    console.log('\n--- TEST 5: Negative balance prevention ---');
    const t5 = await postAdjust({
      targetUserId: testUser.id,
      fundMode: 'LIQUID',
      adjustmentType: 'DECREASE',
      amount: 99999999, // Way more than available
      reason: 'CI Test: Overdraft attempt'
    }, adminToken);

    if (t5.status === 400 && t5.data.message.includes('exceeds available balance')) {
      console.log('✅ PASS: Overdraft deduction strictly blocked with HTTP 400.');
    } else {
      throw new Error(`TEST 5 Failed: Expected 400 overdraft rejection, got ${t5.status}: ${JSON.stringify(t5.data)}`);
    }

    // --- TEST 6: Zero delta rejection ---
    console.log('\n--- TEST 6: Zero delta rejection ---');
    const currentW = await prisma.wallet.findUnique({ where: { userId: testUser.id } });
    const curBal = parseFloat(currentW.availableBalanceLiquid);
    const t6 = await postAdjust({
      targetUserId: testUser.id,
      fundMode: 'LIQUID',
      adjustmentType: 'SET_BALANCE',
      targetBalance: curBal,
      reason: 'CI Test: No-op adjustment'
    }, adminToken);

    if (t6.status === 400 && t6.data.message.includes('No balance change detected')) {
      console.log('✅ PASS: Zero change detected and rejected.');
    } else {
      throw new Error(`TEST 6 Failed: Expected 400 for identical balance, got ${t6.status}: ${JSON.stringify(t6.data)}`);
    }

    // --- TEST 7: Audit log verification ---
    console.log('\n--- TEST 7: Audit log verification ---');
    const audit = await prisma.auditLog.findFirst({
      where: {
        action: 'WALLET_BALANCE_ADJUST',
        actorId: adminUser.id
      },
      orderBy: { createdAt: 'desc' }
    });

    if (audit) {
      console.log(`✅ PASS: Audit log verified: Action ${audit.action} by ${audit.actorEmail}`);
      console.log(`   New values:`, audit.newValues);
    } else {
      throw new Error('Audit log record not found!');
    }

    console.log('\n🎉 ALL 7 INTEGRATION TESTS PASSED WITH 100% SUCCESS!');

  } catch (err) {
    console.error('\n❌ INTEGRATION TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
