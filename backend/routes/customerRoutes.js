// routes/customerRoutes.js

const express = require('express');
const router = express.Router();
const { authenticateUser, authorizeRoles, USER_ROLES } = require('../middleware/authentication');
const {
  registerCustomer,
  getCustomerDetails,
  withdrawBottle,
  adjustCredit,
  getAllCustomers,
  getCustomersInDebt,
  resetCustomerPoints,
  getSavedBottles,
} = require('../controllers/customerController');

// Waiters and up can register/look up customers
router.route('/')
  .post(authenticateUser, authorizeRoles(USER_ROLES.WAITER, USER_ROLES.CASHIER, USER_ROLES.MANAGER, USER_ROLES.ADMIN), registerCustomer)
  .get(authenticateUser, authorizeRoles(USER_ROLES.WAITER, USER_ROLES.CASHIER, USER_ROLES.MANAGER, USER_ROLES.ADMIN), getAllCustomers)
// Get Customer details (including fidelity/credit/withdrawals)

router.route('/debt-report').get(authenticateUser, getCustomersInDebt);

router.patch('/points/:customerId/reset', authenticateUser, authorizeRoles(USER_ROLES.CASHIER, USER_ROLES.MANAGER, USER_ROLES.ADMIN), resetCustomerPoints);

// >>> FIX START: MOVE SPECIFIC ROUTES BEFORE GENERAL PARAMETER ROUTES
router.route('/saved-bottles')
  .get(authenticateUser, authorizeRoles(USER_ROLES.CASHIER, USER_ROLES.MANAGER, USER_ROLES.ADMIN), getSavedBottles);
// >>> FIX END

router.route('/:id')
  .get(authenticateUser, getCustomerDetails);


router.route('/debt-report').get(authenticateUser, getCustomersInDebt);

// FIX: Change withdrawal route to match the `BottleWithdrawalPage.jsx` API call
router.route('/withdraw-bottle')
  .patch(authenticateUser, authorizeRoles(USER_ROLES.CASHIER, USER_ROLES.MANAGER, USER_ROLES.ADMIN), withdrawBottle);

router.route('/credit/:customerId')
  .patch(authenticateUser, authorizeRoles(USER_ROLES.MANAGER, USER_ROLES.ADMIN), adjustCredit);


module.exports = router;