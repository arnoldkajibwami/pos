// controllers/userController.js

const User = require('../models/UserModel');
const { USER_ROLES } = require('../utils/constants');

const getAllUsers = async (req, res) => {
  // Update: Retrieve all staff (Waiter, Cashier, Manager) for comprehensive reporting.
  // Exclude Admin only for staff management list.
  const users = await User.find({ role: { $ne: USER_ROLES.ADMIN } }).select('-password');
  res.status(200).json({ users, count: users.length });
};

// --- NEW: Get all Waiters ---
const getWaiters = async (req, res) => {
  // Find all users with the role 'waiter'
  const waiters = await User.find({ role: USER_ROLES.WAITER }).select('-password');
  res.status(200).json({ waiters, count: waiters.length });
};

const createUser = async (req, res) => {
  // Include 'pin' from the request body
  const { name, email, password, role, pin } = req.body;

  // --- FIX 1: Prevent E11000 crash by checking for existing user ---
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ msg: 'Email already in use. Please use a unique email address.' });
  }

  // Enforce role creation limitations (e.g., prevent Manager from creating Admin)
  if (req.user.role === USER_ROLES.MANAGER && (role === USER_ROLES.ADMIN || role === USER_ROLES.MANAGER)) {
    return res.status(403).json({ msg: 'Manager cannot create Admin or other Manager accounts.' });
  }

  // Pass the optional 'pin' to the User.create. The model's pre-save hook will handle hashing/generation.
  const user = await User.create({ name, email, password, role: role || USER_ROLES.WAITER, pin });

  // Do not send password back
  user.password = undefined;

  // --- FIX 2: Check for and return the unhashed (generated) PIN ---
  const responseData = { user };

  // The user model's pre('save') hook is expected to store the clear-text PIN 
  // in user.unhashedPin if it was generated or provided.
  if (user.unhashedPin) {
    responseData.generatedPin = user.unhashedPin;
  }

  res.status(201).json(responseData);
};

const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  // Role update permission check: Admin can update any role, Manager can update Cashier/Waiter
  if (req.user.role === USER_ROLES.MANAGER && (role === USER_ROLES.ADMIN || role === USER_ROLES.MANAGER)) {
    return res.status(403).json({ msg: 'Manager cannot set role to Admin or Manager.' });
  }

  const user = await User.findByIdAndUpdate(id, { role }, { new: true, runValidators: true });

  if (!user) {
    return res.status(404).json({ msg: `No user with id :${id} found` });
  }

  user.password = undefined;
  res.status(200).json({ user });
};

// --- Update User (Name/Email) ---
const updateUserDetails = async (req, res) => {
  const { id } = req.params;
  // Get name, email, and the optional 'pin'
  const { name, email, pin } = req.body;

  if (!name || !email) {
    return res.status(400).json({ msg: 'Please provide name and email' });
  }

  // Only the user themselves or an Admin/Manager can update their details
  if (req.user.userId !== id && req.user.role !== USER_ROLES.ADMIN && req.user.role !== USER_ROLES.MANAGER) {
    return res.status(403).json({ msg: 'Unauthorized to update this user.' });
  }

  // Create update object for Mongoose
  const updates = { name, email };

  // Only update PIN if provided (4 digits validation should be done by frontend/model)
  if (pin && pin.length === 4) {
    updates.pin = pin;
  }

  const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

  if (!user) {
    return res.status(404).json({ msg: `No user with id :${id} found` });
  }

  user.password = undefined;
  res.status(200).json({ user });
};

// --- Change Password ---
const changePassword = async (req, res) => {
  const { id } = req.params;
  const { oldPassword, newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ msg: 'New password is required.' });
  }

  // Only the user themselves or an Admin can change their password
  if (req.user.userId !== id && req.user.role !== USER_ROLES.ADMIN) {
    return res.status(403).json({ msg: 'Unauthorized to change this password.' });
  }

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({ msg: `No user with id :${id} found` });
  }

  // If not Admin (user is changing their own password), verify old password
  if (req.user.userId === id) {
    if (!oldPassword) {
      return res.status(400).json({ msg: 'Old password is required to change your own password.' });
    }
    const isCorrect = await user.comparePassword(oldPassword);
    if (!isCorrect) {
      return res.status(401).json({ msg: 'Invalid old password.' });
    }
  }

  // Hash the new password and save (User Model pre-save hook handles hashing)
  user.password = newPassword;
  await user.save();

  res.status(200).json({ msg: 'Password updated successfully' });
};

const deleteUser = async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({ msg: `No user with id :${id} found` });
  }

  // Prevent deleting the currently logged-in user or Admin from Manager
  if (user._id.toString() === req.user.userId) {
    return res.status(403).json({ msg: 'Cannot delete own account.' });
  }
  if (req.user.role === USER_ROLES.MANAGER && user.role === USER_ROLES.ADMIN) {
    return res.status(403).json({ msg: 'Manager cannot delete Admin accounts.' });
  }

  await user.deleteOne();
  res.status(200).json({ msg: 'User removed' });
};


module.exports = {
  getAllUsers,
  createUser,
  updateUserRole,
  updateUserDetails,
  changePassword,
  deleteUser,
  getWaiters,
};