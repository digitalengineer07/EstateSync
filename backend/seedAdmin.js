const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding admin user...');

  // 1. Create ADMIN role
  const role = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'System Administrator'
    }
  });

  // 2. Hash password
  const passwordHash = await bcrypt.hash('admin123', 10);

  // 3. Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@estatesync.com' },
    update: {
      passwordHash: passwordHash
    },
    create: {
      email: 'admin@estatesync.com',
      name: 'System Admin',
      passwordHash: passwordHash,
      roleId: role.id
    }
  });

  // 4. Create Wallet if not exists
  await prisma.wallet.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      availableBalance: 0,
      totalAllocated: 0,
      totalSpent: 0
    }
  });

  console.log('Admin user created successfully:');
  console.log('Email:', admin.email);
  console.log('Password: admin123');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
