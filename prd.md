# EstateSync — Fund Management & Accounting System PRD

**Version:** 1.2
**Current Phase:** Fund Management, Expense Management, Accounting, Customer/Sales Collections & Property Acquisition
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
Financial oversight **and** narrow write authority — no longer purely read-only. Can view: total organizational/available/allocated/distributed funds, total expenses, manager and employee wallets, user-wise/manager-wise/department-wise allocation and expenses, complete transaction history, fund requests (approved/pending/rejected), financial reports.

**Write authority (as of v1.2):** Accounting can post the following financial-write actions directly:
- Record a customer payment (§19.4)
- Record a land-owner payment (§20.3)
- Reverse an expense (§16)

**Accounting still cannot** allocate or transfer funds between internal wallets (`fund.allocate` / `fund.approve` remain Admin/Manager-only). This preserves the original separation of duties: Accounting can post money moving **in from** or **out to** parties outside the internal wallet system, and correct erroneous entries, but cannot decide how internal funds are distributed between Admin → Manager → Sales/Marketing.

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
`wallet_id`, `user_id`, `total_allocated_liquid`, `total_allocated_cash`, `total_spent_liquid`, `total_spent_cash`, `available_balance_liquid`, `available_balance_cash`, `created_at`, `updated_at`.

Conceptually: `available_balance_liquid = total_allocated_liquid - total_spent_liquid` (and similarly for cash). The actual implementation must maintain full transactional records rather than relying on a calculated number alone.

### 4.2 Wallet Transaction Types
`FUND_ALLOCATION`, `FUND_TRANSFER`, `FUND_REQUEST`, `FUND_REQUEST_APPROVED`, `FUND_REQUEST_REJECTED`, `EXPENSE`, `EXPENSE_REVERSAL`, `FUND_RETURN`, `ADJUSTMENT`, `CUSTOMER_PAYMENT_RECEIVED`, `LAND_ACQUISITION_PAYMENT`.

`CUSTOMER_PAYMENT_RECEIVED` and `LAND_ACQUISITION_PAYMENT` are **external** transaction types — unlike the other types, they are not a transfer between two existing internal wallets. A customer payment is new money entering the Organization Wallet from outside the system; a land acquisition payment is money leaving the Organization Wallet to a party (land owner) outside the system. See §19–20.

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

### 4.4 Debit / Credit Display Convention

Every transaction shown anywhere in the UI (Transaction Ledger, Wallet Dashboard, Customer Payment History, Property Payment History) must carry a visible **CREDIT** or **DEBIT** tag, so a user can tell at a glance whether money came in or went out — not just the raw amount.

This is computed server-side at posting time as an `entry_type` (`CREDIT` | `DEBIT`) attached to each **wallet-side** ledger row — a transaction that touches two wallets (e.g. an allocation) produces one `DEBIT` row for the source wallet and one `CREDIT` row for the destination wallet, not a single ambiguous row. `entry_type` is never user-editable; it is derived from the transaction type and which side of it a given wallet is on.

| Transaction Type | Wallet in view | Entry Type |
|---|---|---|
| `FUND_ALLOCATION` | Source (Admin/Manager) | **DEBIT** |
| `FUND_ALLOCATION` | Destination (Manager/User) | **CREDIT** |
| `FUND_TRANSFER` | Source | **DEBIT** |
| `FUND_TRANSFER` | Destination | **CREDIT** |
| `FUND_REQUEST_APPROVED` | Approver's wallet | **DEBIT** |
| `FUND_REQUEST_APPROVED` | Requester's wallet | **CREDIT** |
| `FUND_REQUEST_REJECTED` | — | No wallet impact — no entry |
| `EXPENSE` | Spending user's wallet | **DEBIT** |
| `EXPENSE_REVERSAL` | Spending user's wallet | **CREDIT** |
| `FUND_RETURN` | Returning wallet | **DEBIT** |
| `FUND_RETURN` | Receiving wallet | **CREDIT** |
| `ADJUSTMENT` | Affected wallet | **DEBIT** or **CREDIT**, per the sign of the adjustment |
| `CUSTOMER_PAYMENT_RECEIVED` | Organization Wallet | **CREDIT** |
| `LAND_ACQUISITION_PAYMENT` | Organization Wallet | **DEBIT** |

