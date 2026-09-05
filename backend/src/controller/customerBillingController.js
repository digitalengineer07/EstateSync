const paymentPlanService = require('../services/paymentPlanService');
const customerBillingService = require('../services/customerBillingService');
const paymentAllocationService = require('../services/paymentAllocationService');
const customerLedgerService = require('../services/customerLedgerService');

/**
 * Customer Billing & Accounts Receivable Controller (Phase 7)
 */

// Payment Plan Endpoints
exports.createPaymentPlan = async (req, res) => {
  try {
    const { name, projectLocation, description, milestones } = req.body;
    const plan = await paymentPlanService.createPaymentPlan({
      name,
      projectLocation,
      description,
      milestones,
      createdById: req.user.userId
    });
    res.status(201).json({ success: true, message: `Payment plan "${plan.name}" created successfully.`, data: plan });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Server error creating payment plan.' });
  }
};

exports.listPaymentPlans = async (req, res) => {
  try {
    const { status } = req.query;
    const plans = await paymentPlanService.listPaymentPlans({ status });
    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Server error listing payment plans.' });
  }
};

exports.getPaymentPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await paymentPlanService.getPaymentPlanById(id);
    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Server error fetching payment plan.' });
  }
};

exports.assignPlanToCustomer = async (req, res) => {
  try {
    const { customerId, planId } = req.body;
    const customer = await paymentPlanService.assignPlanToCustomer({
      customerId,
      planId,
      actorId: req.user.userId
    });
    res.status(200).json({ success: true, message: `Assigned payment plan to customer "${customer.customerName}".`, data: customer });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Server error assigning payment plan.' });
  }
};

// Demand Note Endpoints
exports.issueDemandNote = async (req, res) => {
  try {
    const { customerId, milestoneId, customAmount, customDueDate, notes } = req.body;
    const result = await customerBillingService.issueDemandNote({
      customerId,
      milestoneId,
      customAmount,
      customDueDate,
      notes,
      issuedById: req.user.userId,
      issuedByEmail: req.user.email
    });
    res.status(201).json({
      success: true,
      message: `Demand note ${result.demandNote.demandNumber} issued successfully.`,
      data: result
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Server error issuing demand note.' });
  }
};

exports.cancelDemandNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await customerBillingService.cancelDemandNote({
      demandNoteId: id,
      reason,
      cancelledById: req.user.userId,
      cancelledByEmail: req.user.email
    });
    res.status(200).json({
      success: true,
      message: `Demand note ${result.demandNote.demandNumber} cancelled successfully.`,
      data: result
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Server error cancelling demand note.' });
  }
};

exports.listDemandNotes = async (req, res) => {
  try {
    const { customerId, status } = req.query;
    const demands = await customerBillingService.listDemandNotes({ customerId, status });
    res.status(200).json({ success: true, data: demands });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Server error listing demand notes.' });
  }
};

// Payment Receipt & Allocation Endpoint
exports.recordCustomerPayment = async (req, res) => {
  try {
    const {
      customerId,
      amount,
      paymentMode,
      referenceNo,
      sourceAccount,
      destinationAccount,
      dateOfPayment,
      targetDemandNoteId,
      notes
    } = req.body;

    const result = await paymentAllocationService.recordCustomerReceipt({
      customerId,
      amount,
      paymentMode,
      referenceNo,
      sourceAccount,
      destinationAccount,
      dateOfPayment,
      targetDemandNoteId,
      notes,
      recordedById: req.user.userId,
      recordedByEmail: req.user.email
    });

    res.status(201).json({
      success: true,
      message: `Customer payment of ₹${parseFloat(amount).toLocaleString('en-IN')} recorded and allocated successfully.`,
      data: result
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Server error recording customer payment.' });
  }
};

// Statements, Aging & Reconciliation Reports
exports.getCustomerStatement = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    const statement = await customerLedgerService.getCustomerStatement({ customerId: id, startDate, endDate });
    res.status(200).json({ success: true, data: statement });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Server error fetching customer statement.' });
  }
};

exports.getARAgingReport = async (req, res) => {
  try {
    const { asOfDate } = req.query;
    const report = await customerLedgerService.getARAgingReport({ asOfDate });
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Server error fetching AR aging report.' });
  }
};

exports.getARReconciliationReport = async (req, res) => {
  try {
    const report = await customerLedgerService.getARReconciliationReport();
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Server error running AR reconciliation.' });
  }
};
