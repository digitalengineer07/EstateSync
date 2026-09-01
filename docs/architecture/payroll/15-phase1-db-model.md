# Phase 1: Database Schema & Entity Relational Model

**Document**: Phase 1 Implementation — PostgreSQL / Prisma Data Specifications  
**Status**: ACTIVE & MIGRATED

---

## 1. Prisma Schema Definition

```prisma
model Employee {
  id                 String      @id @default(uuid())
  employeeCode       String      @unique // e.g. "EMP-000001"
  fullName           String
  displayName        String?
  photo              String?
  mobile             String      @unique
  alternatePhone     String?
  email              String?     @unique
  address            String?
  department         String      // Sales, Accounting, Management, Marketing, Operations, Security, General
  designation        String      // Accountant, Sales Rep, Guard, Driver, Operator, etc.
  employmentType     String      @default("FULL_TIME") // FULL_TIME, PART_TIME, CONTRACT, PROBATION, INTERN
  joiningDate        DateTime
  confirmationDate   DateTime?
  reportingManagerId String?
  reportingManager   Employee?   @relation("ManagerSubordinates", fields: [reportingManagerId], references: [id], onDelete: SetNull)
  subordinates       Employee[]  @relation("ManagerSubordinates")
  workLocation       String?     @default("Head Office")
  status             String      @default("ACTIVE") // ACTIVE, INACTIVE, ARCHIVED, ON_LEAVE, RESIGNED, TERMINATED
  exitDate           DateTime?
  exitReason         String?
  userId             String?     @unique
  user               User?       @relation("UserEmployee", fields: [userId], references: [id], onDelete: SetNull)
  createdBy          String?
  updatedBy          String?
  archivedAt         DateTime?
  archivedBy         String?
  createdAt          DateTime    @default(now())
  updatedAt          DateTime    @updatedAt

  @@index([employeeCode])
  @@index([fullName])
  @@index([mobile])
  @@index([email])
  @@index([status])
  @@index([department])
  @@index([userId])
}
```

---

## 2. Foreign Key & Integrity Specifications

1. **`userId` Foreign Key**:
   - `fields: [userId], references: [id]`
   - `onDelete: SetNull`: Deleting or modifying a `User` account never drops the `Employee` master.
2. **`reportingManagerId` Self-Relation**:
   - `fields: [reportingManagerId], references: [id]`
   - `onDelete: SetNull`: Archiving or altering a manager record unlinks subordinates safely without cascading deletions.
3. **Indexes**:
   - Composite and single-column b-tree indexes on high-frequency search fields (`employeeCode`, `fullName`, `mobile`, `email`, `department`, `status`, `userId`).
