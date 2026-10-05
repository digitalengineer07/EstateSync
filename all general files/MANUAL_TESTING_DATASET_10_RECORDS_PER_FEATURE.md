# EstateSync — Master Manual Testing Dataset & Field Reference
> **Purpose**: Complete, ready-to-use testing values for end-to-end manual verification of every EstateSync feature.
> **Total Records**: **10 realistic records for each feature** (90 total test records across 9 core modules).
> **Usage Instructions**: Copy-paste or enter the exact field values below into their respective forms in the EstateSync web application.

---

## Table of Contents
1. [Feature 1: Bank Inflow & Corporate Treasury Deposits](#feature-1-bank-inflow--corporate-treasury-deposits)
2. [Feature 2: Customer Registration (New Bookings & Contracts)](#feature-2-customer-registration-new-bookings--contracts)
3. [Feature 3: Customer Payment Receipts (Collections)](#feature-3-customer-payment-receipts-collections)
4. [Feature 4: Land & Property Acquisition Master](#feature-4-land--property-acquisition-master)
5. [Feature 5: Land Owner Payouts (Land Purchase Disbursements)](#feature-5-land-owner-payouts-land-purchase-disbursements)
6. [Feature 6: Employee Master Registration](#feature-6-employee-master-registration)
7. [Feature 7: Staff Monthly Salary Disbursements](#feature-7-staff-monthly-salary-disbursements)
8. [Feature 8: Operational Wallet Top-Up Requisitions](#feature-8-operational-wallet-top-up-requisitions)
9. [Feature 9: Wallet Office & Field Expenditures](#feature-9-wallet-office--field-expenditures)

---

## Feature 1: Bank Inflow & Corporate Treasury Deposits
* **Navigation**: Accounting Dashboard (`/dashboards/accounting`) ➔ **"Bank Inflow & Treasury"** tab ➔ Click **"Record Bank Inflow"** button.
* **Form Name**: `Record Bank Deposit`
* **Accounting Effect**: Automates `[Debit] 1010 - Corporate Bank` and `[Credit] 3010 / 3020 / 4020` in the General Ledger.

| # | Amount (₹) | Deposit Type | Payment Mode | Bank Name | UTR / Reference No | Deposit Date | Account Number (Optional) | Description (Optional) |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **1** | `5000000.00` | Capital Investment | RTGS | HDFC Bank Ltd - Corporate | `UTR202609010091` | `2026-09-01` | `50200091823412` | Initial equity tranche from promoter group for Q3 operations |
| **2** | `2500000.00` | Director Loan | RTGS | ICICI Bank - Corporate | `UTR202609010092` | `2026-09-01` | `001205019823` | Short-term director bridge advance for site phase 2 |
| **3** | `150000.00` | Bank Interest | NEFT | HDFC Bank Ltd - Corporate | `UTR202609020015` | `2026-09-02` | `50200091823412` | Corporate fixed deposit interest payout for August |
| **4** | `10000000.00` | Capital Investment | Wire Transfer | State Bank of India - Commercial | `SBINW2026090299` | `2026-09-02` | `39810291823` | Foreign angel investor equity capital infusion |
| **5** | `1200000.00` | Director Loan | NEFT | HDFC Bank Ltd - Corporate | `UTR202609020044` | `2026-09-02` | `50200091823412` | Unsecured shareholder working capital deposit |
| **6** | `75000.00` | Other Deposit | IMPS | Axis Bank - Corporate | `IMPS20260903881` | `2026-09-03` | `91202003819201` | Refund of municipal project plan scrutiny fee |
| **7** | `3500000.00` | Capital Investment | RTGS | HDFC Bank Ltd - Corporate | `UTR202609030071` | `2026-09-03` | `50200091823412` | Partner growth capital for Green Valley Farms project |
| **8** | `500000.00` | Cash Deposit | Cash Deposit | HDFC Bank Ltd - Cash Counter | `CHQ-CSH-98124` | `2026-09-03` | `50200091823412` | Cash branch deposit of recovered client security token |
| **9** | `1850000.00` | Director Loan | RTGS | Kotak Mahindra Bank | `KOTAK2026090312` | `2026-09-03` | `8812049102` | Promoter expansion loan for civil construction equipment |
| **10** | `220000.00` | Bank Interest | NEFT | ICICI Bank - Corporate | `ICIC20260903049` | `2026-09-03` | `001205019823` | Sweep-in corporate liquid savings interest credit |

---

## Feature 2: Customer Registration (New Bookings & Contracts)
* **Navigation**: Accounting Dashboard ➔ **"Customer Collections"** tab (OR Wallet Dashboard ➔ **"Customer Bookings"** tab) ➔ Click **"Register New Customer"** button.
* **Form Name**: `Register New Customer (PRD §19)`
* **Accounting Effect**: Creates Receivable Master record and locks land commercial inventory.

### Customer Records 1 to 5:
```
--- RECORD 1 ---
Customer Name:      Rajesh Singhania
Mobile Contact:     9820198201
Email Address:      rajesh.singhania@gmail.com
Residential Address: Flat 402, Sea Breeze Apts, Worli, Mumbai
Project Location:   Grand View Residency Site
Plot Number:        GVR-A-101
Khata Number:       KHT-9012
Plot Area (Sq.Ft):  1500
Rate per Sq.Ft (₹): 3200
Land Cost (₹):      4800000 (auto-calculated: 1500 x 3200)
Registry Cost (₹):  250000
Development/Other:  150000
Discount (₹):       50000
Taxes (₹):          0
Identity Proof:     Aadhaar
Identity Number:    9812-4512-8921

--- RECORD 2 ---
Customer Name:      Dr. Sunita Deshmukh
Mobile Contact:     9819283741
Email Address:      sunita.deshmukh@apollohospitals.org
Residential Address: Bungalow 14, Koregaon Park, Pune
Project Location:   Green Valley Farms
Plot Number:        GVF-B-204
Khata Number:       KHT-4519
Plot Area (Sq.Ft):  2400
Rate per Sq.Ft (₹): 2800
Land Cost (₹):      6720000
Registry Cost (₹):  320000
Development/Other:  200000
Discount (₹):       100000
Taxes (₹):          0
Identity Proof:     PAN
Identity Number:    ABCPS8912E

--- RECORD 3 ---
Customer Name:      Vikrant Oberoi
Mobile Contact:     9876501234
Email Address:      vikrant.oberoi@oberoiholdings.in
Residential Address: 12th Floor, Imperial Towers, Tardeo, Mumbai
Project Location:   Skyline Meadows
Plot Number:        SKM-C-305
Khata Number:       KHT-7721
Plot Area (Sq.Ft):  1800
Rate per Sq.Ft (₹): 4500
Land Cost (₹):      8100000
Registry Cost (₹):  400000
Development/Other:  250000
Discount (₹):       150000
Taxes (₹):          0
Identity Proof:     Aadhaar
Identity Number:    7821-9921-3412

--- RECORD 4 ---
Customer Name:      Ananya Roy Chowdhury
Mobile Contact:     9830112233
Email Address:      ananya.rc@tcs.com
Residential Address: 8B, Silver Spring Residency, EM Bypass, Kolkata
Project Location:   Grand View Residency Site
Plot Number:        GVR-A-108
Khata Number:       KHT-9019
Plot Area (Sq.Ft):  1200
Rate per Sq.Ft (₹): 3200
Land Cost (₹):      3840000
Registry Cost (₹):  200000
Development/Other:  100000
Discount (₹):       0
Taxes (₹):          0
Identity Proof:     Aadhaar
Identity Number:    6512-8821-4433

--- RECORD 5 ---
Customer Name:      Capt. Harpreet Singh Gill
Mobile Contact:     9814098140
Email Address:      harpreet.gill@airindia.in
Residential Address: House 210, Sector 18, Chandigarh
Project Location:   Green Valley Farms
Plot Number:        GVF-B-212
Khata Number:       KHT-4528
Plot Area (Sq.Ft):  3000
Rate per Sq.Ft (₹): 2600
Land Cost (₹):      7800000
Registry Cost (₹):  350000
Development/Other:  250000
Discount (₹):       100000
Taxes (₹):          0
Identity Proof:     Passport
Identity Number:    Z8912049
```

### Customer Records 6 to 10:
```
--- RECORD 6 ---
Customer Name:      Manoj Kumar Agarwal
Mobile Contact:     9845012345
Email Address:      manoj.agarwal@marwaritraders.com
Residential Address: 45, Commercial Street, Bangalore
Project Location:   Palm County Villas
Plot Number:        PCV-D-401
Khata Number:       KHT-3312
Plot Area (Sq.Ft):  2000
Rate per Sq.Ft (₹): 3800
Land Cost (₹):      7600000
Registry Cost (₹):  380000
Development/Other:  180000
Discount (₹):       60000
Taxes (₹):          0
Identity Proof:     PAN
Identity Number:    BKPMA4412K

--- RECORD 7 ---
Customer Name:      Meenakshi Sundaram
Mobile Contact:     9840098400
Email Address:      meenakshi.sundaram@infosys.com
Residential Address: Flat 3A, Temple Bells, Alwarpet, Chennai
Project Location:   Grand View Residency Site
Plot Number:        GVR-A-115
Khata Number:       KHT-9025
Plot Area (Sq.Ft):  1350
Rate per Sq.Ft (₹): 3200
Land Cost (₹):      4320000
Registry Cost (₹):  220000
Development/Other:  120000
Discount (₹):       50000
Taxes (₹):          0
Identity Proof:     Aadhaar
Identity Number:    5544-3322-1100

--- RECORD 8 ---
Customer Name:      Deepak Chaurasia
Mobile Contact:     9811098110
Email Address:      deepak.chaurasia@indiatoday.in
Residential Address: D-404, Gaur City, Greater Noida West
Project Location:   Skyline Meadows
Plot Number:        SKM-C-310
Khata Number:       KHT-7729
Plot Area (Sq.Ft):  1650
Rate per Sq.Ft (₹): 4200
Land Cost (₹):      6930000
Registry Cost (₹):  340000
Development/Other:  200000
Discount (₹):       70000
Taxes (₹):          0
Identity Proof:     Aadhaar
Identity Number:    4499-2211-7788

--- RECORD 9 ---
Customer Name:      Kavita Rathi
Mobile Contact:     9829012345
Email Address:      kavita.rathi@rathitextiles.com
Residential Address: 14, Civil Lines, Jaipur
Project Location:   Green Valley Farms
Plot Number:        GVF-B-220
Khata Number:       KHT-4535
Plot Area (Sq.Ft):  2500
Rate per Sq.Ft (₹): 2750
Land Cost (₹):      6875000
Registry Cost (₹):  325000
Development/Other:  200000
Discount (₹):       100000
Taxes (₹):          0
Identity Proof:     PAN
Identity Number:    ARZPK9012J

--- RECORD 10 ---
Customer Name:      Sanjay Batra
Mobile Contact:     9818012345
Email Address:      sanjay.batra@batraexports.com
Residential Address: 72, Model Town, Delhi
Project Location:   Palm County Villas
Plot Number:        PCV-D-409
Khata Number:       KHT-3320
Plot Area (Sq.Ft):  2200
Rate per Sq.Ft (₹): 3900
Land Cost (₹):      8580000
Registry Cost (₹):  420000
Development/Other:  220000
Discount (₹):       120000
Taxes (₹):          0
Identity Proof:     Aadhaar
Identity Number:    3311-5544-7766
```

---

## Feature 3: Customer Payment Receipts (Collections)
* **Navigation**: Accounting Dashboard ➔ **"Customer Collections"** ➔ Click on any Customer row ➔ Click **"Record Payment"** in the Customer Statement modal.
* **Form Name**: `Record Customer Payment`
* **Accounting Effect**: `[Debit] 1010 - Corporate Treasury (Asset +)` and `[Credit] 1210 - Customer Receivables (Asset -)`. Reduces customer balance due.

| # | Customer Target | Payment Amount (₹) | Mode | Source Account / Bank | Destination Account | Reference / UTR No | Payment Date | Payment Purpose / Milestone |
|:---:|---|:---:|:---:|---|---|:---:|:---:|---|
| **1** | Rajesh Singhania (`GVR-A-101`) | `1000000.00` | RTGS | ICICI Bank - A/C 9812401 | Corporate Treasury HDFC (1010) | `UTR-CUST-891201` | `2026-09-01` | Token Booking Deposit (20%) |
| **2** | Dr. Sunita Deshmukh (`GVF-B-204`) | `1500000.00` | NEFT | SBI - A/C 30129012 | Corporate Treasury HDFC (1010) | `UTR-CUST-891202` | `2026-09-01` | Down Payment & Land Agreement |
| **3** | Vikrant Oberoi (`SKM-C-305`) | `2500000.00` | RTGS | HDFC Bank - A/C 50100412 | Corporate Treasury HDFC (1010) | `UTR-CUST-891203` | `2026-09-02` | 1st Installment Foundation Stage |
| **4** | Ananya Roy Chowdhury (`GVR-A-108`) | `800000.00` | IMPS | Axis Bank - A/C 91204012 | Corporate Treasury HDFC (1010) | `IMPS-CUST-891204` | `2026-09-02` | Initial Booking Token |
| **5** | Capt. Harpreet Gill (`GVF-B-212`) | `2000000.00` | RTGS | PNB - A/C 019200412 | Corporate Treasury HDFC (1010) | `UTR-CUST-891205` | `2026-09-02` | Milestone 1 Land Advance |
| **6** | Manoj Kumar Agarwal (`PCV-D-401`) | `1800000.00` | CHEQUE | Kotak Bank - Chq # 401921 | Corporate Treasury HDFC (1010) | `CHQ-401921` | `2026-09-03` | Villa Allotment Advance |
| **7** | Meenakshi Sundaram (`GVR-A-115`) | `1000000.00` | UPI | HDFC Bank - NetBanking | Corporate Treasury HDFC (1010) | `UPI-CUST-891207` | `2026-09-03` | Booking Amount Confirmation |
| **8** | Deepak Chaurasia (`SKM-C-310`) | `1500000.00` | NEFT | Bank of Baroda - A/C 1921 | Corporate Treasury HDFC (1010) | `UTR-CUST-891208` | `2026-09-03` | Phase 1 Plot Demarcation Due |
| **9** | Kavita Rathi (`GVF-B-220`) | `500000.00` | CASH | Cash in Hand | Cash in Hand | `CSH-REC-891209` | `2026-09-03` | Site Visit Token Cash Receipt |
| **10** | Sanjay Batra (`PCV-D-409`) | `2200000.00` | RTGS | IndusInd Bank - A/C 41209 | Corporate Treasury HDFC (1010) | `UTR-CUST-891210` | `2026-09-03` | Milestone 1 Agreement to Lease |

---

## Feature 4: Land & Property Acquisition Master
* **Navigation**: Accounting Dashboard ➔ **"Land Acquisitions"** tab ➔ Click **"Register New Land Acquisition"** button.
* **Form Name**: `Register New Land Acquisition (PRD §20)`
* **Accounting Effect**: Registers Corporate Land Capital Asset (Asset 1510) and establishes Seller Liability.

| # | Khata No | Plot No | Project Location | Land Owner Name | Contact | Residential Address | Area (Sq.Ft) | Total Land Value (₹) | Agreement Date |
|:---:|---|---|---|---|---|---|:---:|:---:|:---:|
| **1** | `KHT-LND-101` | `SURV-78/1` | Grand View Residency Extension | Rameshwar Yadav | `9890123456` | Village Bhondsi, Sohna Road, Gurugram | `45000` | `15000000.00` | `2026-08-15` |
| **2** | `KHT-LND-102` | `SURV-82/3` | Green Valley Sector 4 | Balwan Singh Choudhary | `9812345678` | Farmhouse 5, Dera Mandi, New Delhi | `60000` | `22000000.00` | `2026-08-20` |
| **3** | `KHT-LND-103` | `SURV-91/2` | Skyline Meadows Phase 3 | Mahendra Patel | `9825012345` | 14, Sardar Patel Colony, Ahmedabad | `35000` | `14000000.00` | `2026-08-25` |
| **4** | `KHT-LND-104` | `SURV-44/1` | Palm County Commercial Hub | Gurpreet Singh Dhillon | `9872012345` | GT Road, Khanna, Ludhiana | `50000` | `25000000.00` | `2026-08-28` |
| **5** | `KHT-LND-105` | `SURV-112` | Grand View Boulevard | Kishan Lal Sharma | `9829054321` | Bagru Industrial Road, Jaipur | `28000` | `9800000.00` | `2026-09-01` |
| **6** | `KHT-LND-106` | `SURV-65/4` | Green Valley Agro Orchards | Devendrappa Gowda | `9845098450` | Nelamangala Taluk, Bangalore Rural | `87120` | `30000000.00` | `2026-09-01` |
| **7** | `KHT-LND-107` | `SURV-33/2` | Skyline Heights Annex | Shivraj Deshmukh | `9822019822` | Baramati Village, Pune District | `40000` | `16000000.00` | `2026-09-02` |
| **8** | `KHT-LND-108` | `SURV-19/8` | Royal Palms Gated Township | Harishankar Tiwari | `9415012345` | Beli Road, Civil Lines, Prayagraj | `52000` | `18500000.00` | `2026-09-02` |
| **9** | `KHT-LND-109` | `SURV-57/3` | Lakeview Serenity Parcels | Subhash Chandra Bose Naidu | `9848012345` | Gajuwaka Mandal, Visakhapatnam | `65000` | `24000000.00` | `2026-09-03` |
| **10** | `KHT-LND-110` | `SURV-102` | Heritage Hills Eco Enclave | Bimaleshwar Jha | `9835012345` | Bypass Road, Begusarai, Bihar | `32000` | `11200000.00` | `2026-09-03` |

---

## Feature 5: Land Owner Payouts (Land Purchase Disbursements)
* **Navigation**: Accounting Dashboard ➔ **"Land Acquisitions"** ➔ Click on any Property row ➔ Click **"Disburse Owner Payout"** in modal.
* **Form Name**: `Record Land Owner Payment`
* **Accounting Effect**: `[Credit] 1010 Corporate Treasury (Asset -)` and increases `totalPaidToOwner` under Asset 1510.

| # | Target Parcel / Khata | Payout Amount (₹) | Mode | Paid From Account | Reference / UTR No | Date | Milestone Notes |
|:---:|---|:---:|:---:|---|:---:|:---:|---|
| **1** | `KHT-LND-101` (Rameshwar Yadav) | `3000000.00` | RTGS | Corporate Bank (1010) | `UTR-LND-771201` | `2026-09-01` | Token Advance for Registry Verification |
| **2** | `KHT-LND-102` (Balwan Singh) | `5000000.00` | RTGS | Corporate Bank (1010) | `UTR-LND-771202` | `2026-09-01` | Sale Agreement 1st Milestone Execution |
| **3** | `KHT-LND-103` (Mahendra Patel) | `2500000.00` | RTGS | Corporate Bank (1010) | `UTR-LND-771203` | `2026-09-02` | Boundary Wall Demarcation Clearance |
| **4** | `KHT-LND-104` (Gurpreet Dhillon) | `4000000.00` | RTGS | Corporate Bank (1010) | `UTR-LND-771204` | `2026-09-02` | Advance against Land Possession Handover |
| **5** | `KHT-LND-105` (Kishan Lal Sharma) | `1500000.00` | NEFT | Corporate Bank (1010) | `UTR-LND-771205` | `2026-09-02` | Initial Token Earnest Deposit |
| **6** | `KHT-LND-106` (Devendrappa Gowda) | `6000000.00` | RTGS | Corporate Bank (1010) | `UTR-LND-771206` | `2026-09-03` | Title Deed Scrutiny Clearance Milestone |
| **7** | `KHT-LND-107` (Shivraj Deshmukh) | `3500000.00` | RTGS | Corporate Bank (1010) | `UTR-LND-771207` | `2026-09-03` | Sub-Registrar NOC Sign-Off Payment |
| **8** | `KHT-LND-108` (Harishankar Tiwari)| `3000000.00` | RTGS | Corporate Bank (1010) | `UTR-LND-771208` | `2026-09-03` | Revenue Record Mutation Advance |
| **9** | `KHT-LND-109` (Subhash C. Naidu) | `4500000.00` | RTGS | Corporate Bank (1010) | `UTR-LND-771209` | `2026-09-03` | Conversion & Zoning Approval Clearance |
| **10** | `KHT-LND-110` (Bimaleshwar Jha) | `2000000.00` | NEFT | Corporate Bank (1010) | `UTR-LND-771210` | `2026-09-03` | 1st Registered Agreement Payment |

---

## Feature 6: Employee Master Registration
* **Navigation**: Employees Dashboard (`/dashboards/employees`) ➔ Click **"+ Add New Employee"** button.
* **Form Name**: `New Staff Registration`
* **Accounting & HR Effect**: Sets up Staff Directory record, compensation base, and banking details.

```
--- EMPLOYEE 1 ---
Employee Code:      EMP-000011
Full Name:          Rohitashwa Verma
Mobile:             9820011111
Email:              rohitashwa.verma@estatesync.local
Department:         Site Civil Engineering
Designation:        Senior Project Manager
Employment Type:    FULL_TIME
Joining Date:       2026-01-10
Work Location:      Grand View Residency Site
Base Salary (₹):    75000.00
Bank Name:          HDFC Bank Ltd
Bank Account No:    50100492817201
IFSC Code:          HDFC0001045
UPI ID:             rohit.verma@okhdfcbank

--- EMPLOYEE 2 ---
Employee Code:      EMP-000012
Full Name:          Pooja Bhattacharya
Mobile:             9820022222
Email:              pooja.bhattacharya@estatesync.local
Department:         Legal & Compliance
Designation:        Senior Legal Counsel
Employment Type:    FULL_TIME
Joining Date:       2026-02-01
Work Location:      Head Office
Base Salary (₹):    85000.00
Bank Name:          ICICI Bank Ltd
Bank Account No:    001205928102
IFSC Code:          ICIC0000012
UPI ID:             pooja.law@okaxis

--- EMPLOYEE 3 ---
Employee Code:      EMP-000013
Full Name:          Siddharth Malhotra
Mobile:             9820033333
Email:              siddharth.m@estatesync.local
Department:         Sales & Marketing
Designation:        Assistant General Manager - Sales
Employment Type:    FULL_TIME
Joining Date:       2026-02-15
Work Location:      Skyline Meadows
Base Salary (₹):    95000.00
Bank Name:          Kotak Mahindra Bank
Bank Account No:    881204918231
IFSC Code:          KKBK0000958
UPI ID:             siddharth.sales@paytm

--- EMPLOYEE 4 ---
Employee Code:      EMP-000014
Full Name:          Amitabh Saxena
Mobile:             9820044444
Email:              amitabh.saxena@estatesync.local
Department:         Finance & Accounts
Designation:        Senior Chartered Accountant
Employment Type:    FULL_TIME
Joining Date:       2026-03-01
Work Location:      Head Office
Base Salary (₹):    110000.00
Bank Name:          HDFC Bank Ltd
Bank Account No:    50100492817204
IFSC Code:          HDFC0001045
UPI ID:             amitabh.ca@okhdfcbank

--- EMPLOYEE 5 ---
Employee Code:      EMP-000015
Full Name:          Neha Sharma
Mobile:             9820055555
Email:              neha.sharma@estatesync.local
Department:         Architecture & Design
Designation:        Lead Urban Architect
Employment Type:    FULL_TIME
Joining Date:       2026-03-15
Work Location:      Head Office
Base Salary (₹):    90000.00
Bank Name:          Axis Bank Ltd
Bank Account No:    91201002938105
IFSC Code:          UTIB0000056
UPI ID:             neha.architect@axisbank

--- EMPLOYEE 6 ---
Employee Code:      EMP-000016
Full Name:          Gaurav Khandelwal
Mobile:             9820066666
Email:              gaurav.k@estatesync.local
Department:         Site Operations
Designation:        Site Safety & Quality Officer
Employment Type:    FULL_TIME
Joining Date:       2026-04-01
Work Location:      Green Valley Farms
Base Salary (₹):    48000.00
Bank Name:          State Bank of India
Bank Account No:    398102918206
IFSC Code:          SBIN0001234
UPI ID:             gaurav.site@oksbi

--- EMPLOYEE 7 ---
Employee Code:      EMP-000017
Full Name:          Ritu Rajan
Mobile:             9820077777
Email:              ritu.rajan@estatesync.local
Department:         Customer Relations
Designation:        CRM Client Manager
Employment Type:    FULL_TIME
Joining Date:       2026-04-15
Work Location:      Head Office
Base Salary (₹):    52000.00
Bank Name:          HDFC Bank Ltd
Bank Account No:    50100492817207
IFSC Code:          HDFC0001045
UPI ID:             ritu.crm@okhdfcbank

--- EMPLOYEE 8 ---
Employee Code:      EMP-000018
Full Name:          Kunal Deshmukh
Mobile:             9820088888
Email:              kunal.d@estatesync.local
Department:         Procurement & Contracts
Designation:        Materials Sourcing Manager
Employment Type:    FULL_TIME
Joining Date:       2026-05-01
Work Location:      Grand View Residency Site
Base Salary (₹):    65000.00
Bank Name:          ICICI Bank Ltd
Bank Account No:    001205928108
IFSC Code:          ICIC0000012
UPI ID:             kunal.procure@okicici

--- EMPLOYEE 9 ---
Employee Code:      EMP-000019
Full Name:          Sunil Kashyap
Mobile:             9820099999
Email:              sunil.kashyap@estatesync.local
Department:         Civil Construction
Designation:        Site Supervisor
Employment Type:    CONTRACT
Joining Date:       2026-05-15
Work Location:      Palm County Villas
Base Salary (₹):    38000.00
Bank Name:          Punjab National Bank
Bank Account No:    019200412809
IFSC Code:          PUNB0019200
UPI ID:             sunil.kashyap@pnb

--- EMPLOYEE 10 ---
Employee Code:      EMP-000020
Full Name:          Meera Nambiar
Mobile:             9820000000
Email:              meera.nambiar@estatesync.local
Department:         Human Resources
Designation:        HR Talent & Payroll Lead
Employment Type:    FULL_TIME
Joining Date:       2026-06-01
Work Location:      Head Office
Base Salary (₹):    70000.00
Bank Name:          HDFC Bank Ltd
Bank Account No:    50100492817210
IFSC Code:          HDFC0001045
UPI ID:             meera.hr@okhdfcbank
```

---

## Feature 7: Staff Monthly Salary Disbursements
* **Navigation**: Open any Employee's profile (`/dashboards/employees/[id]`) ➔ Lands directly on **"Salary & Payouts"** tab ➔ Click **"Pay Monthly Salary"**.
* **Form Name**: `Disburse Monthly Salary`
* **Accounting Effect**: Atomic `[Credit] 1010 Corporate Treasury` and `[Debit] 5010 Employee Salaries Expense` via GL Journal Entry.

| # | Employee Recipient | Month | Amount (₹) | Payment Mode | Bank Reference / UTR No | Notes / Voucher Narration |
|:---:|---|:---:|:---:|:---:|:---:|---|
| **1** | Rohitashwa Verma (`EMP-000011`) | `2026-08` | `75000.00` | NEFT | `UTR-SAL-202608-01` | August 2026 regular monthly compensation |
| **2** | Pooja Bhattacharya (`EMP-000012`) | `2026-08` | `85000.00` | RTGS | `UTR-SAL-202608-02` | August 2026 legal counsel salary payout |
| **3** | Siddharth Malhotra (`EMP-000013`) | `2026-08` | `95000.00` | RTGS | `UTR-SAL-202608-03` | August 2026 sales division management salary |
| **4** | Amitabh Saxena (`EMP-000014`) | `2026-08` | `110000.00` | RTGS | `UTR-SAL-202608-04` | August 2026 executive finance & audit compensation |
| **5** | Neha Sharma (`EMP-000015`) | `2026-08` | `90000.00` | NEFT | `UTR-SAL-202608-05` | August 2026 architecture division payroll |
| **6** | Gaurav Khandelwal (`EMP-000016`) | `2026-08` | `48000.00` | NEFT | `UTR-SAL-202608-06` | August 2026 site quality supervision compensation |
| **7** | Ritu Rajan (`EMP-000017`) | `2026-08` | `52000.00` | UPI | `UPI-SAL-202608-07` | August 2026 CRM operations monthly stipend |
| **8** | Kunal Deshmukh (`EMP-000018`) | `2026-08` | `65000.00` | NEFT | `UTR-SAL-202608-08` | August 2026 procurement management compensation |
| **9** | Sunil Kashyap (`EMP-000019`) | `2026-08` | `38000.00` | CASH | `CASH-SAL-202608-09` | August 2026 on-site contract supervision cash stipend |
| **10** | Meera Nambiar (`EMP-000020`) | `2026-08` | `70000.00` | NEFT | `UTR-SAL-202608-10` | August 2026 human resources division payroll |

---

## Feature 8: Operational Wallet Top-Up Requisitions
* **Navigation**: Personal Wallet Dashboard (`/dashboards/wallet`) ➔ Left Card **"Request Wallet Top-Up"**.
* **Form Name**: `Request Wallet Top-Up`
* **Accounting & Workflow Effect**: Routes request to designated Manager/Admin. Upon approval, corporate treasury liquid/cash balance is allocated to requester.

| # | Approver Selection | Amount (₹) | Fund Mode | Reason for Request |
|:---:|---|:---:|:---:|---|
| **1** | System Administrator (`admin@estatesync.local`) | `25000.00` | Liquid (Online / Bank) | Site structural core testing and soil bearing inspection fees |
| **2** | System Administrator (`admin@estatesync.local`) | `15000.00` | Cash (Physical) | Emergency site labour hydration, safety helmets, and medical kit |
| **3** | Operations Manager (`manager@estatesync.local`) | `40000.00` | Liquid (Online / Bank) | Municipal zonal authority blueprint scrutiny & survey charges |
| **4** | Operations Manager (`manager@estatesync.local`) | `10000.00` | Cash (Physical) | Boundary marker stones and trenching labour daily wages |
| **5** | System Administrator (`admin@estatesync.local`) | `50000.00` | Liquid (Online / Bank) | Sub-registrar legal fee stamp paper acquisition for Land parcel 101 |
| **6** | Operations Manager (`manager@estatesync.local`) | `30000.00` | Liquid (Online / Bank) | Architect elevation 3D rendering and VR walkthrough software license |
| **7** | System Administrator (`admin@estatesync.local`) | `12000.00` | Cash (Physical) | Generator diesel refueling and site generator maintenance |
| **8** | Operations Manager (`manager@estatesync.local`) | `20000.00` | Liquid (Online / Bank) | High-resolution drone aerial videography for client presentations |
| **9** | System Administrator (`admin@estatesync.local`) | `35000.00` | Liquid (Online / Bank) | Environmental impact assessment compliance report fee |
| **10** | Operations Manager (`manager@estatesync.local`) | `8000.00` | Cash (Physical) | Client meeting hospitality, tea/snacks, and site office stationery |

---

## Feature 9: Wallet Office & Field Expenditures
* **Navigation**: Personal Wallet Dashboard (`/dashboards/wallet`) ➔ Right Card **"Record Wallet Expense"**.
* **Form Name**: `Record Wallet Expense`
* **Accounting Effect**: `[Debit] 50xx Operating Expense Account` and `[Credit] Operational Wallet Balance`. Reduces employee wallet balance.

| # | Amount (₹) | Payment Mode | Date | Category | Description | Reference / Invoice # |
|:---:|:---:|:---:|:---:|---|---|:---:|
| **1** | `4500.00` | Liquid | `2026-09-01` | Operational Supplies | Site worker safety shoes, reflective vests, and gloves | `INV-SAFE-901` |
| **2** | `2800.00` | Cash | `2026-09-01` | Office Expense | High-speed printer toner cartridges and A4 ream bundles | `BILL-STAT-412` |
| **3** | `12500.00` | Liquid | `2026-09-02` | Travel & Conveyance | Flight tickets Mumbai-Delhi for promoter project meeting | `INDIGO-78192` |
| **4** | `3200.00` | Cash | `2026-09-02` | Client Hospitality | Lunch with High-Net-Worth buyer at Oberoi Grand | `HOTEL-REC-109` |
| **5** | `18000.00` | Liquid | `2026-09-02` | Legal & Professional | Legal vetting fee for Land Registry Parcel KHT-LND-102 | `LEGAL-INV-551` |
| **6** | `6500.00` | Liquid | `2026-09-03` | Marketing & Advertising | Meta Facebook Ads campaign for Grand View Residency | `FB-ADS-202609` |
| **7** | `4200.00` | Cash | `2026-09-03` | Site Operations | 50 Litres diesel fuel for JCB land leveling equipment | `PETROL-PUMP-89` |
| **8** | `1500.00` | Cash | `2026-09-03` | Office Expense | Fiber broadband office internet annual router service | `AIRTEL-REC-331` |
| **9** | `9500.00` | Liquid | `2026-09-03` | Equipment & Repairs | Total Station digital survey camera lens calibration | `GEO-TECH-8812` |
| **10** | `2100.00` | Cash | `2026-09-03` | Travel & Conveyance | Ola Corporate cab rides for client site inspections | `OLA-TRIP-90412` |

---

## 🎯 Quick Verification Workflow Checklist

1. **Test Bank Inflow**:
   - Go to `/dashboards/accounting` ➔ Inflow modal ➔ Enter **Record 1** (`₹50,00,000` Capital RTGS).
   - Check if Main Treasury Liquidity increases by ₹50,00,000 on both Accounting and Admin dashboards.
2. **Test Customer Booking**:
   - Go to Customer Collections ➔ Click Register ➔ Enter **Record 1** (`Rajesh Singhania`, Plot `GVR-A-101`).
   - Check if Customer appears in table with total contract value of ₹51,50,000.
3. **Test Customer Payment**:
   - Click Rajesh Singhania's row ➔ Click Record Payment ➔ Enter **Payment Record 1** (`₹10,00,000`).
   - Verify balance due reduces to ₹41,50,000 and Corporate Treasury increases by ₹10,00,000.
4. **Test Land Acquisition & Payout**:
   - Go to Land Acquisitions ➔ Enter **Land Record 1** (`Rameshwar Yadav`, `₹1,50,00,000`).
   - Click row ➔ Disburse Payout ➔ Enter **Payout Record 1** (`₹30,00,000`).
   - Verify Corporate Treasury reflects the ₹30,00,000 outflow and Asset 1510 shows ₹30,00,000 paid.
5. **Test Employee Salary**:
   - Go to `/dashboards/employees` ➔ Add New Employee ➔ Enter **Employee Record 1** (`Rohitashwa Verma`, `₹75,000`).
   - Open his profile ➔ Verify it lands on **Salary & Payouts** ➔ Click "Pay Monthly Salary" ➔ Enter **Disbursement Record 1**.
   - Verify payout is logged in history table with automated GL Journal number.
6. **Test Wallet Top-Up & Expense**:
   - Go to `/dashboards/wallet` ➔ Submit **Top-Up Record 1** (`₹25,000`).
   - Login as Admin or Manager ➔ Approve the request.
   - Return to Wallet ➔ Verify available wallet balance increased by ₹25,000 ➔ Record **Expense Record 1** (`₹4,500`).
