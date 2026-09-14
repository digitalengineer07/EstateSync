const prisma = require('../src/config/db');
const bcrypt = require('bcrypt');
const { ensureStandardAccounts } = require('../src/utils/accountingHelper');
const { ensureAccountingPeriods } = require('../src/services/accountingPeriodService');

async function resetAndSeedPristineDatabase() {
  console.log('=== STARTING DATABASE RESET & PRISTINE SEEDING ===\n');

  // STEP 1: Clear all transactional and business data in foreign-key safe order
  console.log('1. Clearing business and transactional tables...');
  
  // A. Customer & Milestone Billing tables
  await prisma.paymentAllocation.deleteMany({});
  console.log('   ✔ Cleared PaymentAllocation');

  await prisma.customerPayment.deleteMany({});
  console.log('   ✔ Cleared CustomerPayment');

  await prisma.customerLedgerEntry.deleteMany({});
  console.log('   ✔ Cleared CustomerLedgerEntry');

  await prisma.customerDemandNote.deleteMany({});
  console.log('   ✔ Cleared CustomerDemandNote');

  await prisma.paymentPlanMilestone.deleteMany({});
  console.log('   ✔ Cleared PaymentPlanMilestone');

  await prisma.paymentPlan.deleteMany({});
  console.log('   ✔ Cleared PaymentPlan');

  await prisma.customer.deleteMany({});
  console.log('   ✔ Cleared Customer');

  // B. Property Acquisition & Payout tables
  await prisma.propertyPayment.deleteMany({});
  console.log('   ✔ Cleared PropertyPayment');

  await prisma.propertyAcquisition.deleteMany({});
  console.log('   ✔ Cleared PropertyAcquisition');

  // C. Expense & Fund Request tables
  await prisma.expense.deleteMany({});
  console.log('   ✔ Cleared Expense');

  await prisma.fundRequest.deleteMany({});
  console.log('   ✔ Cleared FundRequest');

  // D. Banking & Reference tables
  await prisma.globalBankReference.deleteMany({});
  console.log('   ✔ Cleared GlobalBankReference');

  // E. Payroll & Employee tables
  await prisma.payrollItem.deleteMany({});
  await prisma.payrollLine.deleteMany({});
  await prisma.payrollAdjustment.deleteMany({});
  await prisma.payrollException.deleteMany({});
  await prisma.payrollAccountingPosting.deleteMany({});
  await prisma.payrollRun.deleteMany({});
  await prisma.payrollPeriod.deleteMany({});
  await prisma.salaryPayment.deleteMany({});
  await prisma.salaryPaymentBatch.deleteMany({});
  await prisma.employeeSalaryAssignment.deleteMany({});
  await prisma.salaryStructureLine.deleteMany({});
  await prisma.salaryStructure.deleteMany({});
  await prisma.salaryComponent.deleteMany({});
  await prisma.employee.deleteMany({});
  console.log('   ✔ Cleared Payroll & Employee records');

  // F. General Ledger tables
  await prisma.journalLine.deleteMany({});
  console.log('   ✔ Cleared JournalLine');

  await prisma.journalEntry.deleteMany({});
  console.log('   ✔ Cleared JournalEntry');

  // G. Wallet Transactions, Idempotency & Audit Logs
  await prisma.walletTransaction.deleteMany({});
  console.log('   ✔ Cleared WalletTransaction');

  await prisma.idempotencyKey.deleteMany({});
  console.log('   ✔ Cleared IdempotencyKey');

  await prisma.auditLog.deleteMany({});
  console.log('   ✔ Cleared AuditLog');

  // STEP 2: Reset all User Wallets to ₹0
  console.log('\n2. Resetting User Wallets to ₹0 balances...');
  await prisma.wallet.updateMany({
    data: {
      availableBalanceLiquid: 0,
      availableBalanceCash: 0,
      totalAllocatedLiquid: 0,
      totalAllocatedCash: 0,
      totalSpentLiquid: 0,
      totalSpentCash: 0
    }
  });
  console.log('   ✔ All user wallets reset to zero.');

  // STEP 3: Ensure all standard roles exist
  console.log('\n3. Ensuring standard roles...');
  const roleNames = ['ADMIN', 'MANAGER', 'SALES', 'MARKETING', 'ACCOUNTING', 'OTHER'];
  const roleMap = {};
  for (const name of roleNames) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} System Role` }
    });
    roleMap[name] = role;
  }
  console.log(`   ✔ 6 standard roles verified: ${roleNames.join(', ')}`);

  // STEP 4: Ensure all 33 permissions exist
  console.log('\n4. Ensuring all 33 system permissions...');
  const allPermissions = [
    'fund.view', 'fund.allocate', 'fund.request', 'fund.approve', 'fund.reject',
    'wallet.view', 'wallet.view_all', 'expense.create', 'expense.view',
    'expense.view_all', 'expense.approve', 'expense.reverse', 'expense.view_team',
    'transaction.view', 'transaction.view_all', 'accounting.view',
    'report.view', 'report.view_team', 'audit.view', 'user.manage',
    'customer.create', 'customer.view', 'customer.view_all', 'customer.edit',
    'customer.payment.record', 'customer.payment.view',
    'property.create', 'property.view_all', 'property.edit',
    'property.payment.record', 'property.payment.view',
    'employee.view', 'employee.create', 'employee.update', 'employee.archive'
  ];

  const permMap = {};
  for (const code of allPermissions) {
    const perm = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: `Permission for ${code}` }
    });
    permMap[code] = perm;
  }
  console.log(`   ✔ ${allPermissions.length} permissions verified.`);

  // STEP 5: Assign Full Role Permissions (Zero Access Denied Guarantee)
  console.log('\n5. Mapping permissions to roles...');
  const baseEmployeePerms = [
    'wallet.view', 'expense.create', 'expense.view', 'transaction.view', 'fund.request', 'fund.view'
  ];

  const roleDefinitions = {
    ADMIN: allPermissions, // 100% of all permissions
    ACCOUNTING: [
      ...baseEmployeePerms,
      'wallet.view_all', 'expense.view_all', 'expense.approve', 'expense.reverse',
      'transaction.view_all', 'accounting.view', 'report.view',
      'customer.view', 'customer.view_all', 'customer.edit',
      'customer.payment.record', 'customer.payment.view',
      'property.create', 'property.view_all', 'property.edit',
      'property.payment.record', 'property.payment.view',
      'employee.view', 'employee.create', 'employee.update'
    ],
    MANAGER: [
      ...baseEmployeePerms,
      'customer.create', 'customer.view', 'customer.view_all', 'customer.edit', 'customer.payment.view',
      'expense.view_team', 'fund.approve', 'fund.reject', 'report.view_team',
      'employee.view'
    ],
    SALES: [
      ...baseEmployeePerms,
      'customer.create', 'customer.view', 'customer.edit', 'customer.payment.view'
    ],
    MARKETING: [
      ...baseEmployeePerms,
      'customer.create', 'customer.view', 'customer.edit', 'customer.payment.view'
    ],
    OTHER: baseEmployeePerms
  };

  const rolePermEntries = [];
  for (const [roleName, perms] of Object.entries(roleDefinitions)) {
    const role = roleMap[roleName];
    if (!role) continue;
    for (const code of perms) {
      const perm = permMap[code];
      if (perm) {
        rolePermEntries.push({ roleId: role.id, permissionId: perm.id });
      }
    }
  }

  await prisma.rolePermission.createMany({
    data: rolePermEntries,
    skipDuplicates: true
  });
  console.log(`   ✔ Created/Verified ${rolePermEntries.length} role-permission mappings.`);

  // STEP 6: Ensure Standard System Users
  console.log('\n6. Ensuring standard system users...');
  const passwordHash = await bcrypt.hash('password123', 10);
  const defaultUsers = [
    { email: 'admin@estatesync.local', name: 'System Admin', roleName: 'ADMIN' },
    { email: 'accounting@estatesync.local', name: 'Accounting Officer', roleName: 'ACCOUNTING' },
    { email: 'sales@estatesync.local', name: 'Sales Representative', roleName: 'SALES' },
    { email: 'manager@estatesync.local', name: 'Operations Manager', roleName: 'MANAGER' },
    { email: 'marketing@estatesync.local', name: 'Marketing Officer', roleName: 'MARKETING' },
    { email: 'other@estatesync.local', name: 'General Staff', roleName: 'OTHER' }
  ];

  for (const u of defaultUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        roleId: roleMap[u.roleName].id,
        passwordHash
      },
      create: {
        email: u.email,
        name: u.name,
        passwordHash,
        roleId: roleMap[u.roleName].id
      }
    });

    // Ensure wallet exists
    const existingWallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!existingWallet) {
      await prisma.wallet.create({
        data: {
          userId: user.id,
          availableBalanceLiquid: 0,
          availableBalanceCash: 0,
          totalAllocatedLiquid: 0,
          totalAllocatedCash: 0,
          totalSpentLiquid: 0,
          totalSpentCash: 0
        }
      });
    }
  }
  console.log(`   ✔ 6 standard login users active (Password: password123).`);

  // STEP 7: Ensure Standard Chart of Accounts
  console.log('\n7. Seeding standard Chart of Accounts (1010 to 5070)...');
  await ensureStandardAccounts(prisma);
  const totalAccounts = await prisma.account.count();
  console.log(`   ✔ ${totalAccounts} Chart of Accounts verified in database.`);

  // STEP 8: Ensure Open Accounting Periods (2024 to 2028)
  console.log('\n8. Ensuring open Accounting Periods (2024 to 2028)...');
  await ensureAccountingPeriods(prisma, { startYear: 2024, endYear: 2028 });
  const openPeriods = await prisma.accountingPeriod.count({ where: { status: 'OPEN' } });
  console.log(`   ✔ ${openPeriods} open accounting periods verified.`);

  // STEP 9: Ensure Standard Expense Categories
  console.log('\n9. Ensuring Expense Categories...');
  const categories = [
    { name: 'Travel', description: 'Flights, cabs, fuel, and transit' },
    { name: 'Meals', description: 'Client dinners and staff refreshments' },
    { name: 'Software', description: 'ERP, SaaS subscriptions, and cloud licenses' },
    { name: 'Office Supplies', description: 'Stationery and minor equipment' },
    { name: 'Operations', description: 'General operational overheads' }
  ];
  for (const cat of categories) {
    await prisma.expenseCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat
    });
  }
  console.log(`   ✔ ${categories.length} standard expense categories verified.`);

  console.log('\n======================================================');
  console.log('PRISTINE DATABASE RESET & SEEDING COMPLETED SUCCESSFULLY!');
  console.log('======================================================\n');
}

resetAndSeedPristineDatabase()
  .catch(err => {
    console.error('❌ Reset failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
