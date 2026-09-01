# Phase 1: Employee Master & User Linking Architecture

**Document**: Phase 1 Implementation — Employee Master Specifications  
**Status**: IMPLEMENTED & LOCKED

---

## 1. Core Architectural Paradigm: `USER != EMPLOYEE`

In EstateSync, a fundamental distinction is maintained between an **authenticatable application user** and a **payroll employee**:

- **`User`**: Represents software access, credentials, JWT sessions, and field operational floats.
- **`Employee`**: Represents real-world staff members of AG Homes India PVT. LTD., covering all office and field designations.

```
┌──────────────────────────────────────────────┐
│                  PERSONNEL                   │
├──────────────────────┬───────────────────────┤
│ Login Staff          │ Non-Login Staff       │
│ • Accountant         │ • Security Guard      │
│ • Sales Manager      │ • Driver              │
│ • Sales Rep          │ • Office Assistant    │
│ • System Admin       │ • Site Operator       │
├──────────────────────┼───────────────────────┤
│ Has User account     │ No User account       │
│ Employee.userId = ID │ Employee.userId = null│
└──────────────────────┴───────────────────────┘
```

---

## 2. Uniqueness & Database-Level Constraints

1. **Employee Code (`employeeCode`)**:
   - Unique alphanumeric identifier (e.g. `EMP-000001`, `EMP-000002`).
   - Auto-generated sequentially or validated against custom codes.
2. **User Link (`userId`)**:
   - `userId String? @unique`
   - Enforces $1:1$ or $1:0$ mapping at the PostgreSQL engine level.
   - Prevents linking multiple employee profiles to a single login user account.
3. **Contact Uniqueness**:
   - `mobile String @unique`
   - `email String? @unique`

---

## 3. Lifecycle States (`status`)

| Status | Meaning | Operations Permitted |
| :--- | :--- | :--- |
| **`ACTIVE`** | Active employee on payroll | Salary calculation, advance issuance, attendance |
| **`INACTIVE`** | Temporarily inactive | Profile updates, view history |
| **`ON_LEAVE`** | Extended leave of absence | Profile view, history |
| **`RESIGNED`** | Resigned with exit date recorded | Archived profile, full-and-final settlement |
| **`TERMINATED`**| Terminated with exit reason | Archived profile, historical compliance reports |
| **`ARCHIVED`** | General archived state | Historical reporting only (no salary processing) |
