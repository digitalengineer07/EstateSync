const express = require('express');
const router = express.Router();
const fundRequestController = require('../controller/fundRequestController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

// Base routes for users
router.post('/', verifyJWT, checkPermission('fund.request'), fundRequestController.createRequest);
router.get('/my', verifyJWT, checkPermission('fund.request'), fundRequestController.getMyRequests);

// Manager specific routes
router.get('/incoming', verifyJWT, fundRequestController.getIncomingRequests); // Manager view
router.post('/:id/approve', verifyJWT, fundRequestController.approveRequest);
router.post('/:id/reject', verifyJWT, fundRequestController.rejectRequest);

// Admin specific routes
router.get('/all', verifyJWT, checkPermission('fund.approve'), fundRequestController.getAllRequests);
router.post('/allocate', verifyJWT, checkPermission('fund.allocate'), fundRequestController.directAllocateFunds);

module.exports = router;
