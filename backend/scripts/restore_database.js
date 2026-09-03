require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Prisma } = require('@prisma/client');
const prisma = require('../src/config/db');

async function restoreDatabase(targetDir = null) {
  console.log('====================================================');
  console.log('      EstateSync Database Restore Utility');
  console.log('====================================================\n');

  const backupDir = targetDir || path.join(__dirname, '..', 'backups', 'latest');

  if (!fs.existsSync(backupDir)) {
    console.error(`Backup directory not found: ${backupDir}`);
    process.exit(1);
  }

  const fullJsonPath = path.join(backupDir, 'estatesync_full_backup.json');
  if (!fs.existsSync(fullJsonPath)) {
    console.error(`Full backup JSON file not found at: ${fullJsonPath}`);
    process.exit(1);
  }

  console.log(`Reading backup from: ${backupDir}`);
  const backupData = JSON.parse(fs.readFileSync(fullJsonPath, 'utf8'));

  // Define restore dependency order (independent tables first, foreign keys later)
  const orderedModels = [
    'Role',
    'Permission',
    'RolePermission',
    'ExpenseCategory',
    'Account',
    'AccountingPeriod',
    'User',
    'Wallet',
    'PaymentPlan',
    'PaymentPlanMilestone',
    'Customer',
    'PropertyAcquisition',
    'Employee',
    'SalaryComponent',
    'SalaryStructure',
    'SalaryStructureLine',
    'EmployeeSalaryAssignment',
    'PayrollPeriod',
    'PayrollRun',
    'PayrollItem',
    'PayrollLine',
    'SalaryPaymentBatch',
    'SalaryPayment',
    'CustomerPayment',
    'CustomerDemandNote',
    'CustomerLedgerEntry',
    'PaymentAllocation',
    'PropertyPayment',
    'FundRequest',
    'Expense',
    'WalletTransaction',
    'GlobalBankReference',
    'JournalEntry',
    'JournalLine',
    'AuditLog',
    'IdempotencyKey'
  ];

  console.log(`Starting restoration across ${orderedModels.length} models in dependency order...\n`);

  let totalRestored = 0;

  for (const modelName of orderedModels) {
    const records = backupData[modelName];
    if (!records || records.length === 0) continue;

    const accessor = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    let restoredCount = 0;

    for (const record of records) {
      try {
        await prisma[accessor].upsert({
          where: { id: record.id },
          update: record,
          create: record
        });
        restoredCount++;
      } catch (err) {
        // Fallback for tables where id is not primary key or schema differences
        try {
          await prisma[accessor].create({ data: record });
          restoredCount++;
        } catch (innerErr) {
          // Ignore duplicates
        }
      }
    }

    totalRestored += restoredCount;
    console.log(`✔ [${modelName.padEnd(28)}] : Restored ${restoredCount}/${records.length} records`);
  }

  console.log('\n====================================================');
  console.log('✔ DATABASE RESTORE COMPLETED SUCCESSFULLY!');
  console.log(`Total Records Restored: ${totalRestored}`);
  console.log('====================================================\n');
}

if (require.main === module) {
  const customPath = process.argv[2] || null;
  restoreDatabase(customPath)
    .catch((err) => {
      console.error('Database restore failed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

module.exports = { restoreDatabase };
