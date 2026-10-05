# EstateSync — Integration & Forward-Compatibility Plan

## 1. Purpose

You are building the **Fund Management & Accounting (Wallet) system** first. The **original EstateSync spec** — Property CRM + Booking + Collections + full accounting — is not being built yet, but must be addable later **without re-architecting what you build now**.

This document defines what to build in a shared, reusable way today, so the two systems merge cleanly instead of becoming two competing backends later.

## 2. The Core Insight

Both systems ultimately produce the same three things:
- A **user acting under a role** (RBAC)
- **Money moving** and being recorded (ledger)
- An **audit trail** of who did what

If you build these three foundations generically now, the CRM/booking phase later becomes "add new modules that plug into the existing foundation" rather than "build a second backend and reconcile two databases."

```
                SHARED FOUNDATION (build now, reused by everything later)
        ┌─────────────────────────────────────────────────────┐
        │  Identity & RBAC   │   Ledger/Accounting Core   │  Audit  │
        └─────────────────────────────────────────────────────┘
                    │                        │                  │
        ┌───────────┴──────┐    ┌───────────┴──────┐           │
        ▼                   ▼    ▼                   ▼           ▼
   Fund/Wallet Module   (built now)          Property/CRM/Booking Module (later)
```

## 3. What to Build Generically NOW (so it survives into the CRM phase)

### 3.1 Identity & RBAC — build role-agnostic, not wallet-specific

Do **not** hardcode the six wallet roles (Admin/Manager/Sales/Marketing/Accounting/Other) as if they're the only roles that will ever exist. Build:

- `users`, `roles`, `permissions`, `role_permissions`, `user_roles` exactly as planned — these are already generic.
- Permission codes namespaced by module: `fund.allocate`, `wallet.view`, `expense.create` now; leave room for `booking.create`, `lead.assign`, `unit.hold` later — same tables, just more rows.
- A role like "Sales" in the wallet system and "Sales" in the future CRM system should be **the same role row**, not two separate concepts — a salesperson requesting travel funds and a salesperson creating a lead is the same person, same login, same role.

**Action now:** design the `roles`/`permissions` seed data with module prefixes from day one (`fund.*`, `wallet.*`, `expense.*`) even though only those exist today — this signals the pattern for `crm.*`, `booking.*`, `property.*` later without needing a schema change.

### 3.2 Accounting Core — build the ledger generic, not wallet-only

This is the most important decision. Your wallet system already needs `chart_of_accounts`, `journal_entries`, `journal_lines`. The original CRM spec needs the exact same three tables for customer payments and office expenses.

**Build one shared accounting core now:**

```
chart_of_accounts   — account master (Assets, Liabilities, Income, Expenses, Equity)
journal_entries     — transaction header (date, description, status, posted_by)
journal_lines       — debit/credit lines, each referencing an account
```

Every journal entry should carry a **generic polymorphic reference** back to whatever business event caused it:

```
journal_entries
  ...
  reference_type   VARCHAR   -- e.g. 'WALLET_TRANSACTION', 'BOOKING_PAYMENT', 'OFFICE_EXPENSE'
  reference_id     BIGINT    -- the ID of that specific record
```

This means:
- Today: `reference_type = 'WALLET_TRANSACTION'`, pointing at a `wallet_transactions` row.
- Later: `reference_type = 'BOOKING_PAYMENT'` or `'OFFICE_EXPENSE'`, pointing at a `payments` or `expenses` row from the CRM module.

**One ledger, many sources feeding it.** You never need to migrate or merge two separate accounting systems later — the CRM module just starts writing to the same `journal_entries` table using its own `reference_type`.

### 3.3 Audit Logging — build once, reuse everywhere

`audit_logs` should already be generic: `actor_id`, `action`, `entity_type`, `entity_id`, `before_value`, `after_value`, `reason`, `ip_address`, `created_at`. Don't build a wallet-specific audit table — every future module (bookings, leads, approvals) writes to this same table with its own `entity_type`.

### 3.4 Approval Framework — design once, reuse for both fund and business approvals

Your fund-request approval chain (Sales → Manager → Admin) and the original spec's approval matrix (booking discounts, refunds, expense thresholds, journal adjustments) are the **same underlying pattern**: maker-checker with configurable thresholds.

**Build a generic `approval_requests` table now**, even though only fund requests use it today:

```
approval_requests
  id
  request_type       -- 'FUND_REQUEST' today; 'BOOKING_DISCOUNT', 'REFUND', 'EXPENSE' later
  requester_id
  approver_id
  amount
  reference_type
  reference_id
  status              -- PENDING / APPROVED / REJECTED
  parent_request_id   -- for escalation chains (Sales -> Manager -> Admin)
  reason
  created_at, approved_at, rejected_at
```

Your current `fund_requests` table can either be this table with `request_type = 'FUND_REQUEST'`, or a thin wrapper that references it — either way, the *shape* should match so the CRM phase's booking-discount and refund approvals don't need a second approval engine built from scratch.

