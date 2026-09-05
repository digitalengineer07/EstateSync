# Phase 3: Payroll Engine REST API Contract

**Document**: Phase 3 Implementation — Endpoints & Data Schemas  
**Base Route**: `/api/v1/payroll`  
**Authentication**: Bearer JWT Required

---

## 1. Endpoints Specification

| Method | Endpoint | Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/payroll/periods` | `payroll.period.manage` | Create monthly period |
| `GET` | `/api/v1/payroll/periods` | `payroll.period.view` | List monthly periods |
| `GET` | `/api/v1/payroll/periods/:id` | `payroll.period.view` | Get period details |
| `POST` | `/api/v1/payroll/periods/:id/open` | `payroll.period.manage` | Open period for calculation |
| `POST` | `/api/v1/payroll/runs` | `payroll.run.create` | Create a new calculation run |
| `GET` | `/api/v1/payroll/runs/:id` | `payroll.run.view` | Get run totals and metadata |
| `POST` | `/api/v1/payroll/runs/:id/calculate` | `payroll.run.calculate` | Execute batch calculation |
| `GET` | `/api/v1/payroll/runs/:id/items` | `payroll.item.view` | List calculated employee items |
| `GET` | `/api/v1/payroll/items/:id` | `payroll.item.view` | Get itemized employee payslip snapshot |
| `POST` | `/api/v1/payroll/runs/:id/adjustments` | `payroll.item.adjust` | Add manual run adjustment |
| `GET` | `/api/v1/payroll/runs/:id/exceptions` | `payroll.run.view` | List run exceptions |
| `POST` | `/api/v1/payroll/runs/:id/approve` | `payroll.approve` | Approve run (requires 0 blocking errors) |
| `POST` | `/api/v1/payroll/runs/:id/lock` | `payroll.lock` | Lock approved run (permanently freezes data) |

---

## 2. Sample Payloads

### A. Execute Calculation (`POST /api/v1/payroll/runs/:id/calculate`)
```json
// Success Response (200 OK)
{
  "success": true,
  "message": "Payroll Run #1 calculated successfully for 15 employees (Net: ₹685,400.00).",
  "run": {
    "id": "e7b91a24-...",
    "payrollPeriodId": "f4c82b10-...",
    "runNumber": 1,
    "status": "PENDING_APPROVAL",
    "totalEmployees": 15,
    "totalGross": "750000.00",
    "totalDeductions": "64600.00",
    "totalNet": "685400.00",
    "totalEmployerCost": "42000.00"
  }
}
```

### B. Single Item Detail (`GET /api/v1/payroll/items/:id`)
```json
// Response (200 OK)
{
  "success": true,
  "item": {
    "id": "item-uuid-...",
    "employeeCodeSnapshot": "EMP-000012",
    "employeeNameSnapshot": "Rahul Sharma",
    "grossEarnings": "57000.00",
    "totalDeductions": "3800.00",
    "netPayable": "53200.00",
    "lines": [
      { "componentCode": "BASIC", "amount": "35000.00", "source": "SALARY_STRUCTURE" },
      { "componentCode": "HRA", "amount": "14000.00", "source": "SALARY_STRUCTURE" },
      { "componentCode": "CONVEYANCE", "amount": "3000.00", "source": "SALARY_STRUCTURE" },
      { "componentCode": "SPECIAL_ALLOWANCE", "amount": "5000.00", "source": "SALARY_STRUCTURE" },
      { "componentCode": "PF_EMPLOYEE", "amount": "1800.00", "source": "SALARY_STRUCTURE" },
      { "componentCode": "TDS", "amount": "2000.00", "source": "SALARY_STRUCTURE" }
    ]
  }
}
```
