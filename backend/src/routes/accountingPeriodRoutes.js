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
  checkPermission('accounting.view'),
  accountingPeriodController.listPeriods
);

// 2. Close Period (Admin, Senior Accounting)
router.post(
  '/:id/close',
  checkPermission(['accounting.view', 'expense.approve']),
  idempotencyMiddleware,
  accountingPeriodController.closePeriod
);

// 3. Reopen Period (Admin Only)
router.post(
  '/:id/reopen',
  checkPermission(['user.manage', 'expense.reverse']),
  idempotencyMiddleware,
  accountingPeriodController.reopenPeriod
);

module.exports = router;
