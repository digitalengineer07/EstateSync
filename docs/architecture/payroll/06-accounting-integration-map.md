# EstateSync: General Ledger & Accounting Integration Map

**Document**: Phase 0 Discovery — Accounting Integration  
**Status**: ACTIVE BASELINE

---

## 1. Current Accounting Architecture Summary

EstateSync features a fully balanced, transactional Double-Entry General Ledger located in:
- **`backend/src/utils/accountingHelper.js`**
- **Models**: `Account`, `JournalEntry`, `JournalLine`
- **Current Standard Chart of Accounts (COA)**:
  - `1010`: Corporate Bank / Primary Treasury (ASSET)
  - `1020`: Manager Operational Wallets (ASSET)
  - `1030`: Team / Field Wallets (ASSET)
  - `1510`: Land & Real Estate Property Assets (ASSET)
  - `3010`: Organizational Capital (EQUITY)
  - `3020`: Director Loans & Shareholder Advances (LIABILITY)
  - `4010`: Customer Sales & Contract Revenue (REVENUE)
  - `4020`: Bank Interest & Miscellaneous Receipts (REVENUE)
  - `5010`–`5050`: Travel, Marketing, Entertainment, Office Supplies, Operations (EXPENSES)

---

## 2. Proposed Additive Chart of Accounts for Payroll

To support standard accrual accounting for payroll, the following accounts will be added to `STANDARD_ACCOUNTS` in `accountingHelper.js`:

| Account Code | Account Name | Account Type | Purpose / Description |
| :---: | :--- | :---: | :--- |
| **`2010`** | **Salaries & Wages Payable** | `LIABILITY` | Accrued net salaries owed to staff prior to bank disbursement |
| **`2020`** | **Statutory Payroll Deductions Payable** | `LIABILITY` | Accrued statutory withholdings (PF, ESI, TDS, PT) |
| **`1040`** | **Employee Advances & Loans Receivable** | `ASSET` | Outstanding short-term salary advances given to employees |
| **`5060`** | **Salaries, Wages & Staff Benefits** | `EXPENSE` | Monthly company payroll expenditure |

---

## 3. Standard Payroll Double-Entry Accounting Vouchers

### Voucher 1: Monthly Payroll Accrual (On Payroll Approval)
When Admin approves the calculated monthly payroll for a period:
$$\text{Total Gross Earnings} = \text{Net Salary Payable} + \text{Statutory Deductions} + \text{Advance Recoveries}$$

```
Voucher Type: PAYROLL_ACCRUAL
Entry Reference: PAYROLL-YYYYMM

  Dr: 5060 - Salaries, Wages & Staff Benefits        [Gross Salary Expense]     ₹10,00,000.00
      Cr: 2010 - Salaries & Wages Payable            [Net Pay Liability]        ₹ 8,70,000.00
      Cr: 2020 - Statutory Deductions Payable        [PF / ESI / TDS Liability] ₹   80,000.00
      Cr: 1040 - Employee Advances Receivable        [Advance Recovery Offset]  ₹   50,000.00

Balance Verification: Total Debits (₹10,00,000) === Total Credits (₹10,00,000)  ✅
```

---

### Voucher 2: Salary Disbursement (On Bank / Cash Payment)
When Accounts disburses salaries from Corporate Treasury to employee bank accounts:

```
Voucher Type: SALARY_PAYMENT
Entry Reference: SAL-PAY-YYYYMM-XXXX

  Dr: 2010 - Salaries & Wages Payable               [Liability Discharged]     ₹ 8,70,000.00
      Cr: 1010 - Corporate Bank / Primary Treasury   [Bank Liquidity Outflow]   ₹ 8,70,000.00

Balance Verification: Total Debits (₹8,70,000) === Total Credits (₹8,70,000)    ✅
```

---

### Voucher 3: Employee Salary Advance Issuance
When an advance is issued to a staff member:

```
Voucher Type: EMPLOYEE_ADVANCE
Entry Reference: ADV-YYYYMM-XXXX

  Dr: 1040 - Employee Advances Receivable            [Asset Created]            ₹   20,000.00
      Cr: 1010 - Corporate Bank / Primary Treasury   [Bank / Cash Outflow]      ₹   20,000.00

Balance Verification: Total Debits (₹20,000) === Total Credits (₹20,000)        ✅
```

---

### Voucher 4: Statutory Dues Settlement
When company deposits PF/ESI/TDS to government portals:

```
Voucher Type: STATUTORY_PAYMENT
Entry Reference: STAT-YYYYMM-XXXX

  Dr: 2020 - Statutory Deductions Payable           [Liability Discharged]     ₹   80,000.00
      Cr: 1010 - Corporate Bank / Primary Treasury   [Bank Outflow]             ₹   80,000.00

Balance Verification: Total Debits (₹80,000) === Total Credits (₹80,000)        ✅
```

---

## 4. Architectural Rules for Accounting Integration

1. **Strict Atomicity**: All journal entries MUST be wrapped in `prisma.$transaction`.
2. **Reuse `postJournalEntry()`**: No custom SQL or second journal table. All entries write to `JournalEntry` and `JournalLine`.
3. **No Direct Account Mutation**: Account balances are dynamically computed from journal lines, maintaining mathematical proof of audit trail.
