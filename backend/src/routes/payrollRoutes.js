const express = require('express');
const router = express.Router();
const salaryComponentController = require('../controller/salaryComponentController');
const salaryStructureController = require('../controller/salaryStructureController');
const salaryAssignmentController = require('../controller/salaryAssignmentController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

// All Payroll configuration routes require valid JWT authentication
router.use(verifyJWT);

// -------------------------------------------------------------
// 1. Salary Component Master Routes
// -------------------------------------------------------------
router.post(
  '/components',
  checkPermission('payroll.component.manage'),
  salaryComponentController.createSalaryComponent
);

router.get(
  '/components',
  checkPermission('payroll.component.view'),
  salaryComponentController.getSalaryComponents
);

router.get(
  '/components/:id',
  checkPermission('payroll.component.view'),
  salaryComponentController.getSalaryComponentById
);

router.patch(
  '/components/:id',
  checkPermission('payroll.component.manage'),
  salaryComponentController.updateSalaryComponent
);

// -------------------------------------------------------------
// 2. Salary Structure Master Routes
// -------------------------------------------------------------
router.post(
  '/structures',
  checkPermission('payroll.structure.create'),
  salaryStructureController.createSalaryStructure
);

router.get(
  '/structures',
  checkPermission('payroll.structure.view'),
  salaryStructureController.getSalaryStructures
);

router.get(
  '/structures/:id',
  checkPermission('payroll.structure.view'),
  salaryStructureController.getSalaryStructureById
);

router.post(
  '/structures/:id/archive',
  checkPermission('payroll.structure.archive'),
  salaryStructureController.archiveSalaryStructure
);

// -------------------------------------------------------------
// 3. Employee Salary Assignment Routes
// -------------------------------------------------------------
router.post(
  '/assignments',
  checkPermission('payroll.assignment.create'),
  salaryAssignmentController.createAssignment
);

router.get(
  '/assignments/employees/:id',
  checkPermission('payroll.assignment.history'),
  salaryAssignmentController.getEmployeeAssignments
);

router.get(
  '/assignments/employees/:id/current',
  checkPermission('payroll.assignment.view'),
  salaryAssignmentController.getCurrentAssignment
);

router.get(
  '/assignments/employees/:id/resolve',
  checkPermission('payroll.assignment.view'),
  salaryAssignmentController.resolveSalaryByDate
);

module.exports = router;
