const prisma = require('../src/config/db');

async function getSummaryCounts() {
  const [
    accountsCount,
    journalEntriesCount,
    journalLinesCount,
    customersCount,
    customerPaymentsCount,
    propertiesCount,
    propertyPaymentsCount,
    expensesCount,
    walletTransactionsCount,
    usersCount
  ] = await Promise.all([
    prisma.account.count(),
    prisma.journalEntry.count(),
    prisma.journalLine.count(),
    prisma.customer.count(),
    prisma.customerPayment.count(),
    prisma.propertyAcquisition.count(),
    prisma.propertyPayment.count(),
    prisma.expense.count(),
    prisma.walletTransaction.count(),
    prisma.user.count()
  ]);

  console.log('=== Database Summary Breakdown ===');
  console.log('1. Chart of Accounts Master:', accountsCount);
  console.log('2. Journal Entries (General Ledger):', journalEntriesCount);
  console.log('3. Journal Entry Lines (Debit/Credit records):', journalLinesCount);
  console.log('4. Customer Accounts:', customersCount);
  console.log('5. Customer Payment Records:', customerPaymentsCount);
  console.log('6. Land Property Parcels:', propertiesCount);
  console.log('7. Land Owner Payment Records:', propertyPaymentsCount);
  console.log('8. Staff Expenses Submitted:', expensesCount);
  console.log('9. Total Wallet Cash Flow Transactions:', walletTransactionsCount);
  console.log('10. Total Registered Users / Staff:', usersCount);

  process.exit(0);
}

getSummaryCounts().catch(err => {
  console.error(err);
  process.exit(1);
});
