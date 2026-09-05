# EstateSync Payroll System — Phase 4: Posting Preview Engine

## 1. Overview
The Posting Preview Engine (`GET /api/v1/payroll/runs/:id/posting-preview`) allows finance managers, accountants, and auditors to inspect the exact compound journal lines and reconciliation breakdown prior to committing transactions to the General Ledger.

## 2. Zero-Mutation Guarantee
The preview endpoint is completely read-only. It performs in-memory simulation, validates all reconciliation invariants and Chart of Accounts integrity, but creates zero records in `JournalEntry`, `JournalLine`, or `PayrollAccountingPosting`.

## 3. Pre-Flight Validation Checks

```
┌─────────────────────────────────────────────────────────────┐
│                 PRE-POSTING VALIDATION GATES                │
├─────────────────────────────────────────────────────────────┤
│ 1. Run Existence & Status Gate (status must be LOCKED)       │
│ 2. Idempotency Gate (no active posting exists)              │
│ 3. Period Status Gate (period not CLOSED or CANCELLED)       │
│ 4. Non-Empty Gate (run.items.length > 0)                    │
│ 5. Account Existence Gate (all snapshot GL codes exist)     │
│ 6. Account Nature Gate (Earnings=Expense, Deductions=Liab)  │
│ 7. Balance Gate (|Total Debits - Total Credits| < 0.009)    │
└─────────────────────────────────────────────────────────────┘
```

## 4. Response Payload Schema

```json
{
  "success": true,
  "preview": {
    "payrollRunId": "5bcd1cc5-d9a3-41c1-9bb1-fad1e3565f5d",
    "period": "2026-08",
    "runNumber": 1,
    "status": "LOCKED",
    "totalEmployees": 2,
    "totals": {
      "totalGross": 66200.00,
      "totalDeductions": 5400.00,
      "totalNet": 63800.00,
      "totalEmployerCost": 5400.00
    },
    "reconciliation": {
      "salaryEarnings": 66200.00,
      "salaryDeductions": 5400.00,
      "employerContributions": 5400.00,
      "reimbursements": 0.00,
      "creditAdjustments": 5000.00,
      "debitAdjustments": 2000.00,
      "calculatedNet": 63800.00
    },
    "proposedJournal": {
      "description": "Payroll Expense Posting — 2026-08 — Run #1",
      "referenceType": "PAYROLL",
      "referenceId": "5bcd1cc5-d9a3-41c1-9bb1-fad1e3565f5d",
      "totalDebit": 76600.00,
      "totalCredit": 76600.00,
      "isBalanced": true,
      "lines": [
        {
          "accountCode": "5060",
          "accountName": "Salaries & Wages Expense",
          "accountType": "EXPENSE",
          "debit": 71200.00,
          "credit": 0.00,
          "description": "Salary Expense: Basic Salary"
        },
        {
          "accountCode": "5070",
          "accountName": "Employer Statutory Contribution Expense",
          "accountType": "EXPENSE",
          "debit": 5400.00,
          "credit": 0.00,
          "description": "Employer Statutory Expense: Provident Fund (Employer)"
        },
        {
          "accountCode": "2020",
          "accountName": "Employee Statutory Payable (PF/ESI)",
          "accountType": "LIABILITY",
          "debit": 0.00,
          "credit": 5400.00,
          "description": "Deduction / Recovery: Provident Fund (Employee)"
        },
        {
          "accountCode": "2025",
          "accountName": "Employer Statutory Contribution Payable",
          "accountType": "LIABILITY",
          "debit": 0.00,
          "credit": 5400.00,
          "description": "Employer Statutory Payable: Provident Fund (Employer)"
        },
        {
          "accountCode": "1040",
          "accountName": "Employee Advance & Loan Asset",
          "accountType": "ASSET",
          "debit": 0.00,
          "credit": 2000.00,
          "description": "Deduction / Recovery: Advance Recovery"
        },
        {
          "accountCode": "2010",
          "accountName": "Net Salaries Payable",
          "accountType": "LIABILITY",
          "debit": 0.00,
          "credit": 63800.00,
          "description": "Net Salaries Payable: 2026-08 Run #1"
        }
      ]
    }
  }
}
```
