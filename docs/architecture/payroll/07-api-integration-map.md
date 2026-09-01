# EstateSync: API Integration & Endpoint Design Map

**Document**: Phase 0 Discovery — REST API Interface Specifications  
**Status**: ACTIVE BASELINE

---

## 1. Existing API Architectural Patterns

EstateSync routes follow consistent conventions across all controllers:
- **Base URL Prefix**: `/api/v1`
- **Request Body Parsing**: `express.json()` with `express.urlencoded()`
- **Success Response Structure**:
  ```json
  {
    "success": true,
    "message": "Optional human-readable confirmation",
    "data": { ... }
  }
  ```
- **Error Response Structure**:
  ```json
  {
    "success": false,
    "message": "Specific error description"
  }
  ```
- **HTTP Status Codes**:
  - `200 OK`: Successful retrieval / update
  - `201 Created`: Resource successfully created
  - `400 Bad Request`: Validation failure, duplicate constraint, missing mandatory field
  - `401 Unauthorized`: Missing or invalid JWT
  - `403 Forbidden`: Insufficient RBAC permissions
  - `404 Not Found`: Resource does not exist
  - `500 Internal Server Error`: Unhandled server/database exception

---

## 2. Planned Future Payroll API Routes (Non-breaking & Additive)

All future payroll routes will be mounted under `/api/v1/` following standard controller patterns:

### A. Employee Master Routes (`/api/v1/employees`)
```
GET    /api/v1/employees              # List all employees (filterable by status, department)
POST   /api/v1/employees              # Register new employee profile
GET    /api/v1/employees/:id          # Fetch employee profile details
PATCH  /api/v1/employees/:id          # Update employee details & bank info
POST   /api/v1/employees/:id/link-user# Link/unlink existing login User to Employee
```

### B. Salary Structure & Assignment Routes (`/api/v1/salary-structures`)
```
GET    /api/v1/salary-structures                  # List salary templates
POST   /api/v1/salary-structures                  # Create new salary structure template
POST   /api/v1/employees/:id/salary-assignment     # Assign salary structure to employee
GET    /api/v1/employees/:id/salary-assignment     # Fetch active salary assignment & breakdown
```

### C. Monthly Payroll Processing Routes (`/api/v1/payroll`)
```
POST   /api/v1/payroll/periods/open               # Open a new payroll period (e.g. 2026-04)
GET    /api/v1/payroll/periods                    # List all periods and their statuses
POST   /api/v1/payroll/runs                       # Create payroll run batch
POST   /api/v1/payroll/runs/:id/calculate         # Run gross-to-net calculation engine
GET    /api/v1/payroll/runs/:id                   # View payroll run summary & employee line items
POST   /api/v1/payroll/runs/:id/approve           # Approve payroll (Triggers GL accrual voucher)
POST   /api/v1/payroll/items/:id/disburse         # Disburse individual salary payment (Bank/Cash)
POST   /api/v1/payroll/runs/:id/bulk-disburse     # Bulk disburse entire payroll from Treasury
```

### D. Employee Advances & Loans Routes (`/api/v1/advances`)
```
GET    /api/v1/advances                           # List employee advances & recovery status
POST   /api/v1/advances/issue                     # Issue new advance from Corporate Treasury
GET    /api/v1/employees/:id/advances             # View advance history for specific employee
```

### E. Payslips & Reporting Routes (`/api/v1/payroll-reports`)
```
GET    /api/v1/payroll/items/:id/payslip          # Fetch structured JSON for printable payslip
GET    /api/v1/payroll/reports/monthly-register   # Export monthly payroll register (Excel/JSON)
GET    /api/v1/payroll/reports/bank-transfer      # Export NEFT/RTGS bank upload format
```

> **Zero Route Collisions**: All planned endpoints introduce unique resource paths that do not conflict with existing `/api/v1/users`, `/api/v1/customers`, `/api/v1/properties`, `/api/v1/expenses`, or `/api/v1/treasury` routes.
