// models/CustomerModel.js

const mongoose = require('mongoose');
const qrcode = require('qrcode');

const CustomerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    unique: true,
    sparse: true, // Allows null/undefined values to be non-unique
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
  },
  // --- Fidelity & Financial Fields ---
  fidelityCardId: {
    type: String,
    unique: true,
    required: false,
  },
   totalPoints: {
        type: Number,
        default: 0,
        min: 0,
    },
  creditBalance: {
    type: Number,
    default: 0, // Negative for customer debt
  },
bottleWithdrawals: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    name: String, // Product Name for reporting/display
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill',
    },
    savedQuantity: { 
        type: Number, 
        required: false, 
        min: 1
    }, 
    withdrawnQuantity: { // Quantity taken by the customer
        type: Number, 
        default: 0, 
        min: 0
    },
    waiterName: String, // Waiter who finalized the bill (for traceability)
    paidOn: {
      type: Date,
      default: Date.now,
    },
    // isWithdrawn field is no longer needed, status is derived from (savedQuantity === withdrawnQuantity)
    
    // Log for traceability (required by user)
    withdrawalLog: [{ 
        action: { 
            type: String, 
            enum: ['SAVED', 'WITHDRAWN_PARTIAL', 'WITHDRAWN_FULL'],
            required: true
        },
        quantity: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String,
    }],
  }],
  qrCodeImage: String, // Store the base64 or URL of the generated QR Code
}, { timestamps: true });

// Auto-generate Fidelity Card ID and QR Code before save
CustomerSchema.pre('save', async function(next) {
  if (!this.isNew) return next();

  // Simple ID generation (can be more complex for production)
  this.fidelityCardId = 'FID-' + Date.now() + Math.floor(Math.random() * 9000);
  
  // Generate QR code data (e.g., the FidelityCardId)
  try {
    const qrData = JSON.stringify({
      id: this._id,
      fidelityId: this.fidelityCardId
    });
    // Generate QR code as Data URL (Base64 string)
    this.qrCodeImage = await qrcode.toDataURL(qrData);
  } catch (error) {
    console.error("QR Code generation failed:", error);
    // Continue even if QR fails
  }

  next();
});

module.exports = mongoose.model('Customer', CustomerSchema);