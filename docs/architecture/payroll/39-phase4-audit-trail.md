# EstateSync Payroll System — Phase 4: Audit Trail Specification

## 1. Overview
All state-changing actions in the Payroll Accounting Module generate immutable records in the `AuditLog` table.

## 2. Phase 4 Audit Events

| Action Code | Entity Type | Entity ID | Old Values | New Values | Description |
|---|---|---|---|---|---|
| `PAYROLL_JOURNAL_POST` | `PAYROLL_RUN` | `run.id` | `{ posted: false }` | `{ posted: true, journalEntryId, entryNumber, totalDebit, totalCredit, postedBy }` | Logged when a locked run is posted to GL. |
| `PAYROLL_JOURNAL_REVERSE` | `PAYROLL_RUN` | `run.id` | `{ status: 'POSTED', journalEntryId }` | `{ status: 'REVERSED', reversalJournalEntryId, reversalEntryNumber, reason, reversedBy }` | Logged when an admin reverses a posted GL journal. |

## 3. Immutability & Forensics
- `AuditLog` records include the client IP address (`req.ip`), user agent, actor email, and actor ID.
- Transactions log audit records synchronously inside the same interactive database transaction (`tx`), guaranteeing that an uncommitted journal will never generate an orphaned audit entry.
