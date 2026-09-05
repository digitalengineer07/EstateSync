# EstateSync: Payroll Implementation Roadmap & Phasing Plan

**Document**: Phase 0 Discovery — Phased Implementation Blueprint  
**Status**: ACTIVE BASELINE

---

## 1. Phased Implementation Roadmap

The Payroll implementation is divided into **7 discrete, non-breaking, additive phases**. Each phase must pass its own verification gate before the next begins:

```
[ PHASE 0: Discovery & Architecture Lock ]  ◄── (CURRENT)
                  │
                  ▼
[ PHASE 1: Employee Master & User Linking ]
├── Employee Table & Optional User FK
├── Department & Designation Masters
└── Employee Management APIs & Audit
                  │
                  ▼
[ PHASE 2: Salary Structure Engine ]
├── SalaryComponent Catalog (Basic, HRA, DA, PF, ESI, TDS)
├── SalaryStructure & Formula Template Engine
└── EmployeeSalaryAssignment Model & APIs
                  │
                  ▼
[ PHASE 3: Monthly Payroll Calculation Engine ]
├── PayrollPeriod (Open / Locked / Closed)
├── PayrollRun & Attendance/Leave Input Handling
└── Gross-to-Net Itemized Calculation Engine
                  │
                  ▼
[ PHASE 4: Dual-Control Approval & Double-Entry Accounting ]
├── Admin Approval State Machine
├── Standard Accounts Seeding (2010, 2020, 1040, 5060)
└── Atomic Journal Posting (Dr: 5060, Cr: 2010/2020/1040)
                  │
                  ▼
[ PHASE 5: Salary Disbursement & Treasury Liquidity ]
├── Individual & Bulk Disbursal Execution (Bank/Cash)
├── Corporate Treasury Wallet Decrement
├── Cross-Module UTR Validation
└── Discharge Journal (Dr: 2010, Cr: 1010)
                  │
                  ▼
[ PHASE 6: Employee Advances & Repayment Lifecycle ]
├── Advance Issuance & Treasury Outflow (Dr: 1040, Cr: 1010)
├── Automatic Payroll Recovery Scheduling
└── Recovery Journal Offset (Dr: 2010, Cr: 1040)
                  │
                  ▼
[ PHASE 7: Payslip Generation & Financial Reports ]
├── PDF/Printable Payslip Formatter
├── Monthly Payroll Register Report (Excel/CSV/JSON)
└── Bank NEFT/RTGS Transfer Schedule Export
```

---

## 2. Recommended Git Branching Strategy

For future implementation phases, the following structured feature branch naming convention is established:

1. `feature/payroll-01-employee-master`
2. `feature/payroll-02-salary-structures`
3. `feature/payroll-03-payroll-engine`
4. `feature/payroll-04-accounting-accrual`
5. `feature/payroll-05-salary-disbursement`
6. `feature/payroll-06-advances-loans`
7. `feature/payroll-07-payslips-reports`

---

## 3. Exact Starting Point for Phase 1

When human developer approval is granted to proceed with Phase 1:
- **Starting Objective**: Create the `Employee` master model in Prisma schema with optional `userId` link, implement `employeeController.js`, add `employeeRoutes.js`, configure permissions in `seed.js`, and verify zero regression on existing user authentication.
