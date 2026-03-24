// models/RecipeModel.js
const mongoose = require('mongoose');

const RecipeSchema = new mongoose.Schema({
    // Name of the menu item (e.g., "Latte", "Espresso", "Chocolate Croissant")
    name: {
        type: String,
        required: [true, 'Recipe name is required'],
        unique: true,
        trim: true,
    },
    // Array of ingredients, linking to inventory
    ingredients: [{
        inventoryItem: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Inventory', // Reference the existing Inventory model
            required: [true, 'Inventory item ID is required for an ingredient'],
        },
        // Quantity of the item consumed per serving of the recipe
        quantityUsed: {
            type: Number,
            required: [true, 'Quantity used is required'],
            min: 0,
        },
        // A descriptive unit for clarity (e.g., 'shot', 'ml', 'g'). 
        // This is often for display, but should ideally match the Inventory unit for tracking.
        unit: {
            type: String,
            required: [true, 'Unit for quantity used is required'],
        }
    }],
    description: {
        type: String,
        trim: true,
        maxlength: 250,
    }
}, { timestamps: true });

module.exports = mongoose.model('Recipe', RecipeSchema);