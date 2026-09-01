# EstateSync: Shared Services & Reusable Architecture Components

**Document**: Phase 0 Discovery — Reusable Services Inventory  
**Status**: ACTIVE BASELINE

---

## 1. Inventory of Reusable Core Services

The following shared services and utilities are already fully implemented, tested, and operational in the EstateSync codebase. The future Payroll domain will directly integrate with them without duplication:

### A. Double-Entry General Ledger Service (`backend/src/utils/accountingHelper.js`)
- **`postJournalEntry(tx, { description, referenceType, referenceId, createdBy, lines })`**
  - Enforces atomic balancing: `|totalDebit - totalCredit| <= 0.009`.
  - Generates collision-proof sequential entry numbers (`JE-YYYYMMDD-XXXX`).
  - Creates balanced `JournalEntry` and `JournalLine` rows within a database transaction.
  - **Payroll Reuse**: Used for posting Payroll Accrual, Salary Payouts, Advance Issuance, and Advance Recovery.

### B. Corporate Treasury Liquidity Service (`backend/src/utils/treasuryHelper.js`)
- **`getPrimaryTreasuryWallet(tx)`** & **`getPrimaryTreasuryAdmin(tx)`**
  - Resolves the single source of truth Master Treasury Wallet (`admin@estatesync.local`).
  - Handles dual balances: `availableBalanceLiquid` (Bank/NEFT/RTGS) and `availableBalanceCash` (Physical Cash).
  - **Payroll Reuse**: Salary disbursements and advance payments will decrement corporate treasury balances atomically.

### C. Cross-Module Bank Reference & UTR Validator (`backend/src/utils/referenceValidator.js`)
- **`checkDuplicateReferenceNo(prismaOrTx, referenceNo)`**
  - Performs case-insensitive, trimmed uniqueness checks across all corporate inflows, customer payments, refunds, and land owner payouts.
  - **Payroll Extension**: Will include `SalaryPayment.referenceNo` so that salary disbursement UTRs cannot collide with any other financial transaction.

### D. Centralized Audit Logger (`backend/src/utils/auditLogger.js`)
- **`logAudit({ actorId, actorEmail, action, entityType, entityId, oldValues, newValues, req, tx })`**
  - Captures actor identity, IP address, User-Agent, JSON snapshots of state transitions, and links directly to PostgreSQL transaction contexts.
  - **Payroll Reuse**: Will record `EMPLOYEE_CREATE`, `SALARY_ASSIGN`, `PAYROLL_APPROVE`, `SALARY_DISBURSE`, etc.

### E. Security & Access Control Middleware (`backend/src/middleware/`)
- **`authMiddleware.js` (`verifyJWT`)**: Extracts and validates bearer tokens, attaches user details to `req.user`.
- **`permissionMiddleware.js` (`checkPermission`)**: RBAC guard with fast-path JWT verification and automatic live database fallback for real-time permission sync.
- **`idempotencyMiddleware.js` (`idempotencyMiddleware`)**: Guarantees network retry safety using `IdempotencyKey` table.

### F. Identification & String Normalization (`backend/src/utils/identifierHelper.js`)
- **`normalizeForComparison(val)`**: Strips punctuation, whitespace, and formatting to produce clean comparison keys (useful for employee identification like PAN, Aadhaar, Bank Account numbers).

---

## 2. Shared Service Reuse Mapping Table

```
┌──────────────────────────────┬────────────────────────────────────────────────────────────┐
│ Payroll Lifecycle Event      │ Reused Existing EstateSync Service                         │
├──────────────────────────────┼────────────────────────────────────────────────────────────┤
│ Employee Master Created      │ auditLogger.logAudit('EMPLOYEE_CREATE')                    │
│ Employee Master Updated      │ auditLogger.logAudit('EMPLOYEE_UPDATE')                    │
│ Salary Structure Assigned    │ auditLogger.logAudit('SALARY_ASSIGN')                      │
│ Monthly Payroll Calculated   │ idempotencyMiddleware (Prevents double run)                │
│ Monthly Payroll Approved     │ accountingHelper.postJournalEntry (Dr: 5060, Cr: 2010)     │
│ Salary Disbursed (Bank/Cash) │ treasuryHelper.getPrimaryTreasuryWallet                    │
│                              │ referenceValidator.checkDuplicateReferenceNo (UTR Check)   │
│                              │ accountingHelper.postJournalEntry (Dr: 2010, Cr: 1010)     │
│ Employee Advance Disbursed   │ accountingHelper.postJournalEntry (Dr: 1040, Cr: 1010)     │
│ Advance Deducted from Salary │ accountingHelper.postJournalEntry (Dr: 2010, Cr: 1040)     │
│ Route Protection             │ authMiddleware.verifyJWT + permissionMiddleware            │
└──────────────────────────────┴────────────────────────────────────────────────────────────┘
```
