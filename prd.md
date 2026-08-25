# EstateSync — Fund Management & Accounting System PRD

**Version:** 1.1
**Current Phase:** Fund Management, Expense Management & Accounting
**Frontend:** Next.js / React
**Backend:** Node.js + Express.js
**Database:** PostgreSQL
**Cache:** None (Redis implementation deferred to the final phase)
**API:** REST `/api/v1/...`

---

## 1. Product Overview

EstateSync is a role-based fund management and accounting platform for managing organizational funds, employee/team wallets, expense requests, approvals, allocations, and financial transactions.

This phase focuses on the **Accounting and Fund Management system** — a layer that sits alongside (and eventually connects to) the CRM/booking/collections modules defined in earlier phases.

The system provides:

- Central fund management
- Fund allocation
- User wallets
- Fund requests
- Manager approval workflow
- Admin funding of managers
- Expense recording and tracking
- Overall financial transaction visibility
- Available / allocated / spent fund tracking
- Accounting oversight
- Audit history
- Role-based access control

**Core principle:** every movement of organizational funds must be traceable.

## 2. User Roles

| Role | Description |
|---|---|
| ADMIN | Highest level of financial visibility and control; funds managers |
| MANAGER | Controls funds allocated to their team; approves/rejects requests |
| SALES | Requests and spends funds against own wallet |
| MARKETING | Requests and spends funds against own wallet |
| ACCOUNTING | Read/oversight access to all financial data — no allocation authority |
| OTHER | Users/departments outside Sales/Marketing who still need wallet access |

## 3. Role Responsibilities

### 3.1 Admin
Can: view all transactions, users, wallets, total organizational/allocated/available funds, total expenses, fund requests, manager balances, department/user expenses, complete transaction history, financial reports, audit logs; allocate funds to managers; perform authorized administrative corrections.

**Admin fund allocation** — the primary Admin responsibility is funding managers:

```
Organization Funds
        │
        ▼
      ADMIN
        │
        │ Allocate Funds
        ▼
    MANAGER WALLET
```

Example: Admin has ₹10,00,000 available. Allocating ₹2,00,000 to a manager leaves Admin with ₹8,00,000 available and creates a permanent transaction record.

### 3.2 Manager
Can: view own wallet, available/allocated funds, team fund requests; approve/reject requests; allocate available funds to team members; view team expenses; request additional funds from Admin; view own transaction history.

**A manager cannot allocate more money than the manager currently has available.**

```
ADMIN
   │ Allocate
   ▼
MANAGER WALLET
   │
   ├──────────────┐
   ▼              ▼
SALES WALLET   MARKETING WALLET
   │              │
   ▼              ▼
EXPENSES        EXPENSES
```

**Insufficient manager funds:** if a manager cannot cover a team request, the manager raises a fund request to Admin. Only after Admin approves and the manager's balance increases can the manager approve the original team request.

```
Sales requests ₹50,000
Manager Wallet = ₹20,000  → Insufficient Funds
        ↓
Manager raises fund request to Admin
        ↓
Admin approves allocation
        ↓
Manager Wallet increases
        ↓
Manager approves Sales request
```

The system must prevent negative wallet balances at every step.

### 3.3 Sales
Can: view own wallet/available/allocated funds; request funds; view own requests and status; record expenses; view own expenses and transactions. **Cannot** directly allocate organizational funds.

### 3.4 Marketing
Same capabilities as Sales. **Cannot** approve its own fund request.

### 3.5 Other
Same basic capabilities as Sales/Marketing (wallet view, fund requests, expense recording/viewing) unless additional permissions are assigned.

### 3.6 Accounting
Financial oversight rather than operational fund allocation. Can view: total organizational/available/allocated/distributed funds, total expenses, manager and employee wallets, user-wise/manager-wise/department-wise allocation and expenses, complete transaction history, fund requests (approved/pending/rejected), financial reports.

**Accounting has read/oversight access and should not automatically receive Admin-level fund-allocation authority.**

## 4. Wallet System

The wallet is the central concept of the fund-management system. Every fund-controlled user has a wallet.

```
                    ORGANIZATION
                    ₹10,00,000
                         │
                         ▼
                      ADMIN
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
      MANAGER A                     MANAGER B
      ₹2,00,000                     ₹1,50,000
          │
     ┌────┴─────┐
     ▼          ▼
   SALES      MARKETING
   ₹50,000     ₹30,000
```

### 4.1 Wallet Fields
`wallet_id`, `user_id`, `total_allocated`, `total_spent`, `available_balance`, `created_at`, `updated_at`.

Conceptually: `available_balance = total_allocated - total_spent`. The actual implementation must maintain full transactional records rather than relying on a calculated number alone.

### 4.2 Wallet Transaction Types
`FUND_ALLOCATION`, `FUND_TRANSFER`, `FUND_REQUEST`, `FUND_REQUEST_APPROVED`, `FUND_REQUEST_REJECTED`, `EXPENSE`, `EXPENSE_REVERSAL`, `FUND_RETURN`, `ADJUSTMENT`.

Example chain:

```
ADMIN_ALLOCATED ₹2,00,000 → MANAGER WALLET
MANAGER_ALLOCATED ₹50,000 → SALES WALLET
SALES_EXPENSE ₹10,000 → SALES WALLET

Result:
Sales Allocated: ₹50,000
Sales Spent:     ₹10,000
Sales Available: ₹40,000
```

### 4.3 Wallet Invariants (mandatory)

| Rule | Description |
|---|---|
| No negative balance | `available_balance >= 0` — any transaction that would violate this must fail |
| Every allocation is recorded | Money cannot appear in a wallet without a source transaction |
| Every expense is recorded | Money cannot disappear from a wallet without a transaction |
| Wallet transactions are immutable | Completed transactions cannot be edited or deleted; corrections use reversal/adjustment transactions |
| Atomic wallet updates | Fund allocation must update source and destination wallets in the same database transaction |

## 5. Fund Request System

Users request funds from the person responsible for their allocation.

**Normal flow:**
```
SALES / MARKETING / OTHER → Fund Request → MANAGER → Approve/Reject → USER WALLET
```

**States:**
```
PENDING → APPROVED
PENDING → REJECTED
```

**Manager insufficient-funds case:**
```
PENDING → INSUFFICIENT_MANAGER_FUNDS → ADMIN_FUND_REQUEST → ADMIN_APPROVED
       → MANAGER_FUNDED → APPROVED
```

### 5.1 Fund Request Fields
`request_id`, `requester_id`, `manager_id`, `amount`, `reason`, `status`, `created_at`, `approved_at`, `rejected_at`, `approved_by`, `rejected_by`, `comments`. Admin-directed requests additionally carry `requested_from = ADMIN`.

`parent_request_id` links a manager's escalated request to Admin back to the original employee request, preserving the full chain (e.g. Sales Request #100 → Manager Request #101 → Admin).

### 5.2 Fund Request Rules

| Role | Can | Cannot |
|---|---|---|
| Sales / Marketing / Other | Create request, view own request, cancel eligible request | Approve own request, allocate funds, modify approved request |
| Manager | View team requests, approve/reject, request additional funds from Admin | Allocate more than available balance |
| Admin | View all requests, approve manager funding requests, allocate funds, view all fund movements | — |

## 6. Fund Allocation

### 6.1 Admin → Manager
`POST /api/v1/funds/allocate`
```json
{ "recipientId": "manager-123", "amount": 200000, "reason": "Monthly operational budget" }
```
Both the Admin wallet decrease and Manager wallet increase occur inside one PostgreSQL transaction.

### 6.2 Manager → User
`POST /api/v1/funds/allocate`
```json
{ "recipientId": "sales-123", "amount": 50000, "reason": "Sales travel budget" }
```

### 6.3 Allocation Validation Sequence
1. Authenticate user
2. Check permission
3. Verify recipient
4. Verify recipient relationship (reporting line)
5. Verify amount > 0
6. Check source wallet balance
7. Lock source wallet
8. Lock destination wallet
9. Create transaction record
10. Update balances
11. Create audit record
12. Commit

If any step fails: **full rollback**. No partial allocation is ever persisted.

## 7. Expense Management

Every user with fund access can record expenses against their wallet.

**Expense fields:** `expense_id`, `user_id`, `wallet_id`, `category`, `amount`, `description`, `date`, `vendor`, `reference`, `attachment`, `status`, `created_at`.

**Flow:**
```
USER WALLET → Expense → EXPENSE CREATED → EXPENSE RECORDED → WALLET BALANCE UPDATED
```

### 7.1 Expense Visibility

| Role | Visibility |
|---|---|
| Sales / Marketing / Other | Own expenses, own wallet, own transactions |
| Manager | Own + team expenses, team wallets, team transactions |
| Accounting | All expenses, all wallets, all transactions |
| Admin | Everything |

## 8. Dashboards

### 8.1 Admin / Accounting — Financial Overview
Total Organizational Funds, Total Allocated, Total Available, Total Expenses, Pending Fund Requests — plus breakdowns by user, manager, department, expense category, date, and transaction type.

### 8.2 Wallet Dashboard (all fund-holding users)
Allocated / Spent / Available for the logged-in user. Admin/Accounting additionally see a table of all users' Allocated/Spent/Available.

### 8.3 Manager Dashboard
My Wallet (Allocated/Spent/Available), Fund Requests (Pending/Approved/Rejected), Team (Sales/Marketing/Other), Team Wallets, Team Expenses, Request Funds From Admin.

### 8.4 Sales / Marketing / Other Dashboard
Simplified: My Wallet, Request Funds, My Requests, My Expenses, My Transactions.

## 9. Transaction Ledger

The system maintains a central, authoritative transaction ledger. Each transaction record contains: `transaction_id`, `transaction_type`, `source_wallet_id`, `destination_wallet_id`, `amount`, `reference_type`, `reference_id`, `description`, `created_by`, `created_at`, `status`.

Example chain:
```
TXN-001  FUND_ALLOCATION   Admin Wallet → Manager A Wallet     ₹2,00,000
TXN-002  FUND_ALLOCATION   Manager A Wallet → Sales A Wallet   ₹50,000
TXN-003  EXPENSE           Sales A Wallet                      ₹8,000
```

## 10. Wallet ↔ Accounting Relationship

The **wallet/fund system is the operational view** (who currently has funds available). The **accounting ledger is the financial source of truth** (where every rupee came from and went), maintained via proper double-entry records:

```
Fund Allocation → Wallet Transaction → Accounting Transaction → General Ledger → Financial Reports
```

- **Fund transfer:** Debit Destination Fund/Wallet Account, Credit Source Fund/Wallet Account.
- **Expense:** Debit Expense Account, Credit Wallet/Cash/Bank Account.

## 11. Most Important Business Rule — Fund Categories

The system must distinguish clearly, throughout the database, APIs, dashboards, and reports, between:

| Category | Meaning |
|---|---|
| Organizational Funds | Money controlled by the organization/Admin |
| Allocated Funds | Money assigned to a manager/user but not necessarily spent |
| Spent Funds | Money actually consumed through expenses |
| Available Wallet Funds | Money currently available to a specific wallet |

```
ORGANIZATION LEVEL
Total Funds
    ├── Unallocated Funds
    └── Allocated Funds
            ├── Manager A (Available / Spent)
            ├── Manager B
            └── Other Users
```

Two distinct "available" figures must be shown separately, never conflated:
- **Organizational Available** = Organization Funds − Funds Allocated
- **Wallet Available** = Wallet Allocated − Wallet Spent

## 12. Permission Structure

**Example permission codes:** `fund.view`, `fund.allocate`, `fund.request`, `fund.approve`, `fund.reject`, `wallet.view`, `wallet.view_all`, `expense.create`, `expense.view`, `expense.view_all`, `expense.approve`, `expense.reverse`, `transaction.view`, `transaction.view_all`, `accounting.view`, `report.view`, `audit.view`.

| Permission | Admin | Manager | Sales | Marketing | Accounting | Other |
|---|---|---|---|---|---|---|
| Own wallet | Y | Y | Y | Y | Y | Y |
| All wallets | Y | Team | — | — | Y | — |
| Request funds | Y* | Y | Y | Y | — | Y |
| Allocate funds | Y | Y | — | — | — | — |
| Approve requests | Y | Y | — | — | — | — |
| Own expenses | Y | Y | Y | Y | Y | Y |
| All expenses | Y | Team | — | — | Y | — |
| All transactions | Y | Team | — | — | Y | — |
| Financial reports | Y | Y | Limited | Limited | Y | Limited |
| Audit logs | Y | Limited | — | — | Y/Limited | — |

*depends on the specific administrative operation.

## 13. API Structure

```
/api/v1/auth
/api/v1/users
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
/api/v1/vendors
/api/v1/accounts
/api/v1/journals
/api/v1/accounting-periods
/api/v1/reconciliations
/api/v1/transactions
/api/v1/reports
/api/v1/audit
```

## 14. Critical Fund Transaction Logic

```
BEGIN TRANSACTION
  Lock source wallet
  Lock destination wallet
  Check source balance
  IF balance < amount: ROLLBACK
  Create wallet transaction
  Decrease source balance
  Increase destination balance
  Create audit log
  Create accounting entry
COMMIT
```

This prevents two simultaneous requests from spending the same available balance.

## 15. Example End-to-End Flow

```
Total Funds = ₹10,00,000

Admin allocates:
  Manager A = ₹2,00,000
  Manager B = ₹1,50,000
Admin Available = ₹6,50,000

Manager A approves:
  Sales A     = ₹50,000
  Marketing A = ₹30,000
Manager A Available = ₹1,20,000

Sales A spends ₹10,000:
  Allocated = ₹50,000
  Spent     = ₹10,000
  Available = ₹40,000

Accounting view:
  Total Funds       ₹10,00,000
  Total Allocated   ₹3,30,000
  Total Spent       ₹10,000
  Total Available   ₹6,60,000
```

## 16. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Data integrity | No wallet balance ever goes negative; every fund movement is traceable to a transaction |
| Auditability | Every allocation, request decision, expense, and reversal captures actor, before/after values, and timestamp |
| Concurrency | Source and destination wallets locked and updated within a single atomic transaction |
| Immutability | Posted wallet/accounting transactions are never edited or deleted; corrections use reversal/adjustment entries |
| Accounting integrity | Every accounting entry maintains debit = credit |
| Idempotency | Critical financial operations (allocation, transfer, expense posting) support idempotency to prevent duplicate processing on retry |
| Access control | Role-based, permission-code driven, enforced server-side regardless of frontend display |

## 17. Definition of Done (MVP)

- [ ] Six user types implemented
- [ ] Authentication implemented
- [ ] Permission-based RBAC implemented
- [ ] Every fund-controlled user has a wallet
- [ ] Admin can allocate funds to managers
- [ ] Managers can view their wallet
- [ ] Managers can approve team fund requests
- [ ] Managers cannot approve requests exceeding their available funds
- [ ] Managers can request additional funds from Admin
- [ ] Sales / Marketing / Other users can request funds
- [ ] Users can record and view their own expenses
- [ ] Managers can view team expenses
- [ ] Accounting can view all financial transactions, total funds, allocated funds, expenses, and every user's wallet
- [ ] Admin can view all transactions and wallets
- [ ] Fund transfers are atomic
- [ ] Wallet balances can never become negative
- [ ] Every fund movement creates a transaction
- [ ] Every sensitive action creates an audit record
- [ ] Critical financial operations support idempotency
- [ ] Accounting entries maintain debit = credit
- [ ] Posted financial transactions are immutable
- [ ] Corrections use reversal transactions

## 18. Core System Flow (Summary)

```
                    ┌──────────────┐
                    │    ADMIN     │
                    └──────┬───────┘
                           │ Allocate Funds
                           ▼
                    ┌──────────────┐
                    │ MANAGER WALLET│
                    └──────┬───────┘
                ┌──────────┼──────────┐
                ▼          ▼          ▼
             SALES     MARKETING    OTHER
             WALLET      WALLET     WALLET
                └──────────┼──────────┘
                           ▼
                         EXPENSE
                           ▼
                  WALLET TRANSACTION
                           ▼
                    ACCOUNTING LEDGER
              ┌────────────┼────────────┐
              ▼            ▼            ▼
          EXPENSES      REPORTS      AUDIT LOG
```

The wallet/fund system is the operational core; the accounting ledger is the financial source of truth. This separation matters: a wallet tells you who currently has funds available, while the transaction/accounting ledger tells you where every rupee came from and where it went.

## 19. Open Items for This Phase

- Exact definition and display separation of "Total Available" (organizational vs. wallet-level) to be finalized in implementation and UI copy.
- Whether Accounting requires any conditional allocation authority in specific approved scenarios (currently: view/oversight only).
- Expense approval thresholds and categories, to be aligned with the broader EstateSync expense/accounting design from the CRM phase.
- Reconciliation process between wallet transactions and bank/cash evidence.
- Redis integration for caching, sessions, and idempotency (deferred to the final phase).

## 20. Related Documents

- `architecture.md` — system architecture for the fund management module
- `techStack.md` — technology stack and tooling decisions
