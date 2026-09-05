require('dotenv').config();
const prisma = require('../src/config/db');
const bcrypt = require('bcrypt');

async function main() {
  const users = await prisma.user.findMany({
    include: { role: true }
  });

  console.log('Testing password123 for all users in DB:');
  for (const u of users) {
    const matches = await bcrypt.compare('password123', u.passwordHash);
    console.log(u.email, `(${u.role?.name}):`, matches ? '✅ password123 MATCHES' : '❌ DOES NOT MATCH');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
