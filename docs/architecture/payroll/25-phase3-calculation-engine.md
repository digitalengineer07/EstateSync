# Phase 3: Payroll Calculation Engine & Mathematical Semantics

**Document**: Phase 3 Implementation — Formulas, Sequencing & Cycle Protection  
**Status**: IMPLEMENTED & LOCKED

---

## 1. Mathematical Formulas (Decimal Precision)

All monetary calculations use strict 2-decimal rounding (`round(x, 2)`) to eliminate floating-point drift:

| Calculation Method | Mathematical Formula | Base Reference |
| :--- | :--- | :--- |
| **`FIXED_AMOUNT`** | $\text{Amount} = \text{line.value}$ | Flat |
| **`PERCENTAGE_OF_BASIC`** | $\text{Amount} = \text{round}\left(\text{BASIC} \times \frac{\text{percentage}}{100}\right)$ | Calculated Basic |
| **`PERCENTAGE_OF_GROSS`** | $\text{Amount} = \text{round}\left(\text{baseGross} \times \frac{\text{percentage}}{100}\right)$ | Contractual `baseGross` |
| **`PERCENTAGE_OF_COMPONENT`** | $\text{Amount} = \text{round}\left(\text{Comp}_{\text{base}} \times \frac{\text{percentage}}{100}\right)$ | Referenced component |
| **`MANUAL_AMOUNT`** | $\text{Amount} = \text{adjustment.amount} \lor \text{line.value}$ | Flat / Adjustment |

---

## 2. Sequence Ordering & Cycle Detection

1. **Sequence Sorting**: Lines are evaluated in strict ascending integer `sequence` order (Basic = 1, HRA = 2, PF = 10).
2. **Cycle Protection**: Prior to computation, the engine constructs a directed graph of component dependencies and applies Depth-First Search (DFS) cycle detection. If a cycle is detected, computation is aborted and a `CIRCULAR_COMPONENT_DEPENDENCY` blocking exception is logged.

---

## 3. Net Payable Aggregation

$$\text{Net Payable} = \text{Gross Earnings} + \text{Reimbursements} + \text{Credit Adjustments} - \text{Total Deductions} - \text{Debit Adjustments}$$

- **Negative Net Pay Rule**: If $\text{Net Payable} < 0$, the item status is set to `BLOCKED` with a `NEGATIVE_NET_PAY` blocking exception.
- **Employer Cost**: Tracked separately and does **NOT** reduce employee net pay.