In plain terms, matching how the business actually talks about it: **a client payment is a CREDIT** to the Organization Wallet; **an expense and a land-owner payment are both DEBITs** against the paying wallet. UI treatment: CREDIT rows are visually distinct from DEBIT rows (e.g. green vs. red, `+`/`−` prefix on the amount) — exact styling is a frontend decision, but the tag itself is a required, non-optional field on every ledger row.

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
`request_id`, `requester_id`, `manager_id`, `amount`, `fund_mode` (`LIQUID` or `CASH`), `reason`, `status`, `created_at`, `approved_at`, `rejected_at`, `approved_by`, `rejected_by`, `comments`. Admin-directed requests additionally carry `requested_from = ADMIN`.

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

Every user with fund access can record expenses against their wallet. An expense always posts as a **DEBIT** against the spending wallet (§4.4).

**Expense fields:** `expense_id`, `user_id`, `wallet_id`, `category`, `amount`, `fund_mode` (`LIQUID` or `CASH`), `description`, `date`, `vendor`, `reference`, `attachment`, `status`, `created_at`.

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

The system maintains a central, authoritative transaction ledger. Each transaction record contains: `transaction_id`, `transaction_type`, `entry_type` (`CREDIT`/`DEBIT` — see §4.4), `source_wallet_id`, `destination_wallet_id`, `amount`, `reference_type`, `reference_id`, `description`, `created_by`, `created_at`, `status`.

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

**Example permission codes:** `fund.view`, `fund.allocate`, `fund.request`, `fund.approve`, `fund.reject`, `wallet.view`, `wallet.view_all`, `expense.create`, `expense.view`, `expense.view_all`, `expense.approve`, `expense.reverse`, `transaction.view`, `transaction.view_all`, `accounting.view`, `report.view`, `audit.view`, `customer.create`, `customer.view`, `customer.view_all`, `customer.payment.record`, `property.create`, `property.view`, `property.view_all`, `property.payment.record`.

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
| Create customer profile | Y | — | Y | — | — | — |
| View customer profiles | Y (all) | — | Own | — | Y (all) | — |
| Record customer payment | Y | — | — | — | Y | — |
| Create property/land record | Y | — | — | — | Y | — |
| View property/land records | Y | — | — | — | Y | — |
| Record land-owner payment | Y | — | — | — | Y | — |
| Reverse expenses | Y | — | — | — | Y | — |

*depends on the specific administrative operation. `customer.payment.record` and `property.payment.record` are deliberately **narrower** than `fund.allocate` — they let Accounting post an externally-originated cash movement (customer receipt in, land-owner payout out) into the ledger, but do **not** grant Accounting the ability to move funds *between* internal wallets. Accounting's role (§3.6) is now write-capable for these specific actions, not read-only. See §19–§20 for why this doesn't contradict the separation-of-duties intent.

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
/api/v1/customers
/api/v1/customers/:id
/api/v1/customers/:id/payments
/api/v1/properties
/api/v1/properties/:id
/api/v1/properties/:id/payments
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
- [ ] Sales can create a customer profile with plot/commercial details
- [ ] Accounting can record a customer payment against a profile
- [ ] Every customer payment increases the Organization Wallet and updates customer total paid / balance
- [ ] Admin/Accounting can create a property acquisition (land) record
- [ ] Accounting can record a payment to a land owner against a property record
- [ ] Every land-owner payment decreases the Organization Wallet and updates property total paid / balance remaining
- [ ] Land-owner payments cannot exceed the property's remaining balance
- [ ] Customer and property payments are immutable, idempotent, and generate audit + journal entries like all other financial operations
- [ ] Accounting can record customer payments and land-owner payments directly (write authority, not read-only)
- [ ] Every ledger row displays a CREDIT or DEBIT tag based on transaction type and wallet perspective (§4.4)

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

