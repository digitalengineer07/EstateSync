# Phase 3: Payroll Run Orchestration & Versioning

**Document**: Phase 3 Implementation — Batch Run Execution & Totals  
**Status**: IMPLEMENTED & LOCKED

---

## 1. Concept & Scope

A **Payroll Run** represents a discrete batch calculation execution associated with a `PayrollPeriod`.
- Each run maintains an auto-incrementing `runNumber` (e.g. Run #1, Run #2 for adjustments/recalculations).
- A run encapsulates aggregate financial totals: `totalGross`, `totalDeductions`, `totalNet`, `totalEmployerCost`, and `totalEmployees`.

---

## 2. Recalculation Idempotency & Concurrency

1. **Recalculation Idempotency**:
   - Replaying calculation on a draft or open run cleanly sweeps prior unapproved items and re-evaluates all eligible staff in an atomic transaction (`prisma.$transaction`).
2. **Post-Approval Lock**:
   - Once a run achieves `APPROVED` or `LOCKED` status, the calculation engine rejects further calculation calls with `HTTP 400 Bad Request`.
3. **Approval Gate**:
   - Approval strictly fails if any unresolved exceptions with `severity: 'BLOCKING'` remain.
