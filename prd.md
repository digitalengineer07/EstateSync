# EstateSync Accounting System — Product Requirements Document

**Version:** 1.0  
**Project:** EstateSync  
**Current Scope:** Accounting & Finance Module  
**Backend:** Node.js + Express.js  
**Database:** PostgreSQL  
**Cache / Idempotency / Rate Limiting:** Redis  
**Frontend:** Next.js / React  
**API:** REST `/api/v1/...`

---

# 1. Product Overview

EstateSync is a role-based property business management platform. In the current development phase, this project focuses exclusively on the **Accounting & Finance system**.

The Accounting system will provide a centralized and auditable platform for managing:

- Office expenses
- Vendors
- Chart of accounts
- Double-entry accounting
- Journal entries
- Cash and bank accounts
- Accounting periods
- Expense approvals
- Bank/cash reconciliation
- Financial reports
- Audit history
- Role-based access control

The system must treat financial data as **transactional and immutable**. Posted financial records must not be edited or deleted. Corrections must be performed through controlled reversal or adjustment transactions.

The accounting module must serve as the financial source of truth for EstateSync.

---

# 2. Product Goals

## 2.1 Primary Goals

1. Maintain accurate financial records.
2. Implement proper double-entry accounting.
3. Track all office expenses and settlements.
4. Maintain a structured chart of accounts.
5. Provide cash and bank account visibility.
6. Support expense approval workflows.
7. Prevent unauthorized financial operations.
8. Maintain a complete audit trail.
9. Generate ledger-derived financial reports.
10. Prevent duplicate financial transactions.
11. Protect posted accounting records from modification.
12. Support accounting-period locking.
13. Provide a foundation for future payment, booking, notification, and reporting modules.

---

# 3. Current Phase Scope

## 3.1 In Scope

### Accounting

- Chart of Accounts
- Journal Entries
- Journal Lines
- General Ledger
- Trial Balance
- Profit & Loss
- Balance Sheet
- Cash Flow reporting

### Expenses

- Expense creation
- Expense categories
- Expense items
- Expense evidence/attachments metadata
- Expense submission
- Expense approval
- Expense rejection
- Expense settlement
- Expense reconciliation
- Expense reversal

### Vendors

- Vendor creation
- Vendor listing
- Vendor details
- Vendor updates
- Vendor financial information
- Vendor bills/payables foundation

### Cash & Bank

- Cash accounts
- Bank accounts
- Account balances
- Financial transactions
- Reconciliation

### Accounting Periods

- Period creation
- Period status
- Period locking
- Controlled period reopening

### Governance

- Authentication
- Permission-based RBAC
- Audit logging
- Maker-checker controls
- Idempotency
- Rate limiting
- Input validation

---

# 4. Explicitly Out of Scope

The following are part of the larger EstateSync platform but are **not implemented in the current Accounting phase**:

- Lead management
- CRM
- Site visits
- Property inventory
- Property pricing
- Booking creation
- Customer management
- Customer payment collection
- Payment gateway integration
- SMS
- Email notifications
- WhatsApp
- Electron packaging
- Offline functionality
- Offline approvals
- OCR
- KYC processing
- Customer portal

The accounting architecture should, however, remain compatible with future modules.

---

# 5. User Roles

The system will use permission-based RBAC.

Roles must **not** be hard-coded inside controllers or business logic.

The system will initially support:

| Role | Accounting Access |
|---|---|
| ADMIN | Full accounting control |
| MANAGER | Financial oversight and approvals |
| ACCOUNTING | Expenses, vendors, ledger, reconciliation |
| VIEWER / MIS | Read-only reports and dashboards |
| SYSTEM / WORKER | Automated background operations |

The frontend may hide UI elements based on permissions, but **the backend remains the final authority**.

---

# 6. Permission Model

Permissions use atomic resource-action codes.

Examples:

```text
expense.create
expense.view
expense.submit
expense.approve
expense.reject
expense.settle
expense.reverse

vendor.create
vendor.view
vendor.update

account.create
account.view
account.update

journal.create
journal.view
journal.post
journal.reverse

period.create
period.view
period.lock
period.unlock

cash_bank.view
cash_bank.create
cash_bank.update

reconciliation.create
reconciliation.view
reconciliation.complete

report.view
ledger.view
audit.view
```

A role receives permissions through role-permission mappings.

The backend must never use logic such as:

```js
if (user.role === "ADMIN")
```

Instead:

```text
JWT
 ↓
verifyJWT
 ↓
checkPermission("expense.approve")
 ↓
rateLimiter
 ↓
controller
```

---

# 7. System Architecture

```text
┌──────────────────────────┐
│      Next.js Frontend    │
│       React / Web        │
└────────────┬─────────────┘
             │
          HTTP/JSON
             │
             ▼
┌──────────────────────────┐
│    Node.js / Express     │
│       REST API           │
│                          │
│ Auth / RBAC              │
│ Controllers              │
│ Business Logic           │
│ Validation               │
│ Accounting Transactions  │
│ Audit                    │
└────────────┬─────────────┘
             │
       ┌─────┴──────┐
       │            │
       ▼            ▼
┌────────────┐  ┌────────────┐
│ PostgreSQL │  │   Redis    │
│            │  │            │
│ All data   │  │ Sessions   │
│ Ledger     │  │ Rate limit │
│ Expenses   │  │ Idempotency│
│ Audit      │  │            │
└────────────┘  └────────────┘
```

PostgreSQL is the single source of truth for financial data.

Redis is not the source of financial truth.

---

# 8. Backend Project Structure

```text
backend/
│
├── src/
│   ├── config/
│   │   └── db.js
│   │
│   ├── controller/
│   │   ├── expenseController.js
│   │   ├── vendorController.js
│   │   ├── accountController.js
│   │   ├── journalController.js
│   │   ├── accountingPeriodController.js
│   │   ├── cashBankController.js
│   │   ├── reconciliationController.js
│   │   └── reportController.js
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── permissionMiddleware.js
│   │   ├── rateLimitMiddleware.js
│   │   └── errorMiddleware.js
│   │
│   ├── models/
│   │   ├── Expense.js
│   │   ├── ExpenseItem.js
│   │   ├── ExpenseApproval.js
│   │   ├── Vendor.js
│   │   ├── ChartOfAccount.js
│   │   ├── JournalEntry.js
│   │   ├── JournalLine.js
│   │   ├── AccountingPeriod.js
│   │   ├── CashBankAccount.js
│   │   └── Reconciliation.js
│   │
│   ├── routes/
│   │   ├── expenseRoutes.js
│   │   ├── vendorRoutes.js
│   │   ├── accountRoutes.js
│   │   ├── journalRoutes.js
│   │   ├── accountingPeriodRoutes.js
│   │   ├── cashBankRoutes.js
│   │   ├── reconciliationRoutes.js
│   │   └── reportRoutes.js
│   │
│   ├── utils/
│   │   ├── generateNumber.js
│   │   └── response.js
│   │
│   └── app.js
│
├── package.json
├── package-lock.json
└── .env
```

Controllers are organized by **business resource**, not by role. Role access is enforced through permission middleware.

---

# 9. Authentication

## 9.1 Login

Endpoint:

```http
POST /api/v1/auth/login
```

Request:

```json
{
  "username": "accountant",
  "password": "password"
}
```

Response must contain:

- Short-lived JWT access token
- Refresh token
- User information
- Resolved permission list

Access tokens should be approximately 10–15 minutes.

Refresh tokens must be server-tracked and individually revocable.

---

# 10. Expense Management

## 10.1 Purpose

The expense module manages office expenditure from creation through settlement and reconciliation.

Example categories:

