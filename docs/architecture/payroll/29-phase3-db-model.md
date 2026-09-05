# Phase 3: Database Schema & Relational Specifications

**Document**: Phase 3 Implementation — PostgreSQL / Prisma Data Architecture  
**Status**: ACTIVE & MIGRATED

---

## 1. Relational Schema Architecture

```mermaid
erDiagram
    PayrollPeriod ||--o{ PayrollRun : "contains"
    PayrollRun ||--|{ PayrollItem : "calculates"
    PayrollRun ||--o{ PayrollAdjustment : "applies"
    PayrollRun ||--o{ PayrollException : "logs"
    PayrollItem ||--|{ PayrollLine : "itemizes"
    Employee ||--o{ PayrollItem : "belongs to"
    Employee ||--o{ PayrollAdjustment : "adjusted for"
    Employee ||--o{ PayrollException : "flagged in"

    PayrollPeriod {
        string id PK
        int year
        int month
        datetime periodStart
        datetime periodEnd
        string status
    }

    PayrollRun {
        string id PK
        string payrollPeriodId FK
        int runNumber
        string status
        decimal totalGross
        decimal totalDeductions
        decimal totalNet
        decimal totalEmployerCost
    }

    PayrollItem {
        string id PK
        string payrollRunId FK
        string employeeId FK
        decimal grossEarnings
        decimal totalDeductions
        decimal netPayable
        string status
    }

    PayrollLine {
        string id PK
        string payrollItemId FK
        string componentCode
        string componentType
        decimal amount
        string glAccountCodeSnapshot
    }
```

---

## 2. Integrity & Deletion Rules

1. **`PayrollPeriod` $\rightarrow$ `PayrollRun`**: `onDelete: Restrict` prevents deletion of periods with existing calculation history.
2. **`PayrollRun` $\rightarrow$ `PayrollItem` $\rightarrow$ `PayrollLine`**: `onDelete: Cascade` enables clean, atomic draft run recalculations.
3. **`Employee` $\rightarrow$ `PayrollItem`**: `onDelete: Restrict` prevents deletion of employees who have historical payroll records.
