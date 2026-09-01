const prisma = require('../src/config/db');
const { ensureStandardAccounts } = require('../src/utils/accountingHelper');

async function seedPhase4() {
  console.log('Seeding Phase 4 permissions and accounts...');
  await ensureStandardAccounts(prisma);

  const perms = ['payroll.accounting.view', 'payroll.accounting.post', 'payroll.accounting.reverse'];
  const pMap = {};
  for (const p of perms) {
    pMap[p] = await prisma.permission.upsert({
      where: { code: p },
      update: {},
      create: { code: p, description: `Permission for ${p}` }
    });
  }

  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  const acctRole = await prisma.role.findUnique({ where: { name: 'ACCOUNTING' } });
  const mgrRole = await prisma.role.findUnique({ where: { name: 'MANAGER' } });

  // Admin gets all 3
  for (const p of perms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: pMap[p].id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: pMap[p].id }
    });
  }

  // Accounting gets view and post
  for (const p of ['payroll.accounting.view', 'payroll.accounting.post']) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: acctRole.id, permissionId: pMap[p].id } },
      update: {},
      create: { roleId: acctRole.id, permissionId: pMap[p].id }
    });
  }

  // Manager gets view
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: mgrRole.id, permissionId: pMap['payroll.accounting.view'].id } },
    update: {},
    create: { roleId: mgrRole.id, permissionId: pMap['payroll.accounting.view'].id }
  });

  // Update standard component GL codes
  await prisma.salaryComponent.updateMany({
    where: { code: 'PF_EMPLOYER' },
    data: { glAccountCode: '5070' }
  });
  await prisma.salaryComponent.updateMany({
    where: { code: 'TDS' },
    data: { glAccountCode: '2030' }
  });

  console.log('✅ Phase 4 permissions, GL codes, and accounts seeded successfully!');
}

seedPhase4()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
