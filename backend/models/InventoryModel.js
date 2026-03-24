// models/InventoryModel.js

const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Inventory item name is required'],
    unique: true,
    trim: true,
  },
  // Stock in the main storage/warehouse (General Stock)
  generalStock: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Stock readily available at the counter/bar (Comptoir/Store Stock)
  storeStock: {
    type: Number,
    default: 0,
    min: 0,
  },
  unit: {
    type: String,
    required: true, // e.g., 'kg', 'Liter', 'unit'
  },
  minThreshold: {
    type: Number,
    default: 10, // Low stock alert level
  },
});

// Virtual property for total stock
InventorySchema.virtual('totalStock').get(function() {
  return this.generalStock + this.storeStock;
});

module.exports = mongoose.model('Inventory', InventorySchema);