const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    include: {
      role: true,
      wallet: true,
      expenses: true
    }
  });

  console.log('=== ALL USERS & WALLETS IN DATABASE ===');
  users.forEach(u => {
    console.log(`User: ${u.name} (${u.role.name}, ${u.email})`);
    console.log(`  Wallet: ID=${u.wallet?.id}`);
    console.log(`    Total Allocated: ₹${u.wallet?.totalAllocated}`);
    console.log(`    Available Balance: ₹${u.wallet?.availableBalance}`);
    console.log(`    Total Spent (Wallet field): ₹${u.wallet?.totalSpent}`);
    console.log(`    Recorded Expenses count: ${u.expenses.length}`);
  });

  const totalWallets = await prisma.wallet.aggregate({
    _sum: {
      totalAllocated: true,
      availableBalance: true,
      totalSpent: true
    }
  });
  console.log('\n=== WALLETS AGGREGATE ===');
  console.log(totalWallets._sum);

  const totalExpenses = await prisma.expense.aggregate({
    _sum: { amount: true },
    _count: { id: true }
  });
  console.log('\n=== EXPENSES AGGREGATE ===');
  console.log(totalExpenses);
}

check().then(() => prisma.$disconnect());
