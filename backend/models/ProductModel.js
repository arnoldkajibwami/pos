const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Product name is required"],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
  },
  buyPrice: {
    type: Number,
    default: 0,
    min: 0,
    required: [true, "Buy price (cost) is required"],
  },
  category: {
    type: String,
    required: true,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },

  // 🎯 MODIFICATION: Remplacé isLaw par lowStockThreshold (Number)
  lowStockThreshold: {
    type: Number,
    default: 0, // Default to 10 if not set
    min: 0,
  },

  isBuffetItem: {
    type: Boolean,
    default: false,
  },
  // NEW FIELDS: Direct Stock Management
  stockBar: {
    type: Number,
    default: 0,
    min: 0,
    required: [true, "Bar stock quantity is required"],
  },
  stockGeneral: {
    type: Number,
    default: 0,
    min: 0,
    required: [true, "General stock quantity is required"],
  },
  // Optional flag to skip stock deduction for this product (e.g., services)
  isStockTracked: {
    type: Boolean,
    default: true,
  },
  image: {
    type: String,
    default: "/path/to/default/image.png",
  },
});

module.exports = mongoose.model("Product", ProductSchema);
