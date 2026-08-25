const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const { verifyJWT } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

// GET /api/v1/users/roles
// Protected: Only users with 'user.manage' permission can fetch the list of roles to assign.
router.get('/roles', verifyJWT, checkPermission('user.manage'), userController.getRoles);

// GET /api/v1/users/managers
router.get('/managers', verifyJWT, userController.getManagers);

// GET /api/v1/users/all
router.get('/all', verifyJWT, userController.getAllUsers);

// POST /api/v1/users/register
// Protected: Only users with 'user.manage' permission can register new users.
router.post('/register', verifyJWT, checkPermission('user.manage'), userController.registerUser);

module.exports = router;
