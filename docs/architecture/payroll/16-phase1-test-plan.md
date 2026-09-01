# Phase 1: Test Plan & Validation Specifications

**Document**: Phase 1 Implementation — Test Specifications & Results  
**Test Runner**: `backend/scripts/test_employee_master.js`  
**Status**: VERIFIED & AUTOMATED

---

## 1. Automated Test Cases (Phase 1)

| Test ID | Test Scenario | Expected Outcome | Verified |
| :--- | :--- | :--- | :---: |
| **TEST-01** | Admin creates employee without login (`userId: null`) | HTTP 201 Created, auto-generated `EMP-000001` code, `userId: null` | ✅ |
| **TEST-02** | Admin creates employee with linked existing `User` | HTTP 201 Created, `userId` linked to User | ✅ |
| **TEST-03** | Reject duplicate employee code | HTTP 409 Conflict | ✅ |
| **TEST-04** | Reject duplicate mobile number | HTTP 409 Conflict | ✅ |
| **TEST-05** | Reject duplicate email address | HTTP 409 Conflict | ✅ |
| **TEST-06** | Reject linking User that is already linked to another Employee | HTTP 409 Conflict | ✅ |
| **TEST-07** | Search employee by name, mobile, and employee code | HTTP 200 OK, returns filtered records | ✅ |
| **TEST-08** | Prevent self-reporting loop (`reportingManagerId === id`) | HTTP 400 Bad Request | ✅ |
| **TEST-09** | Update employee profile details | HTTP 200 OK, `EMPLOYEE_UPDATE` audit logged | ✅ |
| **TEST-10** | Archive employee with exit date and reason | HTTP 200 OK, `status: 'ARCHIVED'`, `EMPLOYEE_ARCHIVE` audit logged | ✅ |
| **TEST-11** | Unlink User login from Employee | HTTP 200 OK, `userId` reset to `null` without deleting User | ✅ |
| **TEST-12** | RBAC permission check: `SALES` role blocked | HTTP 403 Forbidden | ✅ |
| **TEST-13** | Database transaction rollback on failure | Database state remains clean | ✅ |
| **TEST-14** | Master CI non-regression suite | 100% tests pass on Auth, Treasury, Customer, Property, Expenses, GL | ✅ |
