const prisma = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

/**
 * 1. Resolve applicable Salary Structure and active components for an employee as of a specific date.
 * Crucial foundation for Phase 3 Monthly Payroll Calculation.
 */
async function resolveApplicableSalaryStructure(employeeId, asOfDate = new Date(), tx = prisma) {
  const targetDate = new Date(asOfDate);
  if (isNaN(targetDate.getTime())) {
    throw new Error('Invalid asOfDate provided to resolveApplicableSalaryStructure');
  }

  const assignment = await tx.employeeSalaryAssignment.findFirst({
    where: {
      employeeId,
      status: { in: ['ACTIVE', 'SUPERSEDED'] },
      effectiveFrom: { lte: targetDate },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: targetDate } }
      ]
    },
    orderBy: { effectiveFrom: 'desc' },
    include: {
      employee: {
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          department: true,
          designation: true,
          status: true
        }
      },
      salaryStructure: {
        include: {
          lines: {
            where: { isActive: true },
            include: { component: true },
            orderBy: { sequence: 'asc' }
          }
        }
      }
    }
  });

  return assignment;
}

/**
 * 2. Assign Salary Structure to Employee with Strict Effective Dating & Automatic Supersession.
 * Enforces zero overlapping intervals and immutable audit history.
 */
async function assignSalaryToEmployee(tx, {
  employeeId,
  salaryStructureId,
  baseGross,
  effectiveFrom,
  effectiveTo = null,
  reason,
  notes,
  actorEmail,
  actorId,
  req
}) {
  // 1. Verify Employee exists and is eligible
  const employee = await tx.employee.findUnique({
    where: { id: employeeId }
  });
  if (!employee) {
    throw { status: 404, message: 'Employee not found.' };
  }
  if (['ARCHIVED', 'TERMINATED'].includes(employee.status)) {
    throw { status: 400, message: `Cannot assign salary to an employee with status "${employee.status}".` };
  }

  // 2. Verify Salary Structure exists and is active
  const structure = await tx.salaryStructure.findUnique({
    where: { id: salaryStructureId },
    include: { lines: { include: { component: true } } }
  });
  if (!structure) {
    throw { status: 404, message: 'Salary Structure not found.' };
  }
  if (structure.status !== 'ACTIVE') {
    throw { status: 400, message: `Cannot assign inactive or archived salary structure "${structure.name}".` };
  }

  const parsedEffectiveFrom = new Date(effectiveFrom);
  if (isNaN(parsedEffectiveFrom.getTime())) {
    throw { status: 400, message: 'Invalid effectiveFrom date.' };
  }

  const parsedEffectiveTo = effectiveTo ? new Date(effectiveTo) : null;
  if (parsedEffectiveTo && isNaN(parsedEffectiveTo.getTime())) {
    throw { status: 400, message: 'Invalid effectiveTo date.' };
  }

  if (parsedEffectiveTo && parsedEffectiveTo < parsedEffectiveFrom) {
    throw { status: 400, message: 'effectiveTo cannot be earlier than effectiveFrom.' };
  }

  // 3. Fetch all active/superseded assignments for this employee to validate intervals
  const existingAssignments = await tx.employeeSalaryAssignment.findMany({
    where: {
      employeeId,
      status: { in: ['ACTIVE', 'SUPERSEDED'] }
    },
    orderBy: { effectiveFrom: 'asc' }
  });

  // 4. Overlap & Collision Resolution
  for (const existing of existingAssignments) {
    const existingStart = new Date(existing.effectiveFrom);
    const existingEnd = existing.effectiveTo ? new Date(existing.effectiveTo) : null;

    // Check same start date collision
    if (existingStart.toDateString() === parsedEffectiveFrom.toDateString()) {
      throw {
        status: 409,
        message: `An assignment already starts on ${parsedEffectiveFrom.toISOString().slice(0, 10)}. Delete or modify existing assignment instead.`
      };
    }

    // If existing assignment is open-ended (current active)
    if (existingEnd === null) {
      if (parsedEffectiveFrom > existingStart) {
        // Cap the previous assignment to end 1 day prior to the new assignment
        const newEndDate = new Date(parsedEffectiveFrom.getTime() - (24 * 60 * 60 * 1000));
        await tx.employeeSalaryAssignment.update({
          where: { id: existing.id },
          data: {
            effectiveTo: newEndDate,
            status: 'SUPERSEDED',
            updatedBy: actorEmail || 'SYSTEM'
          }
        });

        await logAudit({
          actorId,
          actorEmail,
          action: 'SALARY_ASSIGNMENT_SUPERSEDED',
          entityType: 'EMPLOYEE_SALARY_ASSIGNMENT',
          entityId: existing.id,
          oldValues: { effectiveTo: null, status: 'ACTIVE' },
          newValues: { effectiveTo: newEndDate, status: 'SUPERSEDED', supersededByDate: parsedEffectiveFrom },
          req,
          tx
        });
      } else {
        // New assignment starts before an open-ended assignment
        if (!parsedEffectiveTo || parsedEffectiveTo >= existingStart) {
          throw {
            status: 409,
            message: `New assignment overlaps with existing open-ended assignment starting ${existingStart.toISOString().slice(0, 10)}.`
          };
        }
      }
    } else {
      // Existing assignment is closed [existingStart, existingEnd]
      const newStart = parsedEffectiveFrom;
      const newEnd = parsedEffectiveTo || new Date('9999-12-31');

      const isOverlapping = (newStart <= existingEnd) && (newEnd >= existingStart);
      if (isOverlapping) {
        throw {
          status: 409,
          message: `Salary assignment interval (${newStart.toISOString().slice(0, 10)} to ${parsedEffectiveTo ? parsedEffectiveTo.toISOString().slice(0, 10) : 'indefinite'}) overlaps with existing historical assignment (${existingStart.toISOString().slice(0, 10)} to ${existingEnd.toISOString().slice(0, 10)}).`
        };
      }
    }
  }

  // 5. Create new Salary Assignment
  const newAssignment = await tx.employeeSalaryAssignment.create({
    data: {
      employeeId,
      salaryStructureId,
      baseGross: baseGross !== undefined ? Number(baseGross) : 0,
      effectiveFrom: parsedEffectiveFrom,
      effectiveTo: parsedEffectiveTo,
      reason: reason ? reason.trim() : 'Initial Compensation',
      notes: notes ? notes.trim() : null,
      status: 'ACTIVE',
      createdBy: actorEmail || 'SYSTEM',
      updatedBy: actorEmail || 'SYSTEM'
    },
    include: {
      employee: {
        select: { id: true, employeeCode: true, fullName: true, department: true, designation: true }
      },
      salaryStructure: {
        include: {
          lines: {
            where: { isActive: true },
            include: { component: true },
            orderBy: { sequence: 'asc' }
          }
        }
      }
    }
  });

  // 6. Security & Audit Logging
  await logAudit({
    actorId,
    actorEmail,
    action: 'SALARY_ASSIGNMENT_CREATE',
    entityType: 'EMPLOYEE_SALARY_ASSIGNMENT',
    entityId: newAssignment.id,
    newValues: {
      employeeId,
      employeeCode: employee.employeeCode,
      structureCode: structure.code,
      baseGross: newAssignment.baseGross,
      effectiveFrom: newAssignment.effectiveFrom,
      effectiveTo: newAssignment.effectiveTo,
      reason: newAssignment.reason
    },
    req,
    tx
  });

  return newAssignment;
}

module.exports = {
  resolveApplicableSalaryStructure,
  assignSalaryToEmployee
};
