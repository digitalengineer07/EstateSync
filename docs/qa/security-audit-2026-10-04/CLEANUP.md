# Cleanup review — new-features-branch, e6ffc3b

Application files were not removed. The lists below separate runtime-empty files, unused bindings, and items that must be retained or investigated. Static analysis cannot guarantee every external integration or future dynamic import.

## 26 runtime-empty placeholder files

All contain only comments (no executable statements). No application imports were found. The route probe was rerun with imports of these files forced to throw, simulating their absence: application startup and all 102 registered method/path probes still completed. These are high-confidence runtime cleanup candidates. setup.js recreates them, and architecture documents mention some; update those references if deleting. A full frontend build and real-database regression suite were not run.

- [backend/src/config/index.js](../../../backend/src/config/index.js)
- [backend/src/controller/fundController.js](../../../backend/src/controller/fundController.js)
- [backend/src/controller/reconciliationController.js](../../../backend/src/controller/reconciliationController.js)
- [backend/src/controller/reportController.js](../../../backend/src/controller/reportController.js)
- [backend/src/controller/vendorController.js](../../../backend/src/controller/vendorController.js)
- [backend/src/models/AccountingPeriod.js](../../../backend/src/models/AccountingPeriod.js)
- [backend/src/models/AuditLog.js](../../../backend/src/models/AuditLog.js)
- [backend/src/models/ChartOfAccount.js](../../../backend/src/models/ChartOfAccount.js)
- [backend/src/models/Expense.js](../../../backend/src/models/Expense.js)
- [backend/src/models/ExpenseCategory.js](../../../backend/src/models/ExpenseCategory.js)
- [backend/src/models/FundAllocation.js](../../../backend/src/models/FundAllocation.js)
- [backend/src/models/FundRequest.js](../../../backend/src/models/FundRequest.js)
- [backend/src/models/JournalEntry.js](../../../backend/src/models/JournalEntry.js)
- [backend/src/models/JournalLine.js](../../../backend/src/models/JournalLine.js)
- [backend/src/models/Permission.js](../../../backend/src/models/Permission.js)
- [backend/src/models/Reconciliation.js](../../../backend/src/models/Reconciliation.js)
- [backend/src/models/Role.js](../../../backend/src/models/Role.js)
- [backend/src/models/User.js](../../../backend/src/models/User.js)
- [backend/src/models/Vendor.js](../../../backend/src/models/Vendor.js)
- [backend/src/models/Wallet.js](../../../backend/src/models/Wallet.js)
- [backend/src/models/WalletTransaction.js](../../../backend/src/models/WalletTransaction.js)
- [backend/src/routes/fundRoutes.js](../../../backend/src/routes/fundRoutes.js)
- [backend/src/routes/reconciliationRoutes.js](../../../backend/src/routes/reconciliationRoutes.js)
- [backend/src/routes/reportRoutes.js](../../../backend/src/routes/reportRoutes.js)
- [backend/src/routes/vendorRoutes.js](../../../backend/src/routes/vendorRoutes.js)
- [backend/src/utils/index.js](../../../backend/src/utils/index.js)

## All unused bindings detected

This combines JSX-aware JavaScript lint with the configured frontend TypeScript lint. It is a review list, not an automatic deletion list. Do not delete entire declarations containing awaited writes or hooks. Removing the unused fourth parameter from Express error middleware breaks error dispatch.

