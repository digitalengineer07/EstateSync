const prisma = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

/**
 * Derives the Indian Fiscal Quarter based on calendar month (1-12):
 * - Q1: April (4), May (5), June (6)
 * - Q2: July (7), August (8), September (9)
 * - Q3: October (10), November (11), December (12)
 * - Q4: January (1), February (2), March (3)
 */
function getIndianFiscalQuarter(month) {
  if (month >= 4 && month <= 6) return 'Q1';
  if (month >= 7 && month <= 9) return 'Q2';
  if (month >= 10 && month <= 12) return 'Q3';
  return 'Q4';
}

/**
 * Derives Indian Financial Year base year:
 * e.g., April 2026 -> FY 2026-27 (base: 2026)
 * e.g., January 2027 -> FY 2026-27 (base: 2026)
 */
function getIndianFiscalYear(year, month) {
  return month >= 4 ? year : year - 1;
}

/**
 * Idempotently ensures that Indian Financial Year monthly accounting periods exist for given calendar years.
 */
async function ensureAccountingPeriods(tx = prisma, { startYear = 2024, endYear = 2028 } = {}) {
  const periods = [];
  for (let y = startYear; y <= endYear; y++) {
    for (let m = 1; m <= 12; m++) {
      const monthStr = String(m).padStart(2, '0');
      const periodName = `${y}-${monthStr}`;
      const fiscalYear = getIndianFiscalYear(y, m);
      const fiscalQuarter = getIndianFiscalQuarter(m);

      const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      const lastDay = new Date(Date.UTC(y, m, 0)).getDate();
      const endDate = new Date(Date.UTC(y, m - 1, lastDay, 23, 59, 59, 999));

      const existing = await tx.accountingPeriod.findUnique({
        where: { periodName }
      });

      if (!existing) {
        const created = await tx.accountingPeriod.create({
          data: {
            fiscalYear,
            month: m,
            periodName,
            fiscalQuarter,
            startDate,
            endDate,
            status: 'OPEN'
          }
        });
        periods.push(created);
      } else {
        if (!existing.fiscalQuarter || existing.fiscalYear !== fiscalYear) {
          const updated = await tx.accountingPeriod.update({
            where: { id: existing.id },
            data: { fiscalQuarter, fiscalYear }
          });
          periods.push(updated);
        } else {
          periods.push(existing);
        }
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
    const y = targetDate.getFullYear();
    await ensureAccountingPeriods(tx, { startYear: y - 1, endYear: y + 1 });
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
 * Enforces PostgreSQL Row-Level Lock (FOR UPDATE) to prevent concurrent journal posting races.
 */
async function closeAccountingPeriod({ periodId, actorEmail, actorId, req }) {
  return await prisma.$transaction(async (tx) => {
    // 1. Acquire PostgreSQL Row-Level Lock (FOR UPDATE)
    const lockedPeriods = await tx.$queryRaw`
      SELECT id, status, "periodName", "fiscalYear", month
      FROM public."AccountingPeriod"
      WHERE id = ${periodId}
      FOR UPDATE
    `;

    const period = lockedPeriods && lockedPeriods.length > 0 ? lockedPeriods[0] : null;

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
      message: `Accounting Period "${period.periodName}" has been CLOSED. Further General Ledger postings to this period are strictly prohibited.`,
      period: updated
    };
  });
}

/**
 * Reopen an Accounting Period (Transition CLOSED -> OPEN - Admin Only)
 * Requires mandatory detailed justification (minimum 10 characters).
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
    // 1. Acquire PostgreSQL Row-Level Lock (FOR UPDATE)
    const lockedPeriods = await tx.$queryRaw`
      SELECT id, status, "periodName", "fiscalYear", month
      FROM public."AccountingPeriod"
      WHERE id = ${periodId}
      FOR UPDATE
    `;

    const period = lockedPeriods && lockedPeriods.length > 0 ? lockedPeriods[0] : null;

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
  getIndianFiscalQuarter,
  getIndianFiscalYear,
  ensureAccountingPeriods,
  listAccountingPeriods,
  getPeriodForDate,
  closeAccountingPeriod,
  reopenAccountingPeriod
};
