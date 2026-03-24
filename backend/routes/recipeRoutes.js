// routes/recipeRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateUser, authorizeRoles, USER_ROLES } = require('../middleware/authentication');
const { 
    createRecipe, 
    getAllRecipes, 
    getSingleRecipe, 
    updateRecipe, 
    deleteRecipe ,
    
} = require('../controllers/recipeController');

// Authorization middleware for recipe management (only Managers/Admins can manage recipes)
const recipeAuth = [authenticateUser, authorizeRoles(USER_ROLES.MANAGER, USER_ROLES.ADMIN)];

router
    .route('/')
    .post(recipeAuth, createRecipe) // POST /api/v1/recipes
    .get(recipeAuth, getAllRecipes); // GET /api/v1/recipes

router
    .route('/:id')
    .get(recipeAuth, getSingleRecipe) // GET /api/v1/recipes/:id
    .patch(recipeAuth, updateRecipe) // PATCH /api/v1/recipes/:id
    .delete(recipeAuth, deleteRecipe); // DELETE /api/v1/recipes/:id

    

module.exports = router;