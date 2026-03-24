// routes/gallery.js

const express = require('express');
const router = express.Router();
const { getGalleryImages, addImage, deleteImage } = require('../controllers/galleryController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Public route for fetching images
router.route('/')
    .get(getGalleryImages);

// Protected routes for management (requires image upload service like Cloudinary)
router.route('/')
    .post(protect, restrictTo('admin', 'manager'), addImage);

router.route('/:id')
    .delete(protect, restrictTo('admin', 'manager'), deleteImage);

module.exports = router;