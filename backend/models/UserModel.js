// models/UserModel.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES } = require('../utils/constants');

// --- Utility function to generate a 4-digit PIN ---
const generatePin = () => {
    // Generate a random number between 1000 (inclusive) and 9999 (inclusive)
    return Math.floor(1000 + Math.random() * 9000).toString();
};


const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide name'],
    minlength: 3,
    maxlength: 50,
  },
  email: {
    type: String,
    unique: true,
    required: [true, 'Please provide email'],
    match: [
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      'Please provide a valid email',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please provide password'],
    minlength: 6,
  },
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.WAITER,
  },
  // --- NEW: PIN Field ---
  pin: {
    type: String,
    select: false, // Do not send PIN hash by default
    minlength: 4,
    maxlength: 4,
  },
  // --- NEW: Temporary field for clear-text PIN during creation ---
  unhashedPin: {
      type: String, // Stores the clear-text PIN if generated on pre-save
      default: null,
      select: false,
  },
  performancePoints: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastMonthPoints: { 
    type: Number,
    default: 0,
    min: 0,
  },
}, { timestamps: true });

// --- Middleware: Hashing Password and PIN ---
UserSchema.pre('save', async function () {
    // 1. Handle Password Hashing
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }

    // 2. Handle PIN Hashing/Generation (Only for Waiter/Cashier roles)
    const requiresPin = this.role === USER_ROLES.WAITER || this.role === USER_ROLES.CASHIER;

    if (requiresPin && (this.isModified('pin') || this.isNew)) {
        // If it's a new staff member and no PIN was provided, generate one
        if (!this.pin) {
            this.unhashedPin = generatePin(); // Store clear-text PIN temporarily
        } else {
            this.unhashedPin = this.pin; // Store provided clear-text PIN temporarily
        }
        
        // Hash the PIN (either provided or generated)
        const salt = await bcrypt.genSalt(10);
        this.pin = await bcrypt.hash(this.unhashedPin, salt);
    }
    
    // IMPORTANT: If PIN is modified, the 'unhashedPin' field will contain the new clear-text PIN.
    // If PIN is not modified, 'unhashedPin' remains null/undefined and will not be saved.
});

// --- Instance Method: Compare Password ---
UserSchema.methods.comparePassword = async function (candidatePassword) {
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  return isMatch;
};

// --- NEW Instance Method: Compare PIN ---
UserSchema.methods.comparePin = async function (candidatePin) {
    // NOTE: This method must be called on a user object where 'pin' has been selected 
    // (e.g., User.find().select('+pin'))
    if (!this.pin) return false; // No PIN set for this user
    const isMatch = await bcrypt.compare(candidatePin, this.pin);
    return isMatch;
};


module.exports = mongoose.model('User', UserSchema);