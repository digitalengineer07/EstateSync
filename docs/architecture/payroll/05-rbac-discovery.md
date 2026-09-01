# EstateSync: Role-Based Access Control (RBAC) Discovery Report

**Document**: Phase 0 Discovery — Authentication & Authorization Map  
**Status**: ACTIVE BASELINE

---

## 1. Current RBAC Implementation Analysis

EstateSync uses a granular, database-backed RBAC architecture:

### A. Data Models (`backend/prisma/schema.prisma`)
- **`Role`**: Represents named system roles (`ADMIN`, `MANAGER`, `SALES`, `MARKETING`, `ACCOUNTING`, `OTHER`).
- **`Permission`**: Master catalog of permission strings (e.g. `fund.view`, `expense.create`, `customer.create`).
- **`RolePermission`**: Many-to-many join table between `Role` and `Permission` with composite primary key `[roleId, permissionId]`.

### B. Authorization Middleware (`backend/src/middleware/permissionMiddleware.js`)
- **`checkPermission(requiredPermission)`**:
  1. Grants immediate bypass to `ADMIN` role.
  2. Evaluates cached JWT permissions array.
  3. **Live Database Fallback**: If a permission is missing in JWT payload, it queries PostgreSQL in real-time to prevent permission latency when roles are modified during active user sessions.
  4. Returns `HTTP 403 Forbidden` if unauthorized.

---

## 2. Future Payroll Permissions Specification

The following standard permissions will be added to the `Permission` master in future implementation phases:

| Permission Code | Description | Target Role Assignment |
| :--- | :--- | :--- |
| **`employee.view`** | View employee master list and basic details | `ADMIN`, `ACCOUNTING`, `MANAGER` |
| **`employee.create`** | Register new employee profile | `ADMIN`, `ACCOUNTING` |
| **`employee.update`** | Edit employee profile, contact, and bank info | `ADMIN`, `ACCOUNTING` |
| **`employee.archive`** | Mark employee as resigned / terminated | `ADMIN` |
| **`employee.salary.view`**| View sensitive salary structures and CTC breakdown | `ADMIN`, `ACCOUNTING` |
| **`employee.salary.assign`**| Assign or revise salary structure for an employee | `ADMIN`, `ACCOUNTING` |
| **`payroll.create`** | Initiate monthly payroll cycle for a period | `ADMIN`, `ACCOUNTING` |
| **`payroll.calculate`** | Run gross-to-net computation engine | `ADMIN`, `ACCOUNTING` |
| **`payroll.approve`** | Formally approve monthly payroll run | `ADMIN` (Dual control) |
| **`payroll.post`** | Post salary accrual double-entry journals to GL | `ADMIN`, `ACCOUNTING` |
| **`payroll.pay`** | Execute bank disbursement from Corporate Treasury | `ADMIN`, `ACCOUNTING` |
| **`payroll.reverse`** | Void or reverse a salary payment voucher | `ADMIN` |
| **`payroll.report.view`** | Access monthly payroll registers and bank upload sheets | `ADMIN`, `ACCOUNTING`, `MANAGER` |
| **`advance.issue`** | Disburse employee salary advances | `ADMIN`, `ACCOUNTING` |

---

## 3. Role-to-Permission Mapping Matrix (Future State)

```
┌───────────────────────────┬─────────┬────────────┬───────────┬─────────┬─────────┐
│ Permission                │  ADMIN  │ ACCOUNTING │  MANAGER  │  SALES  │  OTHER  │
├───────────────────────────┼─────────┼────────────┼───────────┼─────────┼─────────┤
│ employee.view             │    ✅   │     ✅     │     ✅    │    ❌   │    ❌   │
│ employee.create           │    ✅   │     ✅     │     ❌    │    ❌   │    ❌   │
│ employee.update           │    ✅   │     ✅     │     ❌    │    ❌   │    ❌   │
│ employee.salary.view      │    ✅   │     ✅     │     ❌    │    ❌   │    ❌   │
│ employee.salary.assign    │    ✅   │     ✅     │     ❌    │    ❌   │    ❌   │
│ payroll.create            │    ✅   │     ✅     │     ❌    │    ❌   │    ❌   │
│ payroll.calculate         │    ✅   │     ✅     │     ❌    │    ❌   │    ❌   │
│ payroll.approve           │    ✅   │     ❌     │     ❌    │    ❌   │    ❌   │
│ payroll.post              │    ✅   │     ✅     │     ❌    │    ❌   │    ❌   │
│ payroll.pay               │    ✅   │     ✅     │     ❌    │    ❌   │    ❌   │
│ payroll.report.view       │    ✅   │     ✅     │     ✅    │    ❌   │    ❌   │
│ advance.issue             │    ✅   │     ✅     │     ❌    │    ❌   │    ❌   │
└───────────────────────────┴─────────┴────────────┴───────────┴─────────┴─────────┘
```

> **Integration Note**: Adding these permissions does not touch existing user authentication or sales permissions. `permissionMiddleware.js` handles both single permission strings and arrays of permission options seamlessly.
