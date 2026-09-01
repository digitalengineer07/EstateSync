const { resolveApplicableSalaryStructure } = require('./salaryStructureService');

/**
 * Validates dependency graph for component calculation bases.
 * Detects circular dependencies (e.g. A -> B -> A).
 */
function detectCycleInComponentLines(lines) {
  const adjList = new Map();
  const codes = new Set();

  for (const line of lines) {
    const code = line.component?.code || line.componentCode;
    codes.add(code);
    if (!adjList.has(code)) adjList.set(code, []);

    if (line.calculationMethod === 'PERCENTAGE_OF_BASIC') {
      adjList.get(code).push('BASIC');
    } else if (line.calculationMethod === 'PERCENTAGE_OF_COMPONENT' && line.calculationBase) {
      adjList.get(code).push(line.calculationBase);
    }
  }

  const visited = new Map(); // 0 = unvisited, 1 = visiting, 2 = visited

  function dfs(node) {
    visited.set(node, 1);
    const neighbors = adjList.get(node) || [];
    for (const neighbor of neighbors) {
      if (codes.has(neighbor)) {
        if (visited.get(neighbor) === 1) {
          return true; // Cycle detected
        }
        if (!visited.get(neighbor) && dfs(neighbor)) {
          return true;
        }
      }
    }
    visited.set(node, 2);
    return false;
  }

  for (const code of codes) {
    if (!visited.get(code)) {
      if (dfs(code)) return true;
    }
  }
  return false;
}

/**
 * Core Monthly Payroll Calculation Engine for an individual employee.
 * Deterministically computes earnings, deductions, gross, and net pay.
 */