- Wi-Fi
- Food
- Fuel
- Electricity
- Rent
- Travel
- Maintenance
- Stationery
- Salary
- Vendor services
- Other approved categories

---

# 11. Expense Lifecycle

```text
DRAFT
  │
  ▼
SUBMITTED
  │
  ▼
PENDING_APPROVAL
  │
  ▼
APPROVED
  │
  ▼
PAID / SETTLED
  │
  ▼
RECONCILED
```

Alternative states:

```text
SUBMITTED → REJECTED

APPROVED / SETTLED → REVERSED
```

The backend must validate every state transition.

The frontend must never be trusted to enforce the workflow.

---

# 12. Expense Requirements

## FR-EXP-001 — Create Expense

Authorized users must be able to create an expense.

Required information may include:

- Expense category
- Expense date
- Amount
- Vendor
- Description
- Payment method
- Cash/bank account
- Cost center
- Reference number
- Evidence/receipt
- Notes

Initial status:

```text
DRAFT
```

---

## FR-EXP-002 — Submit Expense

An expense can be submitted only when all required information and evidence are available.

```http
POST /api/v1/expenses/:id/submit
```

Status:

```text
DRAFT → SUBMITTED
```

---

## FR-EXP-003 — Approval

Expenses requiring approval move to:

```text
PENDING_APPROVAL
```

An authorized approver can approve or reject the expense.

Approval must capture:

- Approver
- Timestamp
- Decision
- Comment/reason

---

## FR-EXP-004 — Settlement

After approval, the expense can be settled.

```http
POST /api/v1/expenses/:id/settle
```

Settlement records:

- Settlement date
- Payment method
- Cash/bank account
- Reference
- Amount
- User performing settlement

---

## FR-EXP-005 — Accounting Posting

An approved and settled expense creates an accounting entry.

Example:

```text
Office Wi-Fi = ₹1,799

Debit:
Internet Expense       ₹1,799

Credit:
Bank                   ₹1,799
```

The accounting posting must occur inside the appropriate database transaction.

---

## FR-EXP-006 — Reversal

A finalized expense must never be deleted.

Corrections must create a reversal transaction.

Reversal must reference the original transaction.

---

# 13. Vendor Management

## Requirements

Users with appropriate permissions can:

- Create vendors
- View vendors
- Search vendors
- Update vendor information
- View vendor transactions
- View outstanding vendor balances

Sensitive vendor financial/tax information must have appropriate access control and approval requirements.

Endpoints:

```http
POST   /api/v1/vendors
GET    /api/v1/vendors
GET    /api/v1/vendors/:id
PATCH  /api/v1/vendors/:id
```

---

# 14. Chart of Accounts

The system must maintain a hierarchical chart of accounts.

Primary groups:

```text
Assets
Liabilities
Income
Expenses
Equity
```

Example:

```text
1000 Assets
 ├── 1100 Cash
 ├── 1200 Bank
 └── 1300 Customer Receivables

2000 Liabilities
 └── 2100 Vendor Payables

4000 Income
 └── 4100 Property Sales Income

5000 Expenses
 ├── 5100 Internet Expense
 ├── 5200 Fuel Expense
 ├── 5300 Travel Expense
 └── 5400 Food Expense

3000 Equity
 └── 3100 Capital
```

Accounts must have:

- Internal ID
- Public UUID/ULID
- Account code
- Account name
- Account type
- Parent account
- Status
- Created timestamp
- Updated timestamp

---

# 15. Journal Entry System

Journal entries are the core accounting mechanism.

A journal contains:

```text
Journal Entry
 ├── Header
 └── Journal Lines
       ├── Debit
       └── Credit
```

Example:

```text
JE-000001

Debit:
Internet Expense       1,799

Credit:
Bank                   1,799
```

---

# 16. Journal Invariants

The following rules are mandatory.

### Rule 1 — Balanced Entry

```text
Total Debit = Total Credit
```

