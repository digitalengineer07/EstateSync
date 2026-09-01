const prisma = require('../config/db');
const {
  resolveApplicableSalaryStructure,
  assignSalaryToEmployee
} = require('../services/salaryStructureService');

/**
 * 1. Assign Salary Structure to an Employee (with auto-supersession of prior assignment)
 * POST /api/v1/payroll/assignments
 * or POST /api/v1/employees/:id/salary-assignments
 */
exports.createAssignment = async (req, res) => {
  try {
    const employeeId = req.params.id || req.body.employeeId;
    const {
      salaryStructureId,
      baseGross,
      effectiveFrom,
      effectiveTo,
      reason,
      notes
    } = req.body;

    if (!employeeId || !salaryStructureId || !effectiveFrom) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, Salary Structure ID, and Effective-From Date are compulsory.'
      });
    }

    const assignment = await prisma.$transaction(async (tx) => {
      return await assignSalaryToEmployee(tx, {
        employeeId,
        salaryStructureId,
        baseGross,
        effectiveFrom,
        effectiveTo,
        reason,
        notes,
        actorEmail: req.user?.email,
        actorId: req.user?.userId,
        req
      });
    });

    return res.status(201).json({
      success: true,
      message: `Salary structure "${assignment.salaryStructure.name}" successfully assigned to employee ${assignment.employee.fullName} effective ${new Date(assignment.effectiveFrom).toISOString().slice(0, 10)}.`,
      assignment
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('Create Salary Assignment Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error assigning salary structure' });
  }
};

/**
 * 2. Get full salary assignment history for an Employee
 * GET /api/v1/employees/:id/salary-assignments
 */
exports.getEmployeeAssignments = async (req, res) => {
  try {
    const { id } = req.params;

    // Resolve by UUID or Employee Code
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [{ id }, { employeeCode: id }]
      }
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const assignments = await prisma.employeeSalaryAssignment.findMany({
      where: { employeeId: employee.id },
      include: {
        salaryStructure: {
          include: {
            lines: {
              where: { isActive: true },
              include: { component: true },
              orderBy: { sequence: 'asc' }
            }
          }
        }
      },
      orderBy: { effectiveFrom: 'desc' }
    });

    return res.json({
      success: true,
      employee: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        fullName: employee.fullName,
        department: employee.department,
        designation: employee.designation
      },
      count: assignments.length,
      assignments
    });
  } catch (error) {
    console.error('Get Employee Salary Assignments Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching salary assignment history' });
  }
};

/**
 * 3. Get current active salary assignment for an Employee
 * GET /api/v1/employees/:id/salary-assignments/current
 */
exports.getCurrentAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findFirst({
      where: {
        OR: [{ id }, { employeeCode: id }]
      }
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const currentAssignment = await resolveApplicableSalaryStructure(employee.id, new Date());

    if (!currentAssignment) {
      return res.status(404).json({
        success: false,
        message: 'No active salary structure assignment found for this employee.'
      });
    }

    return res.json({
      success: true,
      assignment: currentAssignment
    });
  } catch (error) {
    console.error('Get Current Salary Assignment Error:', error);
    return res.status(500).json({ success: false, message: 'Server error resolving current salary assignment' });
  }
};

/**
 * 4. Resolve applicable salary structure on a specific historical or future date
 * GET /api/v1/employees/:id/salary-assignments/resolve?date=YYYY-MM-DD
 */
exports.resolveSalaryByDate = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date parameter provided.' });
    }

    const employee = await prisma.employee.findFirst({
      where: {
        OR: [{ id }, { employeeCode: id }]
      }
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const resolved = await resolveApplicableSalaryStructure(employee.id, targetDate);

    if (!resolved) {
      return res.status(404).json({
        success: false,
        message: `No salary structure was applicable for employee ${employee.fullName} on date ${targetDate.toISOString().slice(0, 10)}.`
      });
    }

    return res.json({
      success: true,
      asOfDate: targetDate.toISOString().slice(0, 10),
      assignment: resolved
    });
  } catch (error) {
    console.error('Resolve Salary By Date Error:', error);
    return res.status(500).json({ success: false, message: 'Server error resolving salary assignment' });
  }
};
