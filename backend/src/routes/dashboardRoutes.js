const express = require('express');
const router = express.Router();
const dashboardController = require('../controller/dashboardController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

// GET /api/v1/dashboard/wallet
router.get('/wallet', verifyJWT, dashboardController.getWalletStats);

// GET /api/v1/dashboard/manager
router.get('/manager', verifyJWT, checkPermission('fund.approve'), dashboardController.getManagerStats);

// GET /api/v1/dashboard/admin
router.get('/admin', verifyJWT, checkPermission('user.manage'), dashboardController.getAdminStats);

module.exports = router;
