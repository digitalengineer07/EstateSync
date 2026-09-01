# EstateSync Payroll System — Phase 4: Chart of Accounts & GL Mapping

## 1. Standard Payroll General Ledger Accounts

The EstateSync Chart of Accounts has been enhanced with 7 dedicated General Ledger accounts to support payroll accruals, statutory obligations, and asset recoveries.

| Account Code | Account Name | Type | Normal Balance | Description |
|---|---|---|---|---|
| **5060** | Salaries & Wages Expense | `EXPENSE` | Debit | Gross employee earnings, basic pay, and regular monthly allowances. |
| **5070** | Employer Statutory Contribution Expense | `EXPENSE` | Debit | Company contributions towards Employee Provident Fund (EPF) and ESIC. |
| **2010** | Net Salaries Payable | `LIABILITY` | Credit | Net accrued salary obligations owed to employees for the period. |
| **2020** | Employee Statutory Payable (PF/ESI) | `LIABILITY` | Credit | Statutory deductions withheld from employee earnings awaiting government remittance. |
| **2025** | Employer Statutory Contribution Payable | `LIABILITY` | Credit | Employer statutory contributions withheld awaiting government remittance. |
| **2030** | TDS (Income Tax) Payable | `LIABILITY` | Credit | Tax Deducted at Source withheld from payroll awaiting remittance to the tax department. |
| **1040** | Employee Advance & Loan Asset | `ASSET` | Debit (Credited on Recovery) | Outstanding staff loans and salary advances; credited during payroll recovery deductions. |

## 2. Component Type to GL Routing Rules

| Component Code | Component Type | Debit Account | Credit Account | Posting Note |
|---|---|---|---|---|
| `BASIC` | `EARNING` | 5060 (Expense) | — | Aggregated into Gross Salary Expense |
| `HRA` | `EARNING` | 5060 (Expense) | — | Aggregated into Gross Salary Expense |
| `CONVEYANCE` | `EARNING` | 5060 (Expense) | — | Aggregated into Gross Salary Expense |
| `SPECIAL_ALLOWANCE` | `EARNING` | 5060 (Expense) | — | Aggregated into Gross Salary Expense |
| `PF_EMPLOYEE` | `DEDUCTION` | — | 2020 (Liability) | Employee EPF Withholding |
| `ESI_EMPLOYEE` | `DEDUCTION` | — | 2020 (Liability) | Employee ESIC Withholding |
| `TDS` | `DEDUCTION` | — | 2030 (Liability) | Tax Withheld at Source |
| `ADVANCE_RECOVERY` | `DEDUCTION` | — | 1040 (Asset) | Reduces outstanding Employee Advance Asset |
| `PF_EMPLOYER` | `EMPLOYER_CONTRIBUTION` | 5070 (Expense) | 2025 (Liability) | Dual-entry: Expensed & Accrued simultaneously |
| `ADJ_BONUS` | `EARNING` (Manual) | 5060 (Expense) | — | Credit Adjustment (Increases Net) |
| `ADJ_INCENTIVE` | `EARNING` (Manual) | 5060 (Expense) | — | Credit Adjustment (Increases Net) |
| `NET_PAYABLE` | *Derived* | — | 2010 (Liability) | Net Salary Payable to Staff |

## 3. Strict Boundary Rules

1. **Reimbursements**: Any component with `componentType = 'REIMBURSEMENT'` is strictly blocked with `HTTP 422 (UNSUPPORTED_REIMBURSEMENT_POSTING)` until an approved corporate reimbursement mapping policy is defined.
2. **Penalties**: Any component with code `DED_PENALTY` is strictly blocked with `HTTP 422 (UNSUPPORTED_PENALTY_ACCOUNTING)` to prevent unapproved miscellaneous income credits.
