// controllers/recipeController.js
const Recipe = require('../models/RecipeModel'); // Ensure path is correct
const Inventory = require('../models/InventoryModel'); // Ensure path is correct
const { StatusCodes } = require('http-status-codes');
const CustomError = require('../middleware/errorHandler'); 

// Helper to check if inventory items exist and are valid
const validateIngredients = async (ingredients) => {
    for (const ingredient of ingredients) {
        const item = await Inventory.findById(ingredient.inventoryItem);
        if (!item) {
            throw new CustomError.NotFoundError(`Inventory item not found for ID: ${ingredient.inventoryItem}`);
        }
        if (ingredient.quantityUsed <= 0) {
            throw new CustomError.BadRequestError('Quantity used must be greater than zero.');
        }
    }
};


// 1. CREATE Recipe
const createRecipe = async (req, res) => {
    const { name, ingredients, description } = req.body;

    if (!name || !ingredients || ingredients.length === 0) {
        throw new CustomError.BadRequestError('Please provide a name and ingredients for the recipe.');
    }

    await validateIngredients(ingredients);

    const recipe = await Recipe.create({ name, ingredients, description });

    res.status(StatusCodes.CREATED).json({ recipe });
};

// 2. GET All Recipes
const getAllRecipes = async (req, res) => {
    // Populate the 'inventoryItem' field to show ingredient names/units, not just IDs
    const recipes = await Recipe.find({})
        .populate({
            path: 'ingredients.inventoryItem',
            select: 'name unit', // Select only the name and unit from the Inventory item
        });

    res.status(StatusCodes.OK).json({ recipes, count: recipes.length });
};

// 3. GET Single Recipe
const getSingleRecipe = async (req, res) => {
    const { id: recipeId } = req.params;

    const recipe = await Recipe.findOne({ _id: recipeId })
        .populate({
            path: 'ingredients.inventoryItem',
            select: 'name unit',
        });

    if (!recipe) {
        throw new CustomError.NotFoundError(`No recipe with id :${recipeId}`);
    }

    res.status(StatusCodes.OK).json({ recipe });
};

// 4. UPDATE Recipe
const updateRecipe = async (req, res) => {
    const { id: recipeId } = req.params;
    const { ingredients } = req.body;

    if (ingredients) {
        await validateIngredients(ingredients);
    }
    
    // Use findByIdAndUpdate for simplicity, 'runValidators: true' ensures schema rules are checked
    const recipe = await Recipe.findByIdAndUpdate(recipeId, req.body, { 
        new: true, 
        runValidators: true 
    });

    if (!recipe) {
        throw new CustomError.NotFoundError(`No recipe with id :${recipeId}`);
    }

    res.status(StatusCodes.OK).json({ msg: 'Recipe updated', recipe });
};

// 5. DELETE Recipe
const deleteRecipe = async (req, res) => {
    const { id: recipeId } = req.params;

    const recipe = await Recipe.findOneAndDelete({ _id: recipeId });

    if (!recipe) {
        throw new CustomError.NotFoundError(`No recipe with id :${recipeId}`);
    }

    res.status(StatusCodes.OK).json({ msg: 'Recipe successfully removed' });
};

module.exports = {
    createRecipe,
    getAllRecipes,
    getSingleRecipe,
    updateRecipe,
    deleteRecipe,
};