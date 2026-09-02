const prisma = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

/**
 * Idempotently ensures that standard 12-month calendar accounting periods exist for given years.
 */
async function ensureAccountingPeriods(tx = prisma, { startYear = 2025, endYear = 2027 } = {}) {
  const periods = [];
  for (let y = startYear; y <= endYear; y++) {
    for (let m = 1; m <= 12; m++) {
      const monthStr = String(m).padStart(2, '0');
      const periodName = `${y}-${monthStr}`;
      const startDate = new Date(Date.UTC(y, m - 1, 1));
      const lastDay = new Date(Date.UTC(y, m, 0)).getDate();
      const endDate = new Date(Date.UTC(y, m - 1, lastDay, 23, 59, 59, 999));

      const existing = await tx.accountingPeriod.findUnique({
        where: { periodName }
      });

      if (!existing) {
        const created = await tx.accountingPeriod.create({
          data: {
            fiscalYear: y,
            month: m,
            periodName,
            startDate,
            endDate,
            status: 'OPEN'
          }
        });
        periods.push(created);
      } else {
        periods.push(existing);
      }
    }
  }
  return periods;
}

/**
 * Returns all Accounting Periods with statistics
 */
async function listAccountingPeriods({ fiscalYear, status } = {}) {
  const where = {};
  if (fiscalYear) where.fiscalYear = parseInt(fiscalYear, 10);
  if (status) where.status = status.toUpperCase();

  const periods = await prisma.accountingPeriod.findMany({
    where,
    orderBy: [{ fiscalYear: 'desc' }, { month: 'desc' }],
    include: {
      _count: {
        select: { journalEntries: true }
      }
    }
  });

  return periods;
}

/**
 * Gets the Accounting Period corresponding to a specific posting date
 */
async function getPeriodForDate(tx = prisma, date = new Date()) {
  const targetDate = new Date(date);
  
  let period = await tx.accountingPeriod.findFirst({
    where: {
      startDate: { lte: targetDate },
      endDate: { gte: targetDate }
    }
  });

  if (!period) {
    // Attempt auto-initialization for the year if within reasonable horizon
    const y = targetDate.getFullYear();
    await ensureAccountingPeriods(tx, { startYear: y, endYear: y });
    period = await tx.accountingPeriod.findFirst({
      where: {
        startDate: { lte: targetDate },
        endDate: { gte: targetDate }
      }
    });
  }

  return period;
}

/**
 * Close an Accounting Period (Transition OPEN -> CLOSED)
 */
async function closeAccountingPeriod({ periodId, actorEmail, actorId, req }) {
  return await prisma.$transaction(async (tx) => {
    const period = await tx.accountingPeriod.findUnique({
      where: { id: periodId }
    });

    if (!period) {
      throw { status: 404, code: 'ACCOUNTING_PERIOD_NOT_FOUND', message: 'Accounting Period not found.' };
    }

    if (period.status === 'CLOSED') {
      throw { status: 400, code: 'ACCOUNTING_PERIOD_ALREADY_CLOSED', message: `Accounting Period "${period.periodName}" is already closed.` };
    }

    const updated = await tx.accountingPeriod.update({
      where: { id: period.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedBy: actorEmail || 'SYSTEM',
        updatedAt: new Date()
      }
    });

    await logAudit({
      actorId,
      actorEmail,
      action: 'ACCOUNTING_PERIOD_CLOSE',
      entityType: 'ACCOUNTING_PERIOD',
      entityId: period.id,
      oldValues: { status: 'OPEN' },
      newValues: { status: 'CLOSED', closedBy: actorEmail },
      req,
      tx
    });

    return {
      success: true,
      message: `Accounting Period "${period.periodName}" has been CLOSED. Further General Ledger postings to this period are prohibited.`,
      period: updated
    };
  });
}

/**
 * Reopen an Accounting Period (Transition CLOSED -> OPEN - Admin Only)
 */
async function reopenAccountingPeriod({ periodId, reason, actorEmail, actorId, req }) {
  if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
    throw {
      status: 400,
      code: 'REOPEN_REASON_REQUIRED',
      message: 'A detailed mandatory reason (minimum 10 characters) is required to reopen a closed accounting period.'
    };
  }

  return await prisma.$transaction(async (tx) => {
    const period = await tx.accountingPeriod.findUnique({
      where: { id: periodId }
    });

    if (!period) {
      throw { status: 404, code: 'ACCOUNTING_PERIOD_NOT_FOUND', message: 'Accounting Period not found.' };
    }

    if (period.status === 'OPEN') {
      throw { status: 400, code: 'ACCOUNTING_PERIOD_ALREADY_OPEN', message: `Accounting Period "${period.periodName}" is already open.` };
    }

    const updated = await tx.accountingPeriod.update({
      where: { id: period.id },
      data: {
        status: 'OPEN',
        reopenedAt: new Date(),
        reopenedBy: actorEmail || 'SYSTEM',
        reopenReason: reason.trim(),
        updatedAt: new Date()
      }
    });

    await logAudit({
      actorId,
      actorEmail,
      action: 'ACCOUNTING_PERIOD_REOPEN',
      entityType: 'ACCOUNTING_PERIOD',
      entityId: period.id,
      oldValues: { status: 'CLOSED' },
      newValues: { status: 'OPEN', reopenedBy: actorEmail, reopenReason: reason.trim() },
      req,
      tx
    });

    return {
      success: true,
      message: `Accounting Period "${period.periodName}" has been REOPENED by Admin. Reason: ${reason.trim()}`,
      period: updated
    };
  });
}

module.exports = {
  ensureAccountingPeriods,
  listAccountingPeriods,
  getPeriodForDate,
  closeAccountingPeriod,
  reopenAccountingPeriod
};
