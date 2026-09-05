# Phase 3: Payroll Exceptions & Anomaly Governance

**Document**: Phase 3 Implementation — Anomaly Taxonomy & Severity Rules  
**Status**: IMPLEMENTED & LOCKED

---

## 1. Exception Taxonomy

| Exception Code | Severity | Trigger Condition | Impact on Approval |
| :--- | :--- | :--- | :---: |
| **`NO_SALARY_ASSIGNMENT`** | `BLOCKING` | Employee has no active salary assignment on period date | Blocks Run Approval |
| **`INVALID_SALARY_STRUCTURE`** | `BLOCKING` | Assigned structure contains 0 active line items | Blocks Run Approval |
| **`CIRCULAR_COMPONENT_DEPENDENCY`** | `BLOCKING` | Component dependency forms an infinite loop | Blocks Run Approval |
| **`NEGATIVE_NET_PAY`** | `BLOCKING` | Deductions/adjustments exceed gross earnings | Blocks Run Approval |
| **`CALCULATION_ERROR`** | `BLOCKING` | Runtime math or data type error during evaluation | Blocks Run Approval |
| **`MISSING_REQUIRED_DATA`** | `WARNING` | Non-critical staff metadata absent | Informational |

---

## 2. Approval Gate Invariant

A `PayrollRun` cannot be transitioned to `APPROVED` while any unresolved `BLOCKING` exception exists (`isResolved: false`).
