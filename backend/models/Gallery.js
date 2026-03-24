// models/Gallery.js

const mongoose = require('mongoose');

const GallerySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: false,
    },
    // The link to the image stored in Cloudinary/S3
    imageUrl: {
        type: String,
        required: true,
    },
    // Optional: for sorting or featuring items
    order: {
        type: Number,
        default: 0,
    },
    isFeatured: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('Gallery', GallerySchema);