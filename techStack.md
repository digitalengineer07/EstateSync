# EstateSync — Tech Stack (Fund Management & Accounting Phase)

## 1. Current Phase

Single Next.js frontend + single Node/Express backend API, connected over HTTP, backed by PostgreSQL (Redis for caching only, deferred to the last phase). No Electron packaging or offline sync in this phase.

## 2. Frontend

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js (React) | Single build serving all six roles (Admin, Manager, Sales, Marketing, Accounting, Other); UI renders per-user permissions from the login response |
| Auth token storage | JWT access token in memory; refresh token via secure storage | UI checks are convenience only — every action is re-validated server-side |
| API communication | HTTP/JSON via `fetch`/`axios` | All requests include `Authorization: Bearer <token>` |
| Dashboards | Role-specific views: Admin/Accounting financial overview, Manager team view, simplified Sales/Marketing/Other wallet view | Built from shared components, data scoped by API response, not client-side filtering |

## 3. Backend

| Concern | Choice | Notes |
|---|---|---|
| Runtime | Node.js | |
| API framework | Express.js | Versioned REST API, `/api/v1/...` |
| Auth | JWT (short-lived access token) + refresh tokens | Refresh tokens stored server-side using express-session (Redis deferred), individually revocable |
| Password hashing | bcrypt | Cost factor 12+ |
| Middleware chain | `verifyJWT -> checkPermission('resource.action') -> rateLimiter -> controller` | Applied to every protected route, including all fund/wallet/expense endpoints |
| RBAC | Atomic permission codes (`fund.allocate`, `fund.approve`, `fund.request`, `wallet.view`, `wallet.view_all`, `expense.create`, `expense.approve`, `expense.reverse`, `transaction.view_all`, `accounting.view`, `audit.view`) mapped through roles | Never hard-coded role-name checks |

### Recommended Backend Structure

```
backend/
├── src/
│   ├── config/
│   ├── controller/
│   │   ├── authController.js
│   │   ├── walletController.js
│   │   ├── fundController.js
│   │   ├── fundRequestController.js
│   │   ├── expenseController.js
│   │   ├── vendorController.js
│   │   ├── accountController.js
│   │   ├── journalController.js
│   │   ├── transactionController.js
│   │   ├── accountingPeriodController.js
│   │   ├── reconciliationController.js
│   │   └── reportController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── permissionMiddleware.js
│   │   ├── rateLimitMiddleware.js
│   │   └── errorMiddleware.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Role.js
│   │   ├── Permission.js
│   │   ├── Wallet.js
│   │   ├── WalletTransaction.js
│   │   ├── FundRequest.js
│   │   ├── FundAllocation.js
│   │   ├── Expense.js
│   │   ├── ExpenseCategory.js
│   │   ├── Vendor.js
│   │   ├── ChartOfAccount.js
│   │   ├── JournalEntry.js
│   │   ├── JournalLine.js
│   │   ├── AccountingPeriod.js
│   │   ├── Reconciliation.js
│   │   └── AuditLog.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── walletRoutes.js
│   │   ├── fundRoutes.js
│   │   ├── fundRequestRoutes.js
│   │   ├── expenseRoutes.js
│   │   ├── vendorRoutes.js
│   │   ├── accountRoutes.js
│   │   ├── journalRoutes.js
│   │   ├── transactionRoutes.js
│   │   ├── accountingPeriodRoutes.js
│   │   ├── reconciliationRoutes.js
│   │   └── reportRoutes.js
│   ├── utils/
│   └── app.js
├── package.json
└── .env
```

## 4. Database

| Concern | Choice | Notes |
|---|---|---|
| Primary database | PostgreSQL | Source of truth for wallets, transactions, fund requests, expenses, and the accounting ledger |
| Money fields | `DECIMAL(15,2)` | Never `FLOAT`/`DOUBLE` for monetary values |
| Timestamps | UTC, converted to local timezone at the UI/reporting layer | |
| Concurrency control | Row-level locks (`SELECT ... FOR UPDATE`) on wallet rows during allocation/transfer, locked in a consistent order to prevent deadlocks | Applied to both source and destination wallets in every fund movement |
| Financial record handling | Immutable once posted; corrections via `EXPENSE_REVERSAL`/`ADJUSTMENT` transaction types, never edits/deletes | |
| Core tables | `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `wallets`, `wallet_transactions`, `fund_requests`, `fund_allocations`, `expenses`, `expense_categories`, `vendors`, `chart_of_accounts`, `journal_entries`, `journal_lines`, `accounting_periods`, `reconciliations`, `audit_logs` | |

## 5. Cache & Queue

| Concern | Choice | Notes |
|---|---|---|
| In-memory store | express-session & express-rate-limit | Redis will ONLY be used for caching and is integrated in the last phase. Sessions and rate limits are handled via express middleware without Redis. |

## 6. Rate Limiting

| Concern | Choice | Notes |
|---|---|---|
| Library | `express-rate-limit` | In-memory rate limiting (Redis deferred and not used for rate limiting) |
| Policy | Tiered | Strict on `/auth/login`, `/auth/reset-password`; moderate-to-strict on fund allocation/transfer and fund-request endpoints to prevent rapid-fire balance manipulation attempts; standard on general read endpoints |

## 7. Idempotency

| Concern | Choice | Notes |
|---|---|---|
| Mechanism | Client-generated `idempotency_key` per mutating request, checked against Redis/DB before processing | Applied to fund allocation, fund transfer, and expense-posting endpoints — a retried request with the same key returns the original result rather than duplicating the transaction |

## 8. Accounting Layer

| Concern | Choice | Notes |
|---|---|---|
| Ledger model | Double-entry (`chart_of_accounts`, `journal_entries`, `journal_lines`) | Every wallet-affecting event produces a balanced journal entry; enforced debit = credit before a `POSTED` status is allowed |
| Reconciliation | `reconciliations` table, tied to bank/cash evidence | Later-phase workflow, schema reserved now |
| Period control | `accounting_periods` with lock state | Backdated postings into a locked period disallowed by default |

## 9. Security Summary

| Concern | Choice |
|---|---|
| Transport | HTTPS |
| Password hashing | bcrypt, cost 12+ |
| Auth | JWT (short-lived) + revocable server-tracked refresh tokens |
| Authorization | Permission-code based RBAC, enforced server-side on every endpoint |
| Rate limiting | In-memory express-rate-limit, tiered by endpoint sensitivity |
| Concurrency safety | Postgres row locks (consistent lock ordering) + application-level balance checks |
| Idempotency | DB-stored idempotency keys (Redis caching deferred to last phase) |
| Audit trail | Every wallet/fund/expense mutation logged in the same transaction as the action |
| Secrets management | Environment variables / secret manager on the server only |

## 10. Deferred Stack Additions (later phases)

| Addition | Purpose |
|---|---|
| Electron + electron-builder | Package the frontend into a single identical desktop `.exe` for every role |
| Electron `safeStorage` API | OS-level encrypted local session caching for offline grace-period login |
| Local queue (SQLite/JSON) for offline approval decisions | Manager fund-request approvals queued offline, synced with staleness/version checks on reconnect |
| Memurai (Redis-compatible for Windows) | Native Windows Redis equivalent, if deploying on a Windows on-premise server |
| Process manager (`pm2` or `node-windows`) | Keep the Node API running as an auto-restarting service on an on-premise server |
| Payment gateway / bank statement import integration | Automated reconciliation, future phase |
