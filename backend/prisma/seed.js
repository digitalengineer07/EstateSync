const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data...');

  // 1. Create Roles
  const roles = ['ADMIN', 'MANAGER', 'SALES', 'MARKETING', 'ACCOUNTING', 'OTHER'];
  const createdRoles = {};
  for (const roleName of roles) {
    createdRoles[roleName] = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, description: `${roleName} Role` },
    });
  }

  // 2. Create Permissions
  const permissions = [
    'fund.view', 'fund.allocate', 'fund.request', 'fund.approve', 'fund.reject',
    'wallet.view', 'wallet.view_all', 'expense.create', 'expense.view',
    'expense.view_all', 'expense.approve', 'expense.reverse',
    'transaction.view', 'transaction.view_all', 'accounting.view',
    'report.view', 'audit.view', 'user.manage'
  ];
  
  const createdPerms = {};
  for (const permCode of permissions) {
    createdPerms[permCode] = await prisma.permission.upsert({
      where: { code: permCode },
      update: {},
      create: { code: permCode, description: `Permission for ${permCode}` },
    });
  }

  // 3. Assign Permissions to Roles (Basic mapping)
  // Admin gets all permissions
  for (const permCode of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: createdRoles['ADMIN'].id,
          permissionId: createdPerms[permCode].id
        }
      },
      update: {},
      create: {
        roleId: createdRoles['ADMIN'].id,
        permissionId: createdPerms[permCode].id
      }
    });
  }
  
  // Sales gets own wallet/expense perms
  const salesPerms = ['wallet.view', 'expense.create', 'expense.view', 'transaction.view', 'fund.request'];
  for (const permCode of salesPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: createdRoles['SALES'].id,
          permissionId: createdPerms[permCode].id
        }
      },
      update: {},
      create: {
        roleId: createdRoles['SALES'].id,
        permissionId: createdPerms[permCode].id
      }
    });
  }

  // 4. Create Users
  const passwordHash = await bcrypt.hash('password123', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@estatesync.local' },
    update: {},
    create: {
      email: 'admin@estatesync.local',
      passwordHash,
      name: 'System Admin',
      roleId: createdRoles['ADMIN'].id,
    },
  });

  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@estatesync.local' },
    update: {},
    create: {
      email: 'sales@estatesync.local',
      passwordHash,
      name: 'Sales Rep 1',
      roleId: createdRoles['SALES'].id,
    },
  });

  console.log('Seeding finished.');
  console.log('Admin user: admin@estatesync.local / password123');
  console.log('Sales user: sales@estatesync.local / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
