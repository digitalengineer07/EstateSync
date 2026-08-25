const express = require('express');
const router = express.Router();
const expenseController = require('../controller/expenseController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

// GET /api/v1/expenses/categories
router.get('/categories', verifyJWT, expenseController.getCategories);

// GET /api/v1/expenses/my (User's personal recorded expenses)
router.get('/my', verifyJWT, checkPermission('expense.view'), expenseController.getMyExpenses);

// GET /api/v1/expenses/team (Manager's team expenses)
router.get('/team', verifyJWT, (req, res, next) => {
  if (['ADMIN', 'MANAGER', 'ACCOUNTING'].includes(req.user?.role)) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: Manager or Admin role required' });
}, expenseController.getTeamExpenses);

// GET /api/v1/expenses/all (Admin / Accounting full view)
router.get('/all', verifyJWT, checkPermission('expense.view_all'), expenseController.getAllExpenses);

// POST /api/v1/expenses
router.post('/', verifyJWT, checkPermission('expense.create'), expenseController.createExpense);

module.exports = router;
