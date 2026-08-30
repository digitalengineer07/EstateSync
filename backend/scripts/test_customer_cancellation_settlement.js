const prisma = require('../src/config/db');
const jwt = require('jsonwebtoken');
const { getPrimaryTreasuryAdmin } = require('../src/utils/treasuryHelper');
const JWT_SECRET = 'super-secret-jwt-key-for-estatesync';

async function testCancellationRefundWorkflow() {
  console.log('=== Starting Customer Cancellation & Refund Settlement Test ===\n');

  const adminUser = await getPrimaryTreasuryAdmin(prisma);
  const salesUser = await prisma.user.findFirst({ where: { role: { name: 'SALES' } } });

  if (!adminUser || !salesUser) {
    throw new Error('Admin or Sales user missing');
  }

  const adminToken = jwt.sign({
    userId: adminUser.id,
    email: adminUser.email,
    role: 'ADMIN',
    permissions: ['customer.create', 'customer.view', 'customer.view_all', 'customer.edit', 'customer.payment.record']
  }, JWT_SECRET, { expiresIn: '1h' });

  const salesToken = jwt.sign({
    userId: salesUser.id,
    email: salesUser.email,
    role: 'SALES',
    permissions: ['customer.create', 'customer.view', 'customer.edit']
  }, JWT_SECRET, { expiresIn: '1h' });

  const app = require('../src/app');
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const adminHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` };
  const salesHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${salesToken}` };

  const testKhata = `KH-CANC-${Date.now()}`;
  const testPlot = `PL-CANC-${Date.now()}`;

  // Step 1: Create Customer (Contract ₹10,00,000)
  console.log('Step 1: Registering customer with contract value ₹10,00,000...');
  const res1 = await fetch(`${baseUrl}/api/v1/customers`, {
    method: 'POST',
    headers: salesHeaders,
    body: JSON.stringify({
      customerName: 'Aman Verma (Test Cancellation)',
      customerContact: '9811223344',
      projectLocation: 'Green Valley Phase 2',
      plotNo: testPlot,
      areaSqft: 2000,
      khataNo: testKhata,
      identityType: 'Aadhaar',
      identityNumber: '8877-6655-4433',
      ratePerSqft: 500
    })
  });
  const data1 = await res1.json();
  if (!res1.ok || !data1.success) {
    console.error('Failed to create customer:', data1);
    process.exit(1);
  }
  const customerId = data1.customer.id;
  console.log(`  ✅ Customer created (ID: ${customerId})`);

  // Step 2: Record Payment ₹5,00,000 from Accounting
  console.log('\nStep 2: Accounting records collection payment of ₹5,00,000...');
  const initialWallet = await prisma.wallet.findUnique({ where: { userId: adminUser.id } });
  const initialBal = parseFloat(initialWallet.availableBalance);

  const res2 = await fetch(`${baseUrl}/api/v1/customers/${customerId}/payments`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      amount: 500000,
      paymentMode: 'NEFT',
      referenceNo: `UTR-IN-${Date.now()}`
    })
  });
  const data2 = await res2.json();
  if (!res2.ok || !data2.success) {
    console.error('Failed to record payment:', data2);
    process.exit(1);
  }
  console.log('  ✅ Collection payment ₹5,00,000 recorded in Treasury.');

  // Step 3: Sales cancels the account
  console.log('\nStep 3: Sales updates status to CANCELLED...');
  const res3 = await fetch(`${baseUrl}/api/v1/customers/${customerId}`, {
    method: 'PUT',
    headers: salesHeaders,
    body: JSON.stringify({
      status: 'CANCELLED',
      cancellationReason: 'Buyer requested cancellation due to personal reasons'
    })
  });
  const data3 = await res3.json();
  if (!res3.ok || !data3.success) {
    console.error('Failed to cancel customer:', data3);
    process.exit(1);
  }
  console.log('  ✅ Account cancelled. Status:', data3.customer.status, '| Cancellation Status:', data3.customer.cancellationStatus);
  if (data3.customer.cancellationStatus !== 'PENDING_SETTLEMENT') {
    console.error('Expected PENDING_SETTLEMENT but got', data3.customer.cancellationStatus);
    process.exit(1);
  }

  // Step 4: Accounting settles cancellation refund: Deducts ₹2,50,000 cost, refunds ₹2,50,000
  console.log('\nStep 4: Accounting verifies costing (₹2,50,000) and approves refund (₹2,50,000)...');
  const res4 = await fetch(`${baseUrl}/api/v1/customers/${customerId}/settle-cancellation`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      deductionAmount: 250000,
      refundMode: 'NEFT',
      referenceNo: `REF-UTR-${Date.now()}`,
      notes: 'Approved cancellation after deducting site development & processing charges'
    })
  });
  const data4 = await res4.json();
  if (!res4.ok || !data4.success) {
    console.error('Failed to settle cancellation refund:', data4);
    process.exit(1);
  }
  console.log('  ✅ Settle Response:', data4.message);

  // Step 5: Verify Treasury and Ledger Balance
  console.log('\nStep 5: Verifying Treasury liquidity & Ledger updates...');
  const finalWallet = await prisma.wallet.findUnique({ where: { userId: adminUser.id } });
  const finalBal = parseFloat(finalWallet.availableBalance);
  const expectedBal = initialBal + 500000 - 250000; // Net +250000
  console.log(`  Initial Treasury: ₹${initialBal.toLocaleString('en-IN')}`);
  console.log(`  After +₹5L collection & -₹2.5L refund: ₹${finalBal.toLocaleString('en-IN')}`);
  console.log(`  Expected Treasury: ₹${expectedBal.toLocaleString('en-IN')}`);

  if (Math.abs(finalBal - expectedBal) > 0.01) {
    console.error(`❌ Treasury balance mismatch! Final: ${finalBal}, Expected: ${expectedBal}`);
    process.exit(1);
  }
  console.log('  ✅ Treasury balance matched perfectly!');

  // Step 6: Verify Customer Payment History (Initial deposit + Refund entry)
  const custAfter = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { payments: true }
  });
  console.log('\nStep 6: Customer Payment Records:');
  custAfter.payments.forEach((p, idx) => {
    console.log(`   ${idx + 1}. Mode: ${p.paymentMode} | Amount: ₹${parseFloat(p.amount).toLocaleString('en-IN')} | Status: ${p.status} | Ref: ${p.referenceNo}`);
  });

  if (custAfter.payments.length !== 2) {
    console.error('❌ Expected 2 payment records (Deposit + Refund) but found', custAfter.payments.length);
    process.exit(1);
  }
  console.log('  ✅ Both historical deposit and refund records preserved with full audit trail.');

  // Cleanup
  console.log('\nCleaning up test customer & transactions...');
  await prisma.journalLine.deleteMany({
    where: { journalEntry: { referenceId: { in: [customerId, ...custAfter.payments.map(p => p.id)] } } }
  });
  await prisma.journalEntry.deleteMany({
    where: { referenceId: { in: [customerId, ...custAfter.payments.map(p => p.id)] } }
  });
  await prisma.walletTransaction.deleteMany({
    where: { referenceId: { in: [customerId, ...custAfter.payments.map(p => p.id)] } }
  });
  await prisma.customerPayment.deleteMany({ where: { customerId } });
  await prisma.customer.delete({ where: { id: customerId } });
  // Restore initial wallet
  await prisma.wallet.update({ where: { id: finalWallet.id }, data: { availableBalance: initialBal, totalAllocated: initialBal } });
  console.log('  ✅ Cleanup complete.');

  console.log('\n=== ALL CANCELLATION & REFUND SETTLEMENT TESTS PASSED! ===');
  process.exit(0);
}

testCancellationRefundWorkflow().catch(err => {
  console.error(err);
  process.exit(1);
});
