# Phase 3: Payroll Items & Line Snapshots

**Document**: Phase 3 Implementation — Employee Summary & Immutable Line Snapshots  
**Status**: IMPLEMENTED & LOCKED

---

## 1. Concept & Scope

A **`PayrollItem`** represents the monthly calculated compensation summary for a single employee within a `PayrollRun`.
A **`PayrollLine`** is an immutable itemized line item capturing the exact rate, percentage, amount, calculation method, and GL account code snapshot at the time of calculation.

---

## 2. Immutability Guarantee

```
[Future Salary Change]
Employee Basic: ₹30,000 → ₹40,000 (Effective September 2026)

[Historical August 2026 Payroll Snapshot]
├── PayrollItem (Gross: ₹30,000, Net: ₹28,200)
└── PayrollLine (Component: BASIC, Amount: ₹30,000)  <-- NEVER MUTATED
```

The historical payroll line snapshot is permanently decoupled from future edits to `SalaryStructure` or `SalaryComponent`.
