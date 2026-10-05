# EstateSync security, reliability and cleanup audit

Branch: `new-features-branch`; HEAD: `e6ffc3b`. Audit date: 4 October 2026 (user timezone). This reviews the local working tree, including the pre-existing backend package-lock modification, not a byte-for-byte snapshot of the deployed service. Application files have not been changed or deleted.

## Answers

- **Public APIs:** `GET /`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, and `POST /api/v1/auth/logout` are deliberately reachable without a bearer token. Refresh still requires a valid refresh token and matching session. Logout only destroys the caller's session. Login can write security audit events for failed attempts, as intended. No public business-record creation route was found in the registered production backend routes.
- **Protected APIs:** all **98 protected method/path combinations**, including password change, returned 401 without credentials. This verifies the authentication gate, not the correctness of authorization after login. The earlier authorization findings remain open.
- **Garbage/duplicate creation:** confirmed input-validation defects and non-atomic idempotency allow malformed or repeated requests through. Financial concurrency risks also exist in source. Details below.
- **Loops:** no unconditional infinite loop was identified in application source. There are 56 explicit loops, large unpaginated queries, a per-customer query loop, and some promises that intentionally never settle. These can cause slow requests or stuck UI without being infinite CPU loops.
- **Error handling:** not uniformly safe. 28 of 97 authenticated failure/empty-body probes returned a synthetic internal database error to the client. Missing login bodies cause a 500. No process termination occurred during these local probes; this is not proof against every crash scenario.
- **Cleanup:** 26 comment-only files are high-confidence runtime cleanup candidates; their absence was simulated successfully. There are 116 distinct unused-binding warnings and 12 exported-name review candidates. They must not be bulk-deleted.

## Coverage and evidence

164 handwritten JS/TS source files were parsed, covering 1,262 function/method/callback definitions and 56 explicit loops. Generated Prisma runtimes were excluded. A tracked-code reference search also covered scripts and tests to distinguish runtime-unused code from maintenance tooling. This is static inventory plus targeted review, not exhaustive execution of every branch of every function.

The actual Express route stack supplied 102 registered method/path combinations, including dynamic document routes. Every one received an anonymous loopback request. 97 non-auth business routes additionally received an ephemeral ADMIN identity with database operations replaced by a rejecting stub; empty-body validation often prevented reaching downstream code. Production environment mode was used, `.env` loading was disabled, and no real database writes or live stress tests were performed. Implicit HEAD/OPTIONS are not counted in the 102.

- [Every endpoint and probe result](ENDPOINTS.md), [machine-readable endpoint matrix](endpoints.csv)
- [Cleanup list with every unused binding](CLEANUP.md), [binding CSV](unused-bindings.csv), [export candidates](export-review.csv)
- [Every inventoried function/callback](functions.csv), [explicit loops](loops.csv), [database query candidates](queries.csv)
- [Anonymous results](anonymous-route-probes.json), [authenticated failure results](authenticated-failure-probes.json), [isolated reproductions](reproductions.json)
- [Configured frontend lint results](frontend-lint.json)

## New findings

### H1 — Concurrent identical idempotency keys are not reserved

`backend/src/middleware/idempotencyMiddleware.js:24–62`: the middleware checks a key, then calls `next()`. It inserts the key only after the handler sends JSON, asynchronously and outside the business transaction. Two simultaneous requests see no key and both run. The isolated reproduction observed both entering the mutation. A unique constraint on the eventual key row cannot undo the second financial transaction. Requests without keys also proceed, and there is no request-body fingerprint for changed payloads using the same key.

**Affected:** mutations using this middleware, including expenses, allocations, fund requests, customer/property payments, billing and wallet changes. Treasury inflow is not wired to this middleware at all.

**Fix:** atomically reserve a user/endpoint/key plus payload hash before mutation; commit the business write and completed result with the reservation; handle pending requests and unknown commit outcomes. Require keys on retry-sensitive financial operations. Test concurrent duplicates against PostgreSQL.

### H2 — Financial read/check/write races can corrupt balances

Source findings, not reproduced against a live database:

