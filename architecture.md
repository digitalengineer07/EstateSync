# EstateSync — Fund Management & Accounting Architecture

## 1. Scope

This document covers the architecture for the **Fund Management, Wallet, and Accounting** module — a single Next.js frontend connected to a single Node/Express backend API, backed by PostgreSQL and Redis. No Electron packaging or offline sync in this phase.

## 2. High-Level Architecture

```
┌───────────────────────┐         ┌───────────────────────┐
│   Next.js Frontend      │  HTTP   │   Node/Express API       │
│   (React, single         │ ──────► │   /api/v1/...              │
│   build, role-aware       │ ◄────── │                            │
│   rendering)               │  JSON   │                            │
└───────────────────────┘         └────────────┬──────────┘
                                                        │
                                  ┌────────────────┴─────────────────┐
                                  │                                    │
                           ┌─────────────┐                  ┌─────────────┐
                           │ PostgreSQL   │                  │ Redis        │
                           │ (wallets,    │                  │ (sessions,   │
                           │ transactions,│                  │ rate limits, │
                           │ ledger)      │                  │ idempotency, │
                           │              │                  │ wallet locks)│
                           └─────────────┘                  └─────────────┘
```

## 3. Component Responsibilities

| Component | Responsibility |
|---|---|
| Next.js Frontend | Role-aware dashboards (Admin, Manager, Sales, Marketing, Accounting, Other), wallet views, fund request forms, expense entry, never enforces security itself |
| Node/Express API | Auth, RBAC, wallet transaction logic, fund allocation/request workflows, expense posting, accounting/ledger posting, audit logging |
| PostgreSQL | Source of truth: `users`, `roles`, `permissions`, `wallets`, `wallet_transactions`, `fund_requests`, `fund_allocations`, `expenses`, `chart_of_accounts`, `journal_entries`, `journal_lines`, `audit_logs` |
| Redis | Session/refresh-token store, rate-limit counters, idempotency keys, and short-lived locks around wallet transactions to serialize concurrent requests before the DB-level lock is acquired |

**Golden rule (unchanged from prior phases):** the frontend renders and collects input only. Every wallet balance check, permission check, and financial invariant is enforced server-side.

## 4. Core Domain Model

```
Organization (implicit — Admin's own wallet/ledger root)
   │
   ▼
Admin Wallet
   │  allocate
   ▼
Manager Wallet(s)
   │  allocate / approve
   ├──► Sales Wallet
   ├──► Marketing Wallet
   └──► Other Wallet
        │
        ▼
     Expense (debits the wallet)
        │
        ▼
  Wallet Transaction (ledger entry)
        │
        ▼
  Accounting Journal Entry (double-entry)
```

Two parallel views are maintained and must never be conflated:
- **Operational view (Wallet):** who currently has funds available right now.
- **Financial view (Accounting Ledger):** where every rupee came from and went, as immutable double-entry journal entries.

## 5. Wallet Transaction Architecture

### 5.1 Wallet as an Append-Only Ledger, Not a Mutable Counter

Each wallet row (`total_allocated`, `total_spent`, `available_balance`) is a **cached projection**. The authoritative record is the `wallet_transactions` table — every balance change must correspond to exactly one transaction row. Balances are never edited directly; they are recalculated/adjusted only as a side effect of inserting a new transaction inside a database transaction.

### 5.2 Fund Allocation / Transfer Sequence

```
BEGIN DB TRANSACTION
  1. Authenticate user (JWT)
  2. Check permission (fund.allocate)
  3. Verify recipient exists and reporting relationship is valid
  4. Verify amount > 0
  5. SELECT source_wallet FOR UPDATE
  6. SELECT destination_wallet FOR UPDATE
  7. IF source.available_balance < amount → ROLLBACK, return 409
  8. INSERT wallet_transaction (FUND_ALLOCATION / FUND_TRANSFER)
  9. UPDATE source wallet (decrement)
  10. UPDATE destination wallet (increment)
  11. INSERT audit_log entry
  12. INSERT corresponding journal_entry + journal_lines (double-entry)
COMMIT
```

Locking both wallets **in a consistent order** (e.g. always lock the lower `wallet_id` first) is required to avoid deadlocks when two transfers between the same pair of wallets happen concurrently in opposite directions.

### 5.3 Idempotency

Every allocation/transfer/expense-posting request carries a client-generated `idempotency_key`. The API checks Redis (and/or a DB `idempotency_keys` table) before processing — a retried request with the same key returns the original result rather than creating a duplicate transaction.

### 5.4 Fund Request → Approval → Allocation Pipeline

```
User submits fund_request (PENDING)
        │
        ▼
Manager reviews
        │
   ┌────┴─────┐
   ▼          ▼
REJECTED   Manager has sufficient balance?
              │              │
             YES            NO
              │              │
              ▼              ▼
        Approve →      fund_request created
        run allocation   with parent_request_id,
        sequence (5.2)   requested_from = ADMIN
        APPROVED               │
                                ▼
                          Admin reviews
                                │
                          ┌─────┴─────┐
                          ▼           ▼
                      REJECTED     APPROVED
                                       │
                                       ▼
                            Admin → Manager allocation
                            (sequence 5.2) runs first,
                            then Manager's original
                            approval decision is applied
```

The `parent_request_id` chain is preserved end-to-end so the full escalation path (Sales → Manager → Admin) remains queryable for audit and reporting.

