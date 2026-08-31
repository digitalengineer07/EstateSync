const prisma = require('../config/db');

/**
 * Returns the Primary Corporate Treasury Admin User
 */
async function getPrimaryTreasuryAdmin(tx = prisma) {
  let admin = await tx.user.findUnique({
    where: { email: 'admin@estatesync.local' },
    include: { wallet: true }
  });

  if (!admin) {
    admin = await tx.user.findFirst({
      where: { role: { name: 'ADMIN' } },
      include: { wallet: true }
    });
  }

  return admin;
}

/**
 * Returns the Single Source of Truth Corporate Treasury Wallet
 */
async function getPrimaryTreasuryWallet(tx = prisma) {
  const admin = await getPrimaryTreasuryAdmin(tx);
  if (!admin) {
    throw new Error('No Master Admin Account found to link Corporate Treasury.');
  }

  let wallet = admin.wallet;
  if (!wallet) {
    wallet = await tx.wallet.create({
      data: {
        userId: admin.id,
        availableBalanceLiquid: 0,
        availableBalanceCash: 0,
        totalAllocatedLiquid: 0,
        totalAllocatedCash: 0,
        totalSpentLiquid: 0,
        totalSpentCash: 0
      }
    });
  }

  return wallet;
}

module.exports = {
  getPrimaryTreasuryAdmin,
  getPrimaryTreasuryWallet
};
