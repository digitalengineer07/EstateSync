const express = require('express');
const router = express.Router();
const treasuryController = require('../controller/treasuryController');
const { verifyJWT } = require('../middleware/authMiddleware');

// POST /api/v1/treasury/inflow - Record Bank Statement Inflow / Capital Infusion
router.get('/inflows', verifyJWT, (req, res, next) => {
  if (['ADMIN', 'ACCOUNTING'].includes(req.user?.role)) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: Admin or Accounting role required' });
}, treasuryController.getTreasuryInflows);

// GET /api/v1/treasury/cashflow - Unified Treasury Cashflow (Inflows + Outflows)
router.get('/cashflow', verifyJWT, (req, res, next) => {
  if (['ADMIN', 'ACCOUNTING'].includes(req.user?.role)) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: Admin or Accounting role required' });
}, treasuryController.getTreasuryCashflow);

router.post('/inflow', verifyJWT, (req, res, next) => {
  if (['ADMIN', 'ACCOUNTING'].includes(req.user?.role)) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: Admin or Accounting role required' });
}, treasuryController.recordBankInflow);

module.exports = router;
