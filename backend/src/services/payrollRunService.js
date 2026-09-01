const prisma = require('../config/db');
const { calculateEmployeeMonthlyPayroll } = require('./payrollCalculationEngine');
const { logAudit } = require('../utils/auditLogger');

/**
 * Executes or recalculates a Monthly Payroll Run.
 * Evaluates all eligible employees, creates itemized snapshots and logs exceptions.
 */
async function executePayrollRunCalculation({
  runId,
  actorEmail,
  actorId,
  req
}) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: runId },
    include: {
      payrollPeriod: true,
      adjustments: { where: { status: 'APPROVED' } }
    }
  });

  if (!run) {
    throw { status: 404, message: 'Payroll Run not found.' };
  }

  if (['APPROVED', 'LOCKED', 'CLOSED', 'CANCELLED'].includes(run.status)) {
    throw {
      status: 400,
      message: `Cannot recalculate a payroll run in "${run.status}" status. Approved and locked runs are immutable.`
    };
  }

  const period = run.payrollPeriod;
  if (!period) {
    throw { status: 400, message: 'Associated Payroll Period is missing.' };
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Wipe previous draft items, lines, and exceptions for clean recalculation idempotency
    await tx.payrollLine.deleteMany({
      where: { payrollItem: { payrollRunId: run.id } }
    });
    await tx.payrollException.deleteMany({
      where: { payrollRunId: run.id }
    });
    await tx.payrollItem.deleteMany({
      where: { payrollRunId: run.id }
    });

    // 2. Mark run in PROCESSING state
    await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        status: 'PROCESSING',
        calculationStartedAt: new Date(),
        initiatedBy: actorEmail || 'SYSTEM'
      }
    });

    // 3. Fetch all eligible employees
    const employees = await tx.employee.findMany({
      where: { status: { not: 'ARCHIVED' } },
      orderBy: { employeeCode: 'asc' }
    });

    // Group adjustments by employeeId
    const adjustmentsByEmp = new Map();
    for (const adj of run.adjustments) {
      if (!adjustmentsByEmp.has(adj.employeeId)) {
        adjustmentsByEmp.set(adj.employeeId, []);
      }
      adjustmentsByEmp.get(adj.employeeId).push(adj);
    }

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let totalEmployerCost = 0;
    let calculatedCount = 0;
    let hasBlockingException = false;

    // 4. Calculate for each employee
    for (const emp of employees) {
      const empAdjustments = adjustmentsByEmp.get(emp.id) || [];
      const calcResult = await calculateEmployeeMonthlyPayroll({
        employee: emp,
        period,
        adjustments: empAdjustments,
        tx
      });

      if (!calcResult.isEligible) {
        continue;
      }

      if (!calcResult.success || !calcResult.itemData) {
        // Record blocking exception for unassigned or invalid employees
        hasBlockingException = true;
        for (const exp of calcResult.exceptions) {
          await tx.payrollException.create({
            data: {
              payrollRunId: run.id,
              employeeId: emp.id,
              code: exp.code,
              severity: exp.severity,
              message: exp.message,
              context: exp.context || null
            }
          });
        }
        continue;
      }

      // Check if item has any blocking exceptions (e.g. NEGATIVE_NET_PAY)
      if (calcResult.exceptions.some(e => e.severity === 'BLOCKING')) {
        hasBlockingException = true;
      }

      // Create PayrollItem
      const item = await tx.payrollItem.create({
        data: {
          payrollRunId: run.id,
          ...calcResult.itemData
        }
      });

      // Create PayrollLines
      if (calcResult.linesSnapshot.length > 0) {
        await tx.payrollLine.createMany({
          data: calcResult.linesSnapshot.map(l => ({
            payrollItemId: item.id,
            ...l
          }))
        });
      }

      // Save exceptions associated with this item
      for (const exp of calcResult.exceptions) {
        await tx.payrollException.create({
          data: {
            payrollRunId: run.id,
            payrollItemId: item.id,
            employeeId: emp.id,
            code: exp.code,
            severity: exp.severity,
            message: exp.message,
            context: exp.context || null
          }
        });
      }

      // Aggregate Run Totals
      totalGross = Math.round((totalGross + Number(item.grossEarnings)) * 100) / 100;
      totalDeductions = Math.round((totalDeductions + Number(item.totalDeductions)) * 100) / 100;
      totalNet = Math.round((totalNet + Number(item.netPayable)) * 100) / 100;
      totalEmployerCost = Math.round((totalEmployerCost + Number(item.employerCost)) * 100) / 100;
      calculatedCount++;
    }

    const finalStatus = hasBlockingException ? 'CALCULATED' : 'PENDING_APPROVAL';

    // 5. Update Run Totals & Status
    const completedRun = await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        status: finalStatus,
        totalEmployees: calculatedCount,
        totalGross,
        totalDeductions,
        totalNet,
        totalEmployerCost,
        calculationCompletedAt: new Date(),
        updatedBy: actorEmail || 'SYSTEM'
      },
      include: {
        payrollPeriod: true,
        exceptions: true,
        _count: { select: { items: true, exceptions: true } }
      }
    });

    // 6. Update Period Status
    await tx.payrollPeriod.update({
      where: { id: period.id },
      data: {
        status: finalStatus,
        updatedBy: actorEmail || 'SYSTEM'
      }
    });

    // 7. Audit Log
    await logAudit({
      actorId,
      actorEmail,
      action: 'PAYROLL_CALCULATE',
      entityType: 'PAYROLL_RUN',
      entityId: run.id,
      newValues: {
        payrollPeriodId: period.id,
        year: period.year,
        month: period.month,
        runNumber: run.runNumber,
        totalEmployees: calculatedCount,
        totalGross,
        totalNet,
        status: finalStatus
      },
      req,
      tx
    });

    return completedRun;
  }, {
    maxWait: 15000,
    timeout: 60000
  });
}

