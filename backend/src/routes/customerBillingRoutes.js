const express = require('express');
const router = express.Router();
const customerBillingController = require('../controller/customerBillingController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const idempotencyMiddleware = require('../middleware/idempotencyMiddleware');

// All Customer Billing & AR routes require valid JWT authentication
router.use(verifyJWT);

// 1. Payment Plan Master Routes
router.get(
  '/plans',
  checkPermission(['customer.view', 'customer.view_all', 'payroll.accounting.view']),
  customerBillingController.listPaymentPlans
);

router.post(
  '/plans',
  checkPermission(['payroll.accounting.post', 'customer.edit']),
  idempotencyMiddleware,
  customerBillingController.createPaymentPlan
);

router.get(
  '/plans/:id',
  checkPermission(['customer.view', 'customer.view_all', 'payroll.accounting.view']),
  customerBillingController.getPaymentPlanById
);

router.post(
  '/plans/assign',
  checkPermission(['payroll.accounting.post', 'customer.edit']),
  idempotencyMiddleware,
  customerBillingController.assignPlanToCustomer
);

// 2. Demand Note / Invoice Routes
router.get(
  '/demands',
  checkPermission(['customer.view', 'customer.view_all', 'payroll.accounting.view']),
  customerBillingController.listDemandNotes
);

router.post(
  '/demands',
  checkPermission(['payroll.accounting.post', 'customer.edit']),
  idempotencyMiddleware,
  customerBillingController.issueDemandNote
);

router.post(
  '/demands/:id/cancel',
  checkPermission(['payroll.accounting.reverse', 'customer.edit']),
  idempotencyMiddleware,
  customerBillingController.cancelDemandNote
);

// 3. Payment Receipt & Allocation Route
router.post(
  '/payments',
  checkPermission(['payroll.accounting.post', 'customer.payment']),
  idempotencyMiddleware,
  customerBillingController.recordCustomerPayment
);

// 4. Statements, Aging & Reconciliation Reports
router.get(
  '/customers/:id/statement',
  checkPermission(['customer.view', 'customer.view_all', 'payroll.accounting.view']),
  customerBillingController.getCustomerStatement
);

router.get(
  '/aging',
  checkPermission(['payroll.accounting.view', 'customer.view_all']),
  customerBillingController.getARAgingReport
);

router.get(
  '/reconciliation',
  checkPermission(['payroll.accounting.view', 'customer.view_all']),
  customerBillingController.getARReconciliationReport
);

module.exports = router;
