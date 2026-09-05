# Phase 1: Employee Master REST API Contract

**Document**: Phase 1 Implementation — API Specifications & Endpoints  
**Base Route**: `/api/v1/employees`  
**Authentication**: Bearer JWT Required

---

## 1. Endpoints Summary

| Method | Path | Permission Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/employees` | `employee.create` | Register a new Employee Master profile |
| `GET` | `/api/v1/employees` | `employee.view` | Filter & search employees |
| `GET` | `/api/v1/employees/:id` | `employee.view` | Retrieve detailed employee profile |
| `PATCH` | `/api/v1/employees/:id` | `employee.update` | Update employee information |
| `POST` | `/api/v1/employees/:id/archive` | `employee.archive` | Archive employee (exit record) |
| `POST` | `/api/v1/employees/:id/link-user` | `employee.update` | Link an existing User login account |
| `POST` | `/api/v1/employees/:id/unlink-user` | `employee.update` | Unlink User login account |

---

## 2. Request & Response Payloads

### A. Register Employee (`POST /api/v1/employees`)
```json
// Request Body
{
  "fullName": "Rajesh Kumar",
  "displayName": "Rajesh (Accountant)",
  "mobile": "9876500112",
  "email": "rajesh.k@example.com",
  "address": "Boring Road, Patna, Bihar",
  "department": "Accounting",
  "designation": "Senior Accountant",
  "employmentType": "FULL_TIME",
  "joiningDate": "2026-04-01",
  "workLocation": "Head Office",
  "userId": "2b5967f0-8523-4acb-802a-26bc4d262d17" // Optional
}

// Success Response (201 Created)
{
  "success": true,
  "message": "Employee Rajesh Kumar (EMP-000001) registered successfully.",
  "employee": {
    "id": "e1f2a3b4-...",
    "employeeCode": "EMP-000001",
    "fullName": "Rajesh Kumar",
    "mobile": "9876500112",
    "department": "Accounting",
    "designation": "Senior Accountant",
    "status": "ACTIVE",
    "userId": "2b5967f0-8523-4acb-802a-26bc4d262d17"
  }
}
```

### B. Search Employees (`GET /api/v1/employees?search=Rajesh&hasLogin=true`)
```json
// Response (200 OK)
{
  "success": true,
  "employees": [ ... ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

### C. Archive Employee (`POST /api/v1/employees/:id/archive`)
```json
// Request Body
{
  "exitReason": "Relocated to another state",
  "exitDate": "2026-08-31",
  "status": "RESIGNED"
}

// Response (200 OK)
{
  "success": true,
  "message": "Employee Rajesh Kumar (EMP-000001) has been archived.",
  "employee": {
    "id": "e1f2a3b4-...",
    "status": "RESIGNED",
    "exitReason": "Relocated to another state",
    "archivedAt": "2026-09-02T01:45:00.000Z"
  }
}
```
