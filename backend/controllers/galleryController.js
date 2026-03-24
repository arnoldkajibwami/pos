// controllers/galleryController.js

const Gallery = require('../models/Gallery');

// @route   GET /api/v1/gallery
// @desc    Get all public gallery images
exports.getGalleryImages = async (req, res) => {
    try {
        const images = await Gallery.find().sort({ order: 1, createdAt: -1 });
        res.status(200).json({ success: true, count: images.length, data: images });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'Server Error fetching gallery.' });
    }
};

// @route   POST /api/v1/gallery
// @desc    Add a new image (Protected for Admin/Manager)
exports.addImage = async (req, res) => {
    try {
        const image = await Gallery.create(req.body);
        res.status(201).json({ success: true, data: image });
    } catch (err) {
        res.status(400).json({ success: false, msg: err.message });
    }
};

// @route   DELETE /api/v1/gallery/:id
// @desc    Delete an image (Protected for Admin/Manager)
exports.deleteImage = async (req, res) => {
    try {
        const image = await Gallery.findByIdAndDelete(req.params.id);
        if (!image) {
            return res.status(404).json({ success: false, msg: 'Image not found' });
        }
        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'Server Error deleting image.' });
    }
};