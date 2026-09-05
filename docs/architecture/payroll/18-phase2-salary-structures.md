# Phase 2: Salary Structure Engine & Template Management

**Document**: Phase 2 Implementation — Structure Master & Line Items  
**Status**: IMPLEMENTED & LOCKED

---

## 1. Concept & Scope

A **Salary Structure** is a reusable package representing a standardized compensation tier (e.g., *Sales Executive Standard Structure*, *Site Security Guard Structure*, *Management Executive Structure*).

One Structure can be assigned to multiple employees across different departments.

```
┌────────────────────────────────────────────────────────┐
│           SalaryStructure (e.g. "STR-SALES-STD")       │
├───────────────────┬───────────────────┬────────────────┤
│ Component Code    │ Type              │ Rule           │
├───────────────────┼───────────────────┼────────────────┤
│ BASIC             │ EARNING           │ 50% of Gross   │
│ HRA               │ EARNING           │ 40% of Basic   │
│ CONVEYANCE        │ EARNING           │ ₹1,600 Flat    │
│ SPECIAL_ALLOWANCE │ EARNING           │ Variable / Bal │
│ PF_EMPLOYEE       │ DEDUCTION         │ 12% of Basic   │
│ ESI_EMPLOYEE      │ DEDUCTION         │ 0.75% of Gross │
└───────────────────┴───────────────────┴────────────────┘
```

---

## 2. Structure Line Item Model

Each line within a structure overrides or customizes:
- `calculationMethod`: Calculation formula type.
- `value`: Default flat amount (if fixed).
- `percentage`: Percentage rate (if calculated).
- `sequence`: Execution order during computation.
- `isMandatory`: Whether the component is strictly required.

---

## 3. Immutability & Archival Guarantee

- Structure changes never mutate historical employee assignments in place.
- If a structure is retired, its status is set to `ARCHIVED`, preventing new assignments while preserving historical payroll reproducibility.
