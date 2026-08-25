# EstateSync Feature Tracking Matrix

Based on the [Product Requirements Document (PRD)](./prd.md), here is the comprehensive status of all features, marking what has been implemented and what is currently pending.

---

## 1. User Roles & Authentication
| Feature | Status | Notes |
|---------|--------|-------|
| Six user types implemented (Admin, Manager, Sales, Marketing, Accounting, Other) | ✅ **Implemented** | All roles exist and are seeded in the DB. |
| JWT Authentication | ✅ **Implemented** | Login/Logout flow with secure HTTP and session management. |
| Permission-based RBAC | ✅ **Implemented** | Strict permission code checks on backend routes (e.g., `fund.approve`). |

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

## 5. Dashboards & Visibility
| Feature | Status | Notes |
|---------|--------|-------|
| Admin can view all transactions and wallets | ✅ **Implemented** | `TransactionLedger` and `DashboardStats` provide real-time org-wide visibility. |
| Accounting can view all financial transactions, total funds, allocated funds, expenses, and every user's wallet | ✅ **Implemented** | Built in `accounting/page.js` with `UserWalletLedger`, `ExpenseList`, `TransactionLedger`, and `DashboardStats`. |
| Live Dashboard Statistics | ✅ **Implemented** | `dashboardController.js` serves live aggregates for Admin, Manager, Accounting, and Wallet views. |

## 6. Ledger & Accounting Integrity
| Feature | Status | Notes |
|---------|--------|-------|
| Every fund movement creates a transaction | ✅ **Implemented** | `WalletTransaction` captures every flow. |
| Posted financial transactions are immutable | ✅ **Implemented** | No API endpoints exist to delete or edit `WalletTransaction` records. |
| Every sensitive action creates an audit record | ⚠️ **Partial** | The `WalletTransaction` serves as an audit log, but a dedicated `AuditLog` table for non-financial events (like login/role changes) is pending. |
| Critical financial operations support idempotency | ❌ **Pending** | Requires `Idempotency-Key` headers or request hashing to prevent double-charging on network retries. |
| Accounting entries maintain debit = credit | ❌ **Pending** | Requires building out the `Account` and `JournalEntry` modules for formal double-entry accounting. |
| Corrections use reversal transactions | ❌ **Pending** | Needs API and UI support for Expense/Transaction Reversals. |

---

## Next Steps to reach MVP Complete:
1. Build **Admin Direct Fund Allocation UI** to push money down to Managers.
2. Build **Expense Lists** (My Expenses, Team Expenses).
3. Build out the **Accounting Dashboard**.
4. Implement **Idempotency** for transaction endpoints.
5. Implement double-entry **Journal / Accounts** modules.
