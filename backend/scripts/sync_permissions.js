const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncPerms() {
  console.log('Syncing database permissions in batch...');
  
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

  const existingPerms = await prisma.permission.findMany();
  const existingCodeMap = new Map(existingPerms.map(p => [p.code, p.id]));
  const missingPerms = permissions.filter(code => !existingCodeMap.has(code));

  if (missingPerms.length > 0) {
    await prisma.permission.createMany({
      data: missingPerms.map(code => ({ code, description: 'Permission for ' + code })),
      skipDuplicates: true
    });
  }

  const allPerms = await prisma.permission.findMany();
  const permMap = new Map(allPerms.map(p => [p.code, p.id]));

  // 2. Roles mapping
  const roles = await prisma.role.findMany();
  const roleMap = new Map(roles.map(r => [r.name, r.id]));

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

  const rolePermRecords = [];
  for (const [roleName, perms] of Object.entries(rolePermDefinitions)) {
    const roleId = roleMap.get(roleName);
    if (!roleId) continue;

    for (const permCode of perms) {
      const permissionId = permMap.get(permCode);
      if (permissionId) {
        rolePermRecords.push({ roleId, permissionId });
      }
    }
  }

  await prisma.rolePermission.createMany({
    data: rolePermRecords,
    skipDuplicates: true
  });

  console.log('Role permissions synced successfully with createMany!');

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
