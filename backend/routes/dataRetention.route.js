'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/dataRetention.controller');
const { authorizeRoles } = require('../middleware/auth.middleware');

// DELETE /api/data-retention/clean
router.delete('/clean', authorizeRoles('super_admin', 'admin'), controller.cleanOldLogs);

module.exports = router;
