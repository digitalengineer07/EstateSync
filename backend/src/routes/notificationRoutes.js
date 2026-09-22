const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notificationController');
const { verifyJWT } = require('../middleware/authMiddleware');

// All authenticated roles can fetch their relevant notifications
router.get('/', verifyJWT, notificationController.getNotifications);

module.exports = router;
