const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const { authLimiter, sensitiveAdminLimiter } = require('../middleware/rateLimitMiddleware');

// GET /api/v1/users/roles
// Protected: Only users with 'user.manage' permission can fetch the list of roles to assign.
router.get('/roles', verifyJWT, checkPermission('user.manage'), userController.getRoles);

// GET /api/v1/users/managers
router.get('/managers', verifyJWT, userController.getManagers);

// GET /api/v1/users/all
router.get('/all', verifyJWT, userController.getAllUsers);

// POST /api/v1/users/register
// Protected: Only users with 'user.manage' permission can register new users.
router.post('/register', authLimiter, verifyJWT, checkPermission('user.manage'), userController.registerUser);

// PUT /api/v1/users/:id/reset-password
// Protected: Only Admin / users with 'user.manage' permission can reset passwords without current password
router.put('/:id/reset-password', sensitiveAdminLimiter, verifyJWT, checkPermission('user.manage'), userController.adminResetPassword);

// PATCH & PUT /api/v1/users/:id/status
// Protected: Only Admin / users with 'user.manage' permission can activate or deactivate accounts
router.patch('/:id/status', sensitiveAdminLimiter, verifyJWT, checkPermission('user.manage'), userController.toggleUserStatus);
router.put('/:id/status', sensitiveAdminLimiter, verifyJWT, checkPermission('user.manage'), userController.toggleUserStatus);

module.exports = router;
