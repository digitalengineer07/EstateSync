const prisma = require('./src/config/db');
const bcrypt = require('bcrypt');

async function test() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@estatesync.local' },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    console.log('User found:', user ? user.email : 'NOT FOUND');
    if (user) {
      const isMatch = await bcrypt.compare('password123', user.passwordHash);
      console.log('Password match with password123:', isMatch);
    }
  } catch (err) {
    console.error('Diagnostic error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
