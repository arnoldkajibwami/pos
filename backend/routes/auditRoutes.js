const express = require('express');
const router = express.Router();
const { authenticateUser, authorizeRoles, USER_ROLES } = require('../middleware/authentication');
const { getAuditLogs } = require('../controllers/auditController');

// Only Managers and Admins can view the logs
router.route('/')
    .get(authenticateUser, authorizeRoles(USER_ROLES.MANAGER, USER_ROLES.ADMIN), getAuditLogs);

module.exports = router;