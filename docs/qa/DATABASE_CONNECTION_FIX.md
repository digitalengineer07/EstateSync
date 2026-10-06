# Neon connection and session handling

The supplied log reports Prisma `P1001` (database unreachable during connection) and subsequent connection-pool timeouts. The `Invalid ... invocation` prefix does not establish a malformed query or missing table.

Read-only checks against the configured database succeeded using PostgreSQL directly. A Prisma connection using the default timeout failed; a test with `connect_timeout=15` completed in 12.4 seconds. After applying the runtime defaults, another Prisma `SELECT 1` completed in 3.5 seconds. These observations indicate intermittent connection latency; they do not prove whether compute activation or network conditions caused it. [Neon's Prisma guidance](https://neon.com/blog/prisma-dx-improvements) describes extending the connection timeout when activation exceeds Prisma's default.

Changes:

- Neon URLs default to `connect_timeout=15`, `pool_timeout=20`, and `connection_limit=5`. Explicit settings, credentials and TLS parameters are retained. Local databases retain the previous connection/pool defaults. No `.env` credentials or database host were changed.
- Refresh-session middleware now runs only on `/api/v1/auth`. Other APIs continue to verify bearer tokens and current database permissions, without unnecessary `AuthSession` reads/touches for cookies sent by the browser.
- Session middleware errors and auth/dashboard connectivity failures return safe HTTP 503 responses with `Retry-After: 5`. A database outage during refresh is no longer reported as an invalid refresh token. No automatic financial-write retries or in-memory session fallback were introduced.

Validation: 10 unit/security tests and 13 isolated PostgreSQL integration tests passed. Coverage includes real login/refresh/logout, concurrent refresh protection, cookie-only authentication rejection, no session accesses on business requests, and simulated session-store outages. Production database checks were read-only.

Restart the backend process to pick up these changes. No environment edit is necessary for the inspected URL. If a deployment explicitly supplies lower timeouts, adjust those values intentionally; the application does not override explicit settings. An actual database/network outage still requires connectivity to recover.
