require('dotenv').config();
const prisma = require('../src/config/db');
const bcrypt = require('bcrypt');

async function testVariousPasswords() {
  const users = await prisma.user.findMany({ include: { role: true } });
  const candidates = ['password123', 'admin123', 'admin', 'password', 'sales123', 'marketing123', 'EstateSync123', '123456', '12345678'];

  for (const u of users) {
    console.log(`Checking ${u.email}:`);
    for (const c of candidates) {
      if (await bcrypt.compare(c, u.passwordHash)) {
        console.log(`  -> MATCHES: "${c}"`);
      }
    }
  }
}

testVariousPasswords()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
