# EstateSync™ — Comprehensive Administrator & Master Control User Manual
**Document Release:** `Version 2.4 (Enterprise Production)`  
**Portal Access URL:** [https://estatesync.devoxa.in](https://estatesync.devoxa.in)  
**Security Classification:** `CONFIDENTIAL — Internal Enterprise Document`  
**Target Audience:** Chief Executive Officers (CEO), Managing Directors, Chief Operating Officers (COO), System Administrators, and Internal Audit Leads  

---

## 📑 Table of Contents
1. [Document Control & Platform Metadata](#1-document-control--platform-metadata)
2. [Executive Overview & Master Control Philosophy](#2-executive-overview--master-control-philosophy)
3. [Portal Access, Authentication & Session Security](#3-portal-access-authentication--session-security)
4. [Navigation Shell & Command Island Architecture](#4-navigation-shell--command-island-architecture)
5. [Real-Time Executive KPI Engine](#5-real-time-executive-kpi-engine)
6. [Detailed Operating Manual: Core Modules](#6-detailed-operating-manual-core-modules)
   - [6.1 User Provisioning & Role-Based Access Control (RBAC)](#61-user-provisioning--role-based-access-control-rbac)
   - [6.2 Direct Treasury Capital Allocation Engine](#62-direct-treasury-capital-allocation-engine)
   - [6.3 Circulating Team Wallets & Balance Adjustments](#63-circulating-team-wallets--balance-adjustments)
   - [6.4 Enterprise Fund Request Approval Queue](#64-enterprise-fund-request-approval-queue)
   - [6.5 Workforce Master Directory & HR Governance (`/dashboards/employees`)](#65-workforce-master-directory--hr-governance)
   - [6.6 Customer Portfolios, Unit Bookings & Revenue Collections](#66-customer-portfolios-unit-bookings--revenue-collections)
   - [6.7 Land & Property Acquisitions Management](#67-land--property-acquisitions-management)
   - [6.8 Corporate Treasury & Bank Inflow Governance](#68-corporate-treasury--bank-inflow-governance)
   - [6.9 Staff Salaries & Monthly Payroll Synchronization](#69-staff-salaries--monthly-payroll-synchronization)
   - [6.10 Double-Entry General Ledger & Real-Time Parity Proof](#610-double-entry-general-ledger--real-time-parity-proof)
   - [6.11 Forensic Audit Trail & JSON Terminal Inspector](#611-forensic-audit-trail--json-terminal-inspector)
7. [Real-World Operational Playbooks & Step-by-Step Scenarios](#7-real-world-operational-playbooks--step-by-step-scenarios)
   - [Scenario A: Onboarding a Regional Sales Manager & Seeding Wallet](#scenario-a-onboarding-a-regional-sales-manager--seeding-wallet)
   - [Scenario B: Handling an Emergency Site Fund Request](#scenario-b-handling-an-emergency-site-fund-request)
   - [Scenario C: Reversing a Fraudulent or Mistaken Expense Claim](#scenario-c-reversing-a-fraudulent-or-mistaken-expense-claim)
   - [Scenario D: Executing a High-Value Land Milestone Payout](#scenario-d-executing-a-high-value-land-milestone-payout)
   - [Scenario E: Customer Booking Cancellation & Forfeiture Settlement](#scenario-e-customer-booking-cancellation--forfeiture-settlement)
   - [Scenario F: Conducting an End-of-Month Payroll Settlement](#scenario-f-conducting-an-end-of-month-payroll-settlement)
   - [Scenario G: Investigating a Security Incident via Audit Logs](#scenario-g-investigating-a-security-incident-via-audit-logs)
8. [Master Data Dictionary & Field Reference](#8-master-data-dictionary--field-reference)
9. [Administrative Troubleshooting, Security Hardening & Disaster Recovery](#9-administrative-troubleshooting-security-hardening--disaster-recovery)
10. [Roadmap & Version 3.0 Major Release Preview](#10-roadmap--version-30-major-release-preview)

---

## 1. Document Control & Platform Metadata

| Attribute | Specification |
| :--- | :--- |
| **Product Name** | EstateSync™ Fund Management & Accounting System |
| **Current Live Version** | **v2.4 Production Release** |
| **Official Live Portal** | [https://estatesync.devoxa.in](https://estatesync.devoxa.in) |
| **Backend API Host** | `https://lightcoral-turtle-931044.hostingersite.com` |
| **Framework Stack** | Next.js 16 (Turbopack, App Router) + Express 5 + Prisma ORM + PostgreSQL |
| **Accounting Standard** | Balanced Double-Entry ($\text{Debits} = \text{Credits}$), RERA & Indian Accounting Compliant |
| **Document Version** | `2.4.0-DEEP-DOC` |
| **Published Date** | September 2026 |

---

## 2. Executive Overview & Master Control Philosophy

EstateSync™ is built from the ground up for real estate conglomerates, land developers, and multi-tier construction organizations. In an industry characterized by high-velocity cash movements, fragmented site advance requests, complex land milestone disbursements, and multi-crore customer booking installments, conventional generic ERPs fall short.

EstateSync solves this through an integrated, closed-loop financial architecture. As a **System Administrator** (`ADMIN` role), you hold **Master Control Authority**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ESTATESYNC MASTER CONTROL                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   [ CORPORATE TREASURY ]  ──────>  [ DIRECT CAPITAL ALLOCATION ]           │
│            │                                      │                         │
│            ▼                                      ▼                         │
│   [ LAND ACQUISITIONS ]                 [ CIRCULATING WALLETS ]             │
│            │                                      │                         │
│            ▼                                      ▼                         │
│   [ CUSTOMER COLLECTIONS ] <──── [ EXPENSE AUDITING & REVERSALS ]           │
│                                                   │                         │
│                                                   ▼                         │
│   [ FORENSIC AUDIT LOG ]  <─────  [ DOUBLE-ENTRY GENERAL LEDGER ]          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The Three Core Governance Pillars for Administrators:
1. **Mathematical Zero-Sum Integrity:**  
   No capital enters or leaves the system without balanced double-entry accounting. An allocation from Treasury to an employee wallet debits `1040 (Staff Wallets)` and credits `1010 (Corporate Bank)`. The system never allows single-sided adjustments.
2. **Idempotent State Protection:**  
   Every state mutation (allocations, payouts, collections, reversals) is tagged with a unique `Idempotency-Key`. Double clicks, cellular network drops, and browser reloads can never trigger duplicate debits or payouts.
3. **Unbroken Forensic Audit Trail:**  
   The Administrator has continuous visibility into who did what, when, from which IP address, and what exact data changed before and after every single transaction.

---

## 3. Portal Access, Authentication & Session Security

### 3.1 Portal URL and Login Requirements
- **Live Portal Link:** [https://estatesync.devoxa.in/login](https://estatesync.devoxa.in/login)
- **Supported Web Browsers:** Google Chrome (recommended), Mozilla Firefox, Apple Safari, Microsoft Edge.
- **Login Credentials:** Enter your authorized corporate email (e.g., `admin@estatesync.local`) and your master password.

### 3.2 Authentication Flow & Role Verification
1. Navigate to the login page.
2. Enter your email and password. Click the eye icon (**Show/Hide**) to verify password accuracy.
3. Click **Sign In to Dashboard**.
4. The system transmits your credentials over TLS/HTTPS directly to the live backend API.
5. Upon successful verification:
   - A cryptographically signed **JSON Web Token (JWT)** with 24-hour expiration is issued.
   - Your user role is verified as `ADMIN`.
   - You are redirected to `/dashboards/admin`.

> [!IMPORTANT]
> **Session Security:** If you remain inactive or your session exceeds 24 hours, the JWT token expires automatically. The system will safely route you back to `/login` to prevent unauthorized physical terminal access. Always click the red **Logout** button when leaving your workstation.

---

## 4. Navigation Shell & Command Island Architecture

The EstateSync interface is designed with a persistent, floating island navigation shell. As an administrator, you have unrestricted access to all functional portals:

```
[ EstateSync Logo ] ──── [ Admin Hub ] ─ [ Operations Hub ] ─ [ Accounting Hub ] ─ [ Employees ] ─ [ My Wallet ] ──── [ Profile Chip ] [ Logout ]
```

### Portal Directory:
| Portal Tab | URL Route | Target Audience | Primary Functionality |
| :--- | :--- | :--- | :--- |
| **Admin Hub** | `/dashboards/admin` | System Admin / Managing Director | Master capital allocation, user provisioning, global request approvals, audit logs. |
| **Operations Hub** | `/dashboards/manager` | Operations Heads / Project Managers | Departmental fund requests, field team supervision, expense validation. |
| **Accounting Hub** | `/dashboards/accounting` | CFO / Senior Accountants | Double-entry general ledger, customer installments, land payouts, bank inflows, payroll. |
| **Employees** | `/dashboards/employees` | HR Leads / Directors | Workforce master directory, salary structures, user account binding, archive status. |
| **My Wallet** | `/dashboards/wallet` | All Staff & Executives | Personal circulating wallet balance, expense claim submission, personal claim history. |

---

## 5. Real-Time Executive KPI Engine

Located immediately below the header on `/dashboards/admin`, the Executive KPI engine calculates real-time organizational health metrics:

### 1. Total Corporate Treasury (Liquid)
- **Metric Definition:** Sum of all unencumbered liquid balances currently available in corporate bank accounts (`Account 1010`).
- **Calculation:** $\sum (\text{Bank Inflows} + \text{Customer Collections}) - \sum (\text{Allocations} + \text{Land Payouts} + \text{Salaries})$.
- **Operational Rule:** Direct allocations and landowner milestone payouts cannot exceed this figure.

### 2. Total Capital Allocated
- **Metric Definition:** Total capital currently active and circulating across all employee and department wallets (`Account 1040`).
- **Significance:** Represents operational advance exposure. If this number is excessively high, it indicates unspent advances in the field.

### 3. Pending Approval Requests
- **Metric Definition:** Count of open, unapproved fund requests awaiting managerial or executive approval.
- **Action Required:** When this badge exceeds zero, the administrator should inspect the Fund Request Queue.

### 4. Total System Users
- **Metric Definition:** Count of active registered user accounts provisioned in the system across all six organizational roles.

---

## 6. Detailed Operating Manual: Core Modules

---

### 6.1 User Provisioning & Role-Based Access Control (RBAC)

**Component:** `UserRegistrationForm.js`  
**Access:** Admin Hub -> Administrative Operations Hub -> **`Register New User`** (or **`Side-by-Side`**)

#### Detailed Role Hierarchy Matrix:
| Role Code | Role Name | System Permissions & Access Scope |
| :--- | :--- | :--- |
| **`ADMIN`** | System Administrator | **Unrestricted Master Authority.** Full access to Admin, Accounting, Operations, Employees, Treasury, General Ledger, Audit Logs, and User Management. |
| **`MANAGER`** | Operations Manager | Access to Operations Hub, Employee Directory, Subordinate Fund Request Approvals, Department Expense Review, and Personal Wallet. |
| **`ACCOUNTING`** | Finance Officer / Accountant | Access to Accounting Hub, General Ledger, Treasury Inflows, Customer Installments, Land Acquisitions, Payroll Disbursements, and Wallet Audits. |
| **`SALES`** | Sales Executive | Access to Customer Collections Portfolio, unit bookings, and Personal Sales Expense Wallet. |
| **`MARKETING`** | Marketing Executive | Access to Marketing Campaign Expenses and Personal Marketing Wallet. |
| **`EMPLOYEE`** | Field Staff / Site Engineer | Access to Personal Wallet, Expense Upload with receipts, and Fund Request Submissions. |

#### Step-by-Step Operating Instructions:
1. In the **Administrative Operations Hub**, click the **`Register New User`** toggle button.
2. Complete the form fields:
   - **Full Name:** Enter the staff member's official name (e.g., *"Amitabh Saxena"*).
   - **Corporate Email:** Enter their unique work email address (e.g., *"amitabh.saxena@estatesync.local"*).
   - **Initial Password:** Enter a secure starting password (minimum 6 characters).
   - **Assign Role:** Select the exact role from the dropdown (`ADMIN`, `MANAGER`, `ACCOUNTING`, etc.).
3. Click the blue button: **`Provision Account`**.
4. **Automated Verification:**
   - A green confirmation banner displays: *"Account successfully provisioned for [Name] with [Role] authority."*
   - An individual corporate wallet is initialized automatically with ₹0.00.
   - The Security Audit Log writes a `USER_REGISTER` record.
   - Provide the credentials to the employee; they can log in immediately.

---

### 6.2 Direct Treasury Capital Allocation Engine

**Component:** `DirectFundAllocationForm.js`  
**Access:** Admin Hub -> Administrative Operations Hub -> **`Direct Fund Allocation`**

#### Operating Concept:
In fast-moving construction projects, executive management frequently needs to push operational funds to site managers, liaison officers, or purchasing agents without waiting for an advance voucher request. The Direct Allocation Engine pulls directly from the Corporate Treasury and seeds the target wallet instantaneously.

#### Step-by-Step Operating Instructions:
1. In the Operations Hub container, click **`Direct Fund Allocation`**.
2. Fill out the allocation fields:
   - **Target Staff / Manager:** Select the recipient from the searchable dropdown.
   - **Allocation Amount (₹):** Enter the amount manually or click a quick-fill pill:
     - `₹5,000` | `₹10,000` | `₹25,000` | `₹50,000` | `₹1,00,000`
   - **Disbursement Mode:**
     - **`LIQUID` (Bank Transfer):** Debited from Corporate Bank Current Account (`1010`).
     - **`CASH` (Cash Advance):** Debited from Corporate Cash in Hand (`1020`).
   - **Business Justification / Notes:** Mandatory explanation (e.g., *"Mobilization advance for Sector 82 boundary wall construction contractor"*).
3. Click **`Allocate Capital to Wallet`**.
4. **Automated System Impact:**
   - Real-time deduction from Corporate Treasury.
   - Real-time credit to recipient's wallet balance.
   - Permanent double-entry journal entry: **Debit Staff Wallet (1040)**, **Credit Bank/Cash (1010/1020)**.
   - Logged in the **Global Transaction Ledger** with a unique `Idempotency-Key`.

---

### 6.3 Circulating Team Wallets & Balance Adjustments

**Component:** `UserWalletLedger.js` & `AdjustWalletBalanceModal.js`  
**Access:** Admin Hub -> **`User Wallet Balances & Circulating Advances`**

#### Operating Concept:
Every user in EstateSync has an isolated digital wallet ledger. As funds are allocated or expenses are filed, the wallet ledger tracks three critical numbers:
1. **Available Balance:** Funds currently available for the user to spend.
2. **Total Allocated:** Cumulative funds ever granted to this user.
3. **Total Spent:** Cumulative approved expenses filed by this user.

#### How to Execute an Administrative Balance Adjustment:
If a user returns physical unspent cash, or if an audit reconciliation requires correcting a wallet figure:
1. Locate the employee's wallet card in the ledger.
2. Click the yellow button: **`Adjust Balance`**.
3. In the modal:
   - Verify the displayed **Current Wallet Balance**.
   - Select **Adjustment Direction**:
     - **`CREDIT` (Add Funds):** Increases user's wallet without debiting Treasury.
     - **`DEBIT` (Deduct Funds):** Decreases user's wallet (e.g., returning unspent advances).
   - Enter **Adjustment Delta Amount (₹)**.
   - Enter **Mandatory Audit Reason:** State why the adjustment is required (e.g., *"Return of unspent site advance via Cash Voucher #1049"*).
4. Click **`Confirm Adjustment`**.
5. The wallet is updated immediately, and the action is saved in the audit log with the administrator's signature.

---

### 6.4 Enterprise Fund Request Approval Queue

**Component:** `FundRequestList.js` (`type="all"`)  
**Access:** Admin Hub -> **`All Organization Fund Requests`**

#### Operating Concept:
Field employees and department managers submit formal requests for capital. As an administrator, you have complete authority to approve or reject any request across all departments.

#### Step-by-Step Approval Workflow:
1. Under the **All Organization Fund Requests** section, locate requests with a yellow **`PENDING`** badge.
2. Review the request details:
   - Requester Name, Email, and Department.
   - Amount Requested (₹) and Category (e.g., *Site Fuel, Machinery Rental, Hospitality*).
   - Business Purpose / Description.
   - Attached vendor quotation or pro-forma invoice (if uploaded).
3. **To Approve:**
   - Click the green **`Approve`** button.
   - The system checks Treasury balance in real time.
   - The requester's wallet is credited instantly, and the request status updates to **`APPROVED`**.
4. **To Reject:**
   - Click the red **`Reject`** button.
   - Enter the reason for rejection (e.g., *"Vendor quote exceeds authorized project threshold. Resubmit with 3 comparative bids."*).
   - Status transitions to **`REJECTED`**; no funds move.

---

### 6.5 Workforce Master Directory & HR Governance

**Component:** `EmployeeList.js`, `EmployeeModal.js`, `EditSalaryModal.js`, `EmployeeLinkUserModal.js`  
**Access:** Top Navigation -> **`Employees`** (`/dashboards/employees`)

#### Key Administrative Actions:
1. **Create Employee Profile (`+ Add Employee`):**
   - **Personal:** First Name, Last Name, Email, Phone, Date of Birth.
   - **Professional:** Employee ID/Code (e.g., `EMP-108`), Designation (e.g., *Site Supervisor*), Department (*Civil Engineering*), Employment Type (*Full-Time, Contract*), Date of Joining, Work Location (*Gurugram Sector 88 Site Office*).
2. **Link to System Login Account (`Link User`):**
   - Connects an HR employee record to an existing login identity in the `User` table. This links payroll slips, attendance, and corporate wallet transactions into a unified profile.
3. **Configure Salary Structure (`Edit Salary`):**
   - Configure **Monthly Base Salary (₹)**.
   - Configure **Fixed Allowances** (House Rent Allowance, Site Conveyance, Medical).
   - Configure **Standard Deductions** (Provident Fund, Professional Tax, TDS).
4. **Archive Employee Profile (`Archive`):**
   - When an employee departs, deactivating their profile prevents new allocations or logins while preserving all historical financial records for statutory tax audits.

---

### 6.6 Customer Portfolios, Unit Bookings & Revenue Collections

**Component:** `CustomerPortfolioList.js`, `RecordCustomerPaymentModal.js`, `CustomerCancellationSettlementModal.js`  
**Access:** Admin Hub -> **`Customer Portfolios & Payment Schedules`**

#### Key Administrative Actions:
1. **Onboard New Property Buyer (`+ Register Customer`):**
   - Customer Full Name, Primary Phone, Email Address.
   - Government Identification (PAN / Aadhaar / CNIC) and Residential Address.
   - Assigned Real Estate Project & Unit Number (e.g., *"Tower C, Penthouse 1401"*).
   - Total Agreed Contract Value (e.g., `₹1,25,00,000`).
2. **Log Buyer Installment (`Record Payment`):**
   - Select payment mode: `NEFT`, `RTGS`, `IMPS`, `CHEQUE`, `UPI`, or `CASH`.
   - Enter UTR / Cheque Reference Number and Payment Date.
   - Automated double-entry posting: **Debit Corporate Bank (1010)**, **Credit Customer Accounts Receivable / Revenue (4010)**.
   - Generates an immediate printable receipt with a unique transaction voucher.
3. **Execute Contract Cancellation & Financial Settlement (`Cancel Booking & Settle`):**
   - Enter the **Forfeiture Penalty Percentage** (e.g., `10%`).
   - The engine automatically calculates retained revenue and net refund payable.
   - Authorize disbursement; the property unit is automatically unlocked and restored to available inventory.

---

### 6.7 Land & Property Acquisitions Management

**Component:** `PropertyAcquisitionList.js`, `PropertyAcquisitionModal.js`, `RecordPropertyPaymentModal.js`  
**Access:** Admin Hub -> **`Land Acquisitions & Property Registry`**

#### Key Administrative Actions:
1. **Register New Land Acquisition (`+ Add Property`):**
   - Property Title (e.g., *"Sohna Road Commercial Belt — Parcel 4B"*).
   - Physical Location, Land Registry Khasra/Survey Numbers, Total Acreage.
   - Landowner / Seller Entity Name and Authorized Contact.
   - Total Agreed Consideration (e.g., `₹18,50,00,000`).
2. **Release Landowner Milestone Payout (`Record Owner Payout`):**
   - Select acquisition milestone: Token Advance, Registry Milestone, Mutation / Possession Milestone.
   - System confirms liquid funds in Treasury before releasing payment.
   - Posts capital entry: **Debit Land Fixed Assets (1510)**, **Credit Corporate Bank (1010)**.

---

### 6.8 Corporate Treasury & Bank Inflow Governance

**Component:** `TreasuryInflowList.js`, `RecordBankInflowModal.js`  
**Access:** Admin Hub -> **`Corporate Treasury & Bank Inflow Audit`**

#### Key Administrative Actions:
1. **Monitor Real-Time Cashflow:**
   - Inspect daily inflows, outflows, and net liquidity across all institutional accounts.
2. **Record New Bank Capital Inflow (`+ Record Bank Inflow`):**
   - Enter Deposit Amount (₹).
   - Select Inflow Classification:
     - `CAPITAL_INFUSION` (Equity / Shareholder investment)
     - `DIRECTOR_LOAN` (Unsecured promisor note)
     - `BANK_LOAN` (Credit facility drawdown)
     - `REFUND_RECEIVED` (Statutory or vendor refund)
   - Enter Receiving Bank, Corporate Account Number, and Bank UTR.
   - Immediately reflects in liquid treasury reserves.

---

### 6.9 Staff Salaries & Monthly Payroll Synchronization

**Component:** `AccountingSalaryView.js`, `PaySalaryModal.js`  
**Access:** Accounting Hub -> **`Staff Salaries & Payouts`**

#### Key Administrative Actions:
1. Select the operational payroll month (e.g., `2026-09`).
2. Review the organizational payroll liability vs amount already disbursed.
3. Click **`Pay Salary`** on any pending employee voucher.
4. Review computed breakdown: Base Pay + Allowances - Deductions = Net Payable.
5. Authorize payout via Bank Transfer (NEFT) or Cash.
6. The system debits Treasury (`1010`) and posts salary expense (`5010`) automatically.

---

### 6.10 Double-Entry General Ledger & Real-Time Parity Proof

**Component:** `GeneralLedgerView.js`  
**Access:** Admin Hub -> **`Double-Entry General Ledger & Accounts`**

#### Verification Protocols for Administrators:
- **Zero-Sum Equilibrium Badge:** Ensure the status badge displays **`✓ Balanced (Debit = Credit)`** in green.
- **Journal Entries Tab:** Chronological register of every voucher created. Inspect line-by-line debits and credits.
- **Chart of Accounts Tab:** Review real-time balances across:
  - **1000s:** Assets (Bank, Cash, Receivables, Land Inventory, Staff Wallets)
  - **2000s:** Liabilities (Vendor Payables, Landowner Debt, Director Loans)
  - **3000s:** Equity (Share Capital, Retained Reserves)
  - **4000s:** Revenue (Property Sales, Booking Inflows, Forfeiture Income)
  - **5000s:** Expenses (Land Development, Salaries, Marketing, Utilities)

---

### 6.11 Forensic Security Audit Trail & JSON Terminal Inspector

**Component:** `AuditLogViewer.js`  
**Access:** Admin Hub -> **`Security & Audit Trail`**

#### Forensic Inspection Capabilities:
1. **Action Filter:** Filter events by `USER_LOGIN`, `USER_REGISTER`, `FUND_DIRECT_ALLOCATE`, `FUND_REQUEST_APPROVE`, `EXPENSE_REVERSE`, `PROPERTY_PAYMENT_RECORD`, `CUSTOMER_PAYMENT_RECORD`, etc.
2. **Interactive JSON Terminal:** Click the **`View Details`** icon on any row to open the inspect window:
   - **Actor:** Full email and user ID of the person who executed the action.
   - **Network Metadata:** Client IPv4/IPv6 address and User-Agent browser fingerprint.
   - **State Mutation Snapshot:** Side-by-side view of `oldValues` before the transaction vs `newValues` after the transaction.

---

## 7. Real-World Operational Playbooks & Step-by-Step Scenarios

---

### Scenario A: Onboarding a Regional Sales Manager & Seeding Wallet
**Objective:** Provision a new manager account, create their HR record, configure compensation, and seed their wallet with ₹50,000 for field operations.

```
Step 1: User Registration
├── Go to: Admin Hub -> Register New User
├── Enter Name: "Vikram Malhotra", Email: "vikram@estatesync.local"
├── Set Role: "MANAGER", Password: "TempPassword#2026"
└── Click "Provision Account" -> Wallet initialized with ₹0.00

Step 2: HR Master Record & Linking
├── Go to: Top Navigation -> Employees -> "+ Add Employee"
├── Enter designation: "Regional Sales Manager", Dept: "Sales & Marketing"
├── Click "Link User" -> Select "vikram@estatesync.local"
└── Click "Edit Salary" -> Base: ₹85,000, Allowances: ₹15,000 -> Save

Step 3: Seeding Initial Operating Wallet
├── Go to: Admin Hub -> Direct Fund Allocation
├── Select: "Vikram Malhotra"
├── Amount: Click "₹50,000" pill -> Mode: "LIQUID"
├── Description: "Initial regional site advance for client hosting & fuel"
└── Click "Allocate Capital to Wallet" -> Verified in UserWalletLedger
```

---

### Scenario B: Handling an Emergency Site Fund Request
**Objective:** A site civil engineer requests ₹75,000 for emergency excavation equipment repairs.

1. Navigate to Admin Hub -> **`All Organization Fund Requests`**.
2. Locate the request card for the site engineer marked **`PENDING`**.
3. Review the description and attached repair estimate quotation.
4. Verify that Corporate Treasury Liquid balance is sufficient.
5. Click **`Approve`**.
6. The engineer's wallet balance increases by ₹75,000 immediately. The engineer can now pay the repair vendor and upload the tax invoice.

---

### Scenario C: Reversing a Fraudulent or Mistaken Expense Claim
**Objective:** An employee accidentally uploaded a duplicate ₹12,500 fuel voucher that was already reimbursed last week.

1. Navigate to **Accounting Hub** -> **`Wallets & Expenses`** tab -> **`All Expenses`** sub-tab.
2. Search by employee name or category (`Fuel`).
3. Click **`View Receipt`** to verify the bill number and date.
4. Having confirmed the duplicate submission, click the red button: **`Reverse Expense`**.
5. In the modal, enter the mandatory reason: *"Duplicate fuel receipt #7741 submitted in error. Denied by internal audit."*
6. Click **`Confirm Reversal`**.
7. **Result:**
   - The expense status updates to `REVERSED`.
   - The employee's wallet is credited back ₹12,500 immediately.
   - An offsetting journal voucher is created in the General Ledger.
   - The audit log permanently records the administrator's ID and timestamp.

---

### Scenario D: Executing a High-Value Land Milestone Payout
**Objective:** Release a ₹50,00,000 agreement milestone payment to a landowner for a new commercial parcel.

1. Navigate to Admin Hub -> **`Land Acquisitions & Property Registry`**.
2. Locate the parcel: *"Sohna Road Commercial Belt — Parcel 4B"*.
3. Verify that remaining balance due is greater than or equal to ₹50,00,000.
4. Click **`Record Owner Payout`**.
5. The system performs a real-time liquidity check:
   - If Corporate Treasury balance < ₹50,00,000, the system blocks the transaction and warns: *"Insufficient Treasury Liquidity"*.
   - If balance is sufficient, enter:
     - Amount: `5000000`
     - Mode: `RTGS`
     - Source Bank: `Corporate Bank HDFC (1010)`
     - UTR Reference: `HDFCR52026092100889`
     - Milestone Notes: *"Execution of formal registry agreement — Tranche 2"*
6. Click **`Disburse Milestone Payout`**.
7. **Result:**
   - Treasury liquid reserves decrement by ₹50,00,000.
   - Land asset capitalization increments by ₹50,00,000.
   - Remaining seller liability decrements by ₹50,00,000.

---

### Scenario E: Customer Booking Cancellation & Forfeiture Settlement
**Objective:** A customer cancels their apartment booking after paying ₹10,00,000. As per agreement, company retains 10% (₹1,00,000) and refunds ₹9,00,000.

1. Navigate to Admin Hub -> **`Customer Portfolios & Payment Schedules`**.
2. Locate the customer card and click **`Cancel Booking & Settle`**.
3. Verify total paid to date: `₹10,00,000`.
4. Enter **Cancellation Deduction:** `10%`.
5. The engine computes:
   - Company Forfeiture Income: `₹1,00,000`.
   - Customer Refund Payable: `₹9,00,000`.
6. Enter the refund UTR number and select Corporate Treasury account.
7. Click **`Approve Cancellation & Disburse Refund`**.
8. **Result:**
   - ₹9,00,000 is disbursed out of Treasury.
   - ₹1,00,000 is credited to Forfeiture Revenue (`4030`).
   - The apartment unit is unlocked and restored to `AVAILABLE` for resale.

---

### Scenario F: Conducting an End-of-Month Payroll Settlement
**Objective:** Process and disburse monthly salaries for all active organizational staff.

1. Navigate to **Accounting Hub** -> **`Staff Salaries & Payouts`**.
2. Select payroll month: `2026-09`.
3. The KPI card displays Total Payroll Liability (e.g., `₹18,40,000`).
4. In the employee table, locate staff with status **`PENDING`**.
5. Click **`Pay Salary`**.
6. Review calculated salary slip (Base Pay, Allowances, PF/TDS Deductions).
7. Select payout mode (`NEFT`) and enter bank disbursement UTR.
8. Click **`Confirm & Disburse Salary`**.
9. Status transitions to **`PAID`** with green checkmark. Double-entry salary expense is booked.

---

### Scenario G: Investigating a Security Incident via Audit Logs
**Objective:** An unexpected balance adjustment of ₹25,000 was noticed on an executive wallet.

1. Navigate to Admin Hub -> Scroll to **`Security & Audit Trail`**.
2. Set Action Filter dropdown to: `WALLET_ADJUST_BALANCE` (or `FUND_DIRECT_ALLOCATE`).
3. Locate the row matching the ₹25,000 transaction.
4. Click the blue **`View Details`** icon.
5. In the terminal pop-up, inspect:
   - **Actor:** `admin@estatesync.local`
   - **Client IP:** `103.21.144.18`
   - **Timestamp:** `2026-09-21T14:32:10Z`
   - **Justification Note:** *"Reimbursement for urgent structural consultant site visit"*
   - **Before/After State:** Confirms exact delta applied.
6. The audit log provides absolute legal and operational accountability.

---

## 8. Master Data Dictionary & Field Reference

### 8.1 User Entity (`User`)
| Field Name | Data Type | Description & Validation Rules |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key, auto-generated unique user identifier. |
| `email` | String | Unique work email address, must contain `@` and valid corporate domain. |
| `passwordHash` | String | Bcrypt one-way hash (12 salt rounds), plain text never stored. |
| `name` | String | Employee legal full name. |
| `roleId` | UUID | Foreign Key linking to `Role` entity (`ADMIN`, `MANAGER`, etc.). |
| `createdAt` | DateTime | Timestamp when account was provisioned. |

### 8.2 Wallet Entity (`Wallet`)
| Field Name | Data Type | Description & Validation Rules |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key, auto-generated unique wallet identifier. |
| `userId` | UUID | Foreign Key linking 1-to-1 to `User`. |
| `balance` | Decimal(14,2)| Available unspent funds, cannot be negative. |
| `totalAllocated` | Decimal(14,2)| Cumulative lifetime funds received from Treasury. |
| `totalSpent` | Decimal(14,2)| Cumulative lifetime expenses approved and liquidated. |

### 8.3 Property Entity (`Property`)
| Field Name | Data Type | Description & Validation Rules |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key, auto-generated unique property identifier. |
| `title` | String | Project name or land parcel name. |
| `location` | String | Geographical address, survey numbers, city, state. |
| `totalLandValue` | Decimal(14,2)| Total agreed contractual consideration. |
| `totalPaidToOwner`| Decimal(14,2)| Cumulative milestone funds disbursed to landowner. |
| `balanceRemaining`| Decimal(14,2)| Outstanding debt liability owed to landowner. |

### 8.4 Customer Entity (`Customer`)
| Field Name | Data Type | Description & Validation Rules |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key, auto-generated unique customer identifier. |
| `name` | String | Full legal name of buyer. |
| `phone` | String | Primary 10-digit mobile contact number. |
| `email` | String | Billing email address for receipts. |
| `unitNumber` | String | Assigned flat, villa, or commercial unit number. |
| `totalContractValue`| Decimal(14,2)| Total sales price agreed in the builder-buyer agreement. |
| `totalPaid` | Decimal(14,2)| Cumulative installments received and verified in bank. |
| `status` | Enum | `ACTIVE`, `FULLY_PAID`, `CANCELLED`, `SETTLED`. |

---

## 9. Administrative Troubleshooting, Security Hardening & Disaster Recovery

### 9.1 Common Operational Issues & Administrator Solutions

| Symptom | Root Cause | Administrator Resolution |
| :--- | :--- | :--- |
| **"Email already registered"** | Attempting to provision a user with an email already present in database. | Check User Directory. If user exists, update their role or provide password reset. |
| **"Insufficient Treasury Balance"** | Liquid bank reserves (`Account 1010`) are lower than the allocation or payout amount. | Go to Treasury module -> Click `+ Record Bank Inflow` to record incoming capital or customer collections before disbursing. |
| **User cannot access Admin Hub** | User's role is set to `MANAGER`, `ACCOUNTING`, or `EMPLOYEE`. | Go to Employee Master, inspect user profile, and update role to `ADMIN` if authorized by board resolution. |
| **Expense receipt attachment won't display** | Browser popup blocker is active on `estatesync.devoxa.in`. | Instruct user to click the lock/settings icon in the browser address bar and enable "Popups and Redirects". |
| **Accidental double-click during fund allocation** | Cellular or network latency caused multiple submit events. | **Protected by Idempotency Engine:** The backend rejects identical idempotency tokens. Only one allocation will ever be written. |
| **Session expired abruptly** | JWT token reached its 24-hour lifetime limit. | Re-enter master credentials at `/login` to acquire a fresh cryptographically signed session token. |

### 9.2 Administrative Security Protocols
1. **Master Password Hygiene:** Use a complex passphrase with at least 12 characters combining uppercase, lowercase, numbers, and symbols.
2. **Device Locking:** Always lock your computer screen when leaving your desk (`Windows Key + L`).
3. **Audit Log Reviews:** Perform weekly reviews of the Security Audit Trail, specifically filtering for `USER_REGISTER` and `EXPENSE_REVERSE` to ensure no unauthorized activities occurred.

---

## 10. Roadmap & Version 3.0 Major Release Preview

The engineering team is finalizing the **EstateSync v3.0** upgrade. Here is what is arriving in the next release:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ESTATESYNC ROADMAP — VERSION 3.0                      │
├────────────────────────────┬────────────────────────────────────────────────┤
│ 🔐 In-App Password Change  │ Self-service password updates for all users    │
│                            │ plus administrative one-click password reset.  │
├────────────────────────────┼────────────────────────────────────────────────┤
│ 📝 Personal Sticky Notes   │ Private administrative pinboard & memos        │
│                            │ attachable to land deals, staff, and vouchers. │
├────────────────────────────┼────────────────────────────────────────────────┤
│ 🎨 Next-Gen UI Design      │ Ultra-modern glassmorphic design system,       │
│                            │ enhanced contrast, refined typography & tables.│
├────────────────────────────┼────────────────────────────────────────────────┤
│ 📊 1-Click Data Exporters  │ Instant Excel & PDF export for Balance Sheet,  │
│                            │ Trial Balance, General Ledger, and Users.      │
├────────────────────────────┼────────────────────────────────────────────────┤
│ 🚨 Real-Time Webhook Alerts│ Instant SMS & WhatsApp notifications for large  │
│                            │ bank inflows, milestone payouts, and reversals.│
└────────────────────────────┴────────────────────────────────────────────────┘
```

---

*EstateSync™ • A Product of Devoxa Technologies Pvt. Ltd.*  
*© 2026 All rights reserved. Registered Trademark ®*
