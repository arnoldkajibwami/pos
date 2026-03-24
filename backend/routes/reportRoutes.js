// routes/reportRoutes.js

const express = require('express');
const router = express.Router();
const { authenticateUser, authorizeRoles, USER_ROLES } = require('../middleware/authentication');
const {
  getSalesAndDebtSummary,
  getProductAndWaiterReports,
} = require('../controllers/reportController');

// All reports should typically be restricted to Manager/Admin roles
const reportAuth = [authenticateUser, authorizeRoles(USER_ROLES.MANAGER, USER_ROLES.ADMIN)];

// GET /api/v1/reports/summary - Overall Revenue and Debt Summary
router.get('/summary', reportAuth, getSalesAndDebtSummary);

// GET /api/v1/reports/breakdown - Product Sales and Waiter Performance
router.get('/breakdown', reportAuth, getProductAndWaiterReports);


module.exports = router;