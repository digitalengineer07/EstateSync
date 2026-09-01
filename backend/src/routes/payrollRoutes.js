const express = require('express');
const router = express.Router();
const salaryComponentController = require('../controller/salaryComponentController');
const salaryStructureController = require('../controller/salaryStructureController');
const salaryAssignmentController = require('../controller/salaryAssignmentController');
const payrollPeriodController = require('../controller/payrollPeriodController');
const payrollRunController = require('../controller/payrollRunController');
const payrollAdjustmentController = require('../controller/payrollAdjustmentController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

// All Payroll configuration and processing routes require valid JWT authentication
router.use(verifyJWT);

// -------------------------------------------------------------
// 1. Salary Component Master Routes (Phase 2)
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
// 2. Salary Structure Master Routes (Phase 2)
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
// 3. Employee Salary Assignment Routes (Phase 2)
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

// -------------------------------------------------------------
// 4. Monthly Payroll Period Routes (Phase 3)
// -------------------------------------------------------------
router.post(
  '/periods',
  checkPermission('payroll.period.manage'),
  payrollPeriodController.createPeriod
);

router.get(
  '/periods',
  checkPermission('payroll.period.view'),
  payrollPeriodController.getPeriods
);

router.get(
  '/periods/:id',
  checkPermission('payroll.period.view'),
  payrollPeriodController.getPeriodById
);

router.post(
  '/periods/:id/open',
  checkPermission('payroll.period.manage'),
  payrollPeriodController.openPeriod
);

// -------------------------------------------------------------
// 5. Payroll Calculation Run & Approval Routes (Phase 3)
// -------------------------------------------------------------
router.post(
  '/runs',
  checkPermission('payroll.run.create'),
  payrollRunController.createRun
);

router.get(
  '/runs/:id',
  checkPermission('payroll.run.view'),
  payrollRunController.getRunById
);

router.post(
  '/runs/:id/calculate',
  checkPermission('payroll.run.calculate'),
  payrollRunController.calculateRun
);

router.get(
  '/runs/:id/items',
  checkPermission('payroll.item.view'),
  payrollRunController.getRunItems
);

router.get(
  '/items/:id',
  checkPermission('payroll.item.view'),
  payrollRunController.getItemById
);

router.get(
  '/runs/:id/exceptions',
  checkPermission('payroll.run.view'),
  payrollRunController.getRunExceptions
);

router.post(
  '/runs/:id/approve',
  checkPermission('payroll.approve'),
  payrollRunController.approveRun
);

router.post(
  '/runs/:id/lock',
  checkPermission('payroll.lock'),
  payrollRunController.lockRun
);

// -------------------------------------------------------------
// 6. Payroll Adjustment Routes (Phase 3)
// -------------------------------------------------------------
router.post(
  '/runs/:id/adjustments',
  checkPermission('payroll.item.adjust'),
  payrollAdjustmentController.createAdjustment
);

router.get(
  '/runs/:id/adjustments',
  checkPermission('payroll.run.view'),
  payrollAdjustmentController.getRunAdjustments
);

module.exports = router;
