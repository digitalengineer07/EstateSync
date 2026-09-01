const prisma = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

const VALID_ADJUSTMENT_TYPES = ['CREDIT', 'DEBIT'];
const VALID_CATEGORIES = [
  'BONUS',
  'INCENTIVE',
  'REIMBURSEMENT',
  'ADVANCE_RECOVERY',
  'ARREARS',
  'PENALTY',
  'OTHER'
];

/**
 * 1. Add a Manual Adjustment to a Payroll Run
 * POST /api/v1/payroll/runs/:id/adjustments
 */
exports.createAdjustment = async (req, res) => {
  try {
    const { id: payrollRunId } = req.params;
    const {
      employeeId,
      adjustmentType,
      category,
      amount,
      reason,
      notes
    } = req.body;

    const trimmedReason = reason ? reason.trim() : '';
    const numAmount = Number(amount);

    if (!employeeId || !adjustmentType || !category || !trimmedReason || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, valid Adjustment Type (CREDIT/DEBIT), Category, positive Amount, and Reason are required.'
      });
    }

    if (!VALID_ADJUSTMENT_TYPES.includes(adjustmentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid adjustmentType. Must be one of: ${VALID_ADJUSTMENT_TYPES.join(', ')}`
      });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
    }

    const run = await prisma.payrollRun.findUnique({
      where: { id: payrollRunId },
      include: { payrollPeriod: true }
    });

    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll Run not found.' });
    }

    if (['APPROVED', 'LOCKED', 'CLOSED', 'CANCELLED'].includes(run.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot add adjustments to a payroll run in "${run.status}" status.`
      });
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const adjustment = await prisma.$transaction(async (tx) => {
      const created = await tx.payrollAdjustment.create({
        data: {
          payrollRunId: run.id,
          employeeId: employee.id,
          adjustmentType,
          category,
          amount: numAmount,
          reason: trimmedReason,
          notes: notes ? notes.trim() : null,
          status: 'APPROVED',
          createdBy: req.user?.email || 'SYSTEM'
        },
        include: {
          employee: {
            select: { id: true, employeeCode: true, fullName: true, department: true }
          }
        }
      });

      await logAudit({
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        action: 'PAYROLL_ADJUSTMENT_CREATE',
        entityType: 'PAYROLL_ADJUSTMENT',
        entityId: created.id,
        newValues: {
          payrollRunId: run.id,
          employeeCode: employee.employeeCode,
          adjustmentType,
          category,
          amount: numAmount,
          reason: trimmedReason
        },
        req,
        tx
      });

      return created;
    });

    return res.status(201).json({
      success: true,
      message: `Adjustment of ₹${adjustment.amount} (${adjustment.category}) added for ${adjustment.employee.fullName}.`,
      adjustment
    });
  } catch (error) {
    console.error('Create Payroll Adjustment Error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating payroll adjustment' });
  }
};

/**
 * 2. List Adjustments for a Payroll Run
 * GET /api/v1/payroll/runs/:id/adjustments
 */
exports.getRunAdjustments = async (req, res) => {
  try {
    const { id: payrollRunId } = req.params;

    const adjustments = await prisma.payrollAdjustment.findMany({
      where: { payrollRunId },
      include: {
        employee: {
          select: { id: true, employeeCode: true, fullName: true, department: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      success: true,
      count: adjustments.length,
      adjustments
    });
  } catch (error) {
    console.error('Get Payroll Adjustments Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching adjustments' });
  }
};