An unbalanced journal cannot become `POSTED`.

### Rule 2 — No Negative Amounts

Journal line amounts must be positive unless a dedicated accounting mechanism supports otherwise.

### Rule 3 — Posted Journal Is Immutable

Once posted:

```text
POSTED
```

the journal cannot be edited or deleted.

### Rule 4 — Corrections Use Reversal

```text
Original Journal
       ↓
Reversal Journal
```

### Rule 5 — Accounting Period

A journal cannot normally be posted into a locked accounting period.

---

# 17. Journal API

```http
GET  /api/v1/journals
GET  /api/v1/journals/:id
POST /api/v1/journals
POST /api/v1/journals/:id/reverse
```

Direct journal posting should be restricted to users with the appropriate accounting permission.

Business events such as expense settlement should preferably create journals through controlled backend accounting logic rather than allowing arbitrary frontend-created ledger entries.

---

# 18. Accounting Periods

The system must support accounting periods.

Example:

```text
January 2026
February 2026
March 2026
```

Possible states:

```text
OPEN
LOCKED
```

A locked period rejects normal financial posting.

Privileged corrections require an explicit controlled process and audit reason.

Endpoints:

```http
GET  /api/v1/accounting-periods
GET  /api/v1/accounting-periods/:id
POST /api/v1/accounting-periods
POST /api/v1/accounting-periods/:id/lock
POST /api/v1/accounting-periods/:id/unlock
```

---

# 19. Cash & Bank Management

The system must maintain:

- Cash accounts
- Bank accounts
- Account number/reference metadata
- Opening balances
- Current balance
- Transactions
- Reconciliation state

Examples:

```text
Cash
Petty Cash
HDFC Bank
SBI Bank
ICICI Bank
```

Endpoints:

```http
POST /api/v1/cash-bank
GET  /api/v1/cash-bank
GET  /api/v1/cash-bank/:id
GET  /api/v1/cash-bank/:id/transactions
```

---

# 20. Reconciliation

The reconciliation module matches recorded financial transactions against cash/bank evidence.

Requirements:

- Create reconciliation session
- Select account
- Define reconciliation period
- Record statement balance
- Compare system balance
- Identify unmatched transactions
- Mark transactions as reconciled
- Complete reconciliation
- Preserve reconciliation history

Endpoints:

```http
GET  /api/v1/reconciliations
GET  /api/v1/reconciliations/:id
POST /api/v1/reconciliations
POST /api/v1/reconciliations/:id/complete
```

---

# 21. Financial Reports

Reports must preferably be derived from posted accounting records.

## Required reports

### Trial Balance

```http
GET /api/v1/reports/trial-balance
```

Must show:

- Account
- Debit
- Credit
- Closing balance

---

### Profit & Loss

```http
GET /api/v1/reports/profit-loss
```

Must calculate:

```text
Revenue
- Expenses
----------------
Net Profit / Loss
```

---

### Balance Sheet

```http
GET /api/v1/reports/balance-sheet
```

Must organize:

```text
Assets
Liabilities
Equity
```

---

### Cash Flow

```http
GET /api/v1/reports/cash-flow
```

Must provide cash inflows and outflows for the selected period.

---

### Expense Report

```http
GET /api/v1/reports/expenses
```

Filters should support:

- Date range
- Category
- Vendor
- Branch/cost center
- Payment method
- Status

---

# 22. Audit Logging

Every sensitive mutation must generate an audit record.

Audit data should include:

```text
actor
action
resource
resource_id
before_value
after_value
timestamp
IP address
request/source
reason
```

Examples:

```text
EXPENSE_CREATED
EXPENSE_APPROVED
EXPENSE_REJECTED
EXPENSE_SETTLED
EXPENSE_REVERSED

JOURNAL_POSTED
JOURNAL_REVERSED

ACCOUNT_CREATED
ACCOUNT_UPDATED

PERIOD_LOCKED
PERIOD_UNLOCKED

VENDOR_CREATED
VENDOR_UPDATED
```

