const express = require('express');
const router = express.Router();
const walletController = require('../controller/walletController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const idempotencyMiddleware = require('../middleware/idempotencyMiddleware');

// All wallet routes require valid JWT authentication
router.use(verifyJWT);

// 1. Adjust / Edit User Wallet Balance (Admin Only)
router.post(
  '/adjust',
  checkPermission(['fund.allocate', 'user.manage']),
  idempotencyMiddleware,
  walletController.adjustWalletBalance
);

// 2. Overview of all Wallets (Admin & Accounting)
router.get(
  '/overview',
  checkPermission(['fund.allocate', 'accounting.view', 'user.manage']),
  walletController.getWalletOverview
);

module.exports = router;
