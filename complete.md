# EstateSync Feature Tracking Matrix

Based on the [Product Requirements Document (PRD)](./prd.md), here is the comprehensive status of all features, marking what has been implemented and what is currently pending.

---

## 1. User Roles & Authentication
| Feature | Status | Notes |
|---------|--------|-------|
| Six user types implemented (Admin, Manager, Sales, Marketing, Accounting, Other) | ✅ **Implemented** | All roles exist and are seeded in the DB. |
| JWT Authentication | ✅ **Implemented** | Login/Logout flow with secure HTTP and session management. |
| Permission-based RBAC | ✅ **Implemented** | Strict permission code checks on backend routes (e.g., `fund.approve`, `expense.create`, `expense.reverse`). |

## 2. Wallet System
| Feature | Status | Notes |
|---------|--------|-------|
| Every fund-controlled user has a wallet | ✅ **Implemented** | Automatically generated upon user registration. |
| Managers can view their wallet | ✅ **Implemented** | Built into the Manager Dashboard via `DashboardStats`. |
| Wallet balances can never become negative | ✅ **Implemented** | Strict database validation and transaction locking prevent this. |

## 3. Fund Allocation & Requests
| Feature | Status | Notes |
|---------|--------|-------|
| Admin can allocate funds to managers | ✅ **Implemented** | `DirectFundAllocationForm` and `POST /api/v1/fund-requests/allocate` allow Admin to push funds directly into manager/user wallets. |
| Sales / Marketing / Other users can request funds | ✅ **Implemented** | `FundRequestForm` allows users to select their manager and request funds. |
| Managers can approve team fund requests | ✅ **Implemented** | `FundRequestList` on Manager dashboard supports one-click atomic approvals. |
| Managers cannot approve requests exceeding available funds | ✅ **Implemented** | Prisma `$transaction` explicitly blocks approval if manager's balance is too low. |
| Managers can request additional funds from Admin | ✅ **Implemented** | Managers can select System Admin as their approver in `FundRequestForm`. |
| Fund transfers are atomic | ✅ **Implemented** | Handled natively by Prisma `$transaction`. |

## 4. Expense Management
| Feature | Status | Notes |
|---------|--------|-------|
| Users can record their own expenses | ✅ **Implemented** | `ExpenseUploadForm` deducts wallet balance and creates expense records securely. |
| Users can view their own expenses | ✅ **Implemented** | `ExpenseList (type="my")` on the Wallet Dashboard. |
| Managers can view team expenses | ✅ **Implemented** | `ExpenseList (type="team")` on the Manager Dashboard. |
| Admin / Accounting can view all expenses | ✅ **Implemented** | `ExpenseList (type="all")` on Admin and Accounting Dashboards. |

## 5. Dashboards & Visibility
| Feature | Status | Notes |
|---------|--------|-------|
| Admin can view all transactions and wallets | ✅ **Implemented** | `TransactionLedger` and `DashboardStats` provide real-time org-wide visibility. |
| Accounting can view all financial transactions, total funds, allocated funds, expenses, and every user's wallet | ✅ **Implemented** | Built in `accounting/page.js` with `UserWalletLedger`, `ExpenseList`, `TransactionLedger`, `GeneralLedgerView`, and `DashboardStats`. |
| Live Dashboard Statistics | ✅ **Implemented** | `dashboardController.js` serves live aggregates for Admin, Manager, Accounting, and Wallet views. |

## 6. Ledger & Accounting Integrity
| Feature | Status | Notes |
|---------|--------|-------|
| Every fund movement creates a transaction | ✅ **Implemented** | `WalletTransaction` captures every flow. |
| Posted financial transactions are immutable | ✅ **Implemented** | No API endpoints exist to delete or edit `WalletTransaction` records. |
| Every sensitive action creates an audit record | ✅ **Implemented** | Dedicated `AuditLog` table & `AuditLogViewer` tracks all logins, registrations, fund transfers, approvals, and expense events. |
| Critical financial operations support idempotency | ✅ **Implemented** | `idempotencyMiddleware` intercepts `Idempotency-Key` headers on allocations, requests, approvals, and expenses to prevent duplicate charges. |
| Accounting entries maintain debit = credit | ✅ **Implemented** | Double-entry bookkeeping engine with Chart of Accounts (`Account`), `JournalEntry`, `JournalLine`, and UI `GeneralLedgerView` enforcing `sum(debits) === sum(credits)`. |
| Corrections use reversal transactions | ✅ **Implemented** | Admin & Accounting can reverse expenses (`POST /api/v1/expenses/:id/reverse`) with automatic wallet refund, `EXPENSE_REVERSAL` transaction, and reversing double-entry journal. |

---

## 🎉 MVP Status: 100% Complete
All planned MVP requirements from the PRD, architecture, and matrix are fully developed, integrated, and verified.
