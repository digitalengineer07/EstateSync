# EstateSync: Automated Testing & Validation Map

**Document**: Phase 0 Discovery — Testing Framework Specifications  
**Status**: ACTIVE BASELINE

---

## 1. Existing Test Architecture

EstateSync uses standalone, zero-dependency Node.js automated test suites in `backend/scripts/` that run directly against the live database with full atomic cleanup:
- **`github_action_validation_suite.js`**: Master CI validation runner covering Auth, Fund Allocations, Office Expenses, Customer Bookings, Property Acquisitions, and UTR integrity.
- **`test_duplicate_utr_prevention.js`**: Verifies cross-module UTR collision prevention.
- **`test_property_duplicates.js`**: Verifies deep normalization on Khata and Plot numbers.
- **`test_customer_duplicates.js`**: Verifies duplicate customer plot booking rejections.
- **`test_customer_cancellation_settlement.js`**: Verifies multi-tier cancellation refunds and treasury balance tracking.

---

## 2. Future Payroll Automated Test Suite (`test_payroll_lifecycle.js`)

When implementation begins in subsequent phases, an automated test suite will be created to validate the following 11 core criteria:

```
┌────┬─────────────────────────────────┬─────────────────────────────────────────────────────────────┐
│ #  │ Test Case Category              │ Validation Invariant                                        │
├────┼─────────────────────────────────┼─────────────────────────────────────────────────────────────┤
│ 1  │ **Happy Path Payroll Cycle**    │ Employee -> Salary Assign -> Period Open -> Calculate       │
│    │                                 │ -> Approve -> GL Accrual -> Disburse -> GL Discharge        │
│ 2  │ **User != Employee Linking**    │ Non-login employee receives salary; linked user gets wallet │
│ 3  │ **Duplicate Run Prevention**    │ Cannot calculate/approve two payroll runs for same period   │
│ 4  │ **Duplicate UTR Prevention**    │ Salary disbursement cannot reuse existing UTR reference     │
│ 5  │ **Unauthorized Approvals**      │ Non-admin roles cannot approve payroll or disburse funds    │
│ 6  │ **Locked Period Enforcement**   │ Closed/Locked periods reject retroactive modifications      │
│ 7  │ **Treasury Liquidity Invariant**│ Cannot disburse salary exceeding available treasury balance │
│ 8  │ **Advance Over-Recovery Guard** │ Monthly recovery cannot exceed remaining advance balance    │
│ 9  │ **Double-Entry GL Balance**     │ Every journal entry strictly maintains Sum(Dr) === Sum(Cr)  │
│ 10 │ **Rollback on Error**           │ DB transaction aborts cleanly if any line item fails        │
│ 11 │ **Non-Regression Suite**        │ Existing customer, property, and expense suites pass 100%   │
└────┴─────────────────────────────────┴─────────────────────────────────────────────────────────────┘
```

---

## 3. Test Fixture Strategy

- Test fixtures will use deterministic timestamps (e.g. `test-emp-178829...`) and cleanly delete all created mock employees, salary assignments, payroll runs, and journal lines in the `finally` block of the test suite.
- Test suites must run seamlessly both locally and inside GitHub Actions CI.
