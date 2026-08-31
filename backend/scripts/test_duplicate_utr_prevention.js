const prisma = require('../src/config/db');
const jwt = require('jsonwebtoken');
const { getPrimaryTreasuryAdmin } = require('../src/utils/treasuryHelper');
const JWT_SECRET = 'super-secret-jwt-key-for-estatesync';

async function testDuplicateUtrPrevention() {
  console.log('=== Starting Duplicate UTR / Reference No Prevention Test Suite ===\n');

  const adminUser = await getPrimaryTreasuryAdmin(prisma);
  if (!adminUser) throw new Error('Master Admin missing in DB');

  const adminToken = jwt.sign({
    userId: adminUser.id,
    email: adminUser.email,
    role: 'ADMIN',
    permissions: ['customer.create', 'customer.view', 'customer.edit', 'customer.payment.record']
  }, JWT_SECRET, { expiresIn: '1h' });

  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` };

  const app = require('../src/app');
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const testUtr = `UTR-UNIQUE-${Date.now()}`;
  let createdCustomerId = null;
  let createdPropertyId = null;
  let inflowTxnId = null;

  try {
    // -------------------------------------------------------------
    // Test 1: Record Treasury Bank Inflow with testUtr
    // -------------------------------------------------------------
    console.log(`Test 1: Recording initial Treasury Bank Inflow with UTR: "${testUtr}"...`);
    const res1 = await fetch(`${baseUrl}/api/v1/treasury/inflow`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: 50000,
        bankName: 'HDFC Corporate Current A/C',
        inflowType: 'CAPITAL_INFUSION',
        paymentMode: 'NEFT',
        referenceNo: testUtr,
        narration: 'Initial test capital deposit'
      })
    });
    const data1 = await res1.json();
    if (!res1.ok || !data1.success) {
      console.error('Failed Test 1:', data1);
      process.exit(1);
    }
    inflowTxnId = data1.transaction?.id;
    console.log('  ✅ Initial Bank Inflow recorded successfully.');

    // -------------------------------------------------------------
    // Test 2: Attempt Duplicate Bank Inflow with same testUtr
    // -------------------------------------------------------------
    console.log(`\nTest 2: Attempting duplicate Treasury Bank Inflow with same UTR: "${testUtr}"...`);
    const res2 = await fetch(`${baseUrl}/api/v1/treasury/inflow`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: 30000,
        bankName: 'ICICI Corporate A/C',
        inflowType: 'CAPITAL_INFUSION',
        paymentMode: 'RTGS',
        referenceNo: `  ${testUtr.toLowerCase()}  `, // with whitespace and case difference
        narration: 'Imposter duplicate inflow'
      })
    });
    const data2 = await res2.json();
    if (res2.status === 400 && data2.message?.includes('Duplicate UTR / Reference Error')) {
      console.log('  ✅ Passed: Successfully blocked duplicate Inflow UTR!');
      console.log('  Blocked Message:', data2.message);
    } else {
      console.error('  ❌ Failed Test 2: Expected 400 Duplicate UTR error but got', res2.status, data2);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // Test 3: Attempt Customer Payment using existing testUtr (Cross-module check)
    // -------------------------------------------------------------
    console.log(`\nTest 3: Creating customer and attempting Customer Payment with existing Treasury UTR: "${testUtr}"...`);
    const custRes = await fetch(`${baseUrl}/api/v1/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customerName: 'UTR Security Test Customer',
        customerContact: '9898989898',
        projectLocation: 'Green City Phase 1',
        plotNo: `PL-UTR-${Date.now()}`,
        areaSqft: 1000,
        khataNo: `KH-UTR-${Date.now()}`,
        identityType: 'Aadhaar',
        identityNumber: '1122-3344-5566',
        ratePerSqft: 1000
      })
    });
    const custData = await custRes.json();
    createdCustomerId = custData.customer?.id;

    const res3 = await fetch(`${baseUrl}/api/v1/customers/${createdCustomerId}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: 25000,
        paymentMode: 'NEFT',
        referenceNo: testUtr
      })
    });
    const data3 = await res3.json();
    if (res3.status === 400 && data3.message?.includes('Duplicate UTR / Reference Error')) {
      console.log('  ✅ Passed: Successfully blocked Customer Payment reusing Treasury Inflow UTR!');
      console.log('  Blocked Message:', data3.message);
    } else {
      console.error('  ❌ Failed Test 3: Expected 400 Duplicate UTR error but got', res3.status, data3);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // Test 4: Record Valid Customer Payment with unique UTR, then test duplicate Customer Payment
    // -------------------------------------------------------------
    const customerUtr = `CUST-UTR-${Date.now()}`;
    console.log(`\nTest 4: Recording valid Customer Payment with UTR: "${customerUtr}"...`);
    const res4a = await fetch(`${baseUrl}/api/v1/customers/${createdCustomerId}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: 50000,
        paymentMode: 'NEFT',
        referenceNo: customerUtr
      })
    });
    const data4a = await res4a.json();
    if (!res4a.ok || !data4a.success) {
      console.error('Failed Test 4a:', data4a);
      process.exit(1);
    }
    console.log('  ✅ Customer payment recorded.');

    console.log(`Attempting duplicate Customer Payment with same UTR "${customerUtr}"...`);
    const res4b = await fetch(`${baseUrl}/api/v1/customers/${createdCustomerId}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: 20000,
        paymentMode: 'NEFT',
        referenceNo: customerUtr
      })
    });
    const data4b = await res4b.json();
    if (res4b.status === 400 && data4b.message?.includes('Duplicate UTR / Reference Error')) {
      console.log('  ✅ Passed: Successfully blocked duplicate Customer Payment UTR!');
      console.log('  Blocked Message:', data4b.message);
    } else {
      console.error('  ❌ Failed Test 4b: Expected 400 Duplicate UTR error but got', res4b.status, data4b);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // Test 5: Attempt Land Acquisition Payment reusing customerUtr
    // -------------------------------------------------------------
    console.log(`\nTest 5: Attempting Land Acquisition Payout reusing Customer UTR "${customerUtr}"...`);
    const propRes = await fetch(`${baseUrl}/api/v1/properties`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        khataNo: `KH-PROP-${Date.now()}`,
        plotNo: `PL-PROP-${Date.now()}`,
        projectLocation: 'Test Land Area',
        landOwnerName: 'Shri Ram Landowner',
        landOwnerContact: '9123456780',
        totalLandValue: 500000,
        areaSqft: 2500
      })
    });
    const propData = await propRes.json();
    createdPropertyId = propData.property?.id;

    const res5 = await fetch(`${baseUrl}/api/v1/properties/${createdPropertyId}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: 10000,
        paymentMode: 'NEFT',
        referenceNo: customerUtr
      })
    });
    const data5 = await res5.json();
    if (res5.status === 400 && data5.message?.includes('Duplicate UTR / Reference Error')) {
      console.log('  ✅ Passed: Successfully blocked Land Payout reusing Customer UTR!');
      console.log('  Blocked Message:', data5.message);
    } else {
      console.error('  ❌ Failed Test 5: Expected 400 Duplicate UTR error but got', res5.status, data5);
      process.exit(1);
    }

    console.log('\n=== ALL 5 DUPLICATE UTR & REFERENCE TESTS PASSED WITH 100% INTEGRITY! ===\n');
  } finally {
    // Cleanup
    console.log('Cleaning up test data...');
    if (createdCustomerId) {
      await prisma.journalLine.deleteMany({ where: { journalEntry: { referenceId: createdCustomerId } } });
      await prisma.customerPayment.deleteMany({ where: { customerId: createdCustomerId } });
      await prisma.customer.delete({ where: { id: createdCustomerId } }).catch(() => {});
    }
    if (createdPropertyId) {
      await prisma.propertyPayment.deleteMany({ where: { propertyId: createdPropertyId } });
      await prisma.propertyAcquisition.delete({ where: { id: createdPropertyId } }).catch(() => {});
    }
    if (inflowTxnId) {
      await prisma.journalLine.deleteMany({ where: { journalEntry: { referenceId: inflowTxnId } } });
      await prisma.journalEntry.deleteMany({ where: { referenceId: inflowTxnId } });
      await prisma.walletTransaction.delete({ where: { id: inflowTxnId } }).catch(() => {});
    }
    server.close();
    console.log('✅ Cleanup complete.');
  }

  process.exit(0);
}

testDuplicateUtrPrevention().catch(err => {
  console.error(err);
  process.exit(1);
});
