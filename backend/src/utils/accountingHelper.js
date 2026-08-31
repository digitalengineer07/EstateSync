const prisma = require('../config/db');

const STANDARD_ACCOUNTS = [
  { code: '1010', name: 'Corporate Bank / Primary Treasury', type: 'ASSET', description: 'Central company bank account and master capital reserve' },
  { code: '1020', name: 'Manager Operational Wallets', type: 'ASSET', description: 'Allocated funds held in Manager wallets' },
  { code: '1030', name: 'Team / Field Wallets', type: 'ASSET', description: 'Allocated funds held in Sales, Marketing, and Staff wallets' },
  { code: '1510', name: 'Land & Real Estate Property Assets', type: 'ASSET', description: 'Acquired land parcels, fixed property assets, and development rights' },
  { code: '3010', name: 'Organizational Capital', type: 'EQUITY', description: 'Capital reserves and equity funding' },
  { code: '3020', name: 'Director Loans & Shareholder Advances', type: 'LIABILITY', description: 'Promoter loans and director capital advances' },
  { code: '4010', name: 'Customer Sales & Contract Revenue', type: 'REVENUE', description: 'Customer plot bookings and contract collections' },
  { code: '4020', name: 'Bank Interest & Miscellaneous Receipts', type: 'REVENUE', description: 'Bank interest, refunds, and miscellaneous receipts' },
  { code: '5010', name: 'Travel & Field Expenses', type: 'EXPENSE', description: 'Client site visits, travel, fuel, transport' },
  { code: '5020', name: 'Marketing & Promotions', type: 'EXPENSE', description: 'Lead generation, print collateral, digital ads' },
  { code: '5030', name: 'Client Entertainment & Hospitality', type: 'EXPENSE', description: 'Customer meetings, food, refreshments' },
  { code: '5040', name: 'Office Supplies & Utilities', type: 'EXPENSE', description: 'Stationery, telecom, petty equipment' },
  { code: '5050', name: 'General & Miscellaneous Operations', type: 'EXPENSE', description: 'General operational overheads' }
];

let accountsInitialized = false;

/**
 * Ensure default Chart of Accounts exist in the database (cached in-memory)
 */
async function ensureStandardAccounts(db = prisma) {
  if (accountsInitialized) return;
  try {
    const existing = await db.account.findMany({
      select: { code: true }
    });
    const existingCodes = new Set(existing.map(a => a.code));
    const missing = STANDARD_ACCOUNTS.filter(a => !existingCodes.has(a.code));

    if (missing.length > 0) {
      await db.account.createMany({
        data: missing,
        skipDuplicates: true
      });
    }
    accountsInitialized = true;
  } catch (err) {
    console.error('Account seeding error:', err);
  }
}

// Pre-initialize standard accounts in background
ensureStandardAccounts().catch(console.error);

/**
 * Post an atomic Double-Entry Journal Entry
 * Invariant: Sum of Debits MUST equal Sum of Credits.
 */
async function postJournalEntry(tx, {
  description,
  referenceType,
  referenceId,
  createdBy,
  lines // [{ accountCode, debit, credit, description }]
}) {
  if (!lines || lines.length < 2) {
    throw new Error('Journal entry requires at least two lines (Double-Entry Bookkeeping)');
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    totalDebit += parseFloat(line.debit || 0);
    totalCredit += parseFloat(line.credit || 0);
  }

  // Float precision comparison up to 2 decimals
  if (Math.abs(totalDebit - totalCredit) > 0.009) {
    throw new Error(`Double-entry bookkeeping mismatch: Total Debits (₹${totalDebit.toFixed(2)}) must equal Total Credits (₹${totalCredit.toFixed(2)})`);
  }

  // Fetch account IDs for codes in a single query
  const codes = lines.map(l => l.accountCode);
  let accounts = await tx.account.findMany({
    where: { code: { in: codes } }
  });

  if (accounts.length === 0) {
    await ensureStandardAccounts(tx);
    accounts = await tx.account.findMany({
      where: { code: { in: codes } }
    });
  }

  const accountMap = new Map(accounts.map(a => [a.code, a.id]));

  // Generate sequential unique entry number for today
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const todayPrefix = `JE-${dateStr}-`;
  const latestEntry = await tx.journalEntry.findFirst({
    where: { entryNumber: { startsWith: todayPrefix } },
    orderBy: { entryNumber: 'desc' }
  });

  let nextSeq = 1;
  if (latestEntry) {
    const parts = latestEntry.entryNumber.split('-');
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }

  let entryNumber = `${todayPrefix}${String(nextSeq).padStart(4, '0')}`;

  // Double check uniqueness in case of race condition
  const existing = await tx.journalEntry.findUnique({ where: { entryNumber } });
  if (existing) {
    entryNumber = `${todayPrefix}${Date.now().toString().slice(-4)}`;
  }

  const entry = await tx.journalEntry.create({
    data: {
      entryNumber,
      description,
      referenceType,
      referenceId: referenceId ? String(referenceId) : null,
      createdBy: String(createdBy || 'SYSTEM'),
      status: 'POSTED',
      lines: {
        create: lines.map(l => ({
          accountId: accountMap.get(l.accountCode) || accounts[0]?.id,
          debit: parseFloat(l.debit || 0),
          credit: parseFloat(l.credit || 0),
          description: l.description || description
        }))
      }
    }
  });

  return entry;
}

