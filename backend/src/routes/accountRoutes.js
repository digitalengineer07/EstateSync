const express = require('express');
const router = express.Router();
const accountController = require('../controller/accountController');
const { verifyJWT } = require('../middleware/authMiddleware');

// GET /api/v1/accounts (Chart of accounts with balance)
router.get('/', verifyJWT, (req, res, next) => {
  if (['ADMIN', 'ACCOUNTING', 'MANAGER'].includes(req.user?.role)) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: Admin, Accounting or Manager role required' });
}, accountController.getAccounts);

module.exports = router;
