# EstateSync — System Architecture

## 1. Current Phase Scope

This phase covers a single web frontend connected to a single backend API — no Electron packaging, no offline sync yet. Those are later phases, described at the end of this document.

```
┌───────────────────────┐         ┌───────────────────────┐
│   Next.js Frontend      │  HTTP   │   Node/Express API       │
│   (React, single         │ ──────► │   /api/v1/...              │
│   build, role-aware       │ ◄────── │                            │
│   rendering)               │  JSON   │                            │
└───────────────────────┘         └────────────┬──────────┘
                                                        │
                                  ┌────────────────┴─────────────────┐
                                  │                                    │
                           ┌─────────────┐                  ┌─────────────┐
                           │ PostgreSQL   │                  │ Redis        │
                           │ (all data)   │                  │ (sessions,   │
                           │              │                  │ rate limits, │
                           │              │                  │ idempotency) │
                           └─────────────┘                  └─────────────┘
```

## 2. Component Responsibilities

| Component | Responsibility |
|---|---|
| Next.js Frontend | Login UI, role-aware dashboard rendering, calls API over HTTP, stores JWT, never enforces security itself |
| Node/Express API | All business logic, RBAC enforcement, transaction handling, validation, accounting posting, notification triggering |
| PostgreSQL | Single source of truth — users/roles/permissions, CRM, property inventory, bookings, payments, accounting ledger, audit logs |
| Redis | Session/refresh-token store, rate-limit counters, idempotency keys for payment/critical endpoints |

**Golden rule:** the frontend is a rendering and input layer only. Every permission check, validation rule, and financial invariant is enforced server-side, regardless of what the UI shows or hides.

## 3. Authentication & Role-Based Access

Single identical frontend build for all roles (Admin, Manager, Sales, Marketing, Accounting, Operations, Viewer). Role differentiation happens at runtime via the JWT, not via separate builds.

```
1. POST /auth/login { username, password }
2. Server verifies bcrypt password hash
3. Server returns:
     - access token (JWT, short-lived, ~10-15 min)
     - refresh token (stored server-side in Postgres/Redis, revocable)
     - user profile + resolved permission list
4. Frontend stores tokens, redirects to role-appropriate dashboard
5. Frontend reads permissions from the JWT/profile to conditionally render:
     Sales        -> leads, visits, bookings
     Accounting   -> payments, expenses, ledger
     Manager      -> approvals, reports, oversight
     Operations   -> documents, inventory support
6. Access token expires -> frontend silently calls /auth/refresh
7. Logout -> frontend clears tokens, server invalidates refresh token
```

Every protected API route runs through this middleware chain:

```
verifyJWT -> checkPermission('resource.action') -> rateLimiter -> controller
```

Permission checks use atomic permission codes (e.g. `booking.create`, `payment.create`, `expense.approve`) mapped through roles — never hard-coded role-name checks like `if (role === 'admin')`.

## 4. Core Transaction Integrity Rules

These are non-negotiable regardless of phase, since they protect against double-booking and broken financial records:

- **Booking / inventory**: `SELECT unit FOR UPDATE` row lock at booking time, plus a unique partial index enforcing one active (non-cancelled) booking per unit.
- **Payments**: payment insert, allocation, journal entry, and outbox event are committed in a single atomic database transaction — all succeed or all roll back together. Idempotency keys (Redis) prevent duplicate submissions on retry.
- **Accounting**: every journal entry must have debit = credit before it can become `POSTED`. Corrections happen through reversal entries only — never edits or deletes of posted records.
- **Notifications**: SMS/email are never called inside the core database transaction. A `notification_outbox` row is written in the same transaction as the business event; a background worker sends the actual SMS/email asynchronously, so a provider outage can never block or roll back a payment.

## 5. Security Controls

| Layer | Control |
|---|---|
| Passwords | bcrypt, cost factor 12+ |
| Auth tokens | Short-lived JWT access token + revocable, server-tracked refresh token |
| RBAC | Permission codes checked on every endpoint, not role-name string checks |
| Rate limiting | Redis-backed (`rate-limiter-flexible`); strict on login/reset endpoints, moderate elsewhere |
| Concurrency | Postgres row-level locks (`FOR UPDATE`) + unique constraints |
| Idempotency | Redis-stored idempotency keys on payment and other critical POST endpoints |
| Audit | Every sensitive mutation logged in the same transaction as the action, capturing actor, before/after values, timestamp |
| Input validation | Enforced server-side on every endpoint regardless of frontend validation |
| Secrets | Environment variables / secret manager on the server only — never shipped to any client |
| Documents | Virus scan before processing, SHA-256 checksum stored, versioned metadata |
| Webhooks (Twilio, future payment gateways) | Signature verification, timestamp check, replay-window protection |

## 6. Build Order (this phase)

1. **Postgres schema** — Identity & RBAC tables first: `users`, `roles`, `permissions`, `role_permissions`, `user_roles`; seed the Admin role.
2. **Auth endpoints** — login, refresh, logout; JWT verification middleware; permission-check middleware.
3. **Frontend login + role-aware shell** — dashboard that renders differently based on the logged-in user's permissions.
4. **First functional module** — Leads/CRM (no financial risk, simplest full-stack proof point).
5. Expand outward following the phase order: Property/Inventory -> Booking -> Payments/Collections -> Office Expenses -> Accounting -> Notifications -> Reports.

## 7. Deferred to Later Phases

| Feature | Planned phase |
|---|---|
| Electron desktop packaging (single `.exe`, same build for every role) | After the web frontend + API are fully functional |
| Local encrypted session caching (Electron `safeStorage`) with offline grace period | Same phase as Electron packaging |
| Offline approval queue (Manager decisions on existing approval requests only, synced on reconnect with staleness/version checks) | After Electron shell is working |
| On-premise deployment topology (single office server running Postgres + Redis + API; identical Electron client on every PC over LAN) | After Electron packaging |
| OCR pipeline for KYC/expense documents | Once document upload endpoints exist |
| Twilio SMS + email notification integration | Once the payment flow is working end-to-end |

## 8. Explicit Non-Goals (for this phase)

- No offline support of any kind yet — every action requires a live connection to the API.
- No desktop packaging yet — the frontend runs as a standard web app in a browser.
- Booking and payment creation will never be made offline-capable even in later phases, since they depend on live Postgres row-locking and real-time balance/idempotency checks that cannot be safely replicated on a disconnected client.
