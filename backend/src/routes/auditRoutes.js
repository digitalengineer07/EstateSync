const express = require('express');
const router = express.Router();
const auditController = require('../controller/auditController');
const { verifyJWT } = require('../middleware/authMiddleware');

// GET /api/v1/audit (Dedicated Audit Trail)
router.get('/', verifyJWT, (req, res, next) => {
  if (['ADMIN', 'ACCOUNTING'].includes(req.user?.role)) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: Admin or Accounting role required to view audit logs' });
}, auditController.getAuditLogs);

module.exports = router;
