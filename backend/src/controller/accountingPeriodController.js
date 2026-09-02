const accountingPeriodService = require('../services/accountingPeriodService');

/**
 * List all Accounting Periods
 */
async function listPeriods(req, res) {
  try {
    const { fiscalYear, status } = req.query;
    const periods = await accountingPeriodService.listAccountingPeriods({ fiscalYear, status });
    return res.status(200).json({ success: true, periods });
  } catch (error) {
    console.error('List Accounting Periods Error:', error);
    return res.status(500).json({
      success: false,
      code: 'PERIODS_FETCH_FAILED',
      message: error.message || 'Server error fetching accounting periods.'
    });
  }
}

/**
 * Close an Accounting Period (Admin, Senior Accounting)
 */
async function closePeriod(req, res) {
  try {
    const { id } = req.params;
    const result = await accountingPeriodService.closeAccountingPeriod({
      periodId: id,
      actorEmail: req.user?.email,
      actorId: req.user?.userId,
      req
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error('Close Accounting Period Error:', error);
    return res.status(error.status || 500).json({
      success: false,
      code: error.code || 'PERIOD_CLOSE_FAILED',
      message: error.message || 'Server error closing accounting period.'
    });
  }
}

/**
 * Reopen a Closed Accounting Period (Strictly ADMIN ONLY)
 */
async function reopenPeriod(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Strict Admin Role Check
    if (req.user?.role !== 'ADMIN' && req.user?.roleName !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Only Admin users are authorized to reopen a closed accounting period.'
      });
    }

    const result = await accountingPeriodService.reopenAccountingPeriod({
      periodId: id,
      reason,
      actorEmail: req.user?.email,
      actorId: req.user?.userId,
      req
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error('Reopen Accounting Period Error:', error);
    return res.status(error.status || 500).json({
      success: false,
      code: error.code || 'PERIOD_REOPEN_FAILED',
      message: error.message || 'Server error reopening accounting period.'
    });
  }
}

module.exports = {
  listPeriods,
  closePeriod,
  reopenPeriod
};
