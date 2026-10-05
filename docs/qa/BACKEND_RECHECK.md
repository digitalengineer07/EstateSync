# Backend recheck — 5 October 2026

## Reported failure and repair

The configured database lacked `AuthSession`. Login session regeneration, persistence and scheduled cleanup therefore failed with Prisma P2021. The previous upgrade was attached only to `npm start`; `npm run dev` and direct execution could skip it.

All application entry paths now await the same additive schema upgrade and standard-account initialization before opening the listener or starting retention. Startup failure prevents the application from accepting requests. The explicit upgrade command still works and uses the same implementation. No tables are dropped or existing records reset.

Applied the additive session-table/index upgrade to the configured database. A subsequent read-only schema audit confirmed all 45 Prisma models and scalar columns exist. Restart the running backend to load the startup fix. The table repair itself is already applied.

## Checks completed

- 103 backend source files passed JavaScript syntax checks.
- 6 security unit tests passed.
- 12 security integration tests passed on isolated PostgreSQL, including an initial database without `AuthSession`, login/refresh, concurrent token replay, ownership, balance concurrency, duplicate financial requests, reversal, repeated schema upgrades and session retention.
- 63 document unit/integration tests passed.
- The existing financial CI workflow suite passed on isolated PostgreSQL.
- Configured database: all 45 model tables and scalar columns present.

Evidence: `backend-recheck-security.log`, `backend-recheck-workflows.log`, and `backend-recheck-schema.log` in this directory.

Business workflow fixtures were created only in disposable PostgreSQL clusters. The configured database received only the additive security schema upgrade and read-only schema inspection. Database column/table parity does not prove every index, constraint, external storage integration or production workload is correct. No exhaustive live role/action test, email/storage-provider test or production load test was performed.

The earlier SECURITY_FIXES deployment note requiring a separate upgrade for direct Node starts is superseded: the app now performs this initialization itself. The database role must still be allowed to create the additive table/indexes.
