const prisma = require('../src/config/db');
const jwt = require('jsonwebtoken');
const { getPrimaryTreasuryAdmin } = require('../src/utils/treasuryHelper');
const JWT_SECRET = 'super-secret-jwt-key-for-estatesync';

async function testPropertyDuplicates() {
  console.log('=== Starting Land Acquisition Mandatory Fields & Duplicate Plot/Khata Tests ===\n');

  const adminUser = await getPrimaryTreasuryAdmin(prisma);
  if (!adminUser) throw new Error('Master Admin missing in DB');

  const adminToken = jwt.sign({
    userId: adminUser.id,
    email: adminUser.email,
    role: 'ADMIN',
    permissions: ['property.create', 'property.view', 'property.edit', 'property.payment.record']
  }, JWT_SECRET, { expiresIn: '1h' });

  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` };

  const app = require('../src/app');
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const testKhata = `KH-ACQ-${Date.now()}`;
  const testPlot = `LA-ACQ-${Date.now()}`;
  let propId1 = null;
  let propId2 = null;

  try {
    // -------------------------------------------------------------
    // Test 1: Attempt to create property without Khata No
    // -------------------------------------------------------------
    console.log('Test 1: Attempting to create land acquisition without Khata No...');
    const res1 = await fetch(`${baseUrl}/api/v1/properties`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        khataNo: '   ',
        plotNo: testPlot,
        projectLocation: 'Patna, Bihar',
        landOwnerName: 'Shri Ramesh',
        landOwnerContact: '9876543210',
        totalLandValue: 1000000
      })
    });
    const data1 = await res1.json();
    if (res1.status === 400 && data1.message?.includes('compulsory')) {
      console.log('  ✅ Passed: Rejected empty Khata No with message:', data1.message);
    } else {
      console.error('  ❌ Failed Test 1: Expected 400 error but got', res1.status, data1);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // Test 2: Register valid initial Land Acquisition
    // -------------------------------------------------------------
    console.log(`\nTest 2: Registering valid initial Land Acquisition (${testPlot}, ${testKhata})...`);
    const res2 = await fetch(`${baseUrl}/api/v1/properties`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        khataNo: testKhata,
        plotNo: testPlot,
        projectLocation: 'Patna, Bihar',
        landOwnerName: 'Balram Singh',
        landOwnerContact: '7647583521',
        totalLandValue: 1500000,
        areaSqft: 3000
      })
    });
    const data2 = await res2.json();
    if (!res2.ok || !data2.success) {
      console.error('Failed Test 2:', data2);
      process.exit(1);
    }
    propId1 = data2.property?.id;
    console.log(`  ✅ Passed: Initial property created (ID: ${propId1})`);

    // -------------------------------------------------------------
    // Test 3a: Attempt duplicate Land Acquisition with prefixes (e.g. "Plot ..." and "Khata: ...")
    // -------------------------------------------------------------
    console.log(`\nTest 3a: Attempting duplicate with user-typed prefixes ("Plot ${testPlot}", "Khata: ${testKhata}")...`);
    const res3a = await fetch(`${baseUrl}/api/v1/properties`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        khataNo: `Khata: ${testKhata}`,
        plotNo: `Plot ${testPlot}`,
        projectLocation: 'Patna',
        landOwnerName: 'ABC Duplicate User',
        landOwnerContact: '8759465723',
        totalLandValue: 300000
      })
    });
    const data3a = await res3a.json();
    if (res3a.status === 400 && data3a.message?.includes('Duplicate Record Error')) {
      console.log('  ✅ Passed: Successfully blocked duplicate with "Plot " and "Khata: " prefixes!');
      console.log('  Error Response:', data3a.message);
    } else {
      console.error('  ❌ Failed Test 3a: Expected 400 Duplicate error but got', res3a.status, data3a);
      process.exit(1);
    }

    // -------------------------------------------------------------
    // Test 4: Create a 2nd distinct property, then try updating it to duplicate of 1st
    // -------------------------------------------------------------
    const testKhata2 = `KH-ACQ-2-${Date.now()}`;
    const testPlot2 = `LA-ACQ-2-${Date.now()}`;
    console.log(`\nTest 4: Creating second property and attempting to update to match first...`);
    const res4 = await fetch(`${baseUrl}/api/v1/properties`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        khataNo: testKhata2,
        plotNo: testPlot2,
        projectLocation: 'Zone 2',
        landOwnerName: 'Second Owner',
        landOwnerContact: '8888888888',
        totalLandValue: 1200000
      })
    });
    const data4 = await res4.json();
    propId2 = data4.property?.id;

    // Try updating 2nd to have 1st's plot and khata
    const updateRes = await fetch(`${baseUrl}/api/v1/properties/${propId2}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        khataNo: testKhata,
        plotNo: testPlot
      })
    });
    const updateData = await updateRes.json();
    if (updateRes.status === 400 && updateData.message?.includes('Duplicate Record Error')) {
      console.log('  ✅ Passed: Successfully blocked duplicate Khata & Plot on update!');
      console.log('  Error Response:', updateData.message);
    } else {
      console.error('  ❌ Failed Test 4: Expected 400 Duplicate update error but got', updateRes.status, updateData);
      process.exit(1);
    }

    console.log('\n=== ALL PROPERTY DUPLICATE & MANDATORY FIELD TESTS PASSED! ===\n');
  } finally {
    console.log('Cleaning up test properties...');
    if (propId1) await prisma.propertyAcquisition.delete({ where: { id: propId1 } }).catch(() => {});
    if (propId2) await prisma.propertyAcquisition.delete({ where: { id: propId2 } }).catch(() => {});
    server.close();
    console.log('✅ Cleanup complete.');
  }

  process.exit(0);
}

testPropertyDuplicates().catch(err => {
  console.error(err);
  process.exit(1);
});
