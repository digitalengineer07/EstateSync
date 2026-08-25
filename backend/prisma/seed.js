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

  // Manager gets team perms and approval perms
  const managerPerms = [...salesPerms, 'expense.view_team', 'fund.approve', 'report.view_team'];
  for (const permCode of managerPerms) {
    if (createdPerms[permCode]) { // only if it exists in seed
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: createdRoles['MANAGER'].id,
            permissionId: createdPerms[permCode].id
          }
        },
        update: {},
        create: {
          roleId: createdRoles['MANAGER'].id,
          permissionId: createdPerms[permCode].id
        }
      });
    }
  }

  // Marketing gets same as sales
  for (const permCode of salesPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: createdRoles['MARKETING'].id,
          permissionId: createdPerms[permCode].id
        }
      },
      update: {},
      create: {
        roleId: createdRoles['MARKETING'].id,
        permissionId: createdPerms[permCode].id
      }
    });
  }

  // Accounting gets global view and approval
  const accountingPerms = ['wallet.view_all', 'expense.view_all', 'expense.approve', 'transaction.view_all', 'accounting.view', 'report.view'];
  for (const permCode of accountingPerms) {
    if (createdPerms[permCode]) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: createdRoles['ACCOUNTING'].id,
            permissionId: createdPerms[permCode].id
          }
        },
        update: {},
        create: {
          roleId: createdRoles['ACCOUNTING'].id,
          permissionId: createdPerms[permCode].id
        }
      });
    }
  }

  // 4. Create Expense Categories
  const categories = [
    { name: 'Travel', description: 'Flights, cabs, and transit' },
    { name: 'Meals', description: 'Client dinners and team lunches' },
    { name: 'Software', description: 'SaaS subscriptions and licenses' },
    { name: 'Office Supplies', description: 'Stationery and minor equipment' },
    { name: 'Operations', description: 'General operational costs' }
  ];
  for (const cat of categories) {
    await prisma.expenseCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  // 5. Create Users
  const passwordHash = await bcrypt.hash('password123', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@estatesync.local' },
    update: {},
    create: {
      email: 'admin@estatesync.local',
      passwordHash,
      name: 'System Admin',
      roleId: createdRoles['ADMIN'].id,
      wallet: { create: {} }
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
      wallet: { create: {} }
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@estatesync.local' },
    update: {},
    create: {
      email: 'manager@estatesync.local',
      passwordHash,
      name: 'Sales Manager',
      roleId: createdRoles['MANAGER'].id,
      wallet: { create: {} }
    },
  });

  const marketingUser = await prisma.user.upsert({
    where: { email: 'marketing@estatesync.local' },
    update: {},
    create: {
      email: 'marketing@estatesync.local',
      passwordHash,
      name: 'Marketing Rep',
      roleId: createdRoles['MARKETING'].id,
      wallet: { create: {} }
    },
  });

  const accountingUser = await prisma.user.upsert({
    where: { email: 'accounting@estatesync.local' },
    update: {},
    create: {
      email: 'accounting@estatesync.local',
      passwordHash,
      name: 'Accounting Officer',
      roleId: createdRoles['ACCOUNTING'].id,
      wallet: { create: {} }
    },
  });

  const otherUser = await prisma.user.upsert({
    where: { email: 'other@estatesync.local' },
    update: {},
    create: {
      email: 'other@estatesync.local',
      passwordHash,
      name: 'General Staff',
      roleId: createdRoles['OTHER'].id,
      wallet: { create: {} }
    },
  });

  console.log('Seeding finished.');
  console.log('Admin user: admin@estatesync.local / password123');
  console.log('Manager user: manager@estatesync.local / password123');
  console.log('Sales user: sales@estatesync.local / password123');
  console.log('Marketing user: marketing@estatesync.local / password123');
  console.log('Accounting user: accounting@estatesync.local / password123');
  console.log('Other user: other@estatesync.local / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
