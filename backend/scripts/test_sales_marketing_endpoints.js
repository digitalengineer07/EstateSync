require('dotenv').config();
const jwt = require('jsonwebtoken');
const prisma = require('../src/config/db');

async function testUserEndpoints(email) {
  console.log(`\n================= TESTING ENDPOINTS FOR ${email} =================`);
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: { include: { permissions: { include: { permission: true } } } }, wallet: true }
  });

  if (!user) {
    console.error('User not found:', email);
    return;
  }

  const perms = user.role.permissions.map(rp => rp.permission.code);
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role.name, permissions: perms },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '1h' }
  );

  const endpoints = [
    { method: 'GET', path: '/api/v1/dashboard/wallet' },
    { method: 'GET', path: '/api/v1/fund-requests' },
    { method: 'GET', path: '/api/v1/expenses' },
    { method: 'GET', path: '/api/v1/customers' },
    { method: 'GET', path: '/api/v1/customers/stats' }
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://127.0.0.1:4000${ep.path}`, {
        method: ep.method,
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => null);
      console.log(`${ep.method} ${ep.path} -> STATUS: ${res.status}`, res.status === 200 ? '✅' : `❌ ${JSON.stringify(data)}`);
    } catch (e) {
      console.error(`${ep.method} ${ep.path} -> FETCH ERROR:`, e.message);
    }
  }
}

async function run() {
  await testUserEndpoints('sales@estatesync.local');
  await testUserEndpoints('marketing@estatesync.local');
  await prisma.$disconnect();
}

run();