| File | Binding | Required treatment |
|---|---|---|
| [backend/src/app.js:9](../../../backend/src/app.js#L9) | rateLimit | Review binding only; preserve initializer side effects and callback argument positions. |
| [backend/src/app.js:39](../../../backend/src/app.js#L39) | res | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/app.js:140](../../../backend/src/app.js#L140) | req | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/app.js:150](../../../backend/src/app.js#L150) | req | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/app.js:162](../../../backend/src/app.js#L162) | err | Catch binding may be optional; review swallowed error before deleting. |
| [backend/src/app.js:209](../../../backend/src/app.js#L209) | promise | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/controller/accountController.js:7](../../../backend/src/controller/accountController.js#L7) | req | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/controller/customerBillingController.js:175](../../../backend/src/controller/customerBillingController.js#L175) | req | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/controller/customerController.js:255](../../../backend/src/controller/customerController.js#L255) | userRole | Investigate missing behavior first; do not automatically delete. |
| [backend/src/controller/dashboardController.js:167](../../../backend/src/controller/dashboardController.js#L167) | req | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/controller/dashboardController.js:269](../../../backend/src/controller/dashboardController.js#L269) | req | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/controller/expenseController.js:7](../../../backend/src/controller/expenseController.js#L7) | req | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/controller/expenseController.js:314](../../../backend/src/controller/expenseController.js#L314) | req | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/controller/fundRequestController.js:63](../../../backend/src/controller/fundRequestController.js#L63) | error | Investigate missing behavior first; do not automatically delete. |
| [backend/src/controller/fundRequestController.js:80](../../../backend/src/controller/fundRequestController.js#L80) | error | Investigate missing behavior first; do not automatically delete. |
| [backend/src/controller/fundRequestController.js:86](../../../backend/src/controller/fundRequestController.js#L86) | req | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/controller/fundRequestController.js:96](../../../backend/src/controller/fundRequestController.js#L96) | error | Investigate missing behavior first; do not automatically delete. |
| [backend/src/controller/noteController.js:80](../../../backend/src/controller/noteController.js#L80) | req | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/controller/propertyController.js:123](../../../backend/src/controller/propertyController.js#L123) | req | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/controller/transactionController.js:4](../../../backend/src/controller/transactionController.js#L4) | req | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/controller/treasuryController.js:22](../../../backend/src/controller/treasuryController.js#L22) | transactionDate | Investigate missing behavior first; do not automatically delete. |
| [backend/src/controller/treasuryController.js:190](../../../backend/src/controller/treasuryController.js#L190) | req | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/controller/userController.js:8](../../../backend/src/controller/userController.js#L8) | req | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/controller/userController.js:60](../../../backend/src/controller/userController.js#L60) | req | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/controller/walletController.js:196](../../../backend/src/controller/walletController.js#L196) | updatedTreasuryWallet | Remove assignment binding only; KEEP awaited database write. |
| [backend/src/controller/walletController.js:289](../../../backend/src/controller/walletController.js#L289) | req | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/middleware/errorMiddleware.js:7](../../../backend/src/middleware/errorMiddleware.js#L7) | next | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/middleware/sanitizerMiddleware.js:32](../../../backend/src/middleware/sanitizerMiddleware.js#L32) | res | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/routes/documentRoutes.js:13](../../../backend/src/routes/documentRoutes.js#L13) | res | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/routes/documentRoutes.js:65](../../../backend/src/routes/documentRoutes.js#L65) | req | KEEP positional callback signature; error middleware must retain four arguments. |
| [backend/src/services/customerBillingService.js:71](../../../backend/src/services/customerBillingService.js#L71) | notes | Investigate missing behavior first; do not automatically delete. |
| [backend/src/services/customerBillingService.js:131](../../../backend/src/services/customerBillingService.js#L131) | isTaxable | Investigate missing behavior first; do not automatically delete. |
| [backend/src/services/paymentAllocationService.js:24](../../../backend/src/services/paymentAllocationService.js#L24) | notes | Investigate missing behavior first; do not automatically delete. |
| [backend/src/services/paymentAllocationService.js:102](../../../backend/src/services/paymentAllocationService.js#L102) | updatedWallet | Remove assignment binding only; KEEP awaited database write. |
| [backend/src/services/paymentPlanService.js:171](../../../backend/src/services/paymentPlanService.js#L171) | actorId | Investigate missing behavior first; do not automatically delete. |
| [backend/src/utils/accountingHelper.js:106](../../../backend/src/utils/accountingHelper.js#L106) | lockErr | Catch binding may be optional; review swallowed error before deleting. |
| [backend/src/utils/accountingHelper.js:451](../../../backend/src/utils/accountingHelper.js#L451) | employeeCode | Investigate missing behavior first; do not automatically delete. |
| [frontend/src/app/dashboards/layout.js:26](../../../frontend/src/app/dashboards/layout.js#L26) | ExternalLink | Review binding only; preserve initializer side effects and callback argument positions. |
| [frontend/src/app/dashboards/layout.js:28](../../../frontend/src/app/dashboards/layout.js#L28) | Sparkles | Review binding only; preserve initializer side effects and callback argument positions. |
| [frontend/src/app/dashboards/layout.js:383](../../../frontend/src/app/dashboards/layout.js#L383) | HubIcon | Review binding only; preserve initializer side effects and callback argument positions. |
| [frontend/src/components/accounting/AccountingSalaryView.js:12](../../../frontend/src/components/accounting/AccountingSalaryView.js#L12) | Users | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/accounting/AccountingSalaryView.js:19](../../../frontend/src/components/accounting/AccountingSalaryView.js#L19) | ShieldCheck | Review binding only; preserve initializer side effects and callback argument positions. |
| [frontend/src/components/AdjustWalletBalanceModal.js:8](../../../frontend/src/components/AdjustWalletBalanceModal.js#L8) | Wallet | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/AuditLogViewer.js:6](../../../frontend/src/components/AuditLogViewer.js#L6) | API_URL | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/AuditLogViewer.js:7](../../../frontend/src/components/AuditLogViewer.js#L7) | Terminal | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/AuditLogViewer.js:7](../../../frontend/src/components/AuditLogViewer.js#L7) | ArrowUpRight | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/CustomerCancellationSettlementModal.js:3](../../../frontend/src/components/CustomerCancellationSettlementModal.js#L3) | useTransition | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/CustomerCancellationSettlementModal.js:10](../../../frontend/src/components/CustomerCancellationSettlementModal.js#L10) | ArrowRight | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/CustomerCancellationSettlementModal.js:11](../../../frontend/src/components/CustomerCancellationSettlementModal.js#L11) | Building2 | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/CustomerCancellationSettlementModal.js:15](../../../frontend/src/components/CustomerCancellationSettlementModal.js#L15) | HelpCircle | Review binding only; preserve initializer side effects and callback argument positions. |
| [frontend/src/components/CustomerCancellationSettlementModal.js:16](../../../frontend/src/components/CustomerCancellationSettlementModal.js#L16) | FileText | Review binding only; preserve initializer side effects and callback argument positions. |
| [frontend/src/components/CustomerCancellationSettlementModal.js:23](../../../frontend/src/components/CustomerCancellationSettlementModal.js#L23) | setPayoutAccount | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/CustomerEditModal.js:4](../../../frontend/src/components/CustomerEditModal.js#L4) | FileText | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/CustomerPortfolioList.js:9](../../../frontend/src/components/CustomerPortfolioList.js#L9) | Eye | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/CustomerPortfolioList.js:9](../../../frontend/src/components/CustomerPortfolioList.js#L9) | CreditCard | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/CustomerPortfolioList.js:65](../../../frontend/src/components/CustomerPortfolioList.js#L65) | e | Catch binding may be optional; review swallowed error before deleting. |
| [frontend/src/components/CustomerPortfolioList.js:128](../../../frontend/src/components/CustomerPortfolioList.js#L128) | e | Catch binding may be optional; review swallowed error before deleting. |
| [frontend/src/components/DashboardStats.js:16](../../../frontend/src/components/DashboardStats.js#L16) | error | Investigate missing behavior first; do not automatically delete. |
| [frontend/src/components/DirectFundAllocationForm.js:79](../../../frontend/src/components/DirectFundAllocationForm.js#L79) | error | Investigate missing behavior first; do not automatically delete. |
| [frontend/src/components/EditCustomerPaymentModal.js:8](../../../frontend/src/components/EditCustomerPaymentModal.js#L8) | Landmark | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/EditCustomerPaymentModal.js:9](../../../frontend/src/components/EditCustomerPaymentModal.js#L9) | CreditCard | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/EditCustomerPaymentModal.js:10](../../../frontend/src/components/EditCustomerPaymentModal.js#L10) | Hash | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/EditCustomerPaymentModal.js:52](../../../frontend/src/components/EditCustomerPaymentModal.js#L52) | e | Catch binding may be optional; review swallowed error before deleting. |
| [frontend/src/components/EditPropertyPaymentModal.js:17](../../../frontend/src/components/EditPropertyPaymentModal.js#L17) | formatDate | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/employees/EditSalaryModal.js:4](../../../frontend/src/components/employees/EditSalaryModal.js#L4) | CreditCard | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/employees/EmployeeDetailView.js:20](../../../frontend/src/components/employees/EmployeeDetailView.js#L20) | Calendar | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/employees/EmployeeDetailView.js:21](../../../frontend/src/components/employees/EmployeeDetailView.js#L21) | Phone | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/employees/EmployeeDetailView.js:22](../../../frontend/src/components/employees/EmployeeDetailView.js#L22) | Mail | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/employees/EmployeeDetailView.js:25](../../../frontend/src/components/employees/EmployeeDetailView.js#L25) | UserCheck | Review binding only; preserve initializer side effects and callback argument positions. |
| [frontend/src/components/employees/EmployeeDetailView.js:31](../../../frontend/src/components/employees/EmployeeDetailView.js#L31) | Wallet | Review binding only; preserve initializer side effects and callback argument positions. |
| [frontend/src/components/employees/EmployeeDetailView.js:38](../../../frontend/src/components/employees/EmployeeDetailView.js#L38) | Clock | Review binding only; preserve initializer side effects and callback argument positions. |
| [frontend/src/components/employees/EmployeeDetailView.js:42](../../../frontend/src/components/employees/EmployeeDetailView.js#L42) | router | Review binding only; preserve initializer side effects and callback argument positions. |
| [frontend/src/components/employees/EmployeeLinkUserModal.js:6](../../../frontend/src/components/employees/EmployeeLinkUserModal.js#L6) | CheckCircle2 | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/employees/EmployeeList.js:28](../../../frontend/src/components/employees/EmployeeList.js#L28) | Calendar | Review binding only; preserve initializer side effects and callback argument positions. |
| [frontend/src/components/employees/EmployeeList.js:31](../../../frontend/src/components/employees/EmployeeList.js#L31) | Briefcase | Review binding only; preserve initializer side effects and callback argument positions. |
| [frontend/src/components/employees/EmployeeList.js:109](../../../frontend/src/components/employees/EmployeeList.js#L109) | e | Catch binding may be optional; review swallowed error before deleting. |
| [frontend/src/components/employees/EmployeeList.js:190](../../../frontend/src/components/employees/EmployeeList.js#L190) | archivedCount | Review binding only; preserve initializer side effects and callback argument positions. |
| [frontend/src/components/employees/EmployeeModal.js:6](../../../frontend/src/components/employees/EmployeeModal.js#L6) | CheckCircle2 | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/employees/EmployeeModal.js:17](../../../frontend/src/components/employees/EmployeeModal.js#L17) | isAdmin | Investigate missing behavior first; do not automatically delete. |
| [frontend/src/components/employees/PaySalaryModal.js:5](../../../frontend/src/components/employees/PaySalaryModal.js#L5) | IndianRupee | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/employees/PaySalaryModal.js:5](../../../frontend/src/components/employees/PaySalaryModal.js#L5) | CheckCircle2 | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/ExpenseList.js:28](../../../frontend/src/components/ExpenseList.js#L28) | e | Catch binding may be optional; review swallowed error before deleting. |
| [frontend/src/components/ExpenseUploadForm.js:10](../../../frontend/src/components/ExpenseUploadForm.js#L10) | user | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/ExpenseUploadForm.js:81](../../../frontend/src/components/ExpenseUploadForm.js#L81) | error | Investigate missing behavior first; do not automatically delete. |
| [frontend/src/components/FundRequestForm.js:6](../../../frontend/src/components/FundRequestForm.js#L6) | Clock | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/FundRequestForm.js:6](../../../frontend/src/components/FundRequestForm.js#L6) | Info | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/FundRequestForm.js:6](../../../frontend/src/components/FundRequestForm.js#L6) | IndianRupee | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/FundRequestForm.js:9](../../../frontend/src/components/FundRequestForm.js#L9) | user | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/FundRequestForm.js:68](../../../frontend/src/components/FundRequestForm.js#L68) | error | Investigate missing behavior first; do not automatically delete. |
| [frontend/src/components/FundRequestList.js:66](../../../frontend/src/components/FundRequestList.js#L66) | error | Investigate missing behavior first; do not automatically delete. |
| [frontend/src/components/GeneralLedgerView.js:7](../../../frontend/src/components/GeneralLedgerView.js#L7) | API_URL | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/manager/ManagerSalaryView.js:6](../../../frontend/src/components/manager/ManagerSalaryView.js#L6) | IndianRupee | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/manager/ManagerSalaryView.js:6](../../../frontend/src/components/manager/ManagerSalaryView.js#L6) | Users | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/manager/ManagerSalaryView.js:6](../../../frontend/src/components/manager/ManagerSalaryView.js#L6) | Landmark | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/OperationalNotesView.js:11](../../../frontend/src/components/OperationalNotesView.js#L11) | User | Review binding only; preserve initializer side effects and callback argument positions. |
| [frontend/src/components/OperationalNotesView.js:24](../../../frontend/src/components/OperationalNotesView.js#L24) | Filter | Review binding only; preserve initializer side effects and callback argument positions. |
| [frontend/src/components/OperationalNotesView.js:27](../../../frontend/src/components/OperationalNotesView.js#L27) | toISTDateInputString | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/OperationalNotesView.js:220](../../../frontend/src/components/OperationalNotesView.js#L220) | e | Catch binding may be optional; review swallowed error before deleting. |
| [frontend/src/components/PropertyAcquisitionList.js:8](../../../frontend/src/components/PropertyAcquisitionList.js#L8) | MapPin | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/PropertyAcquisitionList.js:8](../../../frontend/src/components/PropertyAcquisitionList.js#L8) | Building2 | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/PropertyAcquisitionList.js:8](../../../frontend/src/components/PropertyAcquisitionList.js#L8) | TrendingDown | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/PropertyAcquisitionList.js:106](../../../frontend/src/components/PropertyAcquisitionList.js#L106) | e | Catch binding may be optional; review swallowed error before deleting. |
| [frontend/src/components/PropertyAcquisitionList.js:166](../../../frontend/src/components/PropertyAcquisitionList.js#L166) | e | Catch binding may be optional; review swallowed error before deleting. |
| [frontend/src/components/RecordBankInflowModal.js:4](../../../frontend/src/components/RecordBankInflowModal.js#L4) | ArrowUpRight | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/RecordBankInflowModal.js:7](../../../frontend/src/components/RecordBankInflowModal.js#L7) | formatDate | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/components/SoftDashboardShell.js:29](../../../frontend/src/components/SoftDashboardShell.js#L29) | eyebrow | Review binding only; preserve initializer side effects and callback argument positions. |
| [frontend/src/components/TransactionLedger.js:65](../../../frontend/src/components/TransactionLedger.js#L65) | e | Catch binding may be optional; review swallowed error before deleting. |
| [frontend/src/components/UserPasswordManagement.js:37](../../../frontend/src/components/UserPasswordManagement.js#L37) | error | Investigate missing behavior first; do not automatically delete. |
| [frontend/src/components/UserRegistrationForm.js:79](../../../frontend/src/components/UserRegistrationForm.js#L79) | error | Investigate missing behavior first; do not automatically delete. |
| [frontend/src/components/UserWalletLedger.js:6](../../../frontend/src/components/UserWalletLedger.js#L6) | API_URL | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/context/AuthContext.js:36](../../../frontend/src/context/AuthContext.js#L36) | e | Catch binding may be optional; review swallowed error before deleting. |
| [frontend/src/services/apiClient.js:83](../../../frontend/src/services/apiClient.js#L83) | parseErr | Catch binding may be optional; review swallowed error before deleting. |
| [frontend/src/app/support/page.tsx:14](../../../frontend/src/app/support/page.tsx#L14) | AlertCircle | Review binding only; preserve initializer side effects and callback argument positions. |
| [frontend/src/app/terms/page.tsx:7](../../../frontend/src/app/terms/page.tsx#L7) | FileText | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/app/terms/page.tsx:9](../../../frontend/src/app/terms/page.tsx#L9) | Building2 | Unused import candidate; remove specifier only after checking module side effects. |
| [frontend/src/app/terms/page.tsx:11](../../../frontend/src/app/terms/page.tsx#L11) | CreditCard | Unused import candidate; remove specifier only after checking module side effects. |

## Exported names with no references in other tracked code

Internal calls can still require these functions. Framework entry points and configuration exports are not ordinary imports. Remove only an unused export if the function is used inside its defining module.

| File | Export |
|---|---|
| [backend/src/middleware/rateLimitMiddleware.js:68](../../../backend/src/middleware/rateLimitMiddleware.js#L68) | financialMutationLimiter |
| [backend/src/services/customerBillingService.js:432](../../../backend/src/services/customerBillingService.js#L432) | generateNextDemandNumber |
| [backend/src/services/documents/review.js:134](../../../backend/src/services/documents/review.js#L134) | SOURCES |
| [backend/src/services/documents/service.js:171](../../../backend/src/services/documents/service.js#L171) | validateSubmission |
| [backend/src/utils/accountingHelper.js:619](../../../backend/src/utils/accountingHelper.js#L619) | postSalaryPaymentSettlementJournal |
| [backend/src/utils/accountingHelper.js:620](../../../backend/src/utils/accountingHelper.js#L620) | postSalaryPaymentReversalJournal |
| [backend/src/utils/loginRateLimiter.js:219](../../../backend/src/utils/loginRateLimiter.js#L219) | MAX_FAILED_ATTEMPTS |
| [backend/src/utils/loginRateLimiter.js:220](../../../backend/src/utils/loginRateLimiter.js#L220) | LOCKOUT_DURATION_MS |
| [frontend/src/services/documentService.js:4](../../../frontend/src/services/documentService.js#L4) | MAX_DOCUMENT_BYTES |
| [frontend/src/utils/formatters.js:34](../../../frontend/src/utils/formatters.js#L34) | formatNumberINR |
| [frontend/src/utils/permissions.js:31](../../../frontend/src/utils/permissions.js#L31) | hasAnyPermission |
| [frontend/src/utils/permissions.js:44](../../../frontend/src/utils/permissions.js#L44) | hasAllPermissions |

## Public asset candidates

No textual reference in tracked JS/TS was found for these assets. CSS references, metadata conventions, design references and external URLs must be checked before deleting. Public files may be externally linked.

- [frontend/public/file.svg](../../../frontend/public/file.svg)
- [frontend/public/globe.svg](../../../frontend/public/globe.svg)
- [frontend/public/images/landing/organic-curve-overlay.jpg](../../../frontend/public/images/landing/organic-curve-overlay.jpg)
- [frontend/public/images/landing/reference-mockup.jpg](../../../frontend/public/images/landing/reference-mockup.jpg)
- [frontend/public/next.svg](../../../frontend/public/next.svg)
- [frontend/public/vercel.svg](../../../frontend/public/vercel.svg)
- [frontend/public/window.svg](../../../frontend/public/window.svg)

## Retain or repair

- backend/src/services/documents/permissions.js is used by the Prisma seed, permission sync scripts and integration tests. The application-only import graph falsely labels it unreferenced; KEEP it.
- invalidateUserAuthCache is a no-op compatibility export still imported/called by userController. Remove both export and call/import together only after confirming integrations; fixing session revocation is higher priority.
- financialMutationLimiter is exported but not applied by routes. Wire it into mutations; deleting it would abandon the intended safeguard.
- userRole in updateCustomer and actorId in assignPlanToCustomer indicate missing authorization/audit behavior. Repair those functions before cleanup.
- transactionDate in recordBankInflow is ignored despite being accepted. Honor it with validation; do not simply remove the input.
- Keep database writes assigned to unused updatedWallet/updatedTreasuryWallet variables.
- Keep Next.js page/layout/route exports, hooks, Prisma schema, upgrades, runtime @prisma/client and migrations.
- backend/src/generated and backend/src/prisma-client are generated local artifacts excluded from source counts. Current db.js imports @prisma/client. Do not delete generated runtimes without verifying deployment and generation settings.
- Tests, reset/repair/seed scripts, setup.js, design documents and backups are not unused just because no runtime module imports them. setup.js overwrites application files and must not be run against a working checkout. Destructive database scripts require an isolated test database.

## Verification before applying cleanup

Keep cleanup separate from authorization and accounting fixes. Remove one reviewed group at a time, regenerate Prisma if relevant, rerun startup/route probes, backend unit tests, frontend lint/build and tests, then perform role-based integration tests on an isolated PostgreSQL database. The local frontend test runner is currently missing; therefore a no-regression guarantee for all frontend deletions is not available.