Audit records must not be silently deleted.

---

# 23. Database Requirements

PostgreSQL is the primary source of truth.

Money must use:

```sql
DECIMAL(15,2)
```

Never use:

```text
FLOAT
DOUBLE
```

for monetary values.

IDs should use a consistent strategy with internal database identifiers and public UUID/ULID references.

Timestamps should be stored in UTC.

---

# 24. Core Database Tables

The initial accounting implementation should include:

```text
users
roles
permissions
role_permissions
user_roles

vendors

expense_categories
expenses
expense_items
expense_approvals
expense_attachments

chart_of_accounts

journal_entries
journal_lines

accounting_periods

cash_bank_accounts

reconciliations

audit_logs
```

Additional tables can be introduced as future modules are integrated.

---

# 25. API Standards

Base URL:

```text
/api/v1
```

Example:

```text
/api/v1/expenses
/api/v1/vendors
/api/v1/accounts
/api/v1/journals
/api/v1/accounting-periods
/api/v1/cash-bank
/api/v1/reconciliations
/api/v1/reports
```

Responses should follow a consistent structure.

Success:

```json
{
  "success": true,
  "message": "Expense created successfully",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Expense cannot be approved in its current state"
}
```

---

# 26. Validation

All validation must occur on the backend.

The backend must validate:

- Required fields
- Amounts
- Dates
- Account existence
- Account status
- Vendor existence
- Expense status
- Approval permissions
- Accounting period status
- Journal balance
- Duplicate references
- Idempotency keys
- State transitions

Frontend validation is only for user experience and must never be treated as security.

---

# 27. Idempotency

Critical POST endpoints must support idempotency.

Especially:

```text
expense settlement
journal posting
financial transactions
reversal
```

An idempotency key must prevent a retry from creating a duplicate financial transaction.

Redis will store active idempotency keys.

---

# 28. Rate Limiting

Redis-backed `rate-limiter-flexible` will be used.

Policy:

```text
Authentication
    ↓
Strict

Critical financial POST endpoints
    ↓
Moderate / strict

Normal authenticated APIs
    ↓
Moderate

Read-only reports
    ↓
Low
```

---

# 29. Transaction Management

Financial operations must use PostgreSQL database transactions.

Example expense settlement:

```text
BEGIN

Validate expense
Validate permission
Validate accounting period
Validate cash/bank account

Update expense
Create journal entry
Create journal lines
Validate debit = credit
Create audit record

COMMIT
```

If any operation fails:

```text
ROLLBACK
```

No partially completed financial transaction may remain.

---

# 30. Accounting Transaction Example

For an office Wi-Fi expense of ₹1,799:

```text
User creates expense
        ↓
Expense = DRAFT
        ↓
Submit
        ↓
Approval
        ↓
APPROVED
        ↓
Settlement from Bank
        ↓
Create Journal
        ↓
Dr Internet Expense     ₹1,799
Cr Bank                 ₹1,799
        ↓
POSTED
        ↓
Ledger updated
        ↓
P&L reflects expense
        ↓
Audit record created
```

---

# 31. Security Requirements

## Authentication

- bcrypt password hashing
- Cost factor 12+
- Short-lived JWT access token
- Revocable refresh token
- Secure token handling

## Authorization

Every protected endpoint must check permissions.

## Secrets

Secrets must exist only in:

```text
.env
```

or a server-side secret manager.

Never expose:

- Database credentials
- JWT secrets
- Redis credentials
- Provider API keys

to the frontend.

## Transport

Production API must use HTTPS.

---

# 32. Non-Functional Requirements

## Reliability

Financial transactions must be atomic.

## Consistency

Every posted journal must be balanced.

## Security

Unauthorized users must receive:

```text
401 Unauthorized
```

or:

```text
403 Forbidden
```

depending on authentication/authorization state.

## Auditability

Every sensitive financial mutation must be traceable to an authenticated actor.

## Performance

Normal accounting API requests should respond quickly under expected office workload.

Heavy reports should be optimized independently from transactional writes.

## Scalability

The backend should remain a modular monolith initially.

Future modules must be able to integrate without rewriting the accounting core.

---

# 33. Frontend Requirements

The frontend will be implemented as a single Next.js application.

The frontend should render accounting features based on resolved permissions.

Example:

```text
Accounting User
 ├── Expenses
 ├── Vendors
 ├── Chart of Accounts
 ├── Journal
 ├── Cash & Bank
 ├── Reconciliation
 └── Reports

Manager
 ├── Expense Approvals
 ├── Financial Reports
 └── Oversight

Viewer
 └── Reports
```

The frontend must never be responsible for actual authorization.

---

# 34. Dashboard Requirements

The accounting dashboard should eventually show:

```text
Total Expenses
Current Month Expenses
Pending Approvals
Cash Balance
Bank Balance
Outstanding Payables
Income
Net Profit / Loss
Recent Transactions
```

Dashboard figures should be derived from trusted accounting/transaction data.

---

# 35. Error Handling

Express must use centralized error handling.

Errors should be categorized into:

```text
Validation Error
Authentication Error
Authorization Error
Not Found
Conflict
Business Rule Violation
Database Error
Internal Server Error
```

Example:

```json
{
  "success": false,
  "message": "Accounting period is locked",
  "code": "ACCOUNTING_PERIOD_LOCKED"
}
```

Business-rule errors should use stable error codes where useful.

---

# 36. Logging

The backend should log:

- Request ID
- User ID
- API endpoint
- HTTP method
- Response status
- Error information
- Business correlation ID

Sensitive information such as passwords, tokens and confidential financial credentials must never be logged.

---

# 37. Future Integration Points

The accounting system must be designed to integrate later with:

```text
CRM
 ↓
Property
 ↓
Booking
 ↓
Customer Payments
 ↓
Accounting
 ↓
Reports
```

Future customer payment example:

```text
Customer Payment
      ↓
Payment Allocation
      ↓
Journal Entry

Dr Bank
Cr Customer Receivable
```

The accounting module should therefore expose controlled services/API contracts that future payment modules can use.

---

# 38. Deferred Features

The following features are intentionally deferred:

### Notifications

```text
Twilio SMS
SMTP Email
Transactional Outbox
```

### Documents

```text
Object/File Storage
SHA-256
Virus Scanning
OCR
Document Versioning
```

### Desktop

```text
Electron
electron-builder
Windows .exe
```

### Offline

```text
Electron safeStorage
SQLite/local queue
Offline approval synchronization
```

### On-Premise

```text
PostgreSQL
Redis/Memurai
Node API
PM2 / Windows service
LAN deployment
WireGuard
```

These must not be implemented in the current accounting phase.

---

# 39. Development Phases

## Phase 1 — Foundation

- Project setup
- PostgreSQL connection
- Redis connection
- Environment configuration
- Error middleware
- Logging
- API versioning
- Base response format

## Phase 2 — Authentication & RBAC

- Users
- Roles
- Permissions
- Role-permission mapping
- JWT authentication
- Refresh tokens
- Permission middleware
- Rate limiting

## Phase 3 — Accounting Masters

- Expense categories
- Vendors
- Chart of Accounts
- Cash/bank accounts
- Accounting periods

## Phase 4 — Expenses

- Expense creation
- Expense items
- Submission
- Approval
- Rejection
- Settlement
- Reversal
- Evidence metadata

## Phase 5 — Accounting Engine

- Journal entries
- Journal lines
- Debit/credit validation
- Posting
- Reversal
- General ledger
- Period locking

## Phase 6 — Reconciliation

