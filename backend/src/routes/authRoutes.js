const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const { verifyJWT } = require('../middleware/authMiddleware');

// POST /api/v1/auth/login
router.post('/login', authController.login);

// POST /api/v1/auth/refresh
router.post('/refresh', authController.refreshToken);

// POST /api/v1/auth/logout
router.post('/logout', authController.logout);

// PUT /api/v1/auth/change-password
router.put('/change-password', verifyJWT, authController.changePassword);

module.exports = router;