- `expenseController.js:67–79`: checks wallet balance before an unconditional decrement. Concurrent requests can both pass the check.
- `expenseController.js:165–204`: checks reversal status before the transaction, then updates by ID and increments the wallet. Two reversal requests can both refund the same expense.
- `fundRequestController.js:109–122`: reads PENDING status without locking/atomic status transition. Concurrent approval/rejection and repeated approvals are not serialized by the business record.
- `customerController.js:643–660,756–765`: reads the customer before the transaction, then writes absolute totals from that stale object. Concurrent payments can lose a customer balance update while both treasury credits exist.
- `propertyController.js:345–355,412–420`: treasury and property balances are checked/read before transactional writes, with the same race class.

The checked-in schema does not show a unique business constraint preventing repeated expense reversal, or a nonnegative-wallet CHECK. Production may have additional constraints that were not inspected. Transactions alone do not repair stale reads. Use row locks/conditional updates, atomic status transitions, and database constraints; repeat these cases with separate concurrent connections on a disposable PostgreSQL database.

### H3 — Fund approval is based on a caller-selected manager, not approval permission

`fundRequestController.js:11–31` accepts any existing user ID as `managerId`, including self; it does not validate an active manager role or reject self-assignment. `fundRequestRoutes.js:15–16` only authenticates approve/reject, and `fundRequestController.js:120` accepts a matching manager ID without requiring `fund.approve`. A non-manager selected by the requester can approve/reject. Self-directed requests can also generate meaningless transfer records. The isolated stub reproduction confirms self-manager requests reach creation; real transfer effects need database regression tests.

**Fix:** validate eligible active manager and reject self-assignment when creating; require current approval/rejection permission as well as ownership at decision time. Use atomic status transitions.

### M1 — Malformed values are accepted as successful records

Confirmed with isolated controller stubs (no real data created):

- `noteController.js:155–176`: `amount: "garbage"` becomes 0, invalid dates become today, and an arbitrary category is accepted. Response is 201.
- `fundRequestController.js:11–31`: `amount: "100garbage"` becomes 100; whitespace reason is accepted; invalid fund mode becomes LIQUID. Response is 201.
- Other finance controllers use permissive `parseFloat` and `isNaN` rather than strict finite-number validation. This accepts numeric prefixes and does not reliably reject Infinity; database rejection is not request validation.
- Several `.trim()`, `.toUpperCase()` and destructuring operations assume input types. Arrays/objects or missing bodies can become 500s instead of 400s.
- Customer/employee status and operational-note categories are strings without consistent allowed-value checks in update paths.

**Fix:** validate request body/query/params per route: types, trimmed minimum/maximum lengths, finite decimal money and precision, enum values, real dates, UUIDs and referenced-record eligibility. Reject bad input before Prisma. Preserve zero only where zero is valid; do not silently substitute today's date or a different payment mode.

### M2 — Internal errors leak through controller catch blocks

28 authenticated route probes exposed `AUDIT_DATABASE_BLOCKED` in response JSON. See the endpoint matrix for exact routes. Examples include notes, billing, employee salary endpoints, accounting periods, and several financial mutations. Controllers often return `error.message` or `error: error.message` directly, bypassing the central error middleware. Real Prisma errors may include internal query/schema details.

**Fix:** use safe operational errors for expected 4xx conditions and generic 5xx responses with a correlation ID; log detail server-side. Do not suppress useful validation errors by turning everything into 500.

### M3 — Login and central error-handling gaps

- `authController.js:25`: accesses `req.body.email` before its try/catch. A bodyless login produced a 500; Express 5 caught the rejection so the process survived.
- Wrong-type login email reached the mocked database instead of being rejected as 400.
- `errorMiddleware.js:18,34`: lacks a `res.headersSent` guard and status-code validation, and only checks `err.statusCode` rather than consistently accepting normalized error status. A late error after a response can trigger another headers error.
- `app.js:205–211`: uncaught exceptions/rejections are logged and the process continues. Logging is not a safe recovery strategy after an unknown fatal state; use controlled shutdown/restart with in-flight handling.
- Missing API routes return Express's HTML 404 instead of the JSON API contract.

Positive checks: malformed JSON returned 400 and an oversized body returned 413. Those cases did not crash the loopback app.

### M4 — Error traffic bypasses the global API limiter

`app.js:68–94`: parsers and sanitizer execute before the API rate limiter. Malformed/oversized JSON errors go straight to the error handler, before the limiter. The error handler logs full stacks. Repeated unauthenticated malformed requests can consume parsing/log resources without this limiter's accounting. No production flooding was attempted.

