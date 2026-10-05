# Security fixes and verification

Updated 5 October 2026 on `new-features-branch`. Changes are local; no production deployment or production database changes were performed. The October 4 audit directory is the historical baseline, not the current status.

## Implemented

- Enforced customer ownership for customer edits and billing access; payment recording requires its dedicated permission. Fund requests require an eligible, active manager and approval/rejection permissions. Restricted directory wallet details to authorized finance roles.
- Password changes invalidate previously issued access and refresh tokens. Refresh tokens rotate with a database compare-and-set so simultaneous reuse cannot succeed twice. Login regenerates sessions; sessions persist in PostgreSQL; logout clears the configured cookie. Browser requests and the frontend proxy carry session cookies.
- Business HTTP mutations execute under a PostgreSQL transaction and cross-process advisory lock, including reads performed before legacy nested transactions. Rejected responses roll back. Request and database time limits prevent indefinite mutation waits; late controller responses are discarded.
- Idempotency reservations and completed responses commit with business changes. Keys are bound to user, endpoint and payload; conflicting reuse is rejected. Treasury inflows participate. The frontend supplies keys and retains them for uncertain retries.
- Added validation for financial values, dates, common text fields, enumerations, structured input and pagination. Missing expense categories now return 400 before writes. Added safe JSON errors, API 404 responses, early rate limiting and financial mutation limits.
- Audit failures abort business transactions. Accounting prerequisites initialize during startup preparation. Period lock failures surface as conflicts. Notification query failures return an error instead of incomplete success. Treasury posting honors the selected transaction date.
- Replaced note-statistics and customer-reconciliation full-row/N+1 calculations with database aggregation. Bounded S3 pagination, expired-session/idempotency cleanup, and frontend request waits. Removed never-settling auth-error promises and successful treatment of malformed JSON.
- Removed 26 comment-only placeholder files and 53 verified unused frontend import bindings. Retained operational scripts, generated clients and potentially useful exports. Prevented setup from overwriting an existing backend package file.

## Verification

All database workflow tests used disposable local PostgreSQL databases, not the configured deployment database.

- Backend security unit tests: 6 passed.
- Security integration tests: 11 passed, including ownership, malformed values, concurrent overspending, duplicate requests, double reversal, password revocation, persistent sessions and concurrent refresh replay.
- Document unit/integration tests: 63 passed.
- Existing financial CI validation suite: passed, covering valid and invalid property, customer, payment, expense and fund-request workflows.
- Frontend document/auth tests: 12 passed.
- Frontend production build: passed (see `security-fix-build.log`).

Commands: `npm run test:security` in backend; `node scripts/test_documents_local.js --security` and `--regression` in backend with `DOCUMENT_TEST_POSTGRES_BIN` pointing to local PostgreSQL binaries; `npm run test:documents` and `npm run build` in frontend.

## Deployment requirements and deliberate tradeoffs

1. Generate the Prisma client on install. Start the backend with `npm start`; its `prestart` applies the additive `AuthSession` table/index upgrade and ensures standard accounts. If deployment starts `node src/app.js` directly, run `node scripts/upgrade_security_schema.js` first. The database role must have permission for this additive schema upgrade.
2. Existing tokens do not contain the new password-version claim: users must sign in again after deployment. Password, role and ownership rules intentionally reject requests previously accepted incorrectly.
3. All business HTTP writes share one advisory lock. This favors financial correctness but reduces simultaneous write throughput; lock contention returns a retryable failure. Maintenance scripts outside this HTTP path must coordinate separately.
4. Idempotency keys remain optional for backward-compatible external clients. The frontend supplies them, but external clients must reuse the same key when retrying uncertain mutations.
5. Configure production mode, exact frontend CORS origin, strong distinct signing secrets and HTTPS cookies. Browser third-party-cookie restrictions may still require a same-origin proxy or shared-site deployment for cross-site refresh.

## Remaining limits

This is not proof that every possible input or every role/action combination is correct. Full-table exports and several legacy list/report queries remain because silently limiting them would change totals or omit records. Large-data pagination needs coordinated UI/API work. Frontend fetch timeouts cover receiving response headers; streaming body stalls are not separately bounded. Proxied clients may share an IP rate-limit bucket. Existing lint/hook warnings and unreferenced-export candidates require feature-specific review, not blind deletion. No production load test or exhaustive browser-device test was performed.

The pre-existing backend lockfile change was preserved. Historical audit probe scripts describe the pre-fix implementation and are not the post-fix regression suite.
