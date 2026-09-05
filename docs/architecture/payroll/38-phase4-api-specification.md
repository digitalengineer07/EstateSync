# EstateSync Payroll System — Phase 4: REST API Reference

All routes require JWT Authentication (`Authorization: Bearer <token>`).

---

### 1. Get Posting Preview
- **Route**: `GET /api/v1/payroll/runs/:id/posting-preview`
- **Permission**: `payroll.accounting.view`
- **Description**: Generates an in-memory preview of the compound double-entry journal lines, reconciliation breakdown, and balance check. Creates zero database mutations.
- **Success Response (HTTP 200)**:
```json
{
  "success": true,
  "preview": {
    "payrollRunId": "uuid",
    "period": "2026-08",
    "runNumber": 1,
    "status": "LOCKED",
    "totals": { "totalGross": 66200.00, "totalDeductions": 5400.00, "totalNet": 63800.00, "totalEmployerCost": 5400.00 },
    "reconciliation": { ... },
    "proposedJournal": {
      "description": "Payroll Expense Posting — 2026-08 — Run #1",
      "referenceType": "PAYROLL",
      "referenceId": "uuid",
      "totalDebit": 76600.00,
      "totalCredit": 76600.00,
      "isBalanced": true,
      "lines": [ ... ]
    }
  }
}
```

---

### 2. Post Payroll Run to General Ledger
- **Route**: `POST /api/v1/payroll/runs/:id/post-to-ledger`
- **Permission**: `payroll.accounting.post`
- **Header**: Optional `Idempotency-Key`
- **Description**: Posts the compound journal entry to the General Ledger and creates a 1-to-1 `PayrollAccountingPosting` link.
- **Success Response (HTTP 201)**:
```json
{
  "success": true,
  "message": "Payroll Run successfully posted to General Ledger.",
  "posting": {
    "id": "uuid",
    "payrollRunId": "uuid",
    "journalEntryId": "uuid",
    "entryNumber": "JE-20260901-0023",
    "status": "POSTED",
    "totalDebit": 76600.00,
    "totalCredit": 76600.00,
    "postedAt": "2026-09-01T21:29:45.000Z",
    "postedBy": "accounting@estatesync.local"
  },
  "journalEntry": { ... }
}
```
- **Error Codes**:
  - `HTTP 400 (PAYROLL_NOT_LOCKED)`: Run is not in LOCKED status.
  - `HTTP 409 (PAYROLL_ALREADY_POSTED)`: Run has already been posted to GL.
  - `HTTP 422 (UNSUPPORTED_REIMBURSEMENT_POSTING)`: Reimbursement lines detected.
  - `HTTP 422 (JOURNAL_UNBALANCED)`: Debit and credit totals do not balance.

---

### 3. Reverse Payroll General Ledger Posting
- **Route**: `POST /api/v1/payroll/runs/:id/reverse-ledger-posting`
- **Permission**: `payroll.accounting.reverse` (Admin Only)
- **Header**: Optional `Idempotency-Key`
- **Request Body**:
```json
{
  "reason": "Executive compensation adjustment required"
}
```
- **Success Response (HTTP 200)**:
```json
{
  "success": true,
  "message": "Payroll General Ledger posting successfully reversed.",
  "posting": {
    "id": "uuid",
    "status": "REVERSED",
    "reversalJournalEntryId": "uuid"
  },
  "originalJournalEntryNumber": "JE-20260901-0023",
  "reversalJournalEntry": {
    "id": "uuid",
    "entryNumber": "JE-20260901-0024",
    "referenceType": "PAYROLL_REVERSAL",
    "status": "POSTED",
    "lines": [ ... ]
  }
}
```

---

### 4. Get Payroll Accounting Posting Details
- **Route**: `GET /api/v1/payroll/runs/:id/accounting-posting`
- **Permission**: `payroll.accounting.view`
- **Description**: Retrieves the reconciliation link and full line details of both the original posting and any reversal journal.
- **Success Response (HTTP 200)**:
```json
{
  "success": true,
  "posting": {
    "id": "uuid",
    "payrollRunId": "uuid",
    "status": "POSTED",
    "postedGross": 66200.00,
    "postedDeductions": 5400.00,
    "postedNet": 63800.00,
    "postedEmployerCost": 5400.00,
    "journalEntry": { ... },
    "reversalJournalEntry": null
  }
}
```
