# Endpoint verification

Local Express app, production mode, disposable JWT signing secrets, .env disabled, database replaced with a rejecting stub. No live mutations. 102 explicitly registered method/path combinations; implicit HEAD/OPTIONS and unmatched paths are not counted. 98 protected routes include password change; 97 other protected routes also received a synthetic ADMIN token and empty body/database-failure probe. A 400 in that probe means validation stopped the request before the database; it does not prove downstream outage handling. No credentialed successful business transaction was tested.

| Method | Path | Anonymous | Authenticated failure/empty-body probe | Internal error exposed |
|---|---|---|---|---|
| POST | /api/v1/auth/login | 400 | not run | not observed |
| POST | /api/v1/auth/refresh | 401 | not run | not observed |
| POST | /api/v1/auth/logout | 200 | not run | not observed |
| PUT | /api/v1/auth/change-password | 401 | not run | not observed |
| GET | /api/v1/users/roles | 401 | 500 | not observed |
| GET | /api/v1/users/managers | 401 | 500 | not observed |
| GET | /api/v1/users/all | 401 | 500 | not observed |
| POST | /api/v1/users/register | 401 | 400 | not observed |
| PUT | /api/v1/users/:id/reset-password | 401 | 400 | not observed |
| PATCH | /api/v1/users/:id/status | 401 | 400 | not observed |
| PUT | /api/v1/users/:id/status | 401 | 400 | not observed |
| GET | /api/v1/expenses/categories | 401 | 500 | not observed |
| GET | /api/v1/expenses/my | 401 | 500 | not observed |
| GET | /api/v1/expenses/team | 401 | 500 | not observed |
| GET | /api/v1/expenses/all | 401 | 500 | not observed |
| POST | /api/v1/expenses/ | 401 | 400 | not observed |
| POST | /api/v1/expenses/:id/reverse | 401 | 500 | YES |
| POST | /api/v1/fund-requests/ | 401 | 400 | not observed |
| GET | /api/v1/fund-requests/my | 401 | 500 | not observed |
| GET | /api/v1/fund-requests/incoming | 401 | 500 | not observed |
| POST | /api/v1/fund-requests/:id/approve | 401 | 500 | YES |
| POST | /api/v1/fund-requests/:id/reject | 401 | 500 | not observed |
| GET | /api/v1/fund-requests/all | 401 | 500 | not observed |
| POST | /api/v1/fund-requests/allocate | 401 | 400 | not observed |
| GET | /api/v1/transactions/all | 401 | 500 | not observed |
| GET | /api/v1/dashboard/wallet | 401 | 500 | not observed |
| GET | /api/v1/dashboard/manager | 401 | 500 | not observed |
| GET | /api/v1/dashboard/admin | 401 | 500 | not observed |
| GET | /api/v1/dashboard/accounting | 401 | 500 | not observed |
| GET | /api/v1/accounts/ | 401 | 500 | not observed |
| GET | /api/v1/journals/ | 401 | 500 | not observed |
| GET | /api/v1/audit/ | 401 | 500 | not observed |
| POST | /api/v1/customers/ | 401 | 400 | not observed |
| GET | /api/v1/customers/ | 401 | 500 | not observed |
| GET | /api/v1/customers/:id | 401 | 500 | not observed |
| PUT | /api/v1/customers/:id | 401 | 500 | YES |
| POST | /api/v1/customers/:id/payments | 401 | 400 | not observed |
| POST | /api/v1/customers/:id/settle-cancellation | 401 | 500 | YES |
| PATCH | /api/v1/customers/payments/:paymentId | 401 | 500 | YES |
| POST | /api/v1/properties/ | 401 | 400 | not observed |
| GET | /api/v1/properties/ | 401 | 500 | not observed |
| GET | /api/v1/properties/:id | 401 | 500 | not observed |
| PUT | /api/v1/properties/payments/:paymentId | 401 | 500 | YES |
| PUT | /api/v1/properties/:id/payments/:paymentId | 401 | 500 | YES |
| PUT | /api/v1/properties/:id | 401 | 500 | not observed |
| POST | /api/v1/properties/:id/payments | 401 | 400 | not observed |
| GET | /api/v1/treasury/inflows | 401 | 500 | not observed |
| GET | /api/v1/treasury/cashflow | 401 | 500 | not observed |
| POST | /api/v1/treasury/inflow | 401 | 400 | not observed |
| GET | /api/v1/employees/salary/summary | 401 | 500 | YES |
| POST | /api/v1/employees/ | 401 | 400 | not observed |
| GET | /api/v1/employees/ | 401 | 500 | not observed |
| GET | /api/v1/employees/:id | 401 | 500 | not observed |
| PATCH | /api/v1/employees/:id | 401 | 500 | YES |
| POST | /api/v1/employees/:id/archive | 401 | 400 | not observed |
| POST | /api/v1/employees/:id/link-user | 401 | 400 | not observed |
| POST | /api/v1/employees/:id/unlink-user | 401 | 500 | YES |
| PUT | /api/v1/employees/:id/salary | 401 | 500 | YES |
| POST | /api/v1/employees/:id/pay-salary | 401 | 500 | YES |
| GET | /api/v1/employees/:id/salary-payments | 401 | 500 | YES |
| GET | /api/v1/accounting/periods/ | 401 | 500 | YES |
| POST | /api/v1/accounting/periods/:id/close | 401 | 500 | YES |
| POST | /api/v1/accounting/periods/:id/reopen | 401 | 400 | not observed |
| GET | /api/v1/billing/plans | 401 | 500 | YES |
| POST | /api/v1/billing/plans | 401 | 400 | not observed |
| GET | /api/v1/billing/plans/:id | 401 | 500 | YES |
| POST | /api/v1/billing/plans/assign | 401 | 500 | YES |
| GET | /api/v1/billing/demands | 401 | 500 | YES |
| POST | /api/v1/billing/demands | 401 | 500 | YES |
| POST | /api/v1/billing/demands/:id/cancel | 401 | 400 | not observed |
| POST | /api/v1/billing/payments | 401 | 400 | not observed |
| GET | /api/v1/billing/customers/:id/statement | 401 | 500 | YES |
| GET | /api/v1/billing/aging | 401 | 500 | YES |
| GET | /api/v1/billing/reconciliation | 401 | 500 | YES |
| POST | /api/v1/wallets/adjust | 401 | 400 | not observed |
| GET | /api/v1/wallets/overview | 401 | 500 | not observed |
| GET | /api/v1/notes/ | 401 | 500 | YES |
| GET | /api/v1/notes/stats | 401 | 500 | YES |
| GET | /api/v1/notes/:id | 401 | 500 | YES |
| POST | /api/v1/notes/ | 401 | 400 | not observed |
| PUT | /api/v1/notes/:id | 401 | 500 | YES |
| DELETE | /api/v1/notes/:id | 401 | 500 | YES |
| GET | /api/v1/notifications/ | 401 | 200 | not observed |
| GET | /api/v1/search/ | 401 | 200 | not observed |
| GET | /api/v1/documents/policy | 401 | 400 | not observed |
| POST | /api/v1/documents/uploads | 401 | 400 | not observed |
| POST | /api/v1/documents/uploads/:id/discard | 401 | 500 | not observed |
| GET | /api/v1/documents/review | 401 | 500 | not observed |
| GET | /api/v1/documents/transactions | 401 | 500 | not observed |
| GET | /api/v1/documents/summary | 401 | 500 | not observed |
| GET | /api/v1/documents/journal/:id | 401 | 500 | not observed |
| GET | /api/v1/documents/ | 401 | 400 | not observed |
| POST | /api/v1/documents/ | 401 | 500 | not observed |
| POST | /api/v1/documents/exceptions/:id/:action | 401 | 400 | not observed |
| GET | /api/v1/documents/:id | 401 | 500 | not observed |
| GET | /api/v1/documents/:id/preview | 401 | 500 | not observed |
| GET | /api/v1/documents/:id/download | 401 | 500 | not observed |
| POST | /api/v1/documents/:id/verify | 401 | 500 | not observed |
| POST | /api/v1/documents/:id/reject | 401 | 500 | not observed |
| POST | /api/v1/documents/:id/archive | 401 | 500 | not observed |
| POST | /api/v1/documents/:id/replace | 401 | 500 | not observed |
| GET | / | 200 | not run | not observed |

## Additional parser/login probes

- malformed-json: HTTP 400; {"success":false,"message":"Expected property name or '}' in JSON at position 1 (line 1 column 2)"}
- oversized-json: HTTP 413; {"success":false,"message":"An unexpected server error occurred. Please try again later."}
- missing-body: HTTP 500; {"success":false,"message":"An unexpected server error occurred. Please try again later."}
- wrong-email-type: HTTP 500; {"success":false,"message":"Login failed"}