/**
 * Double-Entry Post: Direct Fund Allocation
 * Debit: Recipient Wallet (Asset +)
 * Credit: Source Wallet / Treasury (Asset -)
 */
async function postAllocationJournal(tx, {
  sourceWalletType = 'TREASURY',
  recipientWalletType = 'MANAGER',
  amount,
  description,
  referenceId,
  createdBy
}) {
  const debitCode = recipientWalletType === 'MANAGER' ? '1020' : '1030';
  const creditCode = sourceWalletType === 'TREASURY' ? '1010' : '1020';

  return await postJournalEntry(tx, {
    description: `Fund Allocation: ${description}`,
    referenceType: 'FUND_ALLOCATION',
    referenceId,
    createdBy,
    lines: [
      { accountCode: debitCode, debit: amount, credit: 0, description: `Increase ${recipientWalletType} Wallet Balance` },
      { accountCode: creditCode, debit: 0, credit: amount, description: `Decrease ${sourceWalletType} Available Capital` }
    ]
  });
}

/**
 * Double-Entry Post: Expense Recorded
 * Debit: Expense Account (Expense +)
 * Credit: User Wallet Account (Asset -)
 */
async function postExpenseJournal(tx, {
  categoryName = 'General',
  userRole = 'TEAM',
  amount,
  description,
  referenceId,
  createdBy
}) {
  let expenseCode = '5050';
  const cat = (categoryName || '').toLowerCase();
  if (cat.includes('travel') || cat.includes('cab') || cat.includes('fuel')) expenseCode = '5010';
  else if (cat.includes('market') || cat.includes('ad') || cat.includes('lead')) expenseCode = '5020';
  else if (cat.includes('food') || cat.includes('client') || cat.includes('entertain')) expenseCode = '5030';
  else if (cat.includes('office') || cat.includes('suppl') || cat.includes('station')) expenseCode = '5040';

  const walletCode = userRole === 'MANAGER' ? '1020' : '1030';

  return await postJournalEntry(tx, {
    description: `Expense Recorded: ${description}`,
    referenceType: 'EXPENSE',
    referenceId,
    createdBy,
    lines: [
      { accountCode: expenseCode, debit: amount, credit: 0, description: `Recognize Expense: ${categoryName}` },
      { accountCode: walletCode, debit: 0, credit: amount, description: `Deduct from ${userRole} Wallet` }
    ]
  });
}

/**
 * Double-Entry Post: Expense Reversal
 * Debit: User Wallet Account (Asset +)
 * Credit: Expense Account (Expense -)
 */
async function postExpenseReversalJournal(tx, {
  categoryName = 'General',
  userRole = 'TEAM',
  amount,
  description,
  referenceId,
  createdBy
}) {
  let expenseCode = '5050';
  const cat = (categoryName || '').toLowerCase();
  if (cat.includes('travel') || cat.includes('cab') || cat.includes('fuel')) expenseCode = '5010';
  else if (cat.includes('market') || cat.includes('ad') || cat.includes('lead')) expenseCode = '5020';
  else if (cat.includes('food') || cat.includes('client') || cat.includes('entertain')) expenseCode = '5030';
  else if (cat.includes('office') || cat.includes('suppl') || cat.includes('station')) expenseCode = '5040';

  const walletCode = userRole === 'MANAGER' ? '1020' : '1030';

  return await postJournalEntry(tx, {
    description: `Reversal of Expense: ${description}`,
    referenceType: 'EXPENSE_REVERSAL',
    referenceId,
    createdBy,
    lines: [
      { accountCode: walletCode, debit: amount, credit: 0, description: `Restored Balance to ${userRole} Wallet` },
      { accountCode: expenseCode, debit: 0, credit: amount, description: `Reversed Expense Category: ${categoryName}` }
    ]
  });
}

