const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncPerms() {
  console.log('Syncing database permissions...');
  
  // 1. Ensure all standard permissions exist
  const permissions = [
    'fund.view', 'fund.allocate', 'fund.request', 'fund.approve', 'fund.reject',
    'wallet.view', 'wallet.view_all', 'expense.create', 'expense.view',
    'expense.view_all', 'expense.approve', 'expense.reverse', 'expense.view_team',
    'transaction.view', 'transaction.view_all', 'accounting.view',
    'report.view', 'report.view_team', 'audit.view', 'user.manage',
    'customer.create', 'customer.view', 'customer.view_all', 'customer.edit',
    'customer.payment.record', 'customer.payment.view',
    'property.create', 'property.view_all', 'property.edit',
    'property.payment.record', 'property.payment.view'
  ];

  const permMap = {};
  for (const code of permissions) {
    const p = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: 'Permission for ' + code }
    });
    permMap[code] = p.id;
  }

  // 2. Roles mapping
  const roles = await prisma.role.findMany();
  const roleMap = {};
  for (const r of roles) {
    roleMap[r.name] = r.id;
  }

  const baseEmployeePerms = [
    'wallet.view', 'expense.create', 'expense.view', 'transaction.view', 'fund.request', 'fund.view'
  ];

  const rolePermDefinitions = {
    ADMIN: permissions,
    SALES: [
      ...baseEmployeePerms,
      'customer.create', 'customer.view', 'customer.edit', 'customer.payment.view'
    ],
    MARKETING: [
      ...baseEmployeePerms,
      'customer.create', 'customer.view', 'customer.edit', 'customer.payment.view'
    ],
    MANAGER: [
      ...baseEmployeePerms,
      'customer.create', 'customer.view', 'customer.view_all', 'customer.edit', 'customer.payment.view',
      'expense.view_team', 'fund.approve', 'fund.reject', 'report.view_team'
    ],
    ACCOUNTING: [
      ...baseEmployeePerms,
      'wallet.view_all', 'expense.view_all', 'expense.approve', 'expense.reverse',
      'transaction.view_all', 'accounting.view', 'report.view',
      'customer.view_all', 'customer.payment.record', 'customer.payment.view',
      'property.create', 'property.view_all', 'property.edit', 'property.payment.record', 'property.payment.view'
    ],
    OTHER: baseEmployeePerms
  };

  for (const [roleName, perms] of Object.entries(rolePermDefinitions)) {
    const roleId = roleMap[roleName];
    if (!roleId) continue;

    for (const permCode of perms) {
      const permissionId = permMap[permCode];
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId, permissionId }
        },
        update: {},
        create: { roleId, permissionId }
      });
    }
  }

  console.log('Role permissions synced successfully!');

  // Verify
  const accountingRole = await prisma.role.findUnique({
    where: { name: 'ACCOUNTING' },
    include: { permissions: { include: { permission: true } } }
  });
  console.log('ACCOUNTING permissions count:', accountingRole.permissions.length);
  console.log('ACCOUNTING permissions:', accountingRole.permissions.map(p => p.permission.code).join(', '));
  process.exit(0);
}

syncPerms().catch((err) => {
  console.error(err);
  process.exit(1);
});
