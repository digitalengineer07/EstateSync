# EstateSync: Notification Architecture & Future Payroll Integration

**Document**: Phase 0 Discovery — Notification Integration Map  
**Status**: ACTIVE BASELINE

---

## 1. Current Notification Subsystem State

- **Current Reality in Repository**:
  - No external SMS (e.g. Twilio, MSG91) or Email (e.g. Nodemailer, SendGrid, AWS SES) library is currently configured in `backend/package.json`.
  - Notifications are not actively dispatched in the existing modules.
- **Classification**: **NEW / UNCONFIGURED CROSS-CUTTING SERVICE**.

---

## 2. Future Payroll Notification Architecture (Target Design)

When communication services are introduced for the payroll module, they will follow a decoupled **Transactional Outbox Event Pattern** to ensure that network failures in SMS/Email delivery NEVER crash or rollback financial database transactions:

```
[ Financial Operation ] (e.g. Salary Payment Disbursed / Payslip Generated)
          │
          ▼
[ Database Transaction (PostgreSQL) ]
├── Update PayrollItem status to 'PAID'
├── Decrement Corporate Treasury Wallet
├── Create JournalEntry (Double-Entry GL)
└── Insert row into NotificationOutbox Table (status: 'PENDING')
          │
          ▼ (Commit Transaction)
[ Async Notification Worker / Event Dispatcher ]
├── Polls NotificationOutbox
├── Renders Template (SMS text / Email HTML)
├── Calls SMS/Email Provider
└── Updates NotificationOutbox (status: 'SENT' or 'FAILED' with retry count)
```

---

## 3. Planned Payroll Notification Triggers

| Event Trigger | Notification Channel | Recipient | Payload Description |
| :--- | :---: | :--- | :--- |
| **Salary Disbursed** | SMS & Email | Employee Phone / Email | "Dear {Name}, your salary of ₹{NetPay} for {Month} has been credited via {Mode} (Ref: {UTR})." |
| **Advance Disbursed** | SMS | Employee Phone | "Dear {Name}, an advance of ₹{Amount} has been disbursed from company treasury." |
| **Payroll Approval Required** | In-App / Email | Master Admin | "Monthly payroll for {Month} (Total: ₹{Gross}) has been calculated and requires your approval." |
| **Payslip Available** | Email | Linked Employee User | Monthly PDF payslip attachment with earnings and deductions breakdown. |

> **Phase 0 Rule**: No notification dependencies or background workers are introduced in Phase 0.
