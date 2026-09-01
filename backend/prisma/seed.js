const { PrismaClient } = require('../src/prisma-client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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
    await delay(50);
  }

  // 2. Create Permissions
  const permissions = [
    'fund.view', 'fund.allocate', 'fund.request', 'fund.approve', 'fund.reject',
    'wallet.view', 'wallet.view_all', 'expense.create', 'expense.view',
    'expense.view_all', 'expense.approve', 'expense.reverse',
    'transaction.view', 'transaction.view_all', 'accounting.view',
    'report.view', 'audit.view', 'user.manage',
    'customer.create', 'customer.view', 'customer.view_all', 'customer.edit',
    'customer.payment.record', 'customer.payment.view',
    'property.create', 'property.view_all', 'property.edit',
    'property.payment.record', 'property.payment.view',
    'employee.view', 'employee.create', 'employee.update', 'employee.archive',
    'payroll.component.view', 'payroll.component.manage',
    'payroll.structure.view', 'payroll.structure.create', 'payroll.structure.update', 'payroll.structure.archive',
    'payroll.assignment.view', 'payroll.assignment.create', 'payroll.assignment.update', 'payroll.assignment.history',
    'payroll.period.view', 'payroll.period.manage',
    'payroll.run.create', 'payroll.run.calculate', 'payroll.run.view',
    'payroll.item.view', 'payroll.item.adjust',
    'payroll.approve', 'payroll.lock'
  ];
  
  const createdPerms = {};
  for (const permCode of permissions) {
    createdPerms[permCode] = await prisma.permission.upsert({
      where: { code: permCode },
      update: {},
      create: { code: permCode, description: `Permission for ${permCode}` },
    });
    await delay(50);
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
    await delay(50);
  }
  
  // Base employee permissions
  const baseEmployeePerms = [
    'wallet.view', 'expense.create', 'expense.view', 'transaction.view', 'fund.request', 'fund.view'
  ];

  // Sales gets own wallet/expense perms and customer creation
  const salesPerms = [
    ...baseEmployeePerms,
    'customer.create', 'customer.view', 'customer.edit', 'customer.payment.view'
  ];
  for (const permCode of salesPerms) {
    if (createdPerms[permCode]) {
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
      await delay(50);
    }
  }

  // Manager gets team perms, approval perms, employee/structure/assignment view + payroll run view
  const managerPerms = [
    ...salesPerms,
    'expense.view_team', 'fund.approve', 'fund.reject', 'report.view_team',
    'customer.view_all', 'employee.view',
    'payroll.structure.view', 'payroll.assignment.view',
    'payroll.period.view', 'payroll.run.view', 'payroll.item.view'
  ];
  for (const permCode of managerPerms) {
    if (createdPerms[permCode]) {
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
      await delay(50);
    }
  }

  // Marketing gets same as sales
  for (const permCode of salesPerms) {
    if (createdPerms[permCode]) {
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
      await delay(50);
    }
  }

  // Accounting gets base employee perms + global view, expense approval/reversal, customer payment & property acquisition authority + employee & payroll management
  const accountingPerms = [
    ...baseEmployeePerms,
    'wallet.view_all', 'expense.view_all', 'expense.approve', 'expense.reverse',
    'transaction.view_all', 'accounting.view', 'report.view',
    'customer.view_all', 'customer.payment.record', 'customer.payment.view',
    'property.create', 'property.view_all', 'property.edit', 'property.payment.record', 'property.payment.view',
    'employee.view', 'employee.create', 'employee.update',
    'payroll.component.view', 'payroll.component.manage',
    'payroll.structure.view', 'payroll.structure.create', 'payroll.structure.update',
    'payroll.assignment.view', 'payroll.assignment.create', 'payroll.assignment.update', 'payroll.assignment.history',
    'payroll.period.view', 'payroll.period.manage',
    'payroll.run.create', 'payroll.run.calculate', 'payroll.run.view',
    'payroll.item.view', 'payroll.item.adjust',
    'payroll.approve'
  ];
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
      await delay(50);
    }
  }

  // Other gets base employee perms
  for (const permCode of baseEmployeePerms) {
    if (createdPerms[permCode]) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: createdRoles['OTHER'].id,
            permissionId: createdPerms[permCode].id
          }
        },
        update: {},
        create: {
          roleId: createdRoles['OTHER'].id,
          permissionId: createdPerms[permCode].id
        }
      });
      await delay(50);
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
    await delay(50);
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

  // 4. Seed Standard Salary Components (Phase 2)
  const defaultComponents = [
    {
      code: 'BASIC',
      name: 'Basic Salary',
      description: 'Base salary component',
      componentType: 'EARNING',
      calculationMethod: 'PERCENTAGE_OF_GROSS',
      calculationBase: 'GROSS',
      percentageValue: 50.00,
      defaultValue: 0,
      sequence: 1,
      isTaxable: true,
      isRecurring: true,
      glAccountCode: '5060'
    },
    {
      code: 'HRA',
      name: 'House Rent Allowance',
      description: 'House rent assistance',
      componentType: 'EARNING',
      calculationMethod: 'PERCENTAGE_OF_BASIC',
      calculationBase: 'BASIC',
      percentageValue: 40.00,
      defaultValue: 0,
      sequence: 2,
      isTaxable: true,
      isRecurring: true,
      glAccountCode: '5060'
    },
    {
      code: 'CONVEYANCE',
      name: 'Conveyance Allowance',
      description: 'Local travel allowance',
      componentType: 'EARNING',
      calculationMethod: 'FIXED_AMOUNT',
      defaultValue: 1600,
      percentageValue: 0,
      sequence: 3,
      isTaxable: true,
      isRecurring: true,
      glAccountCode: '5060'
    },
    {
      code: 'SPECIAL_ALLOWANCE',
      name: 'Special Allowance',
      description: 'Supplementary allowance',
      componentType: 'EARNING',
      calculationMethod: 'FIXED_AMOUNT',
      defaultValue: 0,
      percentageValue: 0,
      sequence: 4,
      isTaxable: true,
      isRecurring: true,
      glAccountCode: '5060'
    },
    {
      code: 'PF_EMPLOYEE',
      name: 'Provident Fund (Employee)',
      description: 'Employee statutory EPF contribution (12% of Basic)',
      componentType: 'DEDUCTION',
      calculationMethod: 'PERCENTAGE_OF_BASIC',
      calculationBase: 'BASIC',
      percentageValue: 12.00,
      defaultValue: 0,
      sequence: 10,
      isTaxable: false,
      isRecurring: true,
      glAccountCode: '2020'
    },
    {
      code: 'ESI_EMPLOYEE',
      name: 'ESI (Employee)',
      description: 'Employee statutory ESIC contribution (0.75% of Gross)',
      componentType: 'DEDUCTION',
      calculationMethod: 'PERCENTAGE_OF_GROSS',
      calculationBase: 'GROSS',
      percentageValue: 0.75,
      defaultValue: 0,
      sequence: 11,
      isTaxable: false,
      isRecurring: true,
      glAccountCode: '2020'
    },
    {
      code: 'TDS',
      name: 'Income Tax Deduction (TDS)',
      description: 'Monthly tax deducted at source',
      componentType: 'DEDUCTION',
      calculationMethod: 'MANUAL_AMOUNT',
      defaultValue: 0,
      percentageValue: 0,
      sequence: 12,
      isTaxable: false,
      isRecurring: true,
      glAccountCode: '2020'
    },
    {
      code: 'ADVANCE_RECOVERY',
      name: 'Employee Advance Recovery',
      description: 'Recovery deduction against disbursed advance loan',
      componentType: 'DEDUCTION',
      calculationMethod: 'MANUAL_AMOUNT',
      defaultValue: 0,
      percentageValue: 0,
      sequence: 13,
      isTaxable: false,
      isRecurring: true,
      glAccountCode: '1040'
    },
    {
      code: 'PF_EMPLOYER',
      name: 'Provident Fund (Employer)',
      description: 'Employer statutory EPF contribution (12% of Basic)',
      componentType: 'EMPLOYER_CONTRIBUTION',
      calculationMethod: 'PERCENTAGE_OF_BASIC',
      calculationBase: 'BASIC',
      percentageValue: 12.00,
      defaultValue: 0,
      sequence: 20,
      isTaxable: false,
      isRecurring: true,
      glAccountCode: '5060'
    }
  ];

  for (const comp of defaultComponents) {
    await prisma.salaryComponent.upsert({
      where: { code: comp.code },
      update: {},
      create: comp
    });
    await delay(50);
  }

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
