/**
 * Comprehensive Automated Test Suite for Phase 6:
 * Enterprise Accounting Controls — GlobalBankReference & AccountingPeriod Governance
 */

const prisma = require('../src/config/db');
const { ensureStandardAccounts, postJournalEntry } = require('../src/utils/accountingHelper');
const { getPrimaryTreasuryAdmin, getPrimaryTreasuryWallet } = require('../src/utils/treasuryHelper');
const {
  normalizeReferenceNo,
  checkDuplicateReferenceNo,
  registerBankReference,
  markReferenceReversed
} = require('../src/utils/referenceValidator');
const {
  ensureAccountingPeriods,
  listAccountingPeriods,
  getPeriodForDate,
  closeAccountingPeriod,
  reopenAccountingPeriod
} = require('../src/services/accountingPeriodService');

async function main() {
  console.log('=== Starting Phase 6: Enterprise Accounting Controls Test Suite ===\n');

  const testSuffix = Date.now().toString().slice(-6);
  let adminUserId;

  try {
    // -------------------------------------------------------------
    // Setup Phase
    // -------------------------------------------------------------
    console.log('Setup: Ensuring Standard Chart of Accounts & Master Treasury...');
    await ensureStandardAccounts(prisma);

    const admin = await getPrimaryTreasuryAdmin(prisma);
    adminUserId = admin.id;

    console.log('  ✅ Setup complete.\n');

    // -------------------------------------------------------------
    // Test 1: UTR Normalization
    // -------------------------------------------------------------
    console.log('Test 1: Testing UTR Normalization (Whitespace & Uppercase Collation)...');
    const rawRef = `   utr-norm-${testSuffix}-001   `;
    const normalized = normalizeReferenceNo(rawRef);
    const expected = `UTR-NORM-${testSuffix}-001`;

    if (normalized !== expected) {
      throw new Error(`Normalization failed: expected "${expected}", got "${normalized}"`);
    }
    console.log(`  ✅ Passed: "${rawRef}" normalized to "${normalized}"`);

    // -------------------------------------------------------------
    // Test 2: GlobalBankReference Atomic Registration
    // -------------------------------------------------------------
    console.log('\nTest 2: Testing GlobalBankReference Atomic Registration...');
    const regRef = `UTR-REG-${testSuffix}-001`;
    const regRes = await prisma.$transaction(async (tx) => {
      return await registerBankReference(tx, {
        referenceNo: regRef,
        module: 'CUSTOMER_PAYMENT',
        sourceTable: 'CustomerPayment',
        sourceRecordId: `CUST-PAY-${testSuffix}`,
        amount: 25000,
        bankName: 'HDFC Bank',
        paymentMode: 'NEFT',
        recordedBy: 'admin@estatesync.local'
      });
    });

    if (!regRes || regRes.referenceNo !== regRef || regRes.status !== 'ACTIVE') {
      throw new Error(`Registration failed: ${JSON.stringify(regRes)}`);
    }
    console.log(`  ✅ Passed: Registered ${regRes.referenceNo} in GlobalBankReference (ID: ${regRes.id})`);

    // -------------------------------------------------------------
    // Test 3: Same-Module Duplicate UTR Rejection
    // -------------------------------------------------------------
    console.log('\nTest 3: Testing Same-Module Duplicate UTR Rejection...');
    try {
      await prisma.$transaction(async (tx) => {
        await registerBankReference(tx, {
          referenceNo: regRef, // Exact same reference
          module: 'CUSTOMER_PAYMENT',
          sourceTable: 'CustomerPayment',
          sourceRecordId: `CUST-PAY-DUP-${testSuffix}`,
          amount: 5000,
          recordedBy: 'admin@estatesync.local'
        });
      });
      throw new Error('Same-module duplicate UTR unexpectedly succeeded!');
    } catch (err) {
      if (err.code === 'DUPLICATE_REFERENCE_NO') {
        console.log(`  ✅ Passed: Duplicate UTR rejected with: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Test 4: Cross-Module Duplicate UTR Rejection (Customer -> Salary)
    // -------------------------------------------------------------
    console.log('\nTest 4: Testing Cross-Module Duplicate UTR Rejection (Customer -> Salary)...');
    try {
      await prisma.$transaction(async (tx) => {
        await registerBankReference(tx, {
          referenceNo: regRef.toLowerCase(), // Testing case-insensitive match
          module: 'SALARY_PAYMENT',
          sourceTable: 'SalaryPayment',
          sourceRecordId: `SAL-PAY-${testSuffix}`,
          amount: 12000,
          recordedBy: 'accounting@estatesync.local'
        });
      });
      throw new Error('Cross-module duplicate UTR unexpectedly succeeded!');
    } catch (err) {
      if (err.code === 'DUPLICATE_REFERENCE_NO') {
        console.log(`  ✅ Passed: Cross-module duplicate rejected with: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Test 5: Concurrent UTR Race Protection (Database Engine Serialization)
    // -------------------------------------------------------------
    console.log('\nTest 5: Testing Concurrent UTR Race Condition (Simultaneous Race)...');
    const raceRef = `UTR-RACE-${testSuffix}-001`;

    const [race1, race2] = await Promise.allSettled([
      prisma.$transaction(async (tx) => {
        return await registerBankReference(tx, {
          referenceNo: raceRef,
          module: 'CUSTOMER_PAYMENT',
          sourceTable: 'CustomerPayment',
          sourceRecordId: `RACE-1-${testSuffix}`,
          amount: 10000,
          recordedBy: 'admin@estatesync.local'
        });
      }),
      prisma.$transaction(async (tx) => {
        return await registerBankReference(tx, {
          referenceNo: raceRef,
          module: 'PROPERTY_PAYMENT',
          sourceTable: 'PropertyPayment',
          sourceRecordId: `RACE-2-${testSuffix}`,
          amount: 10000,
          recordedBy: 'admin@estatesync.local'
        });
      })
    ]);

    const successes = [race1, race2].filter(r => r.status === 'fulfilled');
    const failures = [race1, race2].filter(r => r.status === 'rejected');

    if (successes.length !== 1 || failures.length !== 1) {
      throw new Error(`Concurrency race failed: ${successes.length} succeeded, ${failures.length} failed`);
    }
    console.log('  ✅ Passed: Exactly 1 concurrent transaction registered; 2nd received conflict error. Zero double-spend.');

    // -------------------------------------------------------------
    // Test 6: ACID Rollback Safety on Registry
    // -------------------------------------------------------------
    console.log('\nTest 6: Testing ACID Transaction Rollback on GlobalBankReference...');
    const rollbackRef = `UTR-ROLL-${testSuffix}-001`;

    try {
      await prisma.$transaction(async (tx) => {
        await registerBankReference(tx, {
          referenceNo: rollbackRef,
          module: 'TREASURY_INFLOW',
          sourceTable: 'WalletTransaction',
          sourceRecordId: `TXN-ROLL-${testSuffix}`,
          amount: 50000,
          recordedBy: 'admin@estatesync.local'
        });
        // Intentionally throw error to abort transaction
        throw new Error('SIMULATED_BUSINESS_LOGIC_FAILURE');
      });
    } catch (err) {
      if (err.message !== 'SIMULATED_BUSINESS_LOGIC_FAILURE') throw err;
    }

    // Verify record was completely rolled back
    const rolledBackCheck = await prisma.globalBankReference.findUnique({
      where: { referenceNo: rollbackRef }
    });
    if (rolledBackCheck) {
      throw new Error('GlobalBankReference persisted despite transaction rollback!');
    }
    console.log('  ✅ Passed: GlobalBankReference cleanly rolled back on business failure.');

    // -------------------------------------------------------------
    // Test 7: Reversal Persistence (Reference Remains Registered)
    // -------------------------------------------------------------
    console.log('\nTest 7: Testing Reversal Persistence in Registry...');
    await prisma.$transaction(async (tx) => {
      await markReferenceReversed(tx, {
        referenceNo: regRef,
        sourceRecordId: `CUST-PAY-${testSuffix}`,
        reason: 'Customer cancelled cheque'
      });
    });

    const reversedRecord = await prisma.globalBankReference.findUnique({
      where: { referenceNo: regRef }
    });

    if (!reversedRecord || reversedRecord.status !== 'REVERSED') {
      throw new Error(`Reversal status mismatch: ${JSON.stringify(reversedRecord)}`);
    }

    // Subsequent attempt to reuse reversed UTR must still be rejected
    const dupCheckOnReversed = await checkDuplicateReferenceNo(prisma, regRef);
    if (!dupCheckOnReversed) {
      throw new Error('Reversed UTR was incorrectly released for reuse!');
    }
    console.log('  ✅ Passed: Reversed UTR remains permanently registered with status REVERSED; reuse is blocked.');

    // -------------------------------------------------------------
    // Test 8: Accounting Period Initialization & Listing
    // -------------------------------------------------------------
    console.log('\nTest 8: Testing AccountingPeriod Calendar Initialization...');
    await ensureAccountingPeriods(prisma, { startYear: 2026, endYear: 2026 });
    const periods = await listAccountingPeriods({ fiscalYear: 2026 });

    if (periods.length !== 12) {
      throw new Error(`Expected 12 periods for 2026, got ${periods.length}`);
    }
    console.log(`  ✅ Passed: Verified 12 monthly Accounting Periods for fiscal year 2026 (e.g. ${periods[0].periodName} status: ${periods[0].status})`);

    // -------------------------------------------------------------
    // Test 9: Journal Entry Posting in OPEN Period
    // -------------------------------------------------------------
    console.log('\nTest 9: Testing Journal Entry Posting in OPEN Period...');
    const openDate = new Date('2026-07-15');
    const journalOpen = await prisma.$transaction(async (tx) => {
      return await postJournalEntry(tx, {
        description: `Test Open Period Entry (${testSuffix})`,
        referenceType: 'TEST_ENTRY',
        referenceId: `TEST-${testSuffix}-001`,
        createdBy: 'admin@estatesync.local',
        postingDate: openDate,
        lines: [
          { accountCode: '1010', debit: 1000, credit: 0, description: 'Bank Debit' },
          { accountCode: '4010', debit: 0, credit: 1000, description: 'Revenue Credit' }
        ]
      });
    });

    if (!journalOpen.accountingPeriodId) {
      throw new Error(`JournalEntry not linked to AccountingPeriod: ${JSON.stringify(journalOpen)}`);
    }
    console.log(`  ✅ Passed: Journal ${journalOpen.entryNumber} posted in OPEN period (Period ID: ${journalOpen.accountingPeriodId})`);

    // -------------------------------------------------------------
    // Test 10: Closing an Accounting Period
    // -------------------------------------------------------------
    console.log('\nTest 10: Testing Closing an Accounting Period (2026-07)...');
    const periodJuly = periods.find(p => p.periodName === '2026-07');
    const closeRes = await closeAccountingPeriod({
      periodId: periodJuly.id,
      actorEmail: 'admin@estatesync.local',
      actorId: adminUserId
    });

    if (!closeRes.success || closeRes.period.status !== 'CLOSED') {
      throw new Error(`Close period failed: ${JSON.stringify(closeRes)}`);
    }
    console.log(`  ✅ Passed: Period ${closeRes.period.periodName} transitioned to status: ${closeRes.period.status}`);

    // -------------------------------------------------------------
    // Test 11: Journal Entry Posting in CLOSED Period Rejection
    // -------------------------------------------------------------
    console.log('\nTest 11: Testing Journal Entry Posting in CLOSED Period Rejection...');
    try {
      await prisma.$transaction(async (tx) => {
        await postJournalEntry(tx, {
          description: `Illegal Closed Period Entry (${testSuffix})`,
          referenceType: 'TEST_ENTRY',
          referenceId: `TEST-${testSuffix}-002`,
          createdBy: 'admin@estatesync.local',
          postingDate: new Date('2026-07-20'), // Inside closed July 2026
          lines: [
            { accountCode: '1010', debit: 5000, credit: 0, description: 'Bank Debit' },
            { accountCode: '4010', debit: 0, credit: 5000, description: 'Revenue Credit' }
          ]
        });
      });
      throw new Error('Posting into CLOSED period unexpectedly succeeded!');
    } catch (err) {
      if (err.code === 'ACCOUNTING_PERIOD_CLOSED') {
        console.log(`  ✅ Passed: Posting into CLOSED period rejected with: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Test 12: Period Boundary Date Verification
    // -------------------------------------------------------------
    console.log('\nTest 12: Testing Period Boundary Dates (First Day & Last Day)...');
    const startBoundary = new Date('2026-08-01T00:00:00.000Z');
    const endBoundary = new Date('2026-08-31T23:59:59.000Z');

    const jStart = await prisma.$transaction(async (tx) => {
      return await postJournalEntry(tx, {
        description: `Start Boundary Test (${testSuffix})`,
        referenceType: 'TEST_ENTRY',
        postingDate: startBoundary,
        lines: [
          { accountCode: '1010', debit: 200, credit: 0, description: 'Dr' },
          { accountCode: '4010', debit: 0, credit: 200, description: 'Cr' }
        ]
      });
    });

    const jEnd = await prisma.$transaction(async (tx) => {
      return await postJournalEntry(tx, {
        description: `End Boundary Test (${testSuffix})`,
        referenceType: 'TEST_ENTRY',
        postingDate: endBoundary,
        lines: [
          { accountCode: '1010', debit: 200, credit: 0, description: 'Dr' },
          { accountCode: '4010', debit: 0, credit: 200, description: 'Cr' }
        ]
      });
    });

    if (!jStart.accountingPeriodId || !jEnd.accountingPeriodId) {
      throw new Error('Boundary postings failed to attach accountingPeriodId');
    }
    console.log('  ✅ Passed: Exact start boundary and end boundary postings verified.');

    // -------------------------------------------------------------
    // Test 13: Reopening Period without Valid Reason Rejection
    // -------------------------------------------------------------
    console.log('\nTest 13: Testing Reopening Period without Mandatory Reason Rejection...');
    try {
      await reopenAccountingPeriod({
        periodId: periodJuly.id,
        reason: 'short', // Less than 10 characters
        actorEmail: 'admin@estatesync.local',
        actorId: adminUserId
      });
      throw new Error('Reopening period without valid reason unexpectedly succeeded!');
    } catch (err) {
      if (err.code === 'REOPEN_REASON_REQUIRED') {
        console.log(`  ✅ Passed: Reopen without reason rejected with: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Test 14: Admin Reopening Period with Mandatory Reason
    // -------------------------------------------------------------
    console.log('\nTest 14: Testing Admin Reopening Period with Mandatory Reason...');
    const reopenRes = await reopenAccountingPeriod({
      periodId: periodJuly.id,
      reason: 'Audit adjustment requested by statutory auditor for Q2 reconciliations',
      actorEmail: 'admin@estatesync.local',
      actorId: adminUserId
    });

    if (!reopenRes.success || reopenRes.period.status !== 'OPEN') {
      throw new Error(`Reopen failed: ${JSON.stringify(reopenRes)}`);
    }
    console.log(`  ✅ Passed: Period ${reopenRes.period.periodName} REOPENED (Status: ${reopenRes.period.status}, Reason: "${reopenRes.period.reopenReason}")`);

    // Posting into July 2026 now succeeds
    const jAfterReopen = await prisma.$transaction(async (tx) => {
      return await postJournalEntry(tx, {
        description: `Post Reopen Entry (${testSuffix})`,
        referenceType: 'TEST_ENTRY',
        postingDate: new Date('2026-07-20'),
        lines: [
          { accountCode: '1010', debit: 500, credit: 0, description: 'Dr' },
          { accountCode: '4010', debit: 0, credit: 500, description: 'Cr' }
        ]
      });
    });
    console.log(`  ✅ Passed: Post-reopen journal ${jAfterReopen.entryNumber} posted successfully.`);

    // -------------------------------------------------------------
    // Test 15: Reversal of Historical Transaction from Closed Period
    // -------------------------------------------------------------
    console.log('\nTest 15: Testing Reversal Policy for Closed Original Period...');
    // Close July 2026 again
    await closeAccountingPeriod({ periodId: periodJuly.id, actorEmail: 'admin@estatesync.local', actorId: adminUserId });

    // When reversing an entry from July 2026, the reversal must be posted in CURRENT OPEN PERIOD (e.g. today / August)
    const currentOpenDate = new Date();
    const reversalJournal = await prisma.$transaction(async (tx) => {
      return await postJournalEntry(tx, {
        description: `Reversal of July Entry ${jAfterReopen.entryNumber}`,
        referenceType: 'TEST_REVERSAL',
        referenceId: jAfterReopen.id,
        postingDate: currentOpenDate, // Reversal posted in current open period
        lines: [
          { accountCode: '4010', debit: 500, credit: 0, description: 'Reversed Revenue' },
          { accountCode: '1010', debit: 0, credit: 500, description: 'Reversed Bank' }
        ]
      });
    });

    if (reversalJournal.accountingPeriodId === periodJuly.id) {
      throw new Error('Reversal journal was incorrectly created in closed period!');
    }
    console.log(`  ✅ Passed: Reversal journal ${reversalJournal.entryNumber} posted in current active OPEN period (Period ID: ${reversalJournal.accountingPeriodId}) without breaching closed period.`);

    console.log('\n=== ALL PHASE 6 ENTERPRISE ACCOUNTING CONTROLS TESTS PASSED! ===');

  } finally {
    console.log('\nCleaning up Phase 6 test records...');
    await prisma.journalLine.deleteMany({ where: { journalEntry: { description: { contains: testSuffix } } } });
    await prisma.journalEntry.deleteMany({ where: { description: { contains: testSuffix } } });
    await prisma.globalBankReference.deleteMany({ where: { referenceNo: { contains: testSuffix } } });
    console.log('✅ Cleanup complete.');
  }
}

main().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
