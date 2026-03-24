// middleware/fileUpload.js

const multer = require('multer');

// Configure Multer to use memory storage (Cloudinary likes a buffer/stream)
const storage = multer.memoryStorage();

// Middleware function for single file upload
const uploadSingleImage = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow specific mimetypes
    if (file.mimetype.startsWith('image')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
}).single('image'); // 'image' is the field name expected in the form data

module.exports = uploadSingleImage;

// // middleware/fileUpload.js
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');

// // Ensure the uploads directory exists locally
// const uploadDir = 'uploads';
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir);
// }

// // 1. Configure Disk Storage for Offline-First support
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     // Save files locally to the 'uploads' folder on the POS PC
//     cb(null, uploadDir); 
//   },
//   filename: (req, file, cb) => {
//     // Generate a unique filename to prevent overwriting
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
//   }
// });

// // 2. Middleware function for single file upload
// const uploadSingleImage = multer({
//   storage: storage,
//   limits: {
//     fileSize: 1024 * 1024 * 5, // 5MB limit
//   },
//   fileFilter: (req, file, cb) => {
//     // Only allow image mimetypes
//     if (file.mimetype.startsWith('image')) {
//       cb(null, true);
//     } else {
//       cb(new Error('Only image files are allowed!'), false);
//     }
//   },
// }).single('image'); 

// module.exports = uploadSingleImage;