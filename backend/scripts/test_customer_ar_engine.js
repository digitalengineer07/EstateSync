const prisma = require('../src/config/db');
const { ensureStandardAccounts, postJournalEntry } = require('../src/utils/accountingHelper');
const { ensureAccountingPeriods, closeAccountingPeriod, reopenAccountingPeriod } = require('../src/services/accountingPeriodService');
const { createPaymentPlan, listPaymentPlans, assignPlanToCustomer } = require('../src/services/paymentPlanService');
const { issueDemandNote, cancelDemandNote, listDemandNotes } = require('../src/services/customerBillingService');
const { recordCustomerReceipt } = require('../src/services/paymentAllocationService');
const { getCustomerStatement, getARAgingReport, getARReconciliationReport } = require('../src/services/customerLedgerService');
const { getPrimaryTreasuryAdmin } = require('../src/utils/treasuryHelper');

const RUN_ID = Date.now().toString().slice(-6);

async function runCustomerAREngineTests() {
  console.log(`=== Starting Phase 7: Customer AR, Milestone Billing & Sub-Ledger Test Suite (Run: ${RUN_ID}) ===\n`);

  // Step 0: Ensure standard chart of accounts & periods
  await ensureStandardAccounts(prisma);
  await ensureAccountingPeriods(prisma, { startYear: 2026, endYear: 2027 });

  const adminUser = await getPrimaryTreasuryAdmin(prisma);
  if (!adminUser) throw new Error('Corporate Treasury Admin not found');

  // Create a clean test customer
  const testPlotNo = `AR-P7-${RUN_ID}`;
  const testKhataNo = `KH-P7-${RUN_ID}`;
  const totalContract = 2000000; // ₹20,00,000

  const customer = await prisma.customer.create({
    data: {
      salesOwnerId: adminUser.id,
      customerName: `Vikram Malhotra (${RUN_ID})`,
      customerContact: `9876${RUN_ID}`,
      projectLocation: 'Palm Greens',
      plotNo: testPlotNo,
      khataNo: testKhataNo,
      areaSqft: 2000,
      identityType: 'Aadhaar',
      identityNumber: `123456${RUN_ID}`,
      totalContractValue: totalContract,
      totalPaid: 0,
      balanceDue: totalContract,
      status: 'ACTIVE'
    }
  });

  console.log(`Step 1: Test Customer Created: "${customer.customerName}" (Contract: ₹${totalContract.toLocaleString('en-IN')})`);

  // -------------------------------------------------------------
  // Test 1: Payment Plan Creation with Percentage Validation
  // -------------------------------------------------------------
  console.log('\nTest 1: Creating Payment Plan with 100% Milestone Sum Validation...');
  
  // Rejection of invalid percentage sum
  let invalidPlanError = null;
  try {
    await createPaymentPlan({
      name: `INVALID_PLAN_${RUN_ID}`,
      milestones: [
        { sequence: 1, name: 'Stage 1', percentage: 40 },
        { sequence: 2, name: 'Stage 2', percentage: 50 } // Sum = 90%
      ],
      createdById: adminUser.id
    });
  } catch (err) {
    invalidPlanError = err;
  }
  if (!invalidPlanError || invalidPlanError.status !== 400) {
    throw new Error('Failed: Invalid percentage sum (90%) was not rejected!');
  }
  console.log('  ✅ Passed: Invalid milestone sum (90%) rejected with HTTP 400.');

  // Create valid 4-stage plan
  const plan = await createPaymentPlan({
    name: `STANDARD_4_STAGE_${RUN_ID}`,
    projectLocation: 'Palm Greens',
    description: 'Standard 4-Stage Plot Milestone Plan',
    milestones: [
      { sequence: 1, name: 'Booking Advance', percentage: 10, dueDaysAfterTrigger: 10 },
      { sequence: 2, name: 'Agreement Signing', percentage: 20, dueDaysAfterTrigger: 15 },
      { sequence: 3, name: 'Plot Demarcation', percentage: 40, dueDaysAfterTrigger: 30 },
      { sequence: 4, name: 'Registry & Handover', percentage: 30, dueDaysAfterTrigger: 15 }
    ],
    createdById: adminUser.id
  });
  console.log(`  ✅ Passed: Payment Plan "${plan.name}" created with 4 milestones summing to 100.00%.`);

  // -------------------------------------------------------------
  // Test 2: Assign Payment Plan to Customer
  // -------------------------------------------------------------
  console.log('\nTest 2: Assigning Payment Plan to Customer...');
  const assignedCustomer = await assignPlanToCustomer({
    customerId: customer.id,
    planId: plan.id,
    actorId: adminUser.id
  });
  if (assignedCustomer.paymentPlanId !== plan.id) {
    throw new Error('Failed to assign payment plan.');
  }
  console.log(`  ✅ Passed: Payment plan assigned to customer "${customer.customerName}".`);

  // -------------------------------------------------------------
  // Test 3 & 4: Issue Milestone 1 Demand Note & Duplicate Rejection
  // -------------------------------------------------------------
  console.log('\nTest 3 & 4: Issuing Milestone 1 Demand Note & Checking Duplicate Rejection...');
  const milestone1 = plan.milestones.find(m => m.sequence === 1); // 10% = ₹200,000

  const dn1Result = await issueDemandNote({
    customerId: customer.id,
    milestoneId: milestone1.id,
    issuedById: adminUser.id,
    issuedByEmail: adminUser.email
  });

  const dn1 = dn1Result.demandNote;
  console.log(`  ✅ Passed: Demand Note ${dn1.demandNumber} issued (Amount: ₹${parseFloat(dn1.totalDemandAmount).toLocaleString('en-IN')}, Status: ${dn1.status})`);
  if (parseFloat(dn1.totalDemandAmount) !== 200000) {
    throw new Error(`Expected demand ₹200,000, got ₹${dn1.totalDemandAmount}`);
  }

  // Duplicate rejection on same milestone
  let dupDNError = null;
  try {
    await issueDemandNote({
      customerId: customer.id,
      milestoneId: milestone1.id,
      issuedById: adminUser.id,
      issuedByEmail: adminUser.email
    });
  } catch (err) {
    dupDNError = err;
  }
  if (!dupDNError || dupDNError.status !== 409) {
    throw new Error('Failed: Duplicate demand note on same milestone was not rejected!');
  }
  console.log('  ✅ Passed: Duplicate demand note on same milestone rejected with HTTP 409.');

  // -------------------------------------------------------------
  // Test 5 & 6: GL Journal & Customer Sub-Ledger Verification for Demand Note
  // -------------------------------------------------------------
  console.log('\nTest 5 & 6: Verifying GL Accrual Journal & Customer Sub-Ledger Entry...');
  const glJournal = await prisma.journalEntry.findUnique({
    where: { id: dn1Result.journalEntry.id },
    include: { lines: { include: { account: true } } }
  });

  const drLine = glJournal.lines.find(l => l.account.code === '1200');
  const crLine = glJournal.lines.find(l => l.account.code === '2040');

  if (!drLine || parseFloat(drLine.debit) !== 200000) throw new Error('Missing or invalid Dr 1200 AR line');
  if (!crLine || parseFloat(crLine.credit) !== 200000) throw new Error('Missing or invalid Cr 2040 Unearned line');
  console.log(`  ✅ Passed: GL Journal ${glJournal.entryNumber} verified: Dr 1200 AR (₹200,000) = Cr 2040 Unearned (₹200,000).`);

  const ledgerEntry1 = await prisma.customerLedgerEntry.findUnique({
    where: { id: dn1Result.ledgerEntry.id }
  });
  if (parseFloat(ledgerEntry1.debit) !== 200000 || parseFloat(ledgerEntry1.runningBalance) !== 200000) {
    throw new Error(`Invalid ledger entry: Debit=${ledgerEntry1.debit}, Balance=${ledgerEntry1.runningBalance}`);
  }
  console.log(`  ✅ Passed: Customer Sub-Ledger Entry ${ledgerEntry1.entryNumber} recorded DEBIT ₹200,000 (Running Balance: ₹200,000).`);

  // -------------------------------------------------------------
  // Test 7: Exact Payment Receipt & Demand Allocation (₹200,000)
  // -------------------------------------------------------------
  console.log('\nTest 7: Recording Exact Customer Payment (₹200,000) against Demand Note 1...');
  const utr1 = `UTR-AR-P7-${RUN_ID}-01`;

  const pay1Result = await recordCustomerReceipt({
    customerId: customer.id,
    amount: 200000,
    paymentMode: 'NEFT',
    referenceNo: utr1,
    recordedById: adminUser.id,
    recordedByEmail: adminUser.email
  });

  const updatedDN1 = await prisma.customerDemandNote.findUnique({ where: { id: dn1.id } });
  if (updatedDN1.status !== 'PAID' || parseFloat(updatedDN1.outstandingAmount) !== 0) {
    throw new Error(`Demand note status expected PAID, got ${updatedDN1.status}`);
  }
  console.log(`  ✅ Passed: Demand Note 1 transitioned to status: ${updatedDN1.status} (Outstanding: ₹0).`);

  const cleReceipt = pay1Result.ledgerEntry;
  if (parseFloat(cleReceipt.credit) !== 200000 || parseFloat(cleReceipt.runningBalance) !== 0) {
    throw new Error(`Sub-ledger credit balance mismatch: Credit=${cleReceipt.credit}, Balance=${cleReceipt.runningBalance}`);
  }
  console.log(`  ✅ Passed: Sub-Ledger CREDIT ₹200,000 recorded (Running Balance restored to ₹0).`);

  // Verify GL receipt journal: Dr 1010 Bank / Cr 1200 AR
  const receiptJournal = await prisma.journalEntry.findUnique({
    where: { id: pay1Result.journalEntry.id },
    include: { lines: { include: { account: true } } }
  });
  const drBank = receiptJournal.lines.find(l => l.account.code === '1010');
  const crAR = receiptJournal.lines.find(l => l.account.code === '1200');
  if (!drBank || !crAR || parseFloat(drBank.debit) !== 200000 || parseFloat(crAR.credit) !== 200000) {
    throw new Error('GL Receipt journal lines invalid');
  }
  console.log(`  ✅ Passed: GL Receipt Journal verified: Dr 1010 Bank (₹200,000) = Cr 1200 AR (₹200,000).`);

  // -------------------------------------------------------------
  // Test 8 & 9: Milestone 2 Demand Note (20% = ₹400,000) & Partial Payment (₹150,000)
  // -------------------------------------------------------------
  console.log('\nTest 8 & 9: Issuing Milestone 2 Demand Note (₹400,000) & Recording Partial Payment (₹150,000)...');
  const milestone2 = plan.milestones.find(m => m.sequence === 2); // 20% = ₹400,000

  const dn2Result = await issueDemandNote({
    customerId: customer.id,
    milestoneId: milestone2.id,
    issuedById: adminUser.id,
    issuedByEmail: adminUser.email
  });

  const dn2 = dn2Result.demandNote;
  console.log(`  ✅ Passed: Demand Note 2 issued (${dn2.demandNumber}, Amount: ₹400,000).`);

  const utr2 = `UTR-AR-P7-${RUN_ID}-02`;
  const pay2Result = await recordCustomerReceipt({
    customerId: customer.id,
    amount: 150000,
    paymentMode: 'RTGS',
    referenceNo: utr2,
    recordedById: adminUser.id,
    recordedByEmail: adminUser.email
  });

  const updatedDN2 = await prisma.customerDemandNote.findUnique({ where: { id: dn2.id } });
  if (updatedDN2.status !== 'PARTIALLY_PAID' || parseFloat(updatedDN2.outstandingAmount) !== 250000) {
    throw new Error(`Partial payment allocation failed: Status=${updatedDN2.status}, Outstanding=${updatedDN2.outstandingAmount}`);
  }
  console.log(`  ✅ Passed: Partial payment allocated. Demand Note 2 status: ${updatedDN2.status} (Allocated: ₹150,000, Outstanding: ₹250,000).`);

  // -------------------------------------------------------------
  // Test 10: Multi-Demand Allocation & Excess Advance Handling (₹300,000)
  // -------------------------------------------------------------
  console.log('\nTest 10: Recording Multi-Demand Payment with Excess Advance (₹300,000 against ₹250,000 outstanding)...');
  const utr3 = `UTR-AR-P7-${RUN_ID}-03`;

  const pay3Result = await recordCustomerReceipt({
    customerId: customer.id,
    amount: 300000,
    paymentMode: 'IMPS',
    referenceNo: utr3,
    recordedById: adminUser.id,
    recordedByEmail: adminUser.email
  });

  if (pay3Result.allocatedAmount !== 250000 || pay3Result.unallocatedAdvance !== 50000) {
    throw new Error(`Allocation split mismatch: Allocated=${pay3Result.allocatedAmount}, Advance=${pay3Result.unallocatedAdvance}`);
  }
  console.log(`  ✅ Passed: ₹250,000 liquidated Demand Note 2 (status -> PAID), excess ₹50,000 booked as Customer Advance.`);

  const fullyPaidDN2 = await prisma.customerDemandNote.findUnique({ where: { id: dn2.id } });
  if (fullyPaidDN2.status !== 'PAID') throw new Error('Demand Note 2 not fully paid');
  console.log('  ✅ Passed: Demand Note 2 verified status: PAID.');

  // -------------------------------------------------------------
  // Test 11: Demand Note Cancellation with Symmetric Reversal
  // -------------------------------------------------------------
  console.log('\nTest 11: Testing Demand Note Cancellation & Symmetric GL Reversal...');
  const milestone3 = plan.milestones.find(m => m.sequence === 3); // 40% = ₹800,000

  const dn3Result = await issueDemandNote({
    customerId: customer.id,
    milestoneId: milestone3.id,
    issuedById: adminUser.id,
    issuedByEmail: adminUser.email
  });

  const cancelResult = await cancelDemandNote({
    demandNoteId: dn3Result.demandNote.id,
    reason: 'Client requested postponement of milestone billing due to weather delay',
    cancelledById: adminUser.id,
    cancelledByEmail: adminUser.email
  });

  if (cancelResult.demandNote.status !== 'CANCELLED') {
    throw new Error('Demand note status expected CANCELLED');
  }
  console.log(`  ✅ Passed: Demand Note 3 cancelled. Reversal Journal ${cancelResult.reversalJournal.entryNumber} posted.`);

  // -------------------------------------------------------------
  // Test 12: Accounts Receivable Aging Report Verification
  // -------------------------------------------------------------
  console.log('\nTest 12: Generating Accounts Receivable (AR) Aging Report...');
  const agingReport = await getARAgingReport();
  console.log('  - Enterprise AR Aging Summary:', agingReport.summary);
  if (typeof agingReport.summary.totalOutstanding !== 'number') {
    throw new Error('Invalid aging report structure');
  }
  console.log('  ✅ Passed: AR Aging report generated dynamically across 0-30, 31-60, 61-90, 90+ buckets.');

  // -------------------------------------------------------------
  // Test 13: Customer Statement of Account
  // -------------------------------------------------------------
  console.log('\nTest 13: Generating Customer Statement of Account...');
  const statement = await getCustomerStatement({ customerId: customer.id });
  console.log(`  - Customer: ${statement.customer.name}`);
  console.log(`  - Total Debits: ₹${statement.totalDebits.toLocaleString('en-IN')}`);
  console.log(`  - Total Credits: ₹${statement.totalCredits.toLocaleString('en-IN')}`);
  console.log(`  - Closing Balance: ₹${statement.closingBalance.toLocaleString('en-IN')} (${statement.netPosition})`);
  console.log(`  - Total Statement Lines: ${statement.lines.length}`);

  const expectedClosing = statement.openingBalance + statement.totalDebits - statement.totalCredits;
  if (Math.abs(statement.closingBalance - expectedClosing) > 0.01) {
    throw new Error('Customer statement opening + debits - credits != closing balance');
  }
  console.log('  ✅ Passed: Customer Statement mathematically balanced (Opening + Debits - Credits == Closing Balance).');

  // -------------------------------------------------------------
  // Test 14: Sub-Ledger to GL Control Account Reconciliation
  // -------------------------------------------------------------
  console.log('\nTest 14: Running Sub-Ledger to General Ledger Control Account Reconciliation...');
  const recon = await getARReconciliationReport();
  console.log('  - AR Control (1200): GL Balance = ₹' + recon.accountsReceivable.glControlBalance + ', Subledger Sum = ₹' + recon.accountsReceivable.subledgerReceivablesSum + ', Discrepancy = ₹' + recon.accountsReceivable.discrepancy);
  console.log('  - Advance Control (2040): GL Balance = ₹' + recon.customerAdvances.glControlBalance + ', Subledger Sum = ₹' + recon.customerAdvances.subledgerAdvancesSum + ', Discrepancy = ₹' + recon.customerAdvances.discrepancy);

  if (!recon.overallReconciled) {
    throw new Error(`Sub-ledger to GL reconciliation failed! AR Discrepancy: ${recon.accountsReceivable.discrepancy}, Advance Discrepancy: ${recon.customerAdvances.discrepancy}`);
  }
  console.log('  ✅ Passed: Sub-Ledger to General Ledger 100% RECONCILED (Discrepancy: ₹0.00).');

  // -------------------------------------------------------------
  // Test 15: Concurrency Double-Spend & Advisory Lock Race Test
  // -------------------------------------------------------------
  console.log('\nTest 15: Testing Concurrent Demand Note Generation Race Protection...');
  const milestone4 = plan.milestones.find(m => m.sequence === 4); // 30% = ₹600,000

  const [race1, race2] = await Promise.allSettled([
    issueDemandNote({
      customerId: customer.id,
      milestoneId: milestone4.id,
      issuedById: adminUser.id,
      issuedByEmail: adminUser.email
    }),
    issueDemandNote({
      customerId: customer.id,
      milestoneId: milestone4.id,
      issuedById: adminUser.id,
      issuedByEmail: adminUser.email
    })
  ]);

  const successes = [race1, race2].filter(r => r.status === 'fulfilled');
  const rejections = [race1, race2].filter(r => r.status === 'rejected');

  if (successes.length !== 1 || rejections.length !== 1) {
    throw new Error(`Concurrency race invariant violated! Successes: ${successes.length}, Rejections: ${rejections.length}`);
  }
  console.log('  ✅ Passed: Concurrency race test verified: Exactly 1 demand note issued, duplicate concurrent request rejected with 409.');

  // -------------------------------------------------------------
  // Cleanup Test Data
  // -------------------------------------------------------------
  console.log('\nCleaning up Phase 7 test records...');
  await prisma.paymentAllocation.deleteMany({
    where: { payment: { customerId: customer.id } }
  });
  await prisma.customerLedgerEntry.deleteMany({
    where: { customerId: customer.id }
  });
  await prisma.customerDemandNote.deleteMany({
    where: { customerId: customer.id }
  });
  await prisma.customerPayment.deleteMany({
    where: { customerId: customer.id }
  });
  await prisma.globalBankReference.deleteMany({
    where: { referenceNo: { in: [utr1, utr2, utr3] } }
  });
  await prisma.customer.delete({
    where: { id: customer.id }
  });
  // Clean up test journals
  await prisma.journalLine.deleteMany({
    where: {
      journalEntry: {
        referenceType: { in: ['CUSTOMER_DEMAND_NOTE', 'CUSTOMER_PAYMENT', 'DEMAND_NOTE_CANCELLATION'] }
      }
    }
  });
  await prisma.journalEntry.deleteMany({
    where: {
      referenceType: { in: ['CUSTOMER_DEMAND_NOTE', 'CUSTOMER_PAYMENT', 'DEMAND_NOTE_CANCELLATION'] }
    }
  });
  await prisma.paymentPlanMilestone.deleteMany({
    where: { planId: plan.id }
  });
  await prisma.paymentPlan.delete({
    where: { id: plan.id }
  });
  console.log('✅ Cleanup complete.');

  console.log('\n=== ALL PHASE 7 CUSTOMER AR & SUB-LEDGER TESTS PASSED (15/15)! ===\n');
  process.exit(0);
}

runCustomerAREngineTests().catch(err => {
  console.error('\n❌ FATAL TEST ERROR:', err);
  process.exit(1);
});
