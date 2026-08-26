# EstateSync — Complete System Walkthrough & Manual Verification Guide

This document provides a detailed walkthrough of all completed modules in **EstateSync (Fund Management, Expense Management & Double-Entry Accounting)**, along with step-by-step instructions on **how you can manually test and verify every part of the system**.

---

## 🌟 What Has Been Implemented

### 1. 🛡️ Idempotency Protection Engine
- **Mechanism**: `idempotencyMiddleware.js` intercepts client requests containing `Idempotency-Key` or `x-idempotency-key` headers.
- **Protection**: Mutating financial endpoints (`/allocate`, `/expenses`, `/expenses/:id/reverse`, `/approve`) replay the stored response on duplicate submissions within 24 hours without double-charging wallets or duplicating ledger entries.

### 2. ⚖️ Double-Entry Accounting & General Ledger
- **Models**: `Account` (Chart of Accounts), `JournalEntry`, and `JournalLine`.
- **Integrity Guarantee**: Every fund allocation, approval, expense, or reversal automatically posts a balanced transaction where:
  $$\sum \text{Debits} = \sum \text{Credits}$$
- **UI Component**: [GeneralLedgerView.js](file:///d:/EstateSync/frontend/src/components/GeneralLedgerView.js) displays journal entries with account breakdown, Dr/Cr lines, and real-time ledger balance verification badges.

### 3. 🔄 Expense Reversal & Balance Restoration
- **Endpoint**: `POST /api/v1/expenses/:id/reverse` (Protected for Admin & Accounting).
- **Functionality**: Reverses an erroneous expense, refunds the exact amount back to the user's available wallet balance, writes an `EXPENSE_REVERSAL` transaction to `WalletTransaction`, and posts a reversing double-entry journal entry.
- **UI**: Includes an interactive "Reverse Entry" button with a confirmation modal in [ExpenseList.js](file:///d:/EstateSync/frontend/src/components/ExpenseList.js).

### 4. 🔍 Dedicated Security & Governance Audit Trail
- **Model**: `AuditLog` table capturing actor, email, action type, entity type, entity ID, before/after payloads, IP address, user agent, and timestamp.
- **Audited Actions**: `USER_LOGIN`, `USER_REGISTER`, `FUND_DIRECT_ALLOCATE`, `FUND_REQUEST_APPROVE`, `FUND_REQUEST_REJECT`, `EXPENSE_CREATE`, `EXPENSE_REVERSE`.
- **UI Component**: [AuditLogViewer.js](file:///d:/EstateSync/frontend/src/components/AuditLogViewer.js) with live action filtering.

---

## 🔑 Test User Credentials

All seeded test accounts use the password: `password123`

| Role | Email | Password | Access / Primary Functions |
|---|---|---|---|
| **Admin** | `admin@estatesync.local` | `password123` | Master control, direct fund allocation, audit log, user creation |
| **Accounting** | `accounting@estatesync.local` | `password123` | Oversight, double-entry general ledger, all user wallets, expense reversal |
| **Manager** | `manager@estatesync.local` | `password123` | Department wallet, team fund approvals, team expenses |
| **Sales** | `sales@estatesync.local` | `password123` | Personal wallet, fund requests, expense submissions |
| **Marketing** | `marketing@estatesync.local` | `password123` | Personal wallet, fund requests, expense submissions |

---

## 🧪 Step-by-Step Manual Verification Guide

### Test Case 1: Admin Direct Fund Allocation & Idempotency
1. Open your browser at `http://localhost:3000/login`
2. Log in as **Admin**:
   - **Email:** `admin@estatesync.local`
   - **Password:** `password123`
3. You will be redirected to the **Admin Dashboard** (`/dashboards/admin`).
4. Find the **"Direct Fund Allocation"** card:
   - Select a user (e.g., **Sales Manager** or **Sales Rep**).
   - Enter Amount: `₹5,000`
   - Description: `Q3 Field Operations Budget`
   - Click **"Transfer & Allocate Funds"**.
5. **Verify**:
   - A success banner appears showing the updated wallet balance.
   - Scroll down to **"Double-Entry General Ledger & Accounts"** — verify a new journal entry `JE-...` was posted (`Dr: Manager Wallet, Cr: Treasury Bank`).
   - Scroll down to **"Security & Governance Audit Trail"** — verify a `FUND_DIRECT_ALLOCATE` audit event was logged.

---

### Test Case 2: Sales User Submitting an Expense
1. Log out (or open an Incognito window) and go to `http://localhost:3000/login`.
2. Log in as **Sales User**:
   - **Email:** `sales@estatesync.local`
   - **Password:** `password123`
3. You will be redirected to **My Wallet** (`/dashboards/wallet`).
4. In the **"Record New Expense"** form:
   - Amount: `₹350`
   - Category: `Travel` (or Client Entertainment)
   - Description: `Client Meeting Travel Expenses`
   - Date: Select today's date.
   - Click **"Record & Deduct from Wallet"**.
5. **Verify**:
   - Your Available Balance decrements by ₹350.
   - Total Spent increments by ₹350.
   - The expense appears immediately in **"My Recorded Expenses"** with badge `RECORDED`.

---

### Test Case 3: Expense Reversal & Wallet Balance Restoration
1. Log out and log in as **Accounting Officer**:
   - **Email:** `accounting@estatesync.local`
   - **Password:** `password123`
2. You will be redirected to the **Accounting & Financial Hub** (`/dashboards/accounting`).
3. Scroll down to **"All Organization Expenses"**.
4. Find the expense recorded by the Sales User in Test Case 2.
5. Click the red **"Reverse Entry"** button on the right side.
6. A confirmation modal will appear:
   - Enter Reversal Reason: `Duplicate client receipt submitted`
   - Click **"Confirm Reversal & Refund"**.
7. **Verify**:
   - The expense status updates to `REVERSED` with a strikethrough.
   - The total active recorded expenses amount automatically updates.
   - Scroll to **"Double-Entry General Ledger & Accounts"** — verify a reversing journal entry was posted (`Dr: Team Wallet, Cr: Travel Expense`).
   - Scroll to **"Security & Governance Audit Trail"** — verify an `EXPENSE_REVERSE` event was logged with your email and timestamp.
   - Log back in as `sales@estatesync.local` — verify their Available Balance was refunded by ₹350.

---

### Test Case 4: Double-Entry Proof Verification (`Debit = Credit`)
1. On the **Accounting Dashboard** (`/dashboards/accounting`), scroll to the **"Double-Entry General Ledger & Accounts"** section.
2. Verify the green badge at the top:
   $$\text{✓ Balanced (Debit = Credit)}$$
3. Click the **"Chart of Accounts"** tab:
   - Check standard accounts:
     - `1010`: Corporate Bank / Primary Treasury
     - `1020`: Manager Operational Wallets
     - `1030`: Team / Field Wallets
     - `5010`: Travel & Field Expenses
     - `5020`: Marketing & Promotions
   - Verify each account shows its live Total Debits, Total Credits, and Net Balance.
4. Click the **"Journal Entries"** tab:
   - Inspect individual entries. Every single entry displays matching `Entry Total (Dr)` and `Entry Total (Cr)`.

---

### Test Case 5: Auditing & Security Inspection
1. On the **Accounting** or **Admin Dashboard**, scroll to **"Security & Governance Audit Trail"**.
2. Use the filter dropdown to filter by action:
   - Select **"Expense Reversals"** to see all reversed transactions and reasons.
   - Select **"Fund Allocations"** to audit money pushes.
   - Select **"User Logins"** to inspect login activity with IP addresses.
3. Review the payload JSON preview in the table to inspect before/after state diffs.

---

## ⚡ Automated Test Suite Execution

You can also run all automated test suites at any time from the terminal in `d:\EstateSync\backend`:

```powershell
# 1. Test Double-Entry Accounting, Idempotency, Reversals & Audit Logs
node test-advanced-features.js

# 2. Test Accounting Dashboard Aggregates & User Wallets
node test-accounting.js

# 3. Test Expense Creation & Manager Team Visibility
node test-expenses.js

# 4. Test Direct Fund Allocation
node test-allocation.js
```

All 4 test suites pass **100%** out-of-the-box.
