const prisma = require('../src/config/db');
const { updatePayment } = require('../src/controller/customerController');
const { getPrimaryTreasuryAdmin } = require('../src/utils/treasuryHelper');

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

async function runTests() {
  console.log('--- STARTING CUSTOMER PAYMENT AMOUNT EDIT & RECONCILIATION TESTS ---');

  // 1. Fetch Admin and an Accounting User
  const adminUser = await prisma.user.findFirst({
    where: { email: 'admin@estatesync.local' },
    include: { wallet: true }
  });
  if (!adminUser) throw new Error('Admin user not found');

  let accountantUser = await prisma.user.findFirst({
    where: { role: { name: 'ACCOUNTING' } }
  });
  if (!accountantUser) {
    accountantUser = {
      id: 'mock-accountant-id',
      userId: 'mock-accountant-id',
      email: 'accountant@estatesync.local',
      role: 'ACCOUNTING'
    };
  } else {
    accountantUser.userId = accountantUser.id;
    accountantUser.role = 'ACCOUNTING';
  }

  adminUser.userId = adminUser.id;
  adminUser.role = 'ADMIN';

  // 2. Fetch a Customer with payments
  const customer = await prisma.customer.findFirst({
    where: { customerName: { contains: 'Pushpa', mode: 'insensitive' } },
    include: { payments: true }
  });
  if (!customer || !customer.payments.length) {
    throw new Error('Test customer Pushpa Kumari or payments not found');
  }

  const targetPayment = customer.payments[0];
  const originalAmount = parseFloat(targetPayment.amount);
  console.log(`Target Customer: ${customer.customerName}, Plot: ${customer.plotNo}`);
  console.log(`Target Payment ID: ${targetPayment.id}, Original Amount: ₹${originalAmount}`);
  console.log(`Customer Initial Total Paid: ₹${customer.totalPaid}, Balance Due: ₹${customer.balanceDue}`);

  // TEST 1: Accountant attempting to change payment amount -> Must be blocked with 403
  console.log('\n[TEST 1] Non-Admin (Accountant) attempts to change payment amount...');
  {
    const req = {
      user: accountantUser,
      params: { paymentId: targetPayment.id },
      body: {
        amount: originalAmount + 5000,
        reason: 'Accountant trying to change amount directly'
      }
    };
    const res = createMockRes();
    await updatePayment(req, res);

    if (res.statusCode === 403) {
      console.log('✔ PASSED: Non-admin was blocked with HTTP 403: ' + res.body.message);
    } else {
      throw new Error(`TEST 1 FAILED: Expected status 403, got ${res.statusCode}: ${JSON.stringify(res.body)}`);
    }
  }

  // TEST 2: Admin changing amount without proper reason (< 10 chars) -> Must be blocked with 400
  console.log('\n[TEST 2] Admin attempts to change amount without a reason (< 10 chars)...');
  {
    const req = {
      user: adminUser,
      params: { paymentId: targetPayment.id },
      body: {
        amount: originalAmount + 5000,
        reason: 'Too short'
      }
    };
    const res = createMockRes();
    await updatePayment(req, res);

    if (res.statusCode === 400 && res.body.message.includes('mandatory justification reason')) {
      console.log('✔ PASSED: Blocked with HTTP 400: ' + res.body.message);
    } else {
      throw new Error(`TEST 2 FAILED: Expected 400 for short reason, got ${res.statusCode}: ${JSON.stringify(res.body)}`);
    }
  }

  // TEST 3: Admin changing amount to negative or 0 -> Must be blocked with 400
  console.log('\n[TEST 3] Admin attempts to enter non-positive amount...');
  {
    const req = {
      user: adminUser,
      params: { paymentId: targetPayment.id },
      body: {
        amount: -1000,
        reason: 'Entering negative value for test'
      }
    };
    const res = createMockRes();
    await updatePayment(req, res);

    if (res.statusCode === 400 && res.body.message.includes('positive number')) {
      console.log('✔ PASSED: Blocked with HTTP 400: ' + res.body.message);
    } else {
      throw new Error(`TEST 3 FAILED: Expected 400 for negative amount, got ${res.statusCode}: ${JSON.stringify(res.body)}`);
    }
  }

  // TEST 4: Admin increasing payment amount by +₹10,000 (Upward correction)
  console.log('\n[TEST 4] Admin increases payment amount by +₹10,000...');
  const increasedAmount = originalAmount + 10000;
  const initialWallet = await prisma.wallet.findUnique({ where: { id: adminUser.wallet.id } });
  const initialCust = await prisma.customer.findUnique({ where: { id: customer.id } });

  {
    const req = {
      user: adminUser,
      params: { paymentId: targetPayment.id },
      body: {
        amount: increasedAmount,
        reason: 'Correction of under-recorded cash/bank receipt for plot booking advance'
      }
    };
    const res = createMockRes();
    await updatePayment(req, res);

    if (res.statusCode !== 200) {
      throw new Error(`TEST 4 FAILED: Expected 200, got ${res.statusCode}: ${JSON.stringify(res.body)}`);
    }
    console.log('✔ Response message: ' + res.body.message);

    // Verify Customer Balances
    const afterCust = await prisma.customer.findUnique({ where: { id: customer.id } });
    const expectedPaid = parseFloat(initialCust.totalPaid) + 10000;
    const expectedDue = parseFloat(initialCust.balanceDue) - 10000;
    if (Math.abs(parseFloat(afterCust.totalPaid) - expectedPaid) > 0.01) {
      throw new Error(`Customer totalPaid mismatch: expected ${expectedPaid}, got ${afterCust.totalPaid}`);
    }
    if (Math.abs(parseFloat(afterCust.balanceDue) - expectedDue) > 0.01) {
      throw new Error(`Customer balanceDue mismatch: expected ${expectedDue}, got ${afterCust.balanceDue}`);
    }
    console.log(`✔ Customer totalPaid correctly updated to ₹${afterCust.totalPaid}, balanceDue to ₹${afterCust.balanceDue}`);

    // Verify Treasury Wallet
    const fMode = targetPayment.paymentMode === 'CASH' ? 'CASH' : 'LIQUID';
    const balanceField = fMode === 'CASH' ? 'availableBalanceCash' : 'availableBalanceLiquid';
    const afterWallet = await prisma.wallet.findUnique({ where: { id: adminUser.wallet.id } });
    const expectedWalletBalance = parseFloat(initialWallet[balanceField]) + 10000;
    if (Math.abs(parseFloat(afterWallet[balanceField]) - expectedWalletBalance) > 0.01) {
      throw new Error(`Wallet balance mismatch: expected ${expectedWalletBalance}, got ${afterWallet[balanceField]}`);
    }
    console.log(`✔ Treasury Wallet balance correctly incremented by +₹10,000 (New balance: ₹${afterWallet[balanceField]})`);

    // Verify General Ledger Journal Entry
    const journal = await prisma.journalEntry.findFirst({
      where: { 
        referenceId: targetPayment.id,
        referenceType: 'CUSTOMER_PAYMENT_ADJUSTMENT'
      },
      orderBy: { createdAt: 'desc' },
      include: { lines: { include: { account: true } } }
    });
    if (!journal || journal.lines.length !== 2) {
      throw new Error('Double entry journal not found or incomplete');
    }
    console.log(`✔ General Ledger Journal Entry verified: ID ${journal.id}, Type: ${journal.entryType}`);
    journal.lines.forEach(l => {
      console.log(`   - Account ${l.account.code} (${l.account.name}): Debit: ₹${l.debit}, Credit: ₹${l.credit}`);
    });
  }

  // TEST 5: Admin decreasing payment amount back by -₹10,000 (Downward correction / Clawback)
  console.log('\n[TEST 5] Admin decreases payment amount back to original amount (Downward correction / Clawback)...');
  {
    const req = {
      user: adminUser,
      params: { paymentId: targetPayment.id },
      body: {
        amount: originalAmount,
        reason: 'Reverting test adjustment back to verified bank statement value'
      }
    };
    const res = createMockRes();
    await updatePayment(req, res);

    if (res.statusCode !== 200) {
      throw new Error(`TEST 5 FAILED: Expected 200, got ${res.statusCode}: ${JSON.stringify(res.body)}`);
    }
    console.log('✔ Response message: ' + res.body.message);

    // Verify Customer Balances reverted
    const revertedCust = await prisma.customer.findUnique({ where: { id: customer.id } });
    if (Math.abs(parseFloat(revertedCust.totalPaid) - parseFloat(initialCust.totalPaid)) > 0.01) {
      throw new Error(`Customer totalPaid did not revert cleanly: expected ${initialCust.totalPaid}, got ${revertedCust.totalPaid}`);
    }
    console.log(`✔ Customer totalPaid reverted to ₹${revertedCust.totalPaid}, balanceDue to ₹${revertedCust.balanceDue}`);

    // Verify Treasury Wallet reverted
    const fMode = targetPayment.paymentMode === 'CASH' ? 'CASH' : 'LIQUID';
    const balanceField = fMode === 'CASH' ? 'availableBalanceCash' : 'availableBalanceLiquid';
    const revertedWallet = await prisma.wallet.findUnique({ where: { id: adminUser.wallet.id } });
    if (Math.abs(parseFloat(revertedWallet[balanceField]) - parseFloat(initialWallet[balanceField])) > 0.01) {
      throw new Error(`Wallet balance did not revert cleanly: expected ${initialWallet[balanceField]}, got ${revertedWallet[balanceField]}`);
    }
    console.log(`✔ Treasury Wallet balance reverted to ₹${revertedWallet[balanceField]}`);
  }

  // TEST 6: Non-Admin can still update metadata (e.g. sourceAccount or referenceNo) without error
  console.log('\n[TEST 6] Non-Admin (Accountant) updates payment metadata (sourceAccount) without modifying amount...');
  {
    const req = {
      user: accountantUser,
      params: { paymentId: targetPayment.id },
      body: {
        sourceAccount: 'SBI Customer Verified Bank Account'
      }
    };
    const res = createMockRes();
    await updatePayment(req, res);

    if (res.statusCode === 200) {
      console.log('✔ PASSED: Accountant successfully updated metadata: ' + res.body.message);
    } else {
      throw new Error(`TEST 6 FAILED: Expected 200, got ${res.statusCode}: ${JSON.stringify(res.body)}`);
    }
  }

  console.log('\n======================================================');
  console.log('ALL TESTS COMPLETED SUCCESSFULLY! SYSTEM INTEGRITY VERIFIED.');
  console.log('======================================================');
}

runTests()
  .catch(err => {
    console.error('\n❌ TEST RUN FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
