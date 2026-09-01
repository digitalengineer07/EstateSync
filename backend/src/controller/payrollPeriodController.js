const prisma = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

/**
 * 1. Create a new Monthly Payroll Period
 * POST /api/v1/payroll/periods
 */
exports.createPeriod = async (req, res) => {
  try {
    const { year, month, periodStart, periodEnd } = req.body;

    const parsedYear = parseInt(year, 10);
    const parsedMonth = parseInt(month, 10);

    if (isNaN(parsedYear) || isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      return res.status(400).json({
        success: false,
        message: 'Valid year (e.g. 2026) and month (1-12) are required.'
      });
    }

    // Default start/end dates to full calendar month if not explicitly supplied
    const startDate = periodStart
      ? new Date(periodStart)
      : new Date(Date.UTC(parsedYear, parsedMonth - 1, 1, 0, 0, 0));
    const endDate = periodEnd
      ? new Date(periodEnd)
      : new Date(Date.UTC(parsedYear, parsedMonth, 0, 23, 59, 59, 999));

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid periodStart or periodEnd date format.' });
    }

    if (endDate < startDate) {
      return res.status(400).json({ success: false, message: 'periodEnd cannot be earlier than periodStart.' });
    }

    const existing = await prisma.payrollPeriod.findUnique({
      where: {
        year_month: {
          year: parsedYear,
          month: parsedMonth
        }
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Payroll Period for ${parsedYear}-${String(parsedMonth).padStart(2, '0')} already exists.`
      });
    }

    const period = await prisma.$transaction(async (tx) => {
      const created = await tx.payrollPeriod.create({
        data: {
          year: parsedYear,
          month: parsedMonth,
          periodStart: startDate,
          periodEnd: endDate,
          status: 'DRAFT',
          createdBy: req.user?.email || 'SYSTEM'
        }
      });

      await logAudit({
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        action: 'PAYROLL_PERIOD_CREATE',
        entityType: 'PAYROLL_PERIOD',
        entityId: created.id,
        newValues: {
          year: created.year,
          month: created.month,
          periodStart: created.periodStart,
          periodEnd: created.periodEnd,
          status: created.status
        },
        req,
        tx
      });

      return created;
    });

    return res.status(201).json({
      success: true,
      message: `Payroll Period for ${period.year}-${String(period.month).padStart(2, '0')} created successfully.`,
      period
    });
  } catch (error) {
    console.error('Create Payroll Period Error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating payroll period' });
  }
};

/**
 * 2. Get/List Payroll Periods
 * GET /api/v1/payroll/periods
 */
exports.getPeriods = async (req, res) => {
  try {
    const { year, status } = req.query;

    const where = {};
    if (year) where.year = parseInt(year, 10);
    if (status && status !== 'ALL') where.status = status;

    const periods = await prisma.payrollPeriod.findMany({
      where,
      include: {
        runs: {
          select: {
            id: true,
            runNumber: true,
            status: true,
            totalEmployees: true,
            totalGross: true,
            totalNet: true
          }
        },
        _count: { select: { runs: true } }
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });

    return res.json({
      success: true,
      count: periods.length,
      periods
    });
  } catch (error) {
    console.error('Get Payroll Periods Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching payroll periods' });
  }
};

/**
 * 3. Get Payroll Period by ID
 * GET /api/v1/payroll/periods/:id
 */
exports.getPeriodById = async (req, res) => {
  try {
    const { id } = req.params;

    const period = await prisma.payrollPeriod.findUnique({
      where: { id },
      include: {
        runs: {
          orderBy: { runNumber: 'desc' }
        }
      }
    });

    if (!period) {
      return res.status(404).json({ success: false, message: 'Payroll Period not found' });
    }

    return res.json({ success: true, period });
  } catch (error) {
    console.error('Get Payroll Period By ID Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching payroll period' });
  }
};

/**
 * 4. Open a Draft Payroll Period
 * POST /api/v1/payroll/periods/:id/open
 */
exports.openPeriod = async (req, res) => {
  try {
    const { id } = req.params;

    const period = await prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) {
      return res.status(404).json({ success: false, message: 'Payroll Period not found' });
    }

    if (period.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: `Cannot open period in status "${period.status}". Period must be in DRAFT status.`
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.payrollPeriod.update({
        where: { id },
        data: {
          status: 'OPEN',
          updatedBy: req.user?.email || 'SYSTEM'
        }
      });

      await logAudit({
        actorId: req.user?.userId,
        actorEmail: req.user?.email,
        action: 'PAYROLL_PERIOD_OPEN',
        entityType: 'PAYROLL_PERIOD',
        entityId: id,
        oldValues: { status: 'DRAFT' },
        newValues: { status: 'OPEN' },
        req,
        tx
      });

      return p;
    });

    return res.json({
      success: true,
      message: `Payroll Period ${updated.year}-${String(updated.month).padStart(2, '0')} opened successfully.`,
      period: updated
    });
  } catch (error) {
    console.error('Open Payroll Period Error:', error);
    return res.status(500).json({ success: false, message: 'Server error opening payroll period' });
  }
};
