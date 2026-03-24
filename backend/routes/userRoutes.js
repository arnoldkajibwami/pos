// routes/userRoutes.js

const express = require('express');
const router = express.Router();
const { authenticateUser, authorizeRoles, USER_ROLES } = require('../middleware/authentication');
const {
  getAllUsers,
  createUser,
  updateUserRole,
  updateUserDetails,
  changePassword,
  deleteUser,
  getWaiters, // <--- ADDED
} = require('../controllers/userController');

// Staff Management (Admin/Manager CRUD on other staff)
router.route('/')
  .get(authenticateUser, authorizeRoles(USER_ROLES.MANAGER, USER_ROLES.ADMIN), getAllUsers)
  .post(authenticateUser, authorizeRoles(USER_ROLES.MANAGER, USER_ROLES.ADMIN), createUser);

// Fetch all Waiters (Admin/Manager)
router.route('/waiters') // <--- ADDED ROUTE
  .get(authenticateUser, authorizeRoles(USER_ROLES.MANAGER, USER_ROLES.ADMIN), getWaiters);

// Update Role/Delete User (Admin/Manager)
router.route('/:id/role')
  .patch(authenticateUser, authorizeRoles(USER_ROLES.MANAGER, USER_ROLES.ADMIN), updateUserRole);

// Update Details (User themselves, or Admin/Manager)
router.route('/:id/details')
  .patch(authenticateUser, updateUserDetails); // Auth middleware handles who is allowed

// Change Password (User themselves, or Admin)
router.route('/:id/password')
  .patch(authenticateUser, changePassword);

// Delete User (Admin/Manager)
router.route('/:id')
  .delete(authenticateUser, authorizeRoles(USER_ROLES.MANAGER, USER_ROLES.ADMIN), deleteUser);


module.exports = router;