### 3.5 Wallets stay a distinct concept — don't force them into the CRM prematurely

Not everything needs to become a wallet. The original spec's customer payments/receivables are a different domain (customer owes the company; a wallet is money the *company* has allocated to *staff*). Keep `wallets` scoped to internal fund management. The connecting point is only the shared `journal_entries` ledger (§3.2) — that's sufficient integration; don't try to model customer receivables as a "customer wallet," which would blur a distinction the original spec is explicit about.

## 4. What NOT to Do Now (traps that block the future build)

| Trap | Why it blocks later integration |
|---|---|
| Hardcoding exactly 6 roles in code (`if (role === 'sales')`) | The CRM phase needs the same roles to also carry CRM permissions — string-based role checks don't scale; permission-code checks do (you're already planning this correctly — just don't regress) |
| A wallet-specific `wallet_journal_entries` table separate from a future `booking_journal_entries` | Creates two ledgers that need reconciliation later instead of one source of truth |
| A wallet-specific `audit_logs_wallet` table | Same problem — fragments the audit trail across modules |
| Treating `expenses` (wallet/staff expenses) and the original spec's `expenses` (office expense workflow with vendor bills, approval thresholds) as unrelated | They're likely the same concept — a wallet expense claim probably *is* an office expense in the original spec's language. Model `expenses` once, with `paid_from_wallet_id` as a nullable link, rather than building two parallel expense systems |
| Numbering sequences (`sequence_counters`) scoped only to fund transactions | The original spec needs atomic numbering for leads, bookings, receipts, invoices too — build the counter mechanism generically (a `sequence_counters` table keyed by counter name) now, reuse it later |

## 5. Recommended Build Order (accounting for the future phase)

| Step | Build now (Fund Management phase) | Forward-compatibility action |
|---|---|---|
| 1 | `users`, `roles`, `permissions`, `role_permissions`, `user_roles` | Namespace permission codes by module prefix from the start |
| 2 | `audit_logs` (generic) | Use `entity_type`/`entity_id`, not wallet-specific columns |
| 3 | `chart_of_accounts`, `journal_entries`, `journal_lines` (generic ledger) | Add `reference_type`/`reference_id` polymorphic link now |
| 4 | `approval_requests` (generic) | Add `request_type` and `parent_request_id` now, even if only `FUND_REQUEST` is used |
| 5 | `wallets`, `wallet_transactions` | Keep scoped to internal fund allocation; link out to `journal_entries` via reference |
| 6 | `expenses`, `expense_categories` | Design as the **one** expense table the original spec will also use (vendor, attachment, approval status fields included even if unused by wallet-only expenses today) |
| 7 | `sequence_counters` (generic atomic numbering) | Key by counter name (`WALLET_TXN`, later `BOOKING`, `RECEIPT`, `INVOICE`) |
| 8 | Fund allocation/transfer/request endpoints | Business logic only — no schema decisions unique to this phase that the CRM phase would need to undo |

## 6. What Plugs In Later (once the original CRM/property spec is built)

| Original spec module | How it connects to what you're building now |
|---|---|
| Leads/CRM | New tables (`leads`, `activities`, `site_visits`) — uses the same `users`/`roles`/`audit_logs` |
| Property/Inventory/Booking | New tables — booking's discount/refund approvals use the existing `approval_requests` table with `request_type = 'BOOKING_DISCOUNT'`/`'REFUND'` |
| Customer Payments | New `payments`/`payment_allocations`/`receipts` tables — each posts to the **same** `journal_entries`/`journal_lines` tables via `reference_type = 'BOOKING_PAYMENT'` |
| Office Expenses | Reuses the `expenses` table already built for wallet-linked expense claims — just exercises the vendor/approval-threshold fields that wallet-only usage didn't need |
| Notifications (Twilio/SMTP) | New `notification_outbox`/`notification_deliveries` tables — independent of fund management, no shared schema needed |
| Reports | Both fund-management and CRM figures can be queried from the same `journal_entries` table, since both post through it |

## 7. Summary

Build the Fund Management phase as planned, but treat these four tables as **shared infrastructure, not wallet features**: `users`/`roles`/`permissions`, `audit_logs`, `chart_of_accounts`/`journal_entries`/`journal_lines`, and `approval_requests`. Everything else in this phase (`wallets`, `wallet_transactions`, `fund_requests`) is safely wallet-specific and won't need to change shape later.

When the original CRM/property/booking spec is eventually built, it becomes a set of **new modules that write into the same ledger, the same audit trail, and the same approval engine** — not a second system requiring data migration or reconciliation against what you build today.

*Note on Cache/Sessions:* Redis integration is deferred entirely to the final phase and will ONLY be used for caching. It will not be used for session management or rate limiting (which will use in-memory express middleware instead).

## 8. Related Documents

- `prd.md` — Fund Management & Accounting phase requirements
- `architecture.md` — Fund Management module architecture
- `techStack.md` — technology stack and tooling decisions