## 6. Accounting Integration

Every wallet-affecting event also produces a balanced double-entry journal entry:

| Event | Debit | Credit |
|---|---|---|
| Fund allocation/transfer | Destination Fund/Wallet Account | Source Fund/Wallet Account |
| Expense | Expense Account (by category) | Wallet/Cash/Bank Account |
| Expense reversal | Wallet/Cash/Bank Account | Expense Account |

A journal entry cannot be marked `POSTED` while `SUM(debit) != SUM(credit)` — enforced at the application layer before insert and treated as a hard invariant, not merely a validation warning.

## 7. Concurrency & Locking Strategy

| Risk | Mitigation |
|---|---|
| Two simultaneous allocations draining the same wallet below zero | `SELECT ... FOR UPDATE` on the wallet row inside the DB transaction; balance check happens after the lock is acquired, not before |
| Deadlock from two transfers between the same wallet pair in opposite directions | Lock wallets in a fixed, consistent order (e.g. ascending `wallet_id`) |
| Duplicate submission on network retry | Idempotency key required on all mutating fund/expense endpoints |
| Race between a fund-request approval and a wallet balance changing in between | Re-check the approver's current available balance at the moment of approval, inside the same transaction as the allocation — never trust a balance read earlier in the request lifecycle |

## 8. Authentication & Authorization

Unchanged from the base EstateSync design: JWT (short-lived access token) + server-tracked, revocable refresh tokens; bcrypt password hashing; permission-code based RBAC enforced via middleware on every route:

```
verifyJWT → checkPermission('fund.allocate' | 'expense.create' | ...) → rateLimiter → controller
```

One frontend build serves all six user categories (Admin, Manager, Sales, Marketing, Accounting, Other); the UI renders per-user permissions returned at login, but the API independently re-validates every action.

## 9. Audit Logging

Every state-changing action in this module — allocation, transfer, fund request decision, expense creation, expense reversal, journal adjustment — writes an `audit_logs` row **inside the same database transaction** as the business action itself, capturing actor, action, before/after values (wallet balances, request status), and timestamp. This guarantees the audit trail can never be out of sync with what actually happened, even under failure/rollback conditions.

## 10. API Surface (module-relevant)

```
/api/v1/wallets
/api/v1/wallets/:id
/api/v1/funds
/api/v1/funds/allocate
/api/v1/funds/transfer
/api/v1/fund-requests
/api/v1/fund-requests/:id
/api/v1/fund-requests/:id/approve
/api/v1/fund-requests/:id/reject
/api/v1/expenses
/api/v1/expenses/:id
/api/v1/transactions
/api/v1/accounts
/api/v1/journals
/api/v1/accounting-periods
/api/v1/reconciliations
/api/v1/reports
/api/v1/audit
```

## 11. Security Controls (module-specific additions)

| Control | Detail |
|---|---|
| Wallet balance protection | Row-level lock + application-level `available_balance >= 0` check before commit |
| Immutable financial history | No update/delete on `wallet_transactions` or posted `journal_entries`; corrections via `EXPENSE_REVERSAL`/`ADJUSTMENT` transaction types only |
| Least privilege | Sales/Marketing/Other can never call allocate/approve endpoints, even with a valid token, because their role carries no `fund.allocate`/`fund.approve` permission |
| Accounting boundary | Accounting role has `*.view_all` permissions but no `fund.allocate` permission — enforced at the middleware layer, not by omission from the UI |
| Rate limiting | Applied to fund-request and allocation endpoints to prevent rapid-fire abuse attempts against wallet balances |

## 12. Build Order for This Module

1. `users`, `roles`, `permissions`, `role_permissions`, `user_roles` — extend existing RBAC tables with the six roles (Admin, Manager, Sales, Marketing, Accounting, Other) and new permission codes (`fund.*`, `wallet.*`, `expense.*`).
2. `wallets` + `wallet_transactions` tables, with the wallet-creation trigger (every fund-controlled user gets a wallet on creation).
3. Fund allocation endpoint (Admin → Manager) with the full locking/transaction sequence (§5.2).
4. Fund request endpoints + approval/rejection flow, including the insufficient-funds escalation path (§5.4).
5. Manager → User allocation (reuses the same allocation sequence with a different permission check and relationship validation).
6. Expense creation + wallet debit.
7. Accounting integration: `chart_of_accounts`, `journal_entries`, `journal_lines`, wired to fire on every wallet transaction.
8. Dashboards: wallet view, Admin/Accounting financial overview, Manager team view.
9. Reporting endpoints (breakdowns by user/manager/department/category/date/type).
10. Audit log review UI (Admin/Accounting).

## 13. Deferred to Later Phases

| Feature | Planned phase |
|---|---|
| Electron desktop packaging | After this module is functional as a web app |
| Offline approval decisions (Manager reviewing fund requests while disconnected) | Same phase as Electron packaging, following the same staleness/version-check pattern used for CRM approvals |
| Bank/cash reconciliation automation | After core wallet + accounting flows are stable |
| Connection of this fund/wallet ledger to the CRM-side booking/collections ledger (Section 11 of the base EstateSync spec) into one unified chart of accounts | Post-MVP integration phase |

## 14. Related Documents

- `prd.md` — product requirements for the Fund Management & Accounting phase
- `techStack.md` — technology stack and tooling decisions
