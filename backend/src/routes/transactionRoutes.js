const express = require('express');
const router = express.Router();
const transactionController = require('../controller/transactionController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

// GET /api/v1/transactions/all
router.get('/all', verifyJWT, checkPermission('transaction.view_all'), transactionController.getAllTransactions);

module.exports = router;
