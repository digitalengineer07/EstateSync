# EstateSync — Tech Stack

## 1. Current Phase

Single Next.js frontend + single Node/Express backend API, connected over HTTP. No Electron packaging or offline sync in this phase.

## 2. Frontend

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js (React) | Single build, role-aware rendering based on permissions returned from the backend |
| Auth token storage | JWT access token in memory; refresh token handled via secure storage | UI never enforces security — permission checks here are for showing/hiding views only |
| API communication | HTTP/JSON via `fetch`/`axios` | All requests include `Authorization: Bearer <token>` |

## 3. Backend

| Concern | Choice | Notes |
|---|---|---|
| Runtime | Node.js | |
| API framework | Express (or Next.js API routes) | Versioned REST API, `/api/v1/...` |
| Auth | JWT (access token, short-lived) + refresh tokens | Refresh tokens stored server-side (Postgres/Redis) so they are individually revocable |
| Password hashing | bcrypt | Cost factor 12+ |
| Middleware chain | `verifyJWT -> checkPermission('resource.action') -> rateLimiter -> controller` | Applied to every protected route |
| RBAC | Atomic permission codes (e.g. `booking.create`, `payment.create`, `expense.approve`) mapped through roles | Never hard-coded role-name checks |

## 4. Database

| Concern | Choice | Notes |
|---|---|---|
| Primary database | PostgreSQL | Single source of truth for all business data |
| Money fields | `DECIMAL(15,2)` | Never `FLOAT`/`DOUBLE` for monetary values |
| Timestamps | UTC (`DATETIME(6)`/`TIMESTAMP`), converted to local timezone at the UI/reporting layer | |
| IDs | `BIGINT UNSIGNED` auto-increment primary key + public UUID/ULID for external references | |
| Concurrency control | Row-level locks (`SELECT ... FOR UPDATE`) + unique partial indexes | Used at booking/hold time to prevent double-booking |
| Financial record handling | Immutable once posted; corrections via reversal entries, never edits/deletes | |

## 5. Cache & Queue

| Concern | Choice | Notes |
|---|---|---|
| In-memory store | Redis | Used for: session/refresh-token storage (revocable), rate-limit counters, idempotency keys on critical POST endpoints (e.g. payments) |

## 6. Rate Limiting

| Concern | Choice | Notes |
|---|---|---|
| Library | `rate-limiter-flexible` | Backed by Redis, not in-memory, so limits hold across restarts and (later) across processes |
| Policy | Tiered | Strict on `/auth/login`, `/auth/reset-password`; moderate on general API; minimal on read-only authenticated report endpoints |

## 7. Notifications (planned, later phase)

| Concern | Choice | Notes |
|---|---|---|
| SMS/Email provider | Twilio (SMS) + SMTP (email) | Triggered only via an async outbox worker, never inside the core database transaction, so provider downtime cannot block or roll back a payment |
| Delivery pattern | Transactional outbox (`notification_outbox` + `notification_deliveries`) | Retry with exponential backoff; permanent failures move to a dead-letter state for review |
| Webhook handling | Signature + timestamp + replay-window verification | Applies to any inbound Twilio or future payment gateway webhook |

## 8. Documents & OCR (planned, later phase)

| Concern | Choice | Notes |
|---|---|---|
| File storage | Metadata in PostgreSQL, actual files in local file/object storage | SHA-256 checksum stored per file; versioned for mutable documents like agreements |
| Malware scanning | Virus scan on upload, before OCR/processing | |
| OCR | Local Tesseract (fully offline) or an external vision API for structured extraction | Choice depends on whether occasional outbound calls for document processing are acceptable |

## 9. Security Summary

| Concern | Choice |
|---|---|
| Transport | HTTPS |
| Password hashing | bcrypt, cost 12+ |
| Auth | JWT (short-lived) + revocable server-tracked refresh tokens |
| Authorization | Permission-code based RBAC, enforced server-side on every endpoint |
| Rate limiting | Redis-backed, tiered by endpoint sensitivity |
| Concurrency safety | Postgres row locks + unique constraints |
| Idempotency | Redis-stored idempotency keys on critical write endpoints |
| Audit trail | Every sensitive mutation logged in the same transaction as the action |
| Secrets management | Environment variables / secret manager on the server only |

## 10. Deferred Stack Additions (later phases)

| Addition | Purpose |
|---|---|
| Electron + electron-builder | Package the single frontend build into one identical desktop `.exe` for every role |
| Electron `safeStorage` API | OS-level encrypted local session caching for offline grace-period login |
| SQLite (embedded) or local JSON store | Local queue for offline-capable actions only (e.g. Manager approval decisions), synced on reconnect |
| Memurai (Redis-compatible for Windows) | Native Windows Redis equivalent, if/when deploying Redis on a Windows office server |
| Process manager (`pm2` or `node-windows`) | Keep the Node API running as an auto-restarting Windows service on the on-premise server |
| WireGuard VPN | Secure remote access into the office LAN, if ever required, instead of exposing the API directly to the internet |
