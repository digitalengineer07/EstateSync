require('dotenv').config();
const prisma = require('../src/config/db');

async function reconcileTreasuryOpeningBalance() {
  console.log('=== Starting Corporate Treasury Opening Balance Reconciliation ===\n');

  const admin = await prisma.user.findFirst({
    where: { role: { name: 'ADMIN' } },
    include: { wallet: true }
  });

  if (!admin || !admin.wallet) {
    console.error('Master Admin or Admin Wallet not found!');
    process.exit(1);
  }

  const wallet = admin.wallet;
  const currentWalletLiquid = parseFloat(wallet.availableBalanceLiquid || 0);
  const currentWalletCash = parseFloat(wallet.availableBalanceCash || 0);
  console.log('CURRENT WALLET BALANCES (WILL NOT BE MODIFIED):', {
    liquid: currentWalletLiquid,
    cash: currentWalletCash,
    total: currentWalletLiquid + currentWalletCash
  });

  // Check if opening records already exist
  const existingInitCap = await prisma.walletTransaction.findFirst({
    where: { referenceId: 'INIT-CAP-2026' }
  });
  if (existingInitCap) {
    console.log('Opening balance transaction INIT-CAP-2026 already exists. Skipping insertion.');
    process.exit(0);
  }

  // Calculate current ledger net sums
  const INFLOW_TYPES = ['CAPITAL_INFUSION', 'CUSTOMER_PAYMENT_RECEIVED'];
  const OUTFLOW_TYPES = ['LAND_ACQUISITION_PAYMENT', 'SALARY_PAYMENT', 'FUND_ALLOCATION'];

  const txs = await prisma.walletTransaction.findMany();
  let currentLiquidIn = 0, currentLiquidOut = 0;
  let currentCashIn = 0, currentCashOut = 0;

  for (const t of txs) {
    const amt = parseFloat(t.amount || 0);
    const mode = (t.fundMode || 'LIQUID').toUpperCase();
    const isInflow = INFLOW_TYPES.includes(t.type);
    const isOutflow = OUTFLOW_TYPES.includes(t.type);

    if (isInflow) {
      if (mode === 'CASH') currentCashIn += amt;
      else currentLiquidIn += amt;
    } else if (isOutflow) {
      if (mode === 'CASH') currentCashOut += amt;
      else currentLiquidOut += amt;
    }
  }

  const netLiquidInLedger = currentLiquidIn - currentLiquidOut;
  const netCashInLedger = currentCashIn - currentCashOut;

  const neededLiquidOpening = currentWalletLiquid - netLiquidInLedger;
  const neededCashOpening = currentWalletCash - netCashInLedger;

  console.log('\n--- CALCULATED OPENING BALANCE GAPS ---');
  console.log(`Current Net Liquid in Ledger: ₹${netLiquidInLedger.toLocaleString('en-IN')}`);
  console.log(`Target Wallet Liquid:         ₹${currentWalletLiquid.toLocaleString('en-IN')}`);
  console.log(`Needed Liquid Opening Entry:  ₹${neededLiquidOpening.toLocaleString('en-IN')}`);
  console.log('----------------------------------------------------');
  console.log(`Current Net Cash in Ledger:   ₹${netCashInLedger.toLocaleString('en-IN')}`);
  console.log(`Target Wallet Cash:           ₹${currentWalletCash.toLocaleString('en-IN')}`);
  console.log(`Needed Cash Opening Entry:    ₹${neededCashOpening.toLocaleString('en-IN')}`);
  console.log('----------------------------------------------------');
  console.log(`Total Opening Capital Entry:  ₹${(neededLiquidOpening + neededCashOpening).toLocaleString('en-IN')}`);

  // Execute in a clean transaction
  await prisma.$transaction(async (tx) => {
    // 1. Create Liquid Capital Infusion
    const liquidTxn = await tx.walletTransaction.create({
      data: {
        type: 'CAPITAL_INFUSION',
        amount: neededLiquidOpening,
        fundMode: 'LIQUID',
        destWalletId: wallet.id,
        referenceType: 'BANK_STATEMENT',
        referenceId: 'INIT-CAP-2026',
        description: 'Corporate Opening Balance: Initial Shareholder Capital & Working Reserves',
        createdBy: admin.email,
        status: 'COMPLETED',
        createdAt: new Date('2026-08-30T00:00:00.000Z')
      }
    });
    console.log(`\nCreated Liquid Opening TX: ${liquidTxn.id} (₹${neededLiquidOpening.toLocaleString('en-IN')})`);

    // 2. Create Cash Counter Float Infusion
    const cashTxn = await tx.walletTransaction.create({
      data: {
        type: 'CAPITAL_INFUSION',
        amount: neededCashOpening,
        fundMode: 'CASH',
        destWalletId: wallet.id,
        referenceType: 'CASH_VOUCHER',
        referenceId: 'INIT-CSH-2026',
        description: 'Corporate Opening Balance: Initial Treasury Cash in Hand Float',
        createdBy: admin.email,
        status: 'COMPLETED',
        createdAt: new Date('2026-08-30T00:00:00.000Z')
      }
    });
    console.log(`Created Cash Opening TX: ${cashTxn.id} (₹${neededCashOpening.toLocaleString('en-IN')})`);

    // 3. Register in GlobalBankReference
    await tx.globalBankReference.upsert({
      where: { referenceNo: 'INIT-CAP-2026' },
      update: {},
      create: {
        referenceNo: 'INIT-CAP-2026',
        module: 'TREASURY_INFLOW',
        sourceTable: 'WalletTransaction',
        sourceRecordId: liquidTxn.id,
        amount: neededLiquidOpening,
        bankName: 'Corporate Treasury Bank',
        paymentMode: 'NEFT',
        recordedBy: admin.email
      }
    });

    await tx.globalBankReference.upsert({
      where: { referenceNo: 'INIT-CSH-2026' },
      update: {},
      create: {
        referenceNo: 'INIT-CSH-2026',
        module: 'TREASURY_INFLOW',
        sourceTable: 'WalletTransaction',
        sourceRecordId: cashTxn.id,
        amount: neededCashOpening,
        bankName: 'Cash in Hand',
        paymentMode: 'CASH',
        recordedBy: admin.email
      }
    });

    // 4. Double-Entry General Ledger Voucher
    const bankAccount = await tx.account.findFirst({ where: { code: '1010' } });
    const capitalAccount = await tx.account.findFirst({ where: { code: '3010' } });

    if (bankAccount && capitalAccount) {
      const entryCount = await tx.journalEntry.count();
      const entryNumber = `JV-INIT-${String(entryCount + 1).padStart(4, '0')}`;

      const totalOpening = neededLiquidOpening + neededCashOpening;

      const journal = await tx.journalEntry.create({
        data: {
          entryNumber,
          date: new Date('2026-08-30T00:00:00.000Z'),
          referenceType: 'CAPITAL_INFUSION',
          referenceId: 'INIT-CAP-2026',
          description: 'Corporate Opening Balance: Recognition of Initial Organizational Capital & Cash Reserves',
          status: 'POSTED',
          createdBy: admin.email,
          lines: {
            create: [
              {
                accountId: bankAccount.id,
                debit: totalOpening,
                credit: 0,
                description: 'Debit Asset: Corporate Treasury Bank & Cash Inflows'
              },
              {
                accountId: capitalAccount.id,
                debit: 0,
                credit: totalOpening,
                description: 'Credit Equity: Organizational Capital & Working Reserves'
              }
            ]
          }
        }
      });
      console.log(`Created Balanced Double-Entry Journal: ${journal.entryNumber} (Total: ₹${totalOpening.toLocaleString('en-IN')})`);
    }

    // NOTE: Wallet balance is INTENTIONALLY NOT TOUCHED!
  });

  console.log('\n=== RECONCILIATION COMPLETED SUCCESSFULLY ===');
}

reconcileTreasuryOpeningBalance()
  .catch((err) => {
    console.error('Reconciliation failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
