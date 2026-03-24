const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticateUser, authorizeRoles, USER_ROLES } = require('../middleware/authentication');


router
    .route('/reports/detailed-report')
    .get(authenticateUser, inventoryController.getDetailedProductInventoryReport); // <-- This is the route in question


router.route('/reports').get(authenticateUser, inventoryController.getInventoryReports);
router.route('/reports/staff').get(authenticateUser, inventoryController.getStaffPerformanceReport);
router.route('/reports/audit').get(authenticateUser, authorizeRoles(USER_ROLES.MANAGER, USER_ROLES.ADMIN), inventoryController.getAuditLogs); 
router.route('/reports/staff-dashboard').get(authenticateUser, authorizeRoles(USER_ROLES.MANAGER, USER_ROLES.ADMIN), inventoryController.getStaffPerformanceDashboard); 


router.route('/transactions').get(authenticateUser, inventoryController.getAllTransactions);
router.route('/product/adjust/:id').patch(authenticateUser, inventoryController.adjustProductStock);
router.route('/product/transfer/:id').patch(authenticateUser, inventoryController.transferProductStock);
router.route('/adjust/:id').patch(authenticateUser, inventoryController.adjustInventoryStock);
router.route('/transfer/:id').patch(authenticateUser, inventoryController.transferInventoryStock);

router.route('/reports/product-sales-by-staff').get(authenticateUser, inventoryController.getStaffProductSales);

router
    .route('/reports/daily-summary').get(authenticateUser, inventoryController.getDailySummaryReport);


module.exports = router;