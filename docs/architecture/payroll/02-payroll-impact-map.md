# EstateSync: Payroll Impact & Subsystem Classification Map

**Document**: Phase 0 Discovery — Subsystem Impact Map  
**Status**: ACTIVE BASELINE

---

## 1. Impact Classification Matrix

Every subsystem in the EstateSync codebase is classified into one of four categories:
- **REUSE**: Consume directly as-is without rewriting.
- **EXTEND**: Add new enum codes, permissions, or chart of account definitions without breaking existing contracts.
- **NEW**: Brand-new additive tables, models, controllers, and services created specifically for the Payroll domain.
- **NO CHANGE**: Existing core logic left strictly untouched.

| Subsystem | Classification | Rationale & Evidence | Affected Components |
| :--- | :---: | :--- | :--- |
| **Authentication (JWT & Passwords)** | **REUSE** | Existing `authController.js` and `authMiddleware.js` provide complete JWT verification and session handling. Non-login staff will simply have `userId: null`. | `src/middleware/authMiddleware.js` |
| **RBAC & Permissions** | **EXTEND** | Extend `Permission` master with new payroll permission codes (`employee.*`, `payroll.*`). Middleware `permissionMiddleware.js` is reused as-is. | `prisma/seed.js`, `Permission` table |
| **Double-Entry GL Engine** | **REUSE / EXTEND** | `postJournalEntry()` in `accountingHelper.js` provides atomic balanced journal creation. Extend `STANDARD_ACCOUNTS` with Salary Payable (2010), Advance Asset (1040), and Salary Expense (5060). | `src/utils/accountingHelper.js` |
| **Corporate Treasury Wallet** | **REUSE** | `getPrimaryTreasuryWallet()` in `treasuryHelper.js` manages liquid/cash bank accounts. Payroll disbursements will directly draw from this unified liquidity pool. | `src/utils/treasuryHelper.js` |
| **Bank Reference / UTR Validator** | **EXTEND** | `checkDuplicateReferenceNo()` in `referenceValidator.js` will be extended to include `SalaryPayment.referenceNo` so duplicate salary UTRs are blocked globally. | `src/utils/referenceValidator.js` |
| **Audit Logging System** | **REUSE** | `logAudit()` in `auditLogger.js` records actor, IP, timestamp, old/new values. Reused directly for all payroll lifecycle events. | `src/utils/auditLogger.js` |
| **Idempotency Engine** | **REUSE** | `idempotencyMiddleware.js` protects sensitive mutation routes against duplicate network retries. | `src/middleware/idempotencyMiddleware.js` |
| **Customer Master & CRM** | **NO CHANGE** | Customer bookings, commercials, installments, and cancellation workflows remain 100% untouched. | `src/controller/customerController.js` |
| **Property Acquisition Management** | **NO CHANGE** | Land owner payouts and parcel tracking remain 100% untouched. | `src/controller/propertyController.js` |
| **Office & Field Expenses** | **NO CHANGE** | Operational wallet expenses, expense categories, and approval workflows remain 100% untouched. | `src/controller/expenseController.js` |
| **Employee Master** | **NEW** | Standalone master entity for all company personnel (Accountant, Sales, Guard, Driver, etc.) with optional `userId` foreign key. | `prisma/schema.prisma`, `employeeController.js` |
| **Salary Structures & Rules** | **NEW** | Earnings (Basic, HRA, DA, Allowances) and Deductions (PF, ESI, TDS, Professional Tax) structure definitions. | `prisma/schema.prisma`, `salaryStructureController.js` |
| **Payroll Processing Engine** | **NEW** | Monthly payroll period generation, gross-to-net computation, attendance/leave inputs, advance deductions, and approval state machine. | `prisma/schema.prisma`, `payrollController.js` |
| **Salary Advances & Loans** | **NEW** | Issuance of employee advances from Treasury and automatic monthly salary recovery scheduling. | `prisma/schema.prisma`, `advanceController.js` |
| **Payslip & Reporting Engine** | **NEW** | PDF/printable payslips and monthly payroll register sheets. | `payrollReportController.js` |

---

## 2. Non-Regression Invariant Guarantees

1. **Customer & Sales Invariance**:
   - Customer collection journals (`Dr: 1010 | Cr: 4010`) and cancellation refunds (`Dr: 4010 | Cr: 1010`) are strictly separate from payroll journals.
2. **Property Acquisition Invariance**:
   - Land purchase liabilities and payouts (`Dr: 1510 | Cr: 1010`) operate independently.
3. **Office Expense Invariance**:
   - Staff wallet floats (`1020` / `1030`) and categories (`5010`–`5050`) remain dedicated to operational field spending. Payroll salaries are booked under dedicated `5060` (Salaries & Employee Benefits).
4. **General Ledger Integrity**:
   - All payroll financial postings will flow through `postJournalEntry()` ensuring `Sum(Debits) === Sum(Credits)` with strict atomic transactions.
