// controllers/authController.js

const User = require('../models/UserModel');
const { createJWT } = require('../utils/jwt'); // Correct import for JWT utility
const { USER_ROLES } = require('../utils/constants');

// --- Register ---
const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  // Check for existing user
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ msg: 'Email already in use' });
  }

  // First registered user is automatically the admin
  const isFirstAccount = (await User.countDocuments({})) === 0;
  const finalRole = isFirstAccount ? 'admin' : (role || 'waiter');

  // The UserModel's pre-save hook will handle password hashing and optional PIN generation
  const user = await User.create({ name, email, password, role: finalRole });

  // Use createJWT from utility
  const token = createJWT({ payload: { userId: user._id, name: user.name, role: user.role } });

  res.status(201).json({ user: { name: user.name, role: user.role, userId: user._id }, token });
};

// --- Standard Email/Password Login ---
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ msg: 'Please provide email and password' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ msg: 'Invalid Credentials' });
  }

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    return res.status(401).json({ msg: 'Invalid Credentials' });
  }

  // Use createJWT from utility (Corrected from user.createJWT())
  const token = createJWT({ payload: { userId: user._id, name: user.name, role: user.role } });
  const userData = { userId: user._id, name: user.name, email: user.email, role: user.role };

  res.status(200).json({ user: userData, token });
};


// --- New PIN Login for Waiters/Cashiers ---
const pinLogin = async (req, res) => {
  const { pin } = req.body;

  if (!pin || pin.length !== 4) {
    return res.status(400).json({ msg: 'PIN must be 4 digits' });
  }

  // 1. Find all staff members eligible for PIN login and select their hashed PIN
  const users = await User.find({
    role: { $in: [USER_ROLES.WAITER, USER_ROLES.CASHIER] }
  }).select('+pin');

  // 2. Iterate through staff members and asynchronously compare the provided PIN
  //    Note: user.comparePin must be an async function on the User model
  const comparisonPromises = users.map(async u => ({
    user: u,
    isMatch: u.pin ? await u.comparePin(pin) : false // Check if pin exists before comparing
  }));

  const results = await Promise.all(comparisonPromises);

  // 3. Find the user whose PIN matched
  const match = results.find(r => r.isMatch);
  const user = match ? match.user : null;


  if (!user) {
    return res.status(401).json({ msg: 'PIN invalide' });
  }

  // 4. Create and return JWT
  // Use createJWT from utility (Corrected from user.createJWT())
  const token = createJWT({ payload: { userId: user._id, name: user.name, role: user.role } });
  const userData = { userId: user._id, name: user.name, email: user.email, role: user.role };

  // Success!
  res.status(200).json({ user: userData, token });
};


module.exports = {
  register,
  login,
  pinLogin,
};