# EstateSync Payroll System — Phase 4: RBAC & Security Governance

## 1. Phase 4 Permission Matrix

| Permission Code | Description | Admin | Accounting | Manager | Sales | Marketing | Other |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `payroll.accounting.view` | View GL posting previews and posting links | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `payroll.accounting.post` | Post locked payroll runs to General Ledger | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `payroll.accounting.reverse` | Reverse posted payroll journals in GL | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

## 2. Role-Based Capabilities

- **ADMIN (`admin@estatesync.local`)**:
  - Full visibility into posting preview and accounting links.
  - Authority to post locked runs to the General Ledger.
  - Exclusive authority to execute general ledger reversals.
- **ACCOUNTING (`accounting@estatesync.local`)**:
  - Authority to preview compound journal lines.
  - Authority to execute payroll postings to the General Ledger.
  - Reversal is blocked (`HTTP 403 Forbidden`) to enforce segregation of financial controls.
- **MANAGER (`manager@estatesync.local`)**:
  - Read-only visibility into posting preview and accounting links.
  - Posting and reversal blocked (`HTTP 403 Forbidden`).
- **SALES / MARKETING / OTHER**:
  - Completely blocked from all payroll accounting endpoints (`HTTP 403 Forbidden`).

## 3. Idempotency Protection
All state-mutating endpoints (`POST /post-to-ledger` and `POST /reverse-ledger-posting`) are wrapped in `idempotencyMiddleware` using the unique `Idempotency-Key` header, safeguarding against accidental duplicate submissions over unstable network connections.