**Fix:** apply an inexpensive limiter before body parsing, retain body limits, and avoid unbounded stack logging for expected parser errors. Edge/server limits are additional controls, not verified here.

### M5 — Large reads and loops can exhaust resources as data grows

44 `findMany` calls have no literal `take` bound in the inspected call. Not all are bugs: fixed configuration tables, ID-list-bounded document queries and intended reports need separate treatment. The full list is in queries.csv.

Higher-risk examples: transaction/user lists, all notes used for stats, customer/property portfolio summaries, employee-code generation scanning all employees, and `customerLedgerService.js:242–258`, which fetches every active customer then runs a ledger query per customer. Payment plans accept arbitrarily many milestones within the 1 MB body limit and create them sequentially. The exported financial mutation limiter is never wired into the route handlers.

**Fix:** cap page sizes and array lengths, use database aggregate/groupBy operations, replace per-row query loops with batched queries, add an atomic employee sequence and a dedicated limiter/concurrency budget for expensive actions. No literal `while(true)` or self-growing application loop was found. S3 listing relies on provider continuation tokens and has no repeated-token/page cap; this is principally a maintenance/provider-failure concern, not an anonymous endpoint exploit.

### M6 — Idempotency records have no application retention job

The middleware stores full response bodies with an expiry but does not delete them. Expired keys yield 409 indefinitely. Searches found only test/reset deletion, not a production expiry cleanup task. Successful or 4xx requests with fresh keys can grow the table and retain response data past its intended replay window.

**Fix:** add an indexed bounded retention job and explicitly define expiry/reuse semantics. Confirm any externally scheduled cleanup before concluding production is accumulating indefinitely.

### M7 — Session lifecycle is incomplete

`app.js:79` uses express-session MemoryStore in production. It is process-local, loses refresh sessions on restart, and does not support multiple instances consistently. `authController.js:272` clears `connect.sid`, but the configured cookie is `estatesync_sid`. Frontend login does not send cross-origin credentials; the frontend proxy does not forward Cookie/Set-Cookie. These paths cannot reliably maintain the session required by refresh. Password-reset token revocation remains an earlier high-priority finding.

**Fix:** choose one coherent session/refresh design, use a production session store if retaining server sessions, use the exact cookie name, and align credential/cookie handling with the selected deployment origins.

### M8 — Ignored fields and swallowed errors hide failures

- `treasuryController.js:22`: accepted transactionDate is unused, so user-selected transaction dates are not honored by this handler.
- `utils/auditLogger.js:35–39`: returns null on audit failure. Most callers ignore the result and can report success without a recorded audit event for application-level logging failures. PostgreSQL transaction-abort behavior may roll back database errors inside a transaction; do not assume every failure mode commits. Document audit correctly rejects a null result.
- `utils/accountingHelper.js:106`: swallows a NOWAIT lock error and tries to continue with stale period state. In PostgreSQL this can leave the transaction aborted, causing later opaque errors; it is not proof a closed-period write can commit. Return an explicit retry/conflict instead.
- Standard-account initialization runs on module import and catches failure, allowing the server to listen before accounting prerequisites are ready.
- `notificationController.js` catches individual database-query failures and continues. The fault probe received HTTP 200 even while notification queries failed, so users can see an apparently successful empty/partial notification result during an outage. Return an explicit degraded status or error rather than silently representing unavailable data as no notifications.

### M9 — Frontend requests can hang or misreport malformed responses

`services/apiClient.js:74` and `utils/fetcher.js:13` have no request timeout. Both return never-settling promises after auth redirects. These are not CPU loops, but caller `finally` blocks cannot complete if navigation does not happen. `apiClient.js:83–84` treats a non-JSON HTTP 200 as success instead of rejecting an invalid API response. The fetcher parses JSON before checking HTTP status, so an HTML error loses status-specific handling. The backend proxy does have a timeout.

**Fix:** use abort/time limits, reject typed auth errors after initiating navigation, validate JSON response shape, and make loading cleanup run. Handle storage access failures in auth paths. SWR disables error retries globally; no automatic infinite retry storm was found. Existing periodic refresh intervals are intentional. Lint found effect/dependency warnings; these do not by themselves prove an infinite render loop.

### Conditional exposure — Diagnostics and frontend proxy

