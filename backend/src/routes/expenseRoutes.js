const express = require('express');
const router = express.Router();
const expenseController = require('../controller/expenseController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

// GET /api/v1/expenses/categories
router.get('/categories', verifyJWT, expenseController.getCategories);

// POST /api/v1/expenses
router.post('/', verifyJWT, checkPermission('expense.create'), expenseController.createExpense);

module.exports = router;
