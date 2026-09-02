const express = require('express');
const router = express.Router();
const employeeController = require('../controller/employeeController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const idempotencyMiddleware = require('../middleware/idempotencyMiddleware');

// All Employee routes require valid authentication
router.use(verifyJWT);

// 1. Monthly Salary Summary (Must be mounted before /:id)
router.get(
  '/salary/summary',
  checkPermission(['accounting.view', 'user.manage']),
  employeeController.getSalarySummary
);

// 2. Employee Management Routes
router.post(
  '/',
  checkPermission('employee.create'),
  employeeController.createEmployee
);

router.get(
  '/',
  checkPermission('employee.view'),
  employeeController.getEmployees
);

router.get(
  '/:id',
  checkPermission('employee.view'),
  employeeController.getEmployeeById
);

router.patch(
  '/:id',
  checkPermission('employee.update'),
  employeeController.updateEmployee
);

router.post(
  '/:id/archive',
  checkPermission('employee.archive'),
  employeeController.archiveEmployee
);

// 3. User Account Linking Routes
router.post(
  '/:id/link-user',
  checkPermission('employee.update'),
  employeeController.linkUser
);

router.post(
  '/:id/unlink-user',
  checkPermission('employee.update'),
  employeeController.unlinkUser
);

// 4. Simple Salary Configuration & Disbursal Routes
router.put(
  '/:id/salary',
  checkPermission('user.manage'),
  employeeController.updateSalaryConfig
);

router.post(
  '/:id/pay-salary',
  checkPermission(['user.manage', 'expense.approve', 'customer.payment.record']),
  idempotencyMiddleware,
  employeeController.paySalary
);

router.get(
  '/:id/salary-payments',
  checkPermission(['employee.view', 'accounting.view', 'user.manage']),
  employeeController.getSalaryPayments
);

module.exports = router;