`/test-post` and `/test-db` are mounted whenever NODE_ENV is not exactly production. They were absent (404) in the production-mode probe. Set NODE_ENV=production on deployed services. `/test-db` is unauthenticated outside that mode, sits outside `/api/` limiting, and allocates a new pool per request without finally cleanup on failure.

The frontend `/api/[...path]` proxy is publicly callable and forwards to a configured backend. It does not itself authenticate; backend gates remain essential. It forwards no client IP, so proxied clients may share the backend's IP rate-limit bucket. Arbitrary-host SSRF was not demonstrated: the backend base URL is configuration, not directly supplied by the client. No public upload/storage directory or public admin creation route was found.

## Earlier findings still open

1. Customer update lacks sales-owner authorization (`customerController.js:270`).
2. Billing payment permission uses OR with customer.edit (`customerBillingRoutes.js:62`).
3. Billing statements/demand listing lack ownership filtering (`customerBillingController.js:104,154`).
4. Password changes/resets do not invalidate existing access/refresh credentials (`userController.js:215`, `authController.js:354`, `authMiddleware.js:26`).
5. User-directory APIs expose wallet balances to any authenticated user (`userRoutes.js:13–16`, `userController.js:60`).

## Cleanup and function-level conclusions

See CLEANUP.md for every candidate, line number, and treatment. 26 files contain only comments and are not imported by the application. The probe disallowed loading them and startup/routes still passed, supporting removal from the current runtime. References remain in scaffolding/design documents and must be considered.

116 distinct unused bindings include harmless icon imports, deliberately unused positional callback parameters, and missing behavior. Do not remove Express error middleware's fourth argument. Do not delete awaited database writes just because their return value is unused. Do not delete hooks blindly. The no-op invalidateUserAuthCache needs coordinated import/call removal rather than deleting just the export.

Exports with no cross-file references include salary journal helpers, formatNumberINR and permission convenience helpers; internal references and intended future payroll features must be reviewed. Internally called helpers such as generateNextDemandNumber and validateSubmission must remain even if their exports can be narrowed. Financial rate limiting should be activated, not removed as dead code. Permission-sync, reset, backup and repair scripts are operational tools, not safe deletion candidates solely because the app does not import them.

## Checks completed and limitations

- Backend security tests: **6/6 passed**.
- Backend document unit tests: **35/35 passed**.
- All 102 registered route combinations probed anonymously; 98 protected routes returned 401. Refresh also returns 401 with no token, giving 99 total anonymous 401 responses.
- 97 synthetic authenticated business-route failure/empty-body probes completed: 70 HTTP 500, 25 HTTP 400, 2 HTTP 200. Search returned early for an empty query; notifications swallowed individual database failures. Neither is an authorization bypass, but the notification behavior masks an outage.
- 28 internal-error disclosures observed in that failure probe.
- Three isolated in-memory reproductions passed, demonstrating the defects described above.
- Frontend configured lint: 130 messages, recorded in full. These include existing unused imports, hook warnings and JSX style issues; not all are security defects.
- Frontend tests could not run: Vitest is declared but missing from installed node_modules. No packages were installed or lockfiles changed by the audit.
- No real-database workflow/concurrency test, frontend production build, exhaustive role/action matrix, load test or production-environment configuration inspection was performed. The default backend npm test script creates and cleans database records, so it was not run against an unknown DATABASE_URL.

No audit can guarantee that every input or future deletion is crash-free. The findings and cleanup candidates here are backed by the stated source checks and local probes; broader integration checks remain necessary before applying changes.

## Recommended repair order

1. Ownership/payment/fund-approval authorization and password-reset revocation.
2. Atomic idempotency and financial concurrency tests/fixes on isolated PostgreSQL.
3. Strict validation, safe error responses, early rate limiting and session handling.
4. Pagination/aggregation, retention jobs and UI request completion.
5. Separate cleanup commit for comment-only files and reviewed unused imports, followed by restored frontend test/build verification.

## Reproduce safely

From the repository root, run these in order. They use installed parser/lint packages and loopback/in-memory stubs; the route/reproduction tools do not use real database credentials:

```text
node docs/qa/security-audit-2026-10-04.cjs
node docs/qa/security-route-probe-2026-10-04.cjs
node docs/qa/security-reproductions-2026-10-04.cjs
node docs/qa/security-report-2026-10-04.cjs
```