/**
 * Double-Entry Post: Customer Payment Received
 * Debit: Corporate Bank / Primary Treasury (Asset +)
 * Credit: Customer Sales & Contract Revenue (Revenue +)
 */
async function postCustomerPaymentJournal(tx, {
  amount,
  customerName,
  plotNo,
  referenceId,
  createdBy
}) {
  return await postJournalEntry(tx, {
    description: `Customer Collection: ${customerName} (Plot ${plotNo})`,
    referenceType: 'CUSTOMER_PAYMENT',
    referenceId,
    createdBy,
    lines: [
      { accountCode: '1010', debit: amount, credit: 0, description: `Bank Inflow: Collection from ${customerName}` },
      { accountCode: '4010', debit: 0, credit: amount, description: `Recognize Contract Revenue: Plot ${plotNo}` }
    ]
  });
}

/**
 * Double-Entry Post: Land Acquisition Payout to Land Owner
 * Debit: Land & Real Estate Property Assets (Asset +)
 * Credit: Corporate Bank / Primary Treasury (Asset -)
 */
async function postPropertyPaymentJournal(tx, {
  amount,
  landOwnerName,
  khataNo,
  plotNo,
  referenceId,
  createdBy
}) {
  return await postJournalEntry(tx, {
    description: `Land Acquisition Payment: ${landOwnerName} (Khata ${khataNo}, Plot ${plotNo})`,
    referenceType: 'PROPERTY_PAYMENT',
    referenceId,
    createdBy,
    lines: [
      { accountCode: '1510', debit: amount, credit: 0, description: `Fixed Asset Inflow: Land Parcel Khata ${khataNo} Plot ${plotNo}` },
      { accountCode: '1010', debit: 0, credit: amount, description: `Bank Outflow: Payout to ${landOwnerName}` }
    ]
  });
}

/**
 * Double-Entry Post: Bank Inflow / Capital Infusion into Corporate Treasury
 * Debit: Corporate Bank / Primary Treasury (Asset +)
 * Credit: Organizational Capital (3010) or Director Loan (3020) or Other Inflow (4020)
 */
async function postCapitalInfusionJournal(tx, {
  amount,
  inflowType = 'CAPITAL_INFUSION', // 'CAPITAL_INFUSION', 'DIRECTOR_LOAN', 'BANK_INTEREST', 'OTHER'
  bankName,
  referenceNo,
  description,
  referenceId,
  createdBy
}) {
  let creditCode = '3010';
  let creditLabel = 'Organizational Capital & Shareholder Equity';
  
  if (inflowType === 'DIRECTOR_LOAN') {
    creditCode = '3020';
    creditLabel = 'Director Loans & Shareholder Advances';
  } else if (inflowType === 'BANK_INTEREST' || inflowType === 'OTHER') {
    creditCode = '4020';
    creditLabel = 'Bank Interest & Miscellaneous Receipts';
  }

  return await postJournalEntry(tx, {
    description: `Bank Inflow (${bankName || 'Treasury'}): ${description || referenceNo || 'Capital Deposit'}`,
    referenceType: 'CAPITAL_INFUSION',
    referenceId,
    createdBy,
    lines: [
      { accountCode: '1010', debit: amount, credit: 0, description: `Bank Asset Inflow: ${bankName || 'Corporate Bank'} (Ref: ${referenceNo || 'N/A'})` },
      { accountCode: creditCode, debit: 0, credit: amount, description: `Recognize Inflow: ${creditLabel}` }
    ]
  });
}

/**
 * Double-Entry Post: Customer Cancellation Refund Payout
 * Debit: Customer Sales & Contract Revenue (Revenue - / Refund)
 * Credit: Corporate Bank / Primary Treasury (Asset - / Cash Outflow)
 */
async function postCustomerRefundJournal(tx, {
  amount,
  customerName,
  plotNo,
  referenceId,
  createdBy
}) {
  return await postJournalEntry(tx, {
    description: `Customer Cancellation Refund: ${customerName} (Plot ${plotNo})`,
    referenceType: 'CUSTOMER_REFUND',
    referenceId,
    createdBy,
    lines: [
      { accountCode: '4010', debit: amount, credit: 0, description: `Refund Adjustment: Reversal from Revenue for ${customerName}` },
      { accountCode: '1010', debit: 0, credit: amount, description: `Bank Outflow: Refund Disbursed to ${customerName}` }
    ]
  });
}

module.exports = {
  ensureStandardAccounts,
  postJournalEntry,
  postAllocationJournal,
  postExpenseJournal,
  postExpenseReversalJournal,
  postCustomerPaymentJournal,
  postCustomerRefundJournal,
  postPropertyPaymentJournal,
  postCapitalInfusionJournal
};


