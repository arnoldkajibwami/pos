const express = require('express');
const router = express.Router();
const { authenticateUser, authorizeRoles, USER_ROLES } = require('../middleware/authentication');
const {
    createDraftBill,
    updateDraftBill,
    getDraftBills,
    getDraftBillDetails,
    finalizeBill,
    getFinalBills,
    deleteDraftBill,
    getCustomerWithdrawals,
    getMergedDraftDetails, 
    productSave,
    updatedFinalizeBill,
    getPendingSavedProducts,
    resetAllPerformancePoints,
    updateFinalBill,
    productWithdraw,
    getWaiterPerformance,
    getWaitersList,
    getWaiterMovementReport,
} = require('../controllers/billController');
const { generateBuffetBill, composeBuffetPlate, getFinalizedBuffetBills, finalizeBuffetBill, getBuffetReport, getBillById } = require('../controllers/productController');

router.get(
    '/performance', 
    authenticateUser, 
    authorizeRoles(USER_ROLES.MANAGER, USER_ROLES.ADMIN, USER_ROLES.CASHIER), 
    getWaiterPerformance // This function must be imported from billController
);

router.get(
    '/final', 
    authenticateUser, 
    authorizeRoles(USER_ROLES.CASHIER, USER_ROLES.MANAGER, USER_ROLES.WAITER, USER_ROLES.ADMIN), 
    getFinalBills
);


router
    .route('/drafts')
    .post(authenticateUser, authorizeRoles(USER_ROLES.WAITER, USER_ROLES.CASHIER, USER_ROLES.ADMIN, USER_ROLES.BUFFET), createDraftBill)
    .get(authenticateUser, authorizeRoles(USER_ROLES.CASHIER, USER_ROLES.WAITER, USER_ROLES.MANAGER, USER_ROLES.ADMIN, USER_ROLES.BUFFET), getDraftBills);

router.patch('/saved-products/withdraw', authenticateUser, authorizeRoles(USER_ROLES.WAITER, USER_ROLES.CASHIER, USER_ROLES.ADMIN), productWithdraw);

  // PATCH /api/v1/bills/updateFinal
router.patch('/saved-products/save', 
    authenticateUser, 
    authorizeRoles(USER_ROLES.CASHIER, USER_ROLES.MANAGER, USER_ROLES.ADMIN), // Adjust roles as needed
    productSave
);
router.patch('/final/update', authenticateUser,authorizeRoles( USER_ROLES.MANAGER, USER_ROLES.ADMIN), updatedFinalizeBill);
router.patch('/:id', authenticateUser,authorizeRoles( USER_ROLES.MANAGER, USER_ROLES.ADMIN), updateFinalBill);
router.get('/saved-products/pending', authenticateUser, authorizeRoles(USER_ROLES.MANAGER, USER_ROLES.ADMIN, USER_ROLES.CASHIER), getPendingSavedProducts);
router.patch('/reset-points', authenticateUser, authorizeRoles( USER_ROLES.MANAGER, USER_ROLES.ADMIN), resetAllPerformancePoints);

router.post(
    '/drafts/merge-details',
    authenticateUser, 
    authorizeRoles(USER_ROLES.WAITER, USER_ROLES.CASHIER, USER_ROLES.ADMIN),
    getMergedDraftDetails
);

router.get('/:id', getBillById);
router.put('/drafts/:id', updateDraftBill);

router.post(
    '/buffet/compose', 
    authenticateUser, 
    authorizeRoles(USER_ROLES.WAITER, USER_ROLES.CASHIER, USER_ROLES.ADMIN), 
    composeBuffetPlate
);

// Composition & Generation
router.post('/buffet/generate', authenticateUser, generateBuffetBill);

// Finalization
router.post('/buffet/finalize', authenticateUser, finalizeBuffetBill);

// Filtering / Reports
router.get('/buffet/finalized', authenticateUser, authorizeRoles(USER_ROLES.MANAGER, USER_ROLES.ADMIN,USER_ROLES.BUFFET), getFinalizedBuffetBills);


router.get('/buffet/report', authenticateUser, authorizeRoles(USER_ROLES.MANAGER, USER_ROLES.ADMIN, USER_ROLES.BUFFET), getBuffetReport);
router.post(
    '/drafts/details', 
    authenticateUser, 
    authorizeRoles(USER_ROLES.CASHIER, USER_ROLES.BUFFET, USER_ROLES.MANAGER, USER_ROLES.ADMIN), 
    getDraftBillDetails
);

router.get(
    '/waiter-report',
    authenticateUser,
    authorizeRoles(USER_ROLES.MANAGER, USER_ROLES.ADMIN),
    getWaiterMovementReport
);

router
    .route('/drafts/:id')
    .get(authenticateUser, authorizeRoles(USER_ROLES.CASHIER, USER_ROLES.WAITER, USER_ROLES.MANAGER, USER_ROLES.ADMIN, USER_ROLES.BUFFET), getDraftBillDetails) 
    .patch(authenticateUser, authorizeRoles(USER_ROLES.WAITER, USER_ROLES.CASHIER, USER_ROLES.ADMIN, USER_ROLES.BUFFET), updateDraftBill) 
    .delete(authenticateUser, authorizeRoles(USER_ROLES.CASHIER, USER_ROLES.WAITER, USER_ROLES.MANAGER, USER_ROLES.ADMIN, USER_ROLES.BUFFET), deleteDraftBill);


router.post(
    '/finalize', 
    authenticateUser, 
    authorizeRoles(USER_ROLES.CASHIER,USER_ROLES.WAITER, USER_ROLES.MANAGER, USER_ROLES.ADMIN), 
    finalizeBill
);



router.get(
    '/withdrawals/:customerId', 
    authenticateUser, 
    authorizeRoles(USER_ROLES.WAITER, USER_ROLES.CASHIER, USER_ROLES.MANAGER, USER_ROLES.ADMIN), 
    getCustomerWithdrawals
);



router.get(
    '/waiters', 
    authenticateUser, 
    authorizeRoles(USER_ROLES.MANAGER, USER_ROLES.ADMIN), 
   getWaitersList
);

module.exports = router;