/**
 * Approves a calculated Payroll Run.
 * Strictly blocks approval if unresolved BLOCKING exceptions exist.
 */
async function approvePayrollRun({
  runId,
  actorEmail,
  actorId,
  req
}) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: runId },
    include: {
      payrollPeriod: true,
      exceptions: { where: { severity: 'BLOCKING', isResolved: false } }
    }
  });

  if (!run) {
    throw { status: 404, message: 'Payroll Run not found.' };
  }

  if (!['CALCULATED', 'PENDING_APPROVAL'].includes(run.status)) {
    throw {
      status: 400,
      message: `Cannot approve payroll run in status "${run.status}". Run must be CALCULATED or PENDING_APPROVAL.`
    };
  }

  if (run.exceptions.length > 0) {
    throw {
      status: 400,
      message: `Cannot approve payroll run: ${run.exceptions.length} unresolved blocking exception(s) exist. Resolve exceptions before approval.`
    };
  }

  return await prisma.$transaction(async (tx) => {
    const approvedRun = await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        status: 'APPROVED',
        approvedBy: actorEmail || 'SYSTEM',
        approvedAt: new Date(),
        updatedBy: actorEmail || 'SYSTEM'
      }
    });

    await tx.payrollPeriod.update({
      where: { id: run.payrollPeriodId },
      data: {
        status: 'APPROVED',
        approvedBy: actorEmail || 'SYSTEM',
        updatedBy: actorEmail || 'SYSTEM'
      }
    });

    await tx.payrollItem.updateMany({
      where: { payrollRunId: run.id, status: 'CALCULATED' },
      data: { status: 'APPROVED', approvedAt: new Date() }
    });

    await logAudit({
      actorId,
      actorEmail,
      action: 'PAYROLL_APPROVE',
      entityType: 'PAYROLL_RUN',
      entityId: run.id,
      oldValues: { status: run.status },
      newValues: { status: 'APPROVED', approvedBy: actorEmail },
      req,
      tx
    });

    return approvedRun;
  });
}

/**
 * Locks an approved Payroll Run, permanently freezing all compensation records.
 */
async function lockPayrollRun({
  runId,
  actorEmail,
  actorId,
  req
}) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: runId },
    include: { payrollPeriod: true }
  });

  if (!run) {
    throw { status: 404, message: 'Payroll Run not found.' };
  }

  if (run.status !== 'APPROVED') {
    throw {
      status: 400,
      message: `Cannot lock payroll run in status "${run.status}". Only APPROVED runs can be locked.`
    };
  }

  return await prisma.$transaction(async (tx) => {
    const lockedRun = await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        status: 'LOCKED',
        lockedBy: actorEmail || 'SYSTEM',
        lockedAt: new Date(),
        updatedBy: actorEmail || 'SYSTEM'
      }
    });

    await tx.payrollPeriod.update({
      where: { id: run.payrollPeriodId },
      data: {
        status: 'LOCKED',
        lockedBy: actorEmail || 'SYSTEM',
        lockedAt: new Date(),
        updatedBy: actorEmail || 'SYSTEM'
      }
    });

    await logAudit({
      actorId,
      actorEmail,
      action: 'PAYROLL_LOCK',
      entityType: 'PAYROLL_RUN',
      entityId: run.id,
      oldValues: { status: 'APPROVED' },
      newValues: { status: 'LOCKED', lockedBy: actorEmail },
      req,
      tx
    });

    return lockedRun;
  });
}

module.exports = {
  executePayrollRunCalculation,
  approvePayrollRun,
  lockPayrollRun
};
