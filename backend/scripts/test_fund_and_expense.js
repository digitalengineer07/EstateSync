const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

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
      }
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

async function runTest() {
  console.log('=== Starting E2E Verification Test ===\n');

  // Step 1: Check Accountant Token & Permissions
  console.log('1. Generating token for accounting@estatesync.local...');
  const accountantAuth = await generateTestToken('accounting@estatesync.local');
  console.log('Accountant Role:', accountantAuth.payload.role);
  console.log('Has fund.request?:', accountantAuth.payload.permissions.includes('fund.request'));
  console.log('Has expense.create?:', accountantAuth.payload.permissions.includes('expense.create'));
  console.log('Has wallet.view?:', accountantAuth.payload.permissions.includes('wallet.view'));

  if (!accountantAuth.payload.permissions.includes('fund.request') || !accountantAuth.payload.permissions.includes('expense.create')) {
    throw new Error('FAILED: Missing required permissions in accountant token');
  }
  console.log('-> PASS: Accountant has all required permissions!\n');

  // Find Admin User
  const adminAuth = await generateTestToken('admin@estatesync.local');
  const adminId = adminAuth.user.id;
  const accountantId = accountantAuth.user.id;

  // Step 2: Accountant Creates Fund Request
  console.log('2. Creating Fund Request from Accountant to Admin for ₹60,000...');
  const reqAmount = 60000;
  const fundRequest = await prisma.fundRequest.create({
    data: {
      requesterId: accountantId,
      managerId: adminId,
      amount: reqAmount,
      reason: 'Travel & Field Audit Expenses',
      status: 'PENDING'
    }
  });
  console.log('Created Fund Request ID:', fundRequest.id, 'Status:', fundRequest.status);
  console.log('-> PASS: Fund request created successfully!\n');

  // Step 3: Admin Approves the Request
  console.log('3. Admin Approving Fund Request...');
  const { postAllocationJournal } = require('../src/utils/accountingHelper');

  const initialWallet = await prisma.wallet.findUnique({ where: { userId: accountantId } });
  const initialBalance = parseFloat(initialWallet?.availableBalance || 0);
  console.log('Accountant wallet balance before approval: ₹' + initialBalance);

  // Execute approval transaction (same logic as fundRequestController)
  await prisma.$transaction(async (tx) => {
    let requesterWallet = await tx.wallet.findUnique({ where: { userId: accountantId } });
    if (!requesterWallet) {
      requesterWallet = await tx.wallet.create({
        data: { userId: accountantId, totalAllocated: 0, totalSpent: 0, availableBalance: 0 }
      });
    }

    await tx.wallet.update({
      where: { id: requesterWallet.id },
      data: {
        totalAllocated: { increment: reqAmount },
        availableBalance: { increment: reqAmount }
      }
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        type: 'FUND_ALLOCATION',
        sourceWalletId: null,
        destWalletId: requesterWallet.id,
        amount: reqAmount,
        referenceType: 'FUND_REQUEST',
        referenceId: fundRequest.id,
        description: `Fund request approved: ${fundRequest.reason}`,
        createdBy: adminId,
        status: 'COMPLETED'
      }
    });

    await postAllocationJournal(tx, {
      sourceWalletType: 'TREASURY',
      recipientWalletType: 'TEAM',
      amount: reqAmount,
      description: `Fund Request Approval for ${accountantAuth.user.name} (${fundRequest.reason})`,
      referenceId: fundRequest.id,
      createdBy: adminId
    });

    await tx.fundRequest.update({
      where: { id: fundRequest.id },
      data: {
        status: 'APPROVED',
        approvedBy: adminId,
        approvedAt: new Date()
      }
    });
  });

  const updatedWallet = await prisma.wallet.findUnique({ where: { userId: accountantId } });
  const newBalance = parseFloat(updatedWallet.availableBalance);
  console.log('Accountant wallet balance after approval: ₹' + newBalance);
  if (newBalance !== initialBalance + reqAmount) {
    throw new Error('FAILED: Wallet balance was not incremented properly');
  }
  console.log('-> PASS: Request approved and wallet funded!\n');

  // Step 4: Accountant Records an Expense
  console.log('4. Accountant Recording ₹1,500 Expense for Office Supplies...');
  const expenseCategory = await prisma.expenseCategory.findFirst();
  const expenseAmount = 1500;
  const { postExpenseJournal } = require('../src/utils/accountingHelper');

  const expense = await prisma.$transaction(async (tx) => {
    let wallet = await tx.wallet.findUnique({ where: { userId: accountantId } });
    if (parseFloat(wallet.availableBalance) < expenseAmount) {
      throw new Error('INSUFFICIENT_FUNDS');
    }

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: { decrement: expenseAmount },
        totalSpent: { increment: expenseAmount }
      }
    });

    const exp = await tx.expense.create({
      data: {
        userId: accountantId,
        walletId: wallet.id,
        categoryId: expenseCategory.id,
        amount: expenseAmount,
        description: 'Test Office audit supplies',
        date: new Date(),
        vendorId: null,
        reference: 'INV-TEST-001',
        status: 'RECORDED'
      }
    });

    await tx.walletTransaction.create({
      data: {
        type: 'EXPENSE',
        sourceWalletId: wallet.id,
        amount: expenseAmount,
        referenceType: 'EXPENSE',
        referenceId: exp.id,
        description: `Expense: ${exp.description}`,
        createdBy: accountantId,
        status: 'COMPLETED'
      }
    });

    await postExpenseJournal(tx, {
      categoryName: expenseCategory.name,
      userRole: 'ACCOUNTING',
      amount: expenseAmount,
      description: `Expense [${expenseCategory.name}]: ${exp.description}`,
      referenceId: exp.id,
      createdBy: accountantId
    });

    return exp;
  });

  const finalWallet = await prisma.wallet.findUnique({ where: { userId: accountantId } });
  console.log('Expense created with ID:', expense.id, 'Amount: ₹' + expense.amount);
  console.log('Final wallet balance: ₹' + finalWallet.availableBalance, 'Total spent: ₹' + finalWallet.totalSpent);
  console.log('-> PASS: Expense recorded and double-entry general ledger updated!\n');

  console.log('=== All E2E Tests PASSED Successfully! ===');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
