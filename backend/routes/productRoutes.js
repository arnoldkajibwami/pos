const express = require('express');
const router = express.Router();
const { authenticateUser, authorizeRoles, USER_ROLES } = require('../middleware/authentication');
const uploadSingleImage = require('../middleware/fileUpload'); 

const {
    createProduct,
    getProducts,        
    getSingleProduct,   
    updateProduct,
    deleteProduct,
    getSellableProducts,
    addBuffetItem,
    getBuffetIngredients
} = require('../controllers/productController');

// --- 1. Base Collection Routes ---
router.route('/')
    .get(authenticateUser, getProducts)
    .post(authenticateUser, authorizeRoles(USER_ROLES.MANAGER, USER_ROLES.ADMIN), uploadSingleImage, createProduct);

// --- 2. Specific Feature Routes (Must be above /:id) ---
router.get('/sellable', authenticateUser, getSellableProducts);
router.get('/buffet-ingredients', authenticateUser, getBuffetIngredients);

router.post(
    '/buffet', 
    authenticateUser, 
    authorizeRoles(USER_ROLES.MANAGER, USER_ROLES.ADMIN), 
    uploadSingleImage,
    addBuffetItem
);

// --- 3. Single Resource Routes (Dynamic ID always goes last) ---
router.route('/:id')
    .get(authenticateUser, getSingleProduct) 
    .patch(authenticateUser, authorizeRoles(USER_ROLES.MANAGER, USER_ROLES.ADMIN), uploadSingleImage, updateProduct)
    .delete(authenticateUser, authorizeRoles(USER_ROLES.MANAGER, USER_ROLES.ADMIN), deleteProduct);

module.exports = router;