## 19. Customer Management & Sales Collections

This module tracks each sold/booked unit as a **Customer** record and every rupee the customer pays against it. It is the revenue-inflow counterpart to the internal wallet/allocation system defined in §1–§10.

### 19.1 Ownership Split

| Step | Owned By |
|---|---|
| Create customer profile (master + commercial snapshot) | **Sales** |
| Edit customer profile (non-financial fields) | Sales (own), Admin (all) |
| Record a payment against a customer | **Accounting** |
| View customer profiles | Sales (own customers), Admin/Accounting (all) |

Sales originates the relationship and the commercial terms; Accounting is the only role that posts money against it, mirroring the real-world separation between "who sold it" and "who reconciles the cash."

### 19.2 Customer Master Fields

`customer_id`, `sales_owner_id` (Sales user who created it), `customer_name`, `customer_contact`, `customer_address`, `project_location`, `plot_no`, `area_sqft`, `khata_no`, `identity_type` (Aadhaar/PAN/Passport/etc.), `identity_number`, `kyc_documents[]` (stored document references — filenames/URLs, not raw file blobs, per the existing document-handling pattern), `status` (`ACTIVE` / `CANCELLED`), `created_at`, `updated_at`.

### 19.3 Commercial Snapshot Fields

`rate_per_sqft`, `land_cost`, `registry_cost`, `other_charges`, `discount`, `taxes`, `total_contract_value`.

`total_contract_value` is computed once at profile creation (`land_cost + registry_cost + other_charges + taxes − discount`) and then **frozen** — later corrections go through an explicit amendment, not a silent recalculation, to preserve the audit trail.

Two additional fields are **derived, not stored as free-editable inputs** — they exist only as the running result of the payment ledger in §19.4:
- `total_paid` = sum of all non-reversed payments for this customer
- `balance_due` = `total_contract_value − total_paid`

### 19.4 Customer Payment History