async function calculateEmployeeMonthlyPayroll({
  employee,
  period,
  adjustments = [],
  tx
}) {
  const exceptions = [];

  // 1. Eligibility Check
  if (['ARCHIVED'].includes(employee.status)) {
    return { isEligible: false, skipReason: 'EMPLOYEE_ARCHIVED' };
  }

  const joiningDate = new Date(employee.joiningDate);
  const periodStart = new Date(period.periodStart);
  const periodEnd = new Date(period.periodEnd);

  if (joiningDate > periodEnd) {
    return { isEligible: false, skipReason: 'JOINED_AFTER_PERIOD' };
  }

  if (employee.exitDate && new Date(employee.exitDate) < periodStart) {
    return { isEligible: false, skipReason: 'EXITED_BEFORE_PERIOD' };
  }

  // 2. Resolve Applicable Salary Structure as of periodEnd
  const assignment = await resolveApplicableSalaryStructure(employee.id, periodEnd, tx);

  if (!assignment) {
    exceptions.push({
      code: 'NO_SALARY_ASSIGNMENT',
      severity: 'BLOCKING',
      message: `No active salary assignment was found for employee ${employee.fullName} (${employee.employeeCode}) on period date ${periodEnd.toISOString().slice(0, 10)}.`,
      context: { employeeId: employee.id, employeeCode: employee.employeeCode, asOfDate: periodEnd }
    });

    return {
      isEligible: true,
      success: false,
      employee,
      exceptions
    };
  }

  const structure = assignment.salaryStructure;
  const lines = structure?.lines || [];

  if (lines.length === 0) {
    exceptions.push({
      code: 'INVALID_SALARY_STRUCTURE',
      severity: 'BLOCKING',
      message: `Salary structure "${structure?.name}" has no active component lines configured.`,
      context: { structureId: structure?.id, structureCode: structure?.code }
    });

    return {
      isEligible: true,
      success: false,
      employee,
      assignment,
      exceptions
    };
  }

  // 3. Dependency Cycle Check
  if (detectCycleInComponentLines(lines)) {
    exceptions.push({
      code: 'CIRCULAR_COMPONENT_DEPENDENCY',
      severity: 'BLOCKING',
      message: `Circular calculation dependency detected in salary structure "${structure.name}".`,
      context: { structureCode: structure.code }
    });

    return {
      isEligible: true,
      success: false,
      employee,
      assignment,
      exceptions
    };
  }

  // 4. Sequential Component Evaluation (Sorted by sequence ASC)
  const sortedLines = [...lines].sort((a, b) => a.sequence - b.sequence);
  const baseGross = Number(assignment.baseGross) || 0;
  const calculatedAmounts = {};
  const payrollLinesSnapshot = [];

  let grossEarnings = 0;
  let totalDeductions = 0;
  let employerCost = 0;
  let reimbursements = 0;

  for (const line of sortedLines) {
    const code = line.component?.code || 'UNKNOWN';
    const compName = line.component?.name || code;
    const type = line.component?.componentType || 'EARNING';
    const method = line.calculationMethod;
    const pct = Number(line.percentage) || 0;
    const fixedVal = Number(line.value) || 0;
    let amount = 0;

    switch (method) {
      case 'FIXED_AMOUNT':
        amount = fixedVal;
        break;

      case 'PERCENTAGE_OF_BASIC': {
        const basicVal = calculatedAmounts['BASIC'] || 0;
        amount = Math.round((basicVal * (pct / 100)) * 100) / 100;
        break;
      }

      case 'PERCENTAGE_OF_GROSS': {
        amount = Math.round((baseGross * (pct / 100)) * 100) / 100;
        break;
      }

      case 'PERCENTAGE_OF_COMPONENT': {
        const baseKey = line.calculationBase;
        const refVal = calculatedAmounts[baseKey] || 0;
        amount = Math.round((refVal * (pct / 100)) * 100) / 100;
        break;
      }

      case 'MANUAL_AMOUNT':
        amount = fixedVal;
        break;

      default:
        amount = fixedVal;
    }

    calculatedAmounts[code] = amount;

    // Accumulate Category Subtotals
    if (type === 'EARNING') {
      grossEarnings = Math.round((grossEarnings + amount) * 100) / 100;
    } else if (type === 'DEDUCTION') {
      totalDeductions = Math.round((totalDeductions + amount) * 100) / 100;
    } else if (type === 'EMPLOYER_CONTRIBUTION') {
      employerCost = Math.round((employerCost + amount) * 100) / 100;
    } else if (type === 'REIMBURSEMENT') {
      reimbursements = Math.round((reimbursements + amount) * 100) / 100;
    }

    payrollLinesSnapshot.push({
      componentId: line.componentId,
      componentCode: code,
      componentName: compName,
      componentType: type,
      calculationMethod: method,
      calculationBase: line.calculationBase,
      sequence: line.sequence,
      rate: fixedVal,
      percentage: pct,
      amount: amount,
      source: 'SALARY_STRUCTURE',
      glAccountCodeSnapshot: line.component?.glAccountCode || '5060',
      narration: `Calculated from structure ${structure.code}`
    });
  }

  // 5. Process Approved Run Adjustments (Credits / Debits)
  let adjustmentsCredit = 0;
  let adjustmentsDebit = 0;

  for (const adj of adjustments) {
    const adjAmount = Number(adj.amount) || 0;
    if (adj.adjustmentType === 'CREDIT') {
      adjustmentsCredit = Math.round((adjustmentsCredit + adjAmount) * 100) / 100;
      payrollLinesSnapshot.push({
        componentId: null,
        componentCode: `ADJ_${adj.category}`,
        componentName: `Adjustment: ${adj.category} (${adj.reason})`,
        componentType: 'EARNING',
        calculationMethod: 'MANUAL_AMOUNT',
        calculationBase: null,
        sequence: 90,
        rate: adjAmount,
        percentage: 0,
        amount: adjAmount,
        source: 'MANUAL_ADJUSTMENT',
        glAccountCodeSnapshot: '5060',
        narration: adj.reason
      });
    } else if (adj.adjustmentType === 'DEBIT') {
      adjustmentsDebit = Math.round((adjustmentsDebit + adjAmount) * 100) / 100;
      payrollLinesSnapshot.push({
        componentId: null,
        componentCode: `DED_${adj.category}`,
        componentName: `Deduction: ${adj.category} (${adj.reason})`,
        componentType: 'DEDUCTION',
        calculationMethod: 'MANUAL_AMOUNT',
        calculationBase: null,
        sequence: 95,
        rate: adjAmount,
        percentage: 0,
        amount: adjAmount,
        source: 'MANUAL_ADJUSTMENT',
        glAccountCodeSnapshot: '1040',
        narration: adj.reason
      });
    }
  }

  // 6. Compute Net Payable
  const netPayable = Math.round(
    (grossEarnings + reimbursements + adjustmentsCredit - totalDeductions - adjustmentsDebit) * 100
  ) / 100;

  // 7. Negative Net Salary Validation
  let itemStatus = 'CALCULATED';
  if (netPayable < 0) {
    itemStatus = 'BLOCKED';
    exceptions.push({
      code: 'NEGATIVE_NET_PAY',
      severity: 'BLOCKING',
      message: `Calculated net pay for employee ${employee.fullName} is negative (₹${netPayable.toFixed(2)}). Total deductions/adjustments exceed gross earnings.`,
      context: { grossEarnings, totalDeductions, adjustmentsCredit, adjustmentsDebit, netPayable }
    });
  }

  return {
    isEligible: true,
    success: exceptions.every(e => e.severity !== 'BLOCKING'),
    employee,
    assignment,
    structure,
    itemData: {
      employeeId: employee.id,
      salaryAssignmentId: assignment.id,
      employeeCodeSnapshot: employee.employeeCode,
      employeeNameSnapshot: employee.fullName,
      departmentSnapshot: employee.department,
      designationSnapshot: employee.designation,
      structureCodeSnapshot: structure.code,
      grossEarnings,
      totalDeductions,
      employerCost,
      reimbursements,
      adjustmentsCredit,
      adjustmentsDebit,
      netPayable,
      currency: structure.currency || 'INR',
      status: itemStatus
    },
    linesSnapshot: payrollLinesSnapshot,
    exceptions
  };
}

module.exports = {
  detectCycleInComponentLines,
  calculateEmployeeMonthlyPayroll
};
