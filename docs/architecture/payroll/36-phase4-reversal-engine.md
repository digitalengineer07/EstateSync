# EstateSync Payroll System — Phase 4: General Ledger Reversal Engine

## 1. Overview
In accordance with professional double-entry accounting standards, posted General Ledger entries are immutable and cannot be deleted or overwritten. If an error is discovered in a locked payroll run after it has been posted to the General Ledger, the posting must be reversed via an explicit, symmetric opposite Journal Entry.

## 2. Reversal Governance & Authorization
- **Admin Only**: Reversing a General Ledger journal entry directly alters company balance sheet liabilities, statutory tax withholdings, and operational expense reporting. Therefore, `POST /runs/:id/reverse-ledger-posting` is strictly restricted to the `ADMIN` role (`payroll.accounting.reverse` permission).
- **Mandatory Reason**: Reversal requests require a mandatory, non-empty `reason` string that is recorded in both the journal description and the audit log.

## 3. Symmetric Reversal Mechanism

The reversal engine maps the original lines directly into their exact financial opposites:
$$\text{Reversal Debit} = \text{Original Credit}$$
$$\text{Reversal Credit} = \text{Original Debit}$$

```
ORIGINAL POSTING (JE-20260901-0023)
  Dr. 5060 Salaries Expense         ₹71,200
  Dr. 5070 Employer PF Expense      ₹5,400
  Cr. 2020 Employee PF Payable      ₹5,400
  Cr. 2025 Employer PF Payable      ₹5,400
  Cr. 1040 Employee Advance Asset   ₹2,000
  Cr. 2010 Net Salaries Payable     ₹63,800

REVERSAL POSTING (JE-20260901-0024)
  Dr. 2020 Employee PF Payable      ₹5,400
  Dr. 2025 Employer PF Payable      ₹5,400
  Dr. 1040 Employee Advance Asset   ₹2,000
  Dr. 2010 Net Salaries Payable     ₹63,800
  Cr. 5060 Salaries Expense         ₹71,200
  Cr. 5070 Employer PF Expense      ₹5,400
```

## 4. State Transitions on Reversal
1. Original `JournalEntry.status` transitions from `POSTED` to `REVERSED`.
2. New Reversal `JournalEntry` is created with `referenceType = 'PAYROLL_REVERSAL'`, `referenceId = run.id`, and `status = 'POSTED'`.
3. `PayrollAccountingPosting.status` transitions to `REVERSED` and sets `reversalJournalEntryId = reversalEntry.id`.
4. Subsequent reversal attempts on the same run are rejected with `HTTP 400` ("Only active POSTED entries can be reversed").
