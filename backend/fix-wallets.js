const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixWallets() {
  console.log('Finding users without wallets...');
  const users = await prisma.user.findMany({
    include: { wallet: true }
  });

  let createdCount = 0;
  for (const user of users) {
    if (!user.wallet) {
      await prisma.wallet.create({
        data: {
          userId: user.id,
          totalAllocated: 0,
          totalSpent: 0,
          availableBalance: 0
        }
      });
      createdCount++;
      console.log(`Created wallet for user: ${user.email}`);
    }
  }

  console.log(`Done. Created ${createdCount} missing wallets.`);
}

fixWallets()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
