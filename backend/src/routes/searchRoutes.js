const express = require('express');
const router = express.Router();
const searchController = require('../controller/searchController');
const { verifyJWT } = require('../middleware/authMiddleware');

// All authenticated roles can perform global spotlight search
router.get('/', verifyJWT, searchController.globalSearch);

module.exports = router;
