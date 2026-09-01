const payrollAccountingService = require('../services/payrollAccountingService');

/**
 * 1. Get Posting Preview for a Locked Payroll Run (Read-Only)
 * GET /api/v1/payroll/runs/:id/posting-preview
 */
exports.getPostingPreview = async (req, res) => {
  try {
    const { id } = req.params;
    const preview = await payrollAccountingService.generatePayrollPostingPreview(id);
    return res.json({
      success: true,
      preview
    });
  } catch (error) {
    console.error('Error generating payroll posting preview:', error);
    const statusCode = error.status || 500;
    return res.status(statusCode).json({
      success: false,
      code: error.code || 'PAYROLL_PREVIEW_ERROR',
      message: error.message || 'Failed to generate payroll posting preview.'
    });
  }
};

/**
 * 2. Post a Locked Payroll Run to the General Ledger
 * POST /api/v1/payroll/runs/:id/post-to-ledger
 */
exports.postToLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await payrollAccountingService.postPayrollRunToLedger({
      runId: id,
      actorEmail: req.user?.email,
      actorId: req.user?.userId,
      req
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error('Error posting payroll run to general ledger:', error);
    const statusCode = error.status || 500;
    return res.status(statusCode).json({
      success: false,
      code: error.code || 'PAYROLL_POSTING_ERROR',
      message: error.message || 'Failed to post payroll run to general ledger.'
    });
  }
};

/**
 * 3. Reverse a Posted Payroll Journal Entry
 * POST /api/v1/payroll/runs/:id/reverse-ledger-posting
 */
exports.reversePosting = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await payrollAccountingService.reversePayrollPosting({
      runId: id,
      reason,
      actorEmail: req.user?.email,
      actorId: req.user?.userId,
      req
    });

    return res.json(result);
  } catch (error) {
    console.error('Error reversing payroll general ledger posting:', error);
    const statusCode = error.status || 500;
    return res.status(statusCode).json({
      success: false,
      code: error.code || 'PAYROLL_REVERSAL_ERROR',
      message: error.message || 'Failed to reverse payroll general ledger posting.'
    });
  }
};

/**
 * 4. Get Payroll Accounting Posting Details
 * GET /api/v1/payroll/runs/:id/accounting-posting
 */
exports.getAccountingPosting = async (req, res) => {
  try {
    const { id } = req.params;
    const posting = await payrollAccountingService.getPayrollAccountingPosting(id);
    if (!posting) {
      return res.status(404).json({
        success: false,
        message: 'No accounting posting found for this payroll run.'
      });
    }

    return res.json({
      success: true,
      posting
    });
  } catch (error) {
    console.error('Error fetching payroll accounting posting:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payroll accounting posting.'
    });
  }
};
