const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

const JWT_SECRET = 'super-secret-jwt-key-for-estatesync';

async function testAllEndpoints() {
  console.log('=== Verifying All API Endpoints Return Valid JSON ===\n');

  const admin = await prisma.user.findFirst({
    where: { role: { name: 'ADMIN' } },
    include: { role: { include: { permissions: { include: { permission: true } } } } }
  });

  const token = jwt.sign({
    userId: admin.id,
    email: admin.email,
    role: admin.role.name,
    permissions: admin.role.permissions.map(p => p.permission.code)
  }, JWT_SECRET, { expiresIn: '1h' });

  const headers = { 'Authorization': `Bearer ${token}` };

  const endpoints = [
    '/api/v1/treasury/inflows',
    '/api/v1/dashboard/admin',
    '/api/v1/dashboard/accounting',
    '/api/v1/customers',
    '/api/v1/properties',
    '/api/v1/journals',
    '/api/v1/accounts',
    '/api/v1/transactions/all',
    '/api/v1/fund-requests/all',
    '/api/v1/fund-requests/my',
    '/api/v1/expenses/all',
    '/api/v1/expenses/my',
    '/api/v1/users/all',
    '/api/v1/users/roles',
    '/api/v1/users/managers',
    '/api/v1/audit?limit=100'
  ];

  let failed = 0;
  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://localhost:4000${ep}`, { headers });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error(`❌ FAILED: ${ep} did not return valid JSON! Response was:\n${text.substring(0, 100)}...`);
        failed++;
        continue;
      }

      if (res.status >= 200 && res.status < 300 && data.success !== false) {
        console.log(`✅ OK [${res.status}] ${ep}`);
      } else {
        console.log(`⚠️ WARN [${res.status}] ${ep}: ${data.message || 'Error status'}`);
      }
    } catch (e) {
      console.error(`❌ Network error on ${ep}:`, e.message);
      failed++;
    }
  }

  console.log(`\n=== Verification Finished: ${endpoints.length - failed}/${endpoints.length} Successful ===`);
  process.exit(failed > 0 ? 1 : 0);
}

testAllEndpoints().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
