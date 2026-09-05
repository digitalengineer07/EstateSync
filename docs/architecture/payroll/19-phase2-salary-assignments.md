# Phase 2: Effective-Dated Employee Salary Assignments

**Document**: Phase 2 Implementation — Assignment & Supersession Engine  
**Status**: IMPLEMENTED & LOCKED

---

## 1. Effective-Dating Convention

EstateSync establishes a strict system-wide date convention for employee compensation:
- **`effectiveFrom`**: **Inclusive** start date.
- **`effectiveTo`**: **Inclusive** end date (or `NULL` if the assignment is open-ended and currently active).

### Evolution Example

```
Employee: Rahul Sharma (EMP-000012)

[Assignment 1] (Initial Offer)
├── Structure: STR-SALES-STD (Version 1)
├── Base Gross: ₹30,000 / month
├── effectiveFrom: 2026-04-01
├── effectiveTo: 2026-06-30
└── status: SUPERSEDED

[Assignment 2] (Annual Increment / Promotion)
├── Structure: STR-SALES-SENIOR (Version 2)
├── Base Gross: ₹45,000 / month
├── effectiveFrom: 2026-07-01
├── effectiveTo: NULL (Currently Active)
└── status: ACTIVE
```

---

## 2. Supersession & Overlap Prevention Rules

1. **Automatic Supersession**:
   - When a new assignment is submitted with `effectiveFrom` > existing open-ended assignment's `effectiveFrom`:
   - Preceding assignment is capped: `effectiveTo = new Date(effectiveFrom - 1 day)` and marked `SUPERSEDED`.
2. **Start-Date Collision Block**:
   - An attempt to create two assignments starting on the identical `effectiveFrom` date is rejected with `HTTP 409 Conflict`.
3. **Historical Interval Overlap Block**:
   - Any assignment attempting to occupy an already closed historical date interval `[effectiveFrom, effectiveTo]` is rejected with `HTTP 409 Conflict`.
4. **Atomicity**:
   - All supersession and insertion steps execute within `prisma.$transaction`.

---

## 3. Date Resolution Service

The reusable domain function `resolveApplicableSalaryStructure(employeeId, asOfDate)` is exported from `services/salaryStructureService.js`:
- Queries assignments where `effectiveFrom <= asOfDate AND (effectiveTo IS NULL OR effectiveTo >= asOfDate)`.
- Orders by `effectiveFrom DESC` to select the exact version active on that historical date.
