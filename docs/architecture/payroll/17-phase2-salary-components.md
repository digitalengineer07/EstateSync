# Phase 2: Salary Component Master Architecture

**Document**: Phase 2 Implementation — Component Catalog Specifications  
**Status**: IMPLEMENTED & LOCKED

---

## 1. Concept & Scope

A **Salary Component** is a single concept of earning, deduction, employer contribution, or reimbursement. In EstateSync, salary components are configurable catalog items rather than hard-coded variables.

### Component Classification (`componentType`)

| Type | Nature | Accounting Impact (Future) | Tax Treatment |
| :--- | :--- | :--- | :--- |
| **`EARNING`** | Credit to Employee | Dr: 5060 Salaries & Benefits / Cr: 2010 Payable | Taxable (Standard) |
| **`DEDUCTION`** | Debit to Employee | Dr: 2010 Payable / Cr: 2020 Statutory / 1040 Advance | Reduces Net Pay |
| **`EMPLOYER_CONTRIBUTION`** | Company Cost | Dr: 5060 Benefits / Cr: 2020 Statutory Payable | Non-cash to employee |
| **`REIMBURSEMENT`** | Expense Refund | Dr: 5060 Operational / Cr: 2010 Payable | Non-taxable |

---

## 2. Calculation Methods

1. **`FIXED_AMOUNT`**: Exact monthly flat value (e.g. Conveyance = ₹1,600).
2. **`PERCENTAGE_OF_BASIC`**: Multiplier against configured Basic pay (e.g. HRA = 40% of Basic, PF = 12% of Basic).
3. **`PERCENTAGE_OF_GROSS`**: Multiplier against total monthly gross CTC (e.g. Basic = 50% of Gross, ESI = 0.75% of Gross).
4. **`PERCENTAGE_OF_COMPONENT`**: Multiplier against a referenced custom component code.
5. **`MANUAL_AMOUNT`**: Variable ad-hoc input entered during monthly payroll run (e.g. TDS, advance recovery).

---

## 3. Seeded Standard Components

- `BASIC`: Basic Salary (50% of Gross, Earning, GL: 5060)
- `HRA`: House Rent Allowance (40% of Basic, Earning, GL: 5060)
- `CONVEYANCE`: Conveyance Allowance (₹1,600 fixed, Earning, GL: 5060)
- `SPECIAL_ALLOWANCE`: Special Allowance (Residual flat earning, GL: 5060)
- `PF_EMPLOYEE`: Provident Fund (12% of Basic, Deduction, GL: 2020)
- `ESI_EMPLOYEE`: Employee State Insurance (0.75% of Gross, Deduction, GL: 2020)
- `TDS`: Tax Deducted at Source (Manual, Deduction, GL: 2020)
- `ADVANCE_RECOVERY`: Advance Loan Recovery (Manual/Schedule, Deduction, GL: 1040)
- `PF_EMPLOYER`: Provident Fund Employer Share (12% of Basic, Employer Contribution, GL: 5060)
