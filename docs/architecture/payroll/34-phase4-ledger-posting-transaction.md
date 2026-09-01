# EstateSync Payroll System — Phase 4: Ledger Posting Transaction Specification

## 1. Overview
The Ledger Posting Engine commits a locked payroll run to the General Ledger within a single, atomic interactive database transaction (`prisma.$transaction`).

## 2. Transaction Flow & Atomicity

```
[ POST /api/v1/payroll/runs/:id/post-to-ledger ]
                      │
                      ▼
        ┌───────────────────────────┐
        │ BEGIN prisma.$transaction │
        └─────────────┬─────────────┘
                      │
     1. Re-validate status == LOCKED & no active posting
                      │
     2. Build balanced journal lines (totalDebit == totalCredit)
                      │
     3. accountingHelper.postJournalEntry(tx, {...})
        ├── Generates entryNumber (e.g. "JE-20260901-0023")
        ├── Creates JournalEntry (referenceType = 'PAYROLL', referenceId = run.id)
        └── Creates JournalLine[]
                      │
     4. tx.payrollAccountingPosting.create({...})
        ├── payrollRunId (1-to-1 unique)
        ├── journalEntryId (1-to-1 unique)
        └── Snapshot totals & audit metadata
                      │
     5. logAudit({... tx, action: 'PAYROLL_JOURNAL_POST' })
                      │
                      ▼
        ┌───────────────────────────┐
        │ COMMIT prisma.$transaction│
        └───────────────────────────┘
```

## 3. Database Linkage Model (`PayrollAccountingPosting`)

```prisma
model PayrollAccountingPosting {
  id                     String        @id @default(uuid())
  payrollRunId           String        @unique
  payrollRun             PayrollRun    @relation(fields: [payrollRunId], references: [id], onDelete: Restrict)
  journalEntryId         String        @unique
  journalEntry           JournalEntry  @relation("OriginalPostingJournal", fields: [journalEntryId], references: [id], onDelete: Restrict)
  reversalJournalEntryId String?       @unique
  reversalJournalEntry   JournalEntry? @relation("ReversalPostingJournal", fields: [reversalJournalEntryId], references: [id], onDelete: Restrict)
  status                 String        @default("POSTED") // POSTED, REVERSED
  postedGross            Decimal       @db.Decimal(15, 2)
  postedDeductions       Decimal       @db.Decimal(15, 2)
  postedNet              Decimal       @db.Decimal(15, 2)
  postedEmployerCost     Decimal       @db.Decimal(15, 2)
  totalDebit             Decimal       @db.Decimal(15, 2)
  totalCredit            Decimal       @db.Decimal(15, 2)
  postedBy               String
  postedAt               DateTime      @default(now())
  createdAt              DateTime      @default(now())
  updatedAt              DateTime      @updatedAt

  @@index([payrollRunId])
  @@index([journalEntryId])
  @@index([status])
}
```

## 4. Concurrency & Idempotency Safeguards
- The `@unique` constraint on `payrollRunId` guarantees at the PostgreSQL database engine level that no two concurrent requests can create duplicate postings for the same payroll run.
- Network retries with the same `Idempotency-Key` header return the cached 201 response directly.
