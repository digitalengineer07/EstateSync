# Phase 2: Database Schema & Relational Specifications

**Document**: Phase 2 Implementation — PostgreSQL / Prisma Data Architecture  
**Status**: ACTIVE & MIGRATED

---

## 1. Relational Schema Architecture

```mermaid
erDiagram
    Employee ||--o{ EmployeeSalaryAssignment : "assigned to"
    SalaryStructure ||--o{ EmployeeSalaryAssignment : "referenced in"
    SalaryStructure ||--|{ SalaryStructureLine : "contains"
    SalaryComponent ||--o{ SalaryStructureLine : "configured in"

    Employee {
        string id PK
        string employeeCode UK
        string fullName
        string status
    }

    SalaryComponent {
        string id PK
        string code UK
        string name
        string componentType
        string calculationMethod
        decimal defaultValue
        decimal percentageValue
        boolean isActive
    }

    SalaryStructure {
        string id PK
        string code UK
        string name
        string currency
        string status
        int version
    }

    SalaryStructureLine {
        string id PK
        string structureId FK
        string componentId FK
        string calculationMethod
        decimal value
        decimal percentage
        int sequence
    }

    EmployeeSalaryAssignment {
        string id PK
        string employeeId FK
        string salaryStructureId FK
        decimal baseGross
        datetime effectiveFrom
        datetime effectiveTo
        string status
    }
```

---

## 2. Integrity & Deletion Constraints

1. **`SalaryComponent`**: `onDelete: Restrict` on `SalaryStructureLine` prevents dropping components that are referenced by existing structures.
2. **`SalaryStructure`**: `onDelete: Restrict` on `EmployeeSalaryAssignment` prevents deleting structures that are assigned to employees.
3. **`Employee`**: `onDelete: Restrict` on `EmployeeSalaryAssignment` preserves historical compensation records even if employee records undergo archival.
