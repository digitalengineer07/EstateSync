# EstateSync Payroll System — Phase 4: General Ledger Accounting Integration Architecture

## 1. Executive Summary
Phase 4 of the EstateSync Payroll Engine establishes the official financial bridge between the finalized Monthly Payroll Calculation Engine (Phase 3) and the double-entry General Ledger (GL) Core.

When a payroll run reaches the `LOCKED` state, all employee earnings, statutory deductions, employer statutory obligations, and manual adjustments are permanently frozen. The Phase 4 Accounting Posting Engine translates these immutable snapshot records into balanced, compound General Ledger Journal Entries while preserving strict mathematical reconciliation and single-transaction integrity.

```
┌─────────────────────────────────────────────────────────────┐
│                      PHASE 3 (FROZEN)                       │
│  PayrollRun (status = 'LOCKED')                             │
│  └── PayrollItem[]                                          │
│      └── PayrollLine[] (glAccountCodeSnapshot)              │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              PHASE 4 ACCOUNTING POSTING ENGINE              │
│  1. Status & Period Eligibility Validation                   │
│  2. Mathematical Reconciliation & Source Isolation          │
│  3. Account Nature & Existence Verification                 │
│  4. Canonical Balance Policy (|Dr - Cr| < 0.009)            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│   JOURNAL ENTRY & LINES      │ │ PAYROLL ACCOUNTING POSTING │
│   - Compound Multi-Line      │ │ - 1-to-1 Reconciliation    │
│   - Balanced Double Entry    │ │ - Snapshot Totals Audit    │
│   - status = 'POSTED'        │ │ - status = 'POSTED'        │
└──────────────────────────────┘ └────────────────────────────┘
```

## 2. Core Architectural Principles

1. **Snapshot Authority**: The posting engine reads exclusively from `PayrollLine.glAccountCodeSnapshot` and frozen payroll totals. It never recalculates compensation or queries live salary structures.
2. **Double-Entry Invariant**: Every posted journal entry must satisfy $\sum \text{Debits} \equiv \sum \text{Credits}$ within the canonical tolerance of $\Delta < 0.009$.
3. **Interactive Atomic Transaction**: Journal creation, line posting, reconciliation linkage, and audit trail generation occur within a single database transaction.
4. **Idempotency & Duplicate Prevention**: A payroll run can only be posted once. Duplicate posting requests are rejected with `HTTP 409 Conflict`.
5. **Reversal Immutability**: Posted journal entries cannot be deleted or mutated. Adjustments or corrections require an explicit symmetric reversal journal.