- Reconciliation sessions
- Transaction matching
- Reconciliation completion
- Reconciliation history

## Phase 7 — Reports

- Trial Balance
- P&L
- Balance Sheet
- Cash Flow
- Expense reports
- Ledger reports

## Phase 8 — Hardening

- Idempotency tests
- Permission tests
- Transaction rollback tests
- Accounting balance tests
- Period lock tests
- Reversal tests
- Audit completeness tests
- Security testing
- Load testing

---

# 40. Acceptance Criteria

## Expense

- [ ] Authorized user can create an expense.
- [ ] Expense starts in `DRAFT`.
- [ ] Expense can be submitted.
- [ ] Required approval rules are enforced.
- [ ] Unauthorized users cannot approve expenses.
- [ ] Approved expenses can be settled.
- [ ] Settlement creates the appropriate accounting entry.
- [ ] Settled expenses cannot be deleted.
- [ ] Reversal preserves the original transaction.
- [ ] Expense actions are audited.

## Accounting

- [ ] Chart of Accounts can be maintained.
- [ ] Journal entries can be created through authorized flows.
- [ ] Debit total must equal credit total.
- [ ] Unbalanced journals cannot be posted.
- [ ] Posted journals cannot be edited.
- [ ] Posted journals cannot be deleted.
- [ ] Reversals preserve original history.
- [ ] Locked periods reject normal posting.

## Security

- [ ] Every protected endpoint requires authentication.
- [ ] Every protected mutation checks permissions.
- [ ] Role names are not hard-coded into business logic.
- [ ] Passwords are bcrypt hashed.
- [ ] Rate limiting is Redis-backed.
- [ ] Critical POST requests support idempotency.

## Reporting

- [ ] Trial Balance is derived from ledger data.
- [ ] P&L is derived from accounting data.
- [ ] Balance Sheet is derived from accounting data.
- [ ] Expense reports support date filtering.
- [ ] Reports do not modify financial data.

---

# 41. Critical Business Invariants

These rules are non-negotiable.

### Financial Integrity

```text
Debit = Credit
```

for every posted journal.

### Immutability

```text
POSTED
```

financial records cannot be edited or deleted.

### Reversal

```text
Correction → Reversal
```

not direct modification.

### Authorization

```text
No permission → No operation
```

### Period Lock

```text
LOCKED PERIOD → No normal financial posting
```

### Idempotency

```text
Same idempotency key → Same financial operation
```

### Atomicity

```text
Financial operation succeeds completely
OR
financial operation rolls back completely
```

---

# 42. Definition of Done

The Accounting MVP is considered complete when:

1. Authentication and RBAC are operational.
2. Accounting users can manage expenses.
3. Expense approval workflow is operational.
4. Vendors can be managed.
5. Chart of Accounts is operational.
6. Journal entries can be posted through controlled accounting flows.
7. Debit/credit validation is enforced.
8. Accounting periods can be locked.
9. Posted financial records are immutable.
10. Reversal functionality works.
11. Cash/bank accounts can be tracked.
12. Reconciliation is functional.
13. Trial Balance is available.
14. P&L is available.
15. Balance Sheet is available.
16. Expense reports are available.
17. Audit logs capture sensitive mutations.
18. Permission checks are enforced server-side.
19. Idempotency is implemented for critical financial writes.
20. Automated tests cover financial invariants and transaction rollback.

---

# 43. Core Product Principle

EstateSync Accounting must **not** be implemented as a collection of CRUD screens.

The system must behave as a financial transaction system:

```text
User Action
    ↓
Permission Check
    ↓
Validation
    ↓
Business Rule
    ↓
Database Transaction
    ↓
Accounting Entry
    ↓
Audit
    ↓
Commit
```

The frontend is only the input and rendering layer.

**PostgreSQL is the financial source of truth.**

**The backend is the authority for permissions, validation, accounting rules, transaction integrity and auditability.**