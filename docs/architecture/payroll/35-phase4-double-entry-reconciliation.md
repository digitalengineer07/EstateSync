# EstateSync Payroll System — Phase 4: Double-Entry Reconciliation Contract

## 1. Line Source Separation

To prevent manual adjustments (e.g. ad-hoc performance bonuses or arrears) from distorting base contractual earnings or statutory calculations, the reconciliation engine strictly isolates lines by their `source` property:

```
                  ┌─────────────────────────────────────┐
                  │          PAYROLL LINES              │
                  └──────────────────┬──────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
    source = 'SALARY_STRUCTURE'             source = 'MANUAL_ADJUSTMENT'
    (Contractual Base Lines)                (Ad-Hoc Adjustments)
    ├── EARNING (Basic, HRA, Conv)          ├── EARNING (Bonus, Incentive)
    ├── DEDUCTION (PF, ESI, TDS)            └── DEDUCTION (Advance Recovery)
    └── EMPLOYER_CONTRIBUTION (Employer PF)
```

## 2. Strict Mathematical Reconciliation Invariants

1. **Base Salary Earnings Invariant**:
   $$\text{salaryEarnings} = \sum_{\substack{\text{source}=\text{'SALARY\_STRUCTURE'} \\ \text{type}=\text{'EARNING'}}} \text{amount} \equiv \text{PayrollRun.totalGross}$$

2. **Base Salary Deductions Invariant**:
   $$\text{salaryDeductions} = \sum_{\substack{\text{source}=\text{'SALARY\_STRUCTURE'} \\ \text{type}=\text{'DEDUCTION'}}} \text{amount} \equiv \text{PayrollRun.totalDeductions}$$

3. **Employer Statutory Cost Invariant**:
   $$\text{employerContributions} = \sum_{\substack{\text{source}=\text{'SALARY\_STRUCTURE'} \\ \text{type}=\text{'EMPLOYER\_CONTRIBUTION'}}} \text{amount} \equiv \text{PayrollRun.totalEmployerCost}$$

4. **Net Pay Mathematical Invariant**:
   $$\text{salaryEarnings} + \text{reimbursements} + \text{creditAdjustments} - \text{salaryDeductions} - \text{debitAdjustments} \equiv \text{PayrollRun.totalNet}$$

5. **Canonical Double-Entry Balance Invariant**:
   $$|\sum \text{Debits} - \sum \text{Credits}| < 0.009$$

## 3. Financial Proof & Example Ledger Balancing

Consider a payroll run with two employees:
- **Employee A** (Gross ₹50,000 reference, Bonus +₹5,000, Advance Recovery -₹2,000):
  - Basic: ₹25,000, HRA: ₹10,000, Conv: ₹1,600 (Earnings = ₹36,600)
  - PF Employee: ₹3,000 (Deduction)
  - Employer PF: ₹3,000 (Employer Cost)
  - Bonus: ₹5,000 (Credit Adjustment)
  - Advance Recovery: ₹2,000 (Debit Adjustment)
  - Net Pay = ₹36,600 + ₹5,000 - ₹3,000 - ₹2,000 = **₹36,600**
- **Employee B** (Gross ₹40,000 reference, No adjustments):
  - Basic: ₹20,000, HRA: ₹8,000, Conv: ₹1,600 (Earnings = ₹29,600)
  - PF Employee: ₹2,400 (Deduction)
  - Employer PF: ₹2,400 (Employer Cost)
  - Net Pay = ₹29,600 - ₹2,400 = **₹27,200**

### General Ledger Compound Journal Balancing:

| Account | Code | Type | Debit (₹) | Credit (₹) |
|---|---|---|---|---|
| Salaries & Wages Expense | 5060 | Expense | 71,200.00 | — |
| Employer Statutory Expense | 5070 | Expense | 5,400.00 | — |
| Employee Statutory Payable | 2020 | Liability | — | 5,400.00 |
| Employer Statutory Payable | 2025 | Liability | — | 5,400.00 |
| Employee Advance Asset | 1040 | Asset | — | 2,000.00 |
| Net Salaries Payable | 2010 | Liability | — | 63,800.00 |
| **TOTAL** | | | **76,600.00** | **76,600.00** |

$$\text{Total Debits (₹76,600.00)} = \text{Total Credits (₹76,600.00)} \quad (\Delta = 0.0000)$$
