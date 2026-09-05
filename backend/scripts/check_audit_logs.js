require('dotenv').config();
const prisma = require('../src/config/db');

async function main() {
  const logs = await prisma.auditLog.findMany({
    where: { action: { in: ['USER_LOGIN', 'USER_LOGIN_FAILED'] } },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  console.log('--- RECENT LOGIN AUDIT LOGS ---');
  for (const l of logs) {
    console.log(l.createdAt, '| Action:', l.action, '| Email:', l.actorEmail, '| Details:', l.newValues);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
