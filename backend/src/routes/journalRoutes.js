const express = require('express');
const router = express.Router();
const journalController = require('../controller/journalController');
const { verifyJWT } = require('../middleware/authMiddleware');

// GET /api/v1/journals (General Ledger Double-Entry Journals)
router.get('/', verifyJWT, (req, res, next) => {
  if (['ADMIN', 'ACCOUNTING'].includes(req.user?.role)) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: Admin or Accounting role required to view General Ledger' });
}, journalController.getJournals);

module.exports = router;
