const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

const JWT_SECRET = 'super-secret-jwt-key-for-estatesync';

async function generateTestToken(email) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      }
    }
  });

  if (!user) throw new Error('User not found: ' + email);

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role.name,
    permissions: user.role.permissions.map(rp => rp.permission.code)
  };

  return {
    user,
    token: jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }),
    payload
  };
}

async function runTest() {
  console.log('=== Starting Customer Edit Feature Verification ===\n');

  // 1. Get Sales User
  const salesAuth = await generateTestToken('sales@estatesync.local');
  const adminAuth = await generateTestToken('admin@estatesync.local');

  // 2. Create a customer with a typo
  console.log('1. Creating test customer with initial typo in name & plot number...');
  const customer = await prisma.customer.create({
    data: {
      salesOwnerId: salesAuth.user.id,
      customerName: 'Rajesh Kumr (Typo)',
      customerContact: '+91 9999900000',
      customerAddress: 'Old Address 123',
      projectLocation: 'Green Hills Phase 1',
      plotNo: 'PL-99-WRONG',
      areaSqft: 1200,
      khataNo: 'KH-101',
      identityType: 'Aadhaar',
      identityNumber: '1234-5678-9012',
      status: 'ACTIVE',
      ratePerSqft: 2000,
      landCost: 2400000,
      registryCost: 100000,
      otherCharges: 50000,
      discount: 50000,
      taxes: 100000,
      totalContractValue: 2600000,
      totalPaid: 0,
      balanceDue: 2600000
    }
  });
  console.log('-> Customer created with ID:', customer.id, 'Name:', customer.customerName, 'Plot:', customer.plotNo);

  // 3. Sales rep edits the customer record via PUT API
  console.log('\n2. Sales Rep fixing typos via PUT /api/v1/customers/:id ...');
  const updateRes1 = await fetch(`http://localhost:4000/api/v1/customers/${customer.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${salesAuth.token}`
    },
    body: JSON.stringify({
      customerName: 'Rajesh Kumar (Corrected)',
      customerContact: '+91 9876543210',
      customerAddress: 'New Corrected Address 456, Green Hills',
      plotNo: 'PL-100-CORRECT',
      projectLocation: 'Green Hills Phase 2',
      khataNo: 'KH-102',
      areaSqft: 1250,
      identityType: 'PAN',
      identityNumber: 'ABCDE1234F',
      status: 'ACTIVE'
    })
  });

  const updateData1 = await updateRes1.json();
  console.log('HTTP Status:', updateRes1.status);
  console.log('Update Response:', updateData1.message);
  console.log('Updated Name:', updateData1.customer?.customerName);
  console.log('Updated Plot:', updateData1.customer?.plotNo);
  console.log('Total Contract Value (Untampered):', updateData1.customer?.totalContractValue);

  if (updateRes1.status !== 200 || updateData1.customer?.customerName !== 'Rajesh Kumar (Corrected)') {
    throw new Error('FAILED: Sales could not update customer details');
  }
  console.log('-> PASS: Sales successfully updated customer record!\n');

  // 4. Admin edits the customer record from Admin Panel
  console.log('3. Admin editing customer record via Admin Panel...');
  const updateRes2 = await fetch(`http://localhost:4000/api/v1/customers/${customer.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminAuth.token}`
    },
    body: JSON.stringify({
      customerName: 'Rajesh Kumar (Admin Verified)',
      customerContact: '+91 9876543210',
      plotNo: 'PL-100-CORRECT',
      projectLocation: 'Green Hills Luxury Phase 2',
      khataNo: 'KH-102-VERIFIED'
    })
  });

  const updateData2 = await updateRes2.json();
  console.log('HTTP Status:', updateRes2.status);
  console.log('Admin Update Response:', updateData2.message);
  console.log('Updated Name by Admin:', updateData2.customer?.customerName);
  console.log('Updated Location by Admin:', updateData2.customer?.projectLocation);

  if (updateRes2.status !== 200 || updateData2.customer?.customerName !== 'Rajesh Kumar (Admin Verified)') {
    throw new Error('FAILED: Admin could not update customer details');
  }
  console.log('-> PASS: Admin successfully updated customer record!\n');

  // 5. Verify audit logs for customer updates
  const auditLogs = await prisma.auditLog.findMany({
    where: { entityType: 'CUSTOMER', entityId: customer.id },
    orderBy: { createdAt: 'desc' }
  });
  console.log('4. Audit log count for this customer:', auditLogs.length);
  for (const log of auditLogs) {
    console.log(`- Action: ${log.action}, Actor: ${log.actorEmail}`);
  }

  console.log('\n=== ALL CUSTOMER EDIT VERIFICATION TESTS PASSED! ===');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
