const prisma = require('../config/db');
const {
  executePayrollRunCalculation,
  approvePayrollRun,
  lockPayrollRun
} = require('../services/payrollRunService');
const { logAudit } = require('../utils/auditLogger');

/**
 * 1. Create a new Calculation Run for a Payroll Period
 * POST /api/v1/payroll/runs
 */
exports.createRun = async (req, res) => {
  try {
    const { payrollPeriodId } = req.body;

    if (!payrollPeriodId) {
      return res.status(400).json({ success: false, message: 'payrollPeriodId is required.' });
    }

    const period = await prisma.payrollPeriod.findUnique({
      where: { id: payrollPeriodId },
      include: { runs: { orderBy: { runNumber: 'desc' }, take: 1 } }
    });

    if (!period) {
      return res.status(404).json({ success: false, message: 'Payroll Period not found.' });
    }

    if (['LOCKED', 'CLOSED', 'CANCELLED'].includes(period.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot create a new run for period in "${period.status}" status.`
      });
    }

    const lastRunNumber = period.runs[0]?.runNumber || 0;
    const nextRunNumber = lastRunNumber + 1;

    const run = await prisma.$transaction(async (tx) => {
      const created = await tx.payrollRun.create({
        data: {
          payrollPeriodId: period.id,
          runNumber: nextRunNumber,
          status: 'DRAFT',
          createdBy: req.user?.email || 'SYSTEM'
        },
        include: { payrollPeriod: true }
      });

      await logAudit({
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        action: 'PAYROLL_RUN_CREATE',
        entityType: 'PAYROLL_RUN',
        entityId: created.id,
        newValues: {
          payrollPeriodId: period.id,
          runNumber: nextRunNumber,
          status: 'DRAFT'
        },
        req,
        tx
      });

      return created;
    });

    return res.status(201).json({
      success: true,
      message: `Payroll Run #${run.runNumber} for period ${period.year}-${String(period.month).padStart(2, '0')} created successfully.`,
      run
    });
  } catch (error) {
    console.error('Create Payroll Run Error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating payroll run' });
  }
};

/**
 * 2. Get Payroll Run Details
 * GET /api/v1/payroll/runs/:id
 */
exports.getRunById = async (req, res) => {
  try {
    const { id } = req.params;

    const run = await prisma.payrollRun.findUnique({
      where: { id },
      include: {
        payrollPeriod: true,
        _count: {
          select: {
            items: true,
            adjustments: true,
            exceptions: true
          }
        }
      }
    });

    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll Run not found' });
    }

    return res.json({ success: true, run });
  } catch (error) {
    console.error('Get Payroll Run By ID Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching payroll run' });
  }
};

/**
 * 3. Execute Batch Calculation for a Payroll Run
 * POST /api/v1/payroll/runs/:id/calculate
 */
exports.calculateRun = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await executePayrollRunCalculation({
      runId: id,
      actorEmail: req.user?.email,
      actorId: req.user?.userId,
      req
    });

    return res.json({
      success: true,
      message: `Payroll Run #${result.runNumber} calculated successfully for ${result.totalEmployees} employees (Net: ₹${Number(result.totalNet).toLocaleString('en-IN')}).`,
      run: result
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('Calculate Payroll Run Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error calculating payroll run' });
  }
};

/**
 * 4. List Calculated Payroll Items for a Run
 * GET /api/v1/payroll/runs/:id/items
 */
exports.getRunItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, search } = req.query;

    const where = { payrollRunId: id };
    if (status && status !== 'ALL') where.status = status;
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { employeeCodeSnapshot: { contains: term, mode: 'insensitive' } },
        { employeeNameSnapshot: { contains: term, mode: 'insensitive' } },
        { departmentSnapshot: { contains: term, mode: 'insensitive' } }
      ];
    }

    const items = await prisma.payrollItem.findMany({
      where,
      include: {
        _count: { select: { lines: true, exceptions: true } }
      },
      orderBy: { employeeCodeSnapshot: 'asc' }
    });

    return res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    console.error('Get Payroll Run Items Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching payroll run items' });
  }
};

/**
 * 5. Get Single Payroll Item with itemized component snapshots
 * GET /api/v1/payroll/items/:id
 */
exports.getItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await prisma.payrollItem.findUnique({
      where: { id },
      include: {
        lines: {
          orderBy: { sequence: 'asc' }
        },
        exceptions: true,
        payrollRun: {
          include: { payrollPeriod: true }
        }
      }
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Payroll Item not found' });
    }

    return res.json({ success: true, item });
  } catch (error) {
    console.error('Get Payroll Item By ID Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching payroll item' });
  }
};

/**
 * 6. Get Exceptions for a Payroll Run
 * GET /api/v1/payroll/runs/:id/exceptions
 */
exports.getRunExceptions = async (req, res) => {
  try {
    const { id } = req.params;
    const { severity } = req.query;

    const where = { payrollRunId: id };
    if (severity && severity !== 'ALL') where.severity = severity;

    const exceptions = await prisma.payrollException.findMany({
      where,
      include: {
        employee: {
          select: { id: true, employeeCode: true, fullName: true, department: true }
        }
      },
      orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }]
    });

    return res.json({
      success: true,
      count: exceptions.length,
      exceptions
    });
  } catch (error) {
    console.error('Get Payroll Run Exceptions Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching exceptions' });
  }
};

/**
 * 7. Approve a Payroll Run
 * POST /api/v1/payroll/runs/:id/approve
 */
exports.approveRun = async (req, res) => {
  try {
    const { id } = req.params;

    const approvedRun = await approvePayrollRun({
      runId: id,
      actorEmail: req.user?.email,
      actorId: req.user?.userId,
      req
    });

    return res.json({
      success: true,
      message: `Payroll Run #${approvedRun.runNumber} approved successfully.`,
      run: approvedRun
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('Approve Payroll Run Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error approving payroll run' });
  }
};

/**
 * 8. Lock an Approved Payroll Run
 * POST /api/v1/payroll/runs/:id/lock
 */
exports.lockRun = async (req, res) => {
  try {
    const { id } = req.params;

    const lockedRun = await lockPayrollRun({
      runId: id,
      actorEmail: req.user?.email,
      actorId: req.user?.userId,
      req
    });

    return res.json({
      success: true,
      message: `Payroll Run #${lockedRun.runNumber} locked successfully. Payroll data is now frozen.`,
      run: lockedRun
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('Lock Payroll Run Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error locking payroll run' });
  }
};
