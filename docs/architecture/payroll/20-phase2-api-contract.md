# Phase 2: Salary Structure & Assignment REST API Contract

**Document**: Phase 2 Implementation — API Endpoints & Data Contracts  
**Base Route**: `/api/v1/payroll` and `/api/v1/employees/:id/salary-assignments`  
**Authentication**: Bearer JWT Required

---

## 1. Endpoints Summary

| Method | Path | Permission Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/payroll/components` | `payroll.component.manage` | Create a new Salary Component |
| `GET` | `/api/v1/payroll/components` | `payroll.component.view` | List & filter components |
| `GET` | `/api/v1/payroll/components/:id` | `payroll.component.view` | Get component details |
| `PATCH` | `/api/v1/payroll/components/:id` | `payroll.component.manage` | Update component parameters |
| `POST` | `/api/v1/payroll/structures` | `payroll.structure.create` | Create a Structure with itemized lines |
| `GET` | `/api/v1/payroll/structures` | `payroll.structure.view` | List all Salary Structures |
| `GET` | `/api/v1/payroll/structures/:id` | `payroll.structure.view` | Get structure with lines |
| `POST` | `/api/v1/payroll/structures/:id/archive` | `payroll.structure.archive` | Archive a Structure |
| `POST` | `/api/v1/employees/:id/salary-assignments` | `payroll.assignment.create` | Assign structure to employee |
| `GET` | `/api/v1/employees/:id/salary-assignments` | `payroll.assignment.history` | Get employee compensation timeline |
| `GET` | `/api/v1/employees/:id/salary-assignments/current` | `payroll.assignment.view` | Get currently active salary assignment |
| `GET` | `/api/v1/employees/:id/salary-assignments/resolve?date=YYYY-MM-DD` | `payroll.assignment.view` | Resolve structure on historical date |

---

## 2. Sample Payloads

### A. Assign Salary Structure (`POST /api/v1/employees/:id/salary-assignments`)
```json
// Request Body
{
  "salaryStructureId": "c8a32b90-...",
  "baseGross": 50000,
  "effectiveFrom": "2026-07-01",
  "reason": "Annual Increment 2026",
  "notes": "Promoted to Senior Executive"
}

// Success Response (201 Created)
{
  "success": true,
  "message": "Salary structure \"Sales Standard Structure\" successfully assigned to employee Rahul Sharma effective 2026-07-01.",
  "assignment": {
    "id": "e4f5a6b7-...",
    "employeeId": "a1b2c3d4-...",
    "salaryStructureId": "c8a32b90-...",
    "baseGross": 50000,
    "effectiveFrom": "2026-07-01T00:00:00.000Z",
    "effectiveTo": null,
    "status": "ACTIVE",
    "salaryStructure": { ... }
  }
}
```

### B. Resolve Salary by Date (`GET /api/v1/employees/:id/salary-assignments/resolve?date=2026-05-15`)
```json
// Response (200 OK)
{
  "success": true,
  "asOfDate": "2026-05-15",
  "assignment": {
    "id": "b1c2d3e4-...",
    "effectiveFrom": "2026-04-01T00:00:00.000Z",
    "effectiveTo": "2026-06-30T00:00:00.000Z",
    "status": "SUPERSEDED",
    "baseGross": 30000,
    "salaryStructure": {
      "code": "STR-SALES-V1",
      "name": "Sales Standard Structure V1",
      "lines": [ ... ]
    }
  }
}
```
