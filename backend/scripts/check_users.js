require('dotenv').config();
const prisma = require('../src/config/db');

async function main() {
  const users = await prisma.user.findMany({
    include: { role: true, wallet: true }
  });
  console.log('--- ALL USERS IN CURRENT DATABASE ---');
  for (const u of users) {
    console.log(u.email, '| Role:', u.role?.name, '| Name:', u.name, '| Wallet:', !!u.wallet);
  }
  const roles = await prisma.role.findMany();
  console.log('\n--- ALL ROLES IN CURRENT DATABASE ---');
  for (const r of roles) {
    console.log(r.id, '|', r.name);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
