const express = require('express');
const router = express.Router();
const accountingPeriodController = require('../controller/accountingPeriodController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const idempotencyMiddleware = require('../middleware/idempotencyMiddleware');

// All Accounting Period routes require valid JWT authentication
router.use(verifyJWT);

// 1. List Periods (Admin, Accounting, Manager)
router.get(
  '/',
  checkPermission('payroll.accounting.view'),
  accountingPeriodController.listPeriods
);

// 2. Close Period (Admin, Senior Accounting)
router.post(
  '/:id/close',
  checkPermission('payroll.accounting.post'),
  idempotencyMiddleware,
  accountingPeriodController.closePeriod
);

// 3. Reopen Period (Admin Only)
router.post(
  '/:id/reopen',
  checkPermission('payroll.accounting.reverse'),
  idempotencyMiddleware,
  accountingPeriodController.reopenPeriod
);

module.exports = router;
