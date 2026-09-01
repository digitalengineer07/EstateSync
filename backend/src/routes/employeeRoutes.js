const express = require('express');
const router = express.Router();
const employeeController = require('../controller/employeeController');
const salaryAssignmentController = require('../controller/salaryAssignmentController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

// All Employee routes require valid authentication
router.use(verifyJWT);

// 1. Employee Management Routes
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

// 2. User Account Linking Routes
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

// 3. Employee Salary Assignment Subroutes (Phase 2)
router.post(
  '/:id/salary-assignments',
  checkPermission('payroll.assignment.create'),
  salaryAssignmentController.createAssignment
);

router.get(
  '/:id/salary-assignments',
  checkPermission('payroll.assignment.history'),
  salaryAssignmentController.getEmployeeAssignments
);

router.get(
  '/:id/salary-assignments/current',
  checkPermission('payroll.assignment.view'),
  salaryAssignmentController.getCurrentAssignment
);

router.get(
  '/:id/salary-assignments/resolve',
  checkPermission('payroll.assignment.view'),
  salaryAssignmentController.resolveSalaryByDate
);

module.exports = router;
