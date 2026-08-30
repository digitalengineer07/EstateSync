const prisma = require('../src/config/db');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'super-secret-jwt-key-for-estatesync';

async function testCustomerValidationAndDuplicates() {
  console.log('=== Starting Customer Mandatory Fields & Duplicate Plot/Khata Tests ===\n');

  const salesUser = await prisma.user.findFirst({
    where: { role: { name: 'SALES' } }
  });

  if (!salesUser) {
    throw new Error('No sales user found in database');
  }

  const token = jwt.sign({
    userId: salesUser.id,
    email: salesUser.email,
    role: 'SALES',
    permissions: ['customer.create', 'customer.view', 'customer.edit']
  }, JWT_SECRET, { expiresIn: '1h' });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const testKhata = `KH-TEST-${Date.now()}`;
  const testPlot = `PL-TEST-${Date.now()}`;

  // Test 1: Empty Plot No. or Khata No.
  console.log('Test 1: Attempting to register customer without Khata No...');
  const res1 = await fetch('http://localhost:4000/api/v1/customers', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customerName: 'Test Customer 1',
      customerContact: '9876543210',
      projectLocation: 'Test Project Phase 1',
      plotNo: testPlot,
      areaSqft: 1200,
      khataNo: '', // EMPTY
      identityType: 'Aadhaar',
      identityNumber: '1234-5678-9012',
      ratePerSqft: 1500
    })
  });
  const data1 = await res1.json();
  if (res1.status === 400) {
    console.log('  ✅ Passed: Rejected empty Khata No. with message:', data1.message);
  } else {
    console.error('  ❌ Failed: Expected 400 but got', res1.status, data1);
    process.exit(1);
  }

  // Test 2: Valid First Registration
  console.log('\nTest 2: Registering valid initial customer...');
  const res2 = await fetch('http://localhost:4000/api/v1/customers', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customerName: 'Test Customer Initial',
      customerContact: '9876543210',
      projectLocation: 'Test Project Phase 1',
      plotNo: testPlot,
      areaSqft: 1200,
      khataNo: testKhata,
      identityType: 'Aadhaar',
      identityNumber: '1234-5678-9012',
      ratePerSqft: 1500
    })
  });
  const data2 = await res2.json();
  if (res2.status === 201 && data2.success) {
    console.log(`  ✅ Passed: Initial customer (${data2.customer.customerName}) registered with Khata ${testKhata}, Plot ${testPlot}`);
  } else {
    console.error('  ❌ Failed to create initial customer:', data2);
    process.exit(1);
  }

  const createdId = data2.customer.id;

  // Test 3: Duplicate Registration with SAME Plot & Khata
  console.log('\nTest 3: Attempting duplicate registration with identical Khata & Plot...');
  const res3 = await fetch('http://localhost:4000/api/v1/customers', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customerName: 'Second Imposter Customer',
      customerContact: '9999988888',
      projectLocation: 'Test Project Phase 1',
      plotNo: `  ${testPlot}  `, // With whitespace
      areaSqft: 1500,
      khataNo: `  ${testKhata.toLowerCase()}  `, // Lowercase with whitespace
      identityType: 'PAN',
      identityNumber: 'ABCDE1234F',
      ratePerSqft: 2000
    })
  });
  const data3 = await res3.json();
  if (res3.status === 400 && data3.message.includes('Duplicate Record Error')) {
    console.log('  ✅ Passed: Successfully blocked duplicate registration!');
    console.log('  Error Response:', data3.message);
  } else {
    console.error('  ❌ Failed: Expected duplicate block 400 but got', res3.status, data3);
    process.exit(1);
  }

  // Cleanup test customer
  console.log('\nCleaning up test customer from DB...');
  await prisma.customer.delete({ where: { id: createdId } });
  console.log('  ✅ Cleaned up successfully.');

  console.log('\n=== ALL MANDATORY & DUPLICATE CHECKS PASSED! ===');
  process.exit(0);
}

testCustomerValidationAndDuplicates().catch(err => {
  console.error(err);
  process.exit(1);
});
