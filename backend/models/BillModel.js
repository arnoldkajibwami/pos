// models/BillModel.js

const mongoose = require('mongoose');
const { BILL_STATUS, PAYMENT_STATUS } = require('../utils/constants');

const BillItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: String, // Storing name for historical reporting
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: Number, // Price at the time of order
  total: Number,
});

const BillSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null,
  },
  customerName: {
    type: String,
    // required: true, 

  },
  draftName: {
    type: String,
    trim: true,
    maxlength: 50, // Set a reasonable limit
    default: null, // It's optional for the waiter to fill out
  },
  waiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // required: true,
  },
  waiterName: String,

  items: [BillItemSchema],

  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 }, // Apply tax calculation logic
  total: { type: Number, default: 0 },

  // Your core billing requirements
  status: {
    type: String,
    enum: Object.values(BILL_STATUS),
    default: BILL_STATUS.DRAFT,
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: null, // Null until payment is attempted
  },
  amountPaid: {
    type: Number,
    default: 0,
  },
  creditGiven: {
    type: Number,
    default: 0, // Amount added to customer's credit balance
  },

  paymentMethod: { // e.g., 'Cash', 'Card', 'Credit', 'Credit Card'
    type: String,
    default: 'Unspecified',
  },
  customerInitialCreditBalance: { // Customer's balance *before* this bill was applied
    type: Number,
    default: 0,
  },
  customerFinalCreditBalance: { // Customer's balance *after* this bill was applied
    type: Number,
    default: 0,
  },

  pointsEarned: {
    type: Number,
    default: 0,
    min: 0,
  },

  pointsUsed: { // New field for points used in this transaction
      type: Number,
      default: 0,
      min: 0,
  },

  // Linking drafts for final bill generation
  parentBillId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
    default: null, // Only set for draft bills that were merged into a final bill
  },

  productsSaved: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: String, // Name of the saved product
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: Number, // Price at the time of order
    isPickedUp: { // Status for this item on this bill
      type: Boolean,
      default: false,
    },
    // Optional: You can add a withdrawalRef to link it to the CustomerModel's entry
  }],
  actionLog: [{
    action: { 
        type: String, 
        enum: ['STOCK_ADJUSTMENT', 'PRICE_CORRECTION', 'BILL_VOID', 'OTHER'], 
        required: true 
    },
    details: { type: String }, // Description of the change
    admin: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    timestamp: { 
        type: Date, 
        default: Date.now 
    },
    // Keep a record of the stock changes made in this action
    stockChanges: [{ 
        product: mongoose.Schema.Types.ObjectId, 
        quantity: Number, // Positive for stock return, Negative for stock removal
        action: String
    }]
}],

}, { timestamps: true });

// Pre-save hook to calculate totals
BillSchema.pre('save', function (next) {
  let subtotal = 0;
  this.items.forEach(item => {
    item.total = item.quantity * item.price;
    subtotal += item.total;
  });

  this.subtotal = subtotal;
  // Simple tax example: 0%
  this.tax = subtotal * 0;
  this.total = subtotal + this.tax;
  next();
});

module.exports = mongoose.model('Bill', BillSchema);