`payment_id`, `customer_id`, `date_of_payment`, `amount`, `payment_mode` (Cash/Cheque/NEFT/RTGS/UPI/DD), `source_account` (client's paying account/reference), `destination_account` (organization bank/collection account the money landed in), `reference_no`, `recorded_by` (Accounting user), `created_at`.

A customer payment always posts as a **CREDIT** to the Organization Wallet (§4.4) — it is money entering the system.

**On every payment recorded:**

```
Accounting records Customer Payment ₹10,00,000
        │
        ▼
BEGIN TRANSACTION
  Validate amount > 0 and amount <= remaining balance_due (warn/block overpayment per business rule)
  Create CustomerPayment record
  Organization Wallet available_balance += amount      (WalletTransaction: CUSTOMER_PAYMENT_RECEIVED)
  Customer.total_paid   += amount
  Customer.balance_due  -= amount
  Create accounting journal entry:
      Debit  Bank/Collection Account
      Credit Customer Contract / Revenue Receivable Account
  Create audit log
COMMIT
```

This is the **inverse direction** of §6 (Fund Allocation): instead of money moving between two wallets that already exist inside the system, new money is entering the Organization Wallet from outside it. It uses the same atomicity, immutability, and audit guarantees as every other wallet-affecting operation in §4.3 and §16 — a customer payment can never be edited or deleted after posting; corrections use a reversal entry.

### 19.5 Customer Payment Rules

| Role | Can | Cannot |
|---|---|---|
| Sales | Create customer profile, view own customers, edit non-financial fields | Record payments, edit commercial snapshot after freeze |
| Accounting | Record payments, view all customers, view full payment history | Create/edit the customer profile itself |
| Admin | Everything Sales + Accounting can do, amend frozen commercial terms | — |
| Manager / Marketing / Other | No access unless explicitly granted | — |

## 20. Property Acquisition Management

This module tracks land parcels the organization **acquires** and every payment made to the land owner against the purchase — the outflow counterpart to §19, and structurally the mirror image of it.

### 20.1 Ownership Split

| Step | Owned By |
|---|---|
| Create property/land acquisition record | **Admin / Accounting** |
| Record a payment to the land owner | **Accounting** |
| View property records | Admin / Accounting |

### 20.2 Property Master Fields

`property_id`, `khata_no`, `plot_no`, `project_location`, `land_owner_name`, `land_owner_contact`, `total_land_value`, `status` (`ONGOING` / `FULLY_PAID` / `CANCELLED`), `created_by`, `created_at`, `updated_at`.

Derived fields (from the payment ledger in §20.3, not directly editable):
- `total_paid_to_owner` = sum of all non-reversed payments against this property
- `balance_remaining` = `total_land_value − total_paid_to_owner`

### 20.3 Land Owner Payment History

`payment_id`, `property_id`, `date_of_payment`, `amount`, `payment_mode`, `paid_from_account`, `reference_no`, `paid_by` (Accounting user), `created_at`.

A land-owner payment always posts as a **DEBIT** against the Organization Wallet (§4.4) — it is money leaving the system, the same as an expense.

**On every payment recorded:**

```
Accounting records Land Owner Payment ₹5,00,000
        │
        ▼
BEGIN TRANSACTION
  Validate amount > 0 and amount <= balance_remaining
  Validate amount <= Organization Wallet available_balance
  Create PropertyPayment record
  Organization Wallet available_balance -= amount       (WalletTransaction: LAND_ACQUISITION_PAYMENT)
  Property.total_paid_to_owner += amount
  Property.balance_remaining   -= amount
  Create accounting journal entry:
      Debit  Land / Fixed Asset Account
      Credit Bank/Cash Account
  Create audit log
COMMIT
```

The same no-negative-balance invariant from §4.3 applies here: a land-owner payment can never push the Organization Wallet below zero, and can never exceed the property's own `balance_remaining`. This is functionally an **`EXPENSE`-shaped** transaction against the Organization Wallet rather than an internal transfer — it behaves like §7 (Expense Management) but posts against `total_land_value` instead of a discretionary expense category.

### 20.4 Property Payment Rules

| Role | Can | Cannot |
|---|---|---|
| Admin | Create property record, record payments, view all | — |
| Accounting | Create property record, record payments, view all | — |
| Manager / Sales / Marketing / Other | No access | — |

### 20.5 Note on §3.6 (Accounting has no allocation authority)

§3.6 states Accounting should not automatically receive Admin-level fund-**allocation** authority — that still holds: Accounting cannot move money between internal wallets (Admin → Manager → Sales/Marketing) via `fund.allocate`. What §19–§20 add is narrower: authority to **post externally-originated transactions** (money arriving from a customer, money leaving to a land owner) via the separate `customer.payment.record` / `property.payment.record` permission codes (§12). This preserves the original separation-of-duties intent while giving Accounting the operational role it needs to actually run collections and land payouts.

## 21. Open Items for This Phase

- Exact definition and display separation of "Total Available" (organizational vs. wallet-level) to be finalized in implementation and UI copy.
- Whether Accounting requires any conditional allocation authority in specific approved scenarios — **narrowed by §19–§20 to `customer.payment.record` / `property.payment.record` only**; general `fund.allocate` remains Admin/Manager-only.
- Expense approval thresholds and categories, to be aligned with the broader EstateSync expense/accounting design from the CRM phase.
- Reconciliation process between wallet transactions and bank/cash evidence.
- Whether overpayment by a customer (amount recorded exceeds `balance_due`) should be blocked outright or allowed and tracked as a credit/advance.
- Whether a property acquisition record can be created before any payment is made (i.e., value-only record) or only alongside a first payment.
- Redis integration for caching, sessions, and idempotency (deferred to the final phase).

## 22. Related Documents

- `architecture.md` — system architecture for the fund management module
- `techStack.md` — technology stack and tooling decisions