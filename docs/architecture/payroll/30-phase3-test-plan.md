# Phase 3: Test Plan & Validation Specifications

**Document**: Phase 3 Implementation — Test Specifications & Results  
**Test Runner**: `backend/scripts/test_payroll_engine.js`  
**Status**: VERIFIED & AUTOMATED

---

## 1. Automated Test Matrix (Phase 3)

| Category | Test Scenario | Expected Outcome | Verified |
| :--- | :--- | :--- | :---: |
| **Periods** | Create monthly period (e.g. 2026-08) | HTTP 201 Created | ✅ |
| **Periods** | Reject duplicate period for same year + month | HTTP 409 Conflict | ✅ |
| **Periods** | Open draft period | Transitions to `OPEN` status | ✅ |
| **Runs** | Create calculation run (Run #1) | HTTP 201 Created, `status: 'DRAFT'` | ✅ |
| **Calculation** | Execute batch calculation for assigned staff | HTTP 200 OK, Populates items & lines | ✅ |
| **Formulas** | Verify `FIXED_AMOUNT` line calculation | Exact decimal value | ✅ |
| **Formulas** | Verify `PERCENTAGE_OF_BASIC` line calculation | $\text{BASIC} \times \frac{\text{pct}}{100}$ | ✅ |
| **Formulas** | Verify `PERCENTAGE_OF_GROSS` line calculation | $\text{baseGross} \times \frac{\text{pct}}{100}$ | ✅ |
| **Formulas** | Verify `PERCENTAGE_OF_COMPONENT` line calculation | $\text{BaseComp} \times \frac{\text{pct}}{100}$ | ✅ |
| **Aggregations** | Verify Gross, Total Deductions, Net, Employer Cost | Exact decimal totals | ✅ |
| **Exceptions** | Detect unassigned employee (`NO_SALARY_ASSIGNMENT`) | Creates `BLOCKING` exception | ✅ |
| **Exceptions** | Detect circular dependency (`CIRCULAR_COMPONENT_DEPENDENCY`) | Aborts & creates `BLOCKING` exception | ✅ |
| **Exceptions** | Detect negative net pay (`NEGATIVE_NET_PAY`) | Blocks item & creates `BLOCKING` exception | ✅ |
| **Adjustments** | Apply Credit adjustment (Bonus) | Increases Net Payable | ✅ |
| **Adjustments** | Apply Debit adjustment (Advance Recovery) | Decreases Net Payable | ✅ |
| **Immutability** | Modify future salary structure after payroll run | Historical snapshot lines remain identical | ✅ |
| **Approval** | Attempt approval with blocking exceptions | HTTP 400 Bad Request | ✅ |
| **Approval** | Approve clean calculated run | Transitions to `APPROVED` status | ✅ |
| **Locking** | Lock approved run | Transitions to `LOCKED` status | ✅ |
| **Immutability** | Attempt recalculation / adjustments on locked run | HTTP 400 Bad Request | ✅ |
| **RBAC** | Admin & Accounting authorized | Full access | ✅ |
| **RBAC** | Manager authorized for view | Read-only access | ✅ |
| **RBAC** | Sales & Marketing blocked | HTTP 403 Forbidden | ✅ |
| **Audit** | Audit records written for all lifecycle events | `PAYROLL_PERIOD_CREATE`, `PAYROLL_CALCULATE`, etc. | ✅ |
| **Non-Regression** | Master CI validation suite | 100% PASS across all existing modules | ✅ |
