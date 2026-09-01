# EstateSync: Audit Logging Integration & Compliance Map

**Document**: Phase 0 Discovery — Audit Trail Specifications  
**Status**: ACTIVE BASELINE

---

## 1. Current Audit Infrastructure

EstateSync has a dedicated audit trail system:
- **Model (`backend/prisma/schema.prisma`)**:
  ```prisma
  model AuditLog {
    id          String    @id @default(uuid())
    actorId     String?
    actorEmail  String?
    actor       User?     @relation(fields: [actorId], references: [id])
    action      String    // Action verb (e.g. USER_LOGIN, EXPENSE_CREATE)
    entityType  String    // Entity category (e.g. USER, EXPENSE, CUSTOMER)
    entityId    String?
    oldValues   Json?     // State before modification
    newValues   Json?     // State after modification
    ipAddress   String?
    userAgent   String?
    createdAt   DateTime  @default(now())
  }
  ```
- **Helper (`backend/src/utils/auditLogger.js`)**:
  - `logAudit({ actorId, actorEmail, action, entityType, entityId, oldValues, newValues, req, tx })`
  - Safely extracts IP and User-Agent from Express `req`.
  - Supports execution inside `prisma.$transaction(tx)` or independently.
  - Catches and logs errors without crashing main business logic.

---

## 2. Planned Payroll Audit Events

All sensitive payroll operations will be logged using the existing `logAudit()` helper:

| Action Verb (`action`) | Entity Type (`entityType`) | Logged Metadata / State Snapshots |
| :--- | :--- | :--- |
| **`EMPLOYEE_CREATE`** | `EMPLOYEE` | Employee name, code, department, designation, joining date, initial bank details. |
| **`EMPLOYEE_UPDATE`** | `EMPLOYEE` | Field-by-field `oldValues` vs `newValues` (especially bank accounts and PAN/Aadhaar changes). |
| **`EMPLOYEE_ARCHIVE`** | `EMPLOYEE` | Resignation/termination date, exit reason, final settlement flag. |
| **`SALARY_STRUCTURE_CREATE`** | `SALARY_STRUCTURE` | Template name, earnings components, deduction rules. |
| **`SALARY_ASSIGN`** | `EMPLOYEE_SALARY` | Employee ID, structure ID, CTC, effective date, revised CTC. |
| **`PAYROLL_PERIOD_OPEN`** | `PAYROLL_PERIOD` | Period name (e.g. `2026-04`), working days, cutoff dates. |
| **`PAYROLL_CALCULATE`** | `PAYROLL_RUN` | Total employees computed, gross total, total deductions, net payable total. |
| **`PAYROLL_APPROVE`** | `PAYROLL_RUN` | Approver ID, approval timestamp, GL Journal Entry ID. |
| **`SALARY_PAYMENT_DISBURSE`**| `SALARY_PAYMENT` | Employee ID, amount, payment mode (NEFT/CASH), UTR reference number, source bank account. |
| **`SALARY_PAYMENT_REVERSE`** | `SALARY_PAYMENT` | Reversal reason, original voucher ID, GL reversal journal ID. |
| **`EMPLOYEE_ADVANCE_ISSUE`** | `EMPLOYEE_ADVANCE` | Principal amount, monthly installment amount, disbursement reference. |

---

## 3. Audit Guarantee & Immutability

1. **No Truncation**: JSON fields preserve full commercial details for complete reconstruction during financial audits.
2. **Actor Accountability**: All actions capture the exact authenticated `actorId` and `actorEmail`.
3. **Non-repudiation**: IP address and User-Agent are stamped on every entry.
