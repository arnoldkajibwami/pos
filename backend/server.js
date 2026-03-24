// server.js (CORRECTED ORDER)

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const path = require('path');

// 1. Load environment variables first.
require('dotenv').config(); 

// 2. EXPRESS APP INITIALIZATION (CRITICAL FIX: Define 'app' early)
const app = express(); // <--- MOVED UP HERE to be used later!

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// --- Middleware Setup (Now 'app' is defined and usable) ---
// This is your first use of 'app', so it should be after 'const app = express();'
app.use(cors()); 
app.use(express.json()); 

// --- Import Router and Error Handlers ---
const authRouter = require('./routes/authRoutes');
const userRouter = require('./routes/userRoutes');
const productRouter = require('./routes/productRoutes');
const inventoryRouter = require('./routes/inventoryRoutes');
const customerRouter = require('./routes/customerRoutes');
const billRouter = require('./routes/billRoutes');
const recipeRouter = require('./routes/recipeRoutes');
const reportRouter = require('./routes/reportRoutes');
const auditRouter = require('./routes/auditRoutes')

const notFoundMiddleware = require('./middleware/notFound');
const errorHandlerMiddleware = require('./middleware/errorHandler');
const User = require('./models/UserModel'); 
const { USER_ROLES } = require('./utils/constants'); 

// --- Routes Setup ---
app.get('/', (req, res) => {
  res.send('POS Backend API is running!');
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/products', productRouter);
app.use('/api/v1/inventory', inventoryRouter);
app.use('/api/v1/customers', customerRouter);
app.use('/api/v1/bills', billRouter);
app.use('/api/v1/recipes', recipeRouter);
app.use('/api/v1/reports', reportRouter);
app.use('/api/v1/auditlogs', auditRouter);

// --- Error Handling Middleware ---
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const port = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');
    
    // ... Admin Creation Logic ...
    const userCount = await User.countDocuments({});
    if (userCount === 0) {
      console.log('No users found. Creating default Admin account...');
      const defaultAdmin = {
        name: 'Default Admin',
        email: 'admin@app.com', 
        password: 'testing', 
        role: USER_ROLES.ADMIN, 
      };
      await User.create(defaultAdmin); 
      console.log('Default Admin user created successfully.');
    } else {
      console.log(`Found ${userCount} users. Skipping default Admin creation.`);
    }
    
    // Start Server
  
    app.listen(port, '0.0.0.0', () =>
  console.log(`Server is listening on port ${port}...`)
);
  } catch (error) {
    console.error('--- CRITICAL STARTUP ERROR ---');
    console.error(error.message); // This will tell you if it's "Module not found" or "Auth failed"
    console.error(error.stack);
    process.exit(1);
  }
};

startServer();
