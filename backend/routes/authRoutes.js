// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const { register, login, pinLogin } = require('../controllers/authController');
const { authenticateUser } = require('../middleware/authentication');

router.post('/register', register);
router.post('/login', login);
router.post('/pin-login', pinLogin);
router.get('/me', authenticateUser, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
});

module.exports = router;