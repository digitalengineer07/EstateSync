const salaryPaymentService = require('../services/salaryPaymentService');

/**
 * 1. Create a single salary payment (Draft / Pending Approval)
 */
async function createPayment(req, res) {
  try {
    const {
      payrollRunId,
      payrollItemId,
      employeeId,
      amount,
      paymentMode,
      sourceAccountCode,
      bankName,
      accountNumberMasked,
      ifscCode,
      referenceNo,
      initialStatus
    } = req.body;

    const result = await salaryPaymentService.createSalaryPayment({
      payrollRunId,
      payrollItemId,
      employeeId,
      amount,
      paymentMode,
      sourceAccountCode,
      bankName,
      accountNumberMasked,
      ifscCode,
      referenceNo,
      initialStatus,
      actorEmail: req.user?.email,
      actorId: req.user?.userId,
      req
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error('Create Salary Payment Error:', error);
    return res.status(error.status || 500).json({
      success: false,
      code: error.code || 'SALARY_PAYMENT_CREATION_FAILED',
      message: error.message || 'Server error creating salary payment.'
    });
  }
}

/**
 * 2. Create a salary payment batch (Draft)
 */
async function createPaymentBatch(req, res) {
  try {
    const { payrollRunId, paymentMode, sourceAccountCode, notes, payments } = req.body;

    const result = await salaryPaymentService.createSalaryPaymentBatch({
      payrollRunId,
      paymentMode,
      sourceAccountCode,
      notes,
      payments,
      actorEmail: req.user?.email,
      actorId: req.user?.userId,
      req
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error('Create Salary Payment Batch Error:', error);
    return res.status(error.status || 500).json({
      success: false,
      code: error.code || 'BATCH_CREATION_FAILED',
      message: error.message || 'Server error creating salary payment batch.'
    });
  }
}

/**
 * 3. Approve salary payment batch (Funds & Liability Reserved)
 */
async function approvePaymentBatch(req, res) {
  try {
    const { id } = req.params;

    const result = await salaryPaymentService.approveSalaryPaymentBatch({
      batchId: id,
      actorEmail: req.user?.email,
      actorId: req.user?.userId,
      req
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Approve Salary Payment Batch Error:', error);
    return res.status(error.status || 500).json({
      success: false,
      code: error.code || 'BATCH_APPROVAL_FAILED',
      message: error.message || 'Server error approving salary payment batch.'
    });
  }
}

/**
 * 4. Cancel salary payment batch (Releases Reservation)
 */
async function cancelPaymentBatch(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await salaryPaymentService.cancelSalaryPaymentBatch({
      batchId: id,
      reason,
      actorEmail: req.user?.email,
      actorId: req.user?.userId,
      req
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Cancel Salary Payment Batch Error:', error);
    return res.status(error.status || 500).json({
      success: false,
      code: error.code || 'BATCH_CANCELLATION_FAILED',
      message: error.message || 'Server error cancelling salary payment batch.'
    });
  }
}

/**
 * 5. Phase 5B: Settle single salary payment
 */
async function settlePayment(req, res) {
  try {
    const { id } = req.params;
    const { paymentDate, referenceNo, paymentMode, sourceAccountCode } = req.body;

    const result = await salaryPaymentService.settleSalaryPayment({
      paymentId: id,
      paymentDate,
      referenceNo,
      paymentMode,
      sourceAccountCode,
      actorEmail: req.user?.email,
      actorId: req.user?.userId,
      req
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Settle Salary Payment Error:', error);
    return res.status(error.status || 500).json({
      success: false,
      code: error.code || 'SALARY_PAYMENT_SETTLEMENT_FAILED',
      message: error.message || 'Server error settling salary payment.'
    });
  }
}

/**
 * 6. Phase 5B: Settle salary payment batch
 */
async function settlePaymentBatch(req, res) {
  try {
    const { id } = req.params;
    const { paymentDate } = req.body;

    const result = await salaryPaymentService.settleSalaryPaymentBatch({
      batchId: id,
      paymentDate,
      actorEmail: req.user?.email,
      actorId: req.user?.userId,
      req
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Settle Salary Payment Batch Error:', error);
    return res.status(error.status || 500).json({
      success: false,
      code: error.code || 'BATCH_SETTLEMENT_FAILED',
      message: error.message || 'Server error settling salary payment batch.'
    });
  }
}

/**
 * 7. Phase 5B: Reverse salary payment settlement (Admin Only)
 */
async function reversePayment(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Check Admin Role
    if (req.user?.role !== 'ADMIN' && req.user?.roleName !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Only Admin users can reverse salary payment settlements.'
      });
    }

    const result = await salaryPaymentService.reverseSalaryPaymentSettlement({
      paymentId: id,
      reason,
      actorEmail: req.user?.email,
      actorId: req.user?.userId,
      req
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Reverse Salary Payment Error:', error);
    return res.status(error.status || 500).json({
      success: false,
      code: error.code || 'SALARY_PAYMENT_REVERSAL_FAILED',
      message: error.message || 'Server error reversing salary payment.'
    });
  }
}

/**
 * 8. Phase 5B: Get Settlement Preview (Read-Only)
 */
async function getSettlementPreview(req, res) {
  try {
    const { id } = req.params;
    const result = await salaryPaymentService.getPaymentSettlementPreview(id);
    return res.status(200).json({ success: true, preview: result });
  } catch (error) {
    console.error('Get Settlement Preview Error:', error);
    return res.status(error.status || 500).json({
      success: false,
      code: error.code || 'PREVIEW_FAILED',
      message: error.message || 'Server error getting settlement preview.'
    });
  }
}

/**
 * 9. Get Payroll Payment Summary
 */
async function getPaymentSummary(req, res) {
  try {
    const { id } = req.params; // payrollRunId
    const result = await salaryPaymentService.getPayrollPaymentSummary(id);
    return res.status(200).json({ success: true, summary: result });
  } catch (error) {
    console.error('Get Payment Summary Error:', error);
    return res.status(error.status || 500).json({
      success: false,
      code: error.code || 'SUMMARY_FAILED',
      message: error.message || 'Server error getting payment summary.'
    });
  }
}

/**
 * 10. Get Employee Payable Status
 */
async function getEmployeePayableStatus(req, res) {
  try {
    const { id } = req.params; // payrollItemId
    const result = await salaryPaymentService.getEmployeePayableStatus({ payrollItemId: id });
    return res.status(200).json({ success: true, status: result });
  } catch (error) {
    console.error('Get Employee Payable Status Error:', error);
    return res.status(error.status || 500).json({
      success: false,
      code: error.code || 'STATUS_QUERY_FAILED',
      message: error.message || 'Server error fetching payable status.'
    });
  }
}

module.exports = {
  createPayment,
  createPaymentBatch,
  approvePaymentBatch,
  cancelPaymentBatch,
  settlePayment,
  settlePaymentBatch,
  reversePayment,
  getSettlementPreview,
  getPaymentSummary,
  getEmployeePayableStatus
};
