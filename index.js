require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const cloudinary = require('cloudinary').v2;

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
if (mongoUri) {
  mongoose.connect(mongoUri, {
    ssl: false,
  });
} else {
  console.error('No MongoDB URI provided. Set MONGODB_URI or DATABASE_URL environment variable.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'auntie-araba-admin-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Custom Multer storage for Google Cloud Storage
const multerStorage = multer.memoryStorage();
const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Function to upload file to Cloudinary
async function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'auntie-araba-shop-uploads',
        public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    uploadStream.end(file.buffer);
  });
}

// Serve static files (CSS, JS)
app.use('/style.css', express.static('style.css'));
app.use('/script.js', express.static('script.js'));
app.use('/login.js', express.static('login.js'));

// Product Model
const productSchema = new mongoose.Schema({
  product_name: { type: String, required: true },
  cover_image: String,
  other_images: [String],
  video: String,
  sizes: [String],
  colors: [String],
  fabric_type: String,
  short_description: { type: String, required: true },
  long_description: String,
  price_ghc: { type: Number, required: true },
  stock_status: { type: String, default: 'In Stock' },
  stock_quantity: { type: Number, default: 0 },
  low_stock_threshold: { type: Number, default: 5 },
  promo: { type: Boolean, default: false },
  promo_price: Number,
  categories: [String],
  sections: [String],
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

// User Model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  address: {
    street: String,
    city: String,
    country: String,
    zipCode: String
  },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Order Model
const orderSchema = new mongoose.Schema({
  customer_name: { type: String, required: true },
  customer_email: { type: String, required: true },
  customer_phone: { type: String, required: true },
  customer_address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    zipCode: { type: String, required: true }
  },
  items: [{
    product_id: { type: String, required: true }, // Changed to String for now to debug
    product_name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    image: String
  }],
  subtotal: { type: Number, required: true },
  tax: { type: Number, required: true },
  shipping: { type: Number, default: 15 },
  total: { type: Number, required: true },
  status: { type: String, default: 'Pending', enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] },
  payment_method: { type: String, default: 'Cash on Delivery' },
  order_notes: String
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'auntie-araba-user-secret-key-2024';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Drop problematic index if it exists
Product.collection.dropIndex("product_id_1").then(() => {
  console.log('Dropped product_id index');
}).catch(err => {
  console.log('Index not found or already dropped:', err.message);
});

// User Authentication Routes

// Register
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

    // Generate JWT token
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Refresh token
app.post('/auth/refresh', authenticateToken, async (req, res) => {
  try {
    // Since token is valid (middleware passed), generate new token
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newToken = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Token refreshed',
      token: newToken
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user profile
app.get('/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
app.put('/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone, address },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password
app.put('/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Current password is incorrect' });

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Routes

// Root route - check authentication
app.get('/', (req, res) => {
  console.log('Root route accessed, auth cookie:', req.cookies.auth);
  if (req.cookies.auth === 'true') {
    console.log('Redirecting to dashboard');
    res.redirect('/dashboard');
  } else {
    console.log('Serving login page');
    res.sendFile(__dirname + '/login.html');
  }
});

// Serve dashboard - requires authentication
app.get('/dashboard', (req, res) => {
  console.log('Dashboard route accessed, auth cookie:', req.cookies.auth);
  if (req.cookies.auth === 'true') {
    console.log('Serving dashboard');
    res.sendFile(__dirname + '/index.html');
  } else {
    console.log('Redirecting to login');
    res.redirect('/');
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt for:', username);

  // Admin credentials
  const adminUsername = 'admin@shopauntiearaba';
  const adminPassword = 'auntiearaba123';

  if (username === adminUsername && password === adminPassword) {
    // Set a simple auth cookie (valid for 24 hours)
    res.cookie('auth', 'true', {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    console.log('Login successful, cookie set');
    res.status(200).send();
  } else {
    console.log('Login failed: invalid credentials');
    res.status(401).send();
  }
});

// Logout route
app.post('/logout', (req, res) => {
  res.clearCookie('auth');
  console.log('User logged out, cookie cleared');
  res.status(200).send();
});

// Get all products
app.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single product
app.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new product
app.post('/products', upload.fields([{ name: 'cover_image', maxCount: 1 }, { name: 'other_images', maxCount: 10 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    const data = req.body;
    data.sizes = data.sizes ? data.sizes.split(',').map(s => s.trim()).filter(s => s) : [];
    data.colors = data.colors ? data.colors.split(',').map(c => c.trim()).filter(c => c) : [];
    data.categories = data.categories ? data.categories.split(',').map(c => c.trim()).filter(c => c) : [];
    data.sections = data.sections ? data.sections.split(',').map(s => s.trim()).filter(s => s) : [];
    data.promo = data.promo === 'true';

    // Convert numeric fields
    data.price_ghc = parseFloat(data.price_ghc);
    if (isNaN(data.price_ghc)) data.price_ghc = 0;

    if (data.promo_price) {
      data.promo_price = parseFloat(data.promo_price);
      if (isNaN(data.promo_price)) data.promo_price = undefined;
    }

    // Inventory fields
    data.stock_quantity = parseInt(data.stock_quantity) || 0;
    data.low_stock_threshold = parseInt(data.low_stock_threshold) || 5;
    data.stock_status = data.stock_quantity > 0 ? 'In Stock' : 'Out of Stock';

    // Upload images and video to Cloudinary
    if (req.files.cover_image && req.files.cover_image[0]) {
      data.cover_image = await uploadToCloudinary(req.files.cover_image[0]);
    }
    if (req.files.other_images && req.files.other_images.length > 0) {
      data.other_images = await Promise.all(req.files.other_images.map(file => uploadToCloudinary(file)));
    }
    if (req.files.video && req.files.video[0]) {
      data.video = await uploadToCloudinary(req.files.video[0]);
    }

    const product = new Product(data);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error('Error saving product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update product
app.put('/products/:id', upload.fields([{ name: 'cover_image', maxCount: 1 }, { name: 'other_images', maxCount: 10 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    const data = req.body;
    data.sizes = data.sizes ? data.sizes.split(',').map(s => s.trim()).filter(s => s) : [];
    data.colors = data.colors ? data.colors.split(',').map(c => c.trim()).filter(c => c) : [];
    data.categories = data.categories ? data.categories.split(',').map(c => c.trim()).filter(c => c) : [];
    data.sections = data.sections ? data.sections.split(',').map(s => s.trim()).filter(s => s) : [];
    data.promo = data.promo === 'true';

    // Convert numeric fields
    data.price_ghc = parseFloat(data.price_ghc);
    if (isNaN(data.price_ghc)) data.price_ghc = 0;

    if (data.promo_price) {
      data.promo_price = parseFloat(data.promo_price);
      if (isNaN(data.promo_price)) data.promo_price = undefined;
    }

    // Inventory fields
    data.stock_quantity = parseInt(data.stock_quantity) || 0;
    data.low_stock_threshold = parseInt(data.low_stock_threshold) || 5;
    data.stock_status = data.stock_quantity > 0 ? 'In Stock' : 'Out of Stock';

    // Upload images and video to Cloudinary
    if (req.files.cover_image && req.files.cover_image[0]) {
      data.cover_image = await uploadToCloudinary(req.files.cover_image[0]);
    }
    if (req.files.other_images && req.files.other_images.length > 0) {
      data.other_images = await Promise.all(req.files.other_images.map(file => uploadToCloudinary(file)));
    }
    if (req.files.video && req.files.video[0]) {
      data.video = await uploadToCloudinary(req.files.video[0]);
    }

    const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete product
app.delete('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.status(200).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get low stock products
app.get('/products/low-stock', async (req, res) => {
  try {
    const products = await Product.find({
      $expr: { $lte: ['$stock_quantity', '$low_stock_threshold'] }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Order Routes

// Create new order
app.post('/orders', async (req, res) => {
  try {
    const orderData = req.body;

    // Validate required fields
    const requiredFields = ['customer_name', 'customer_email', 'customer_phone', 'customer_address', 'items', 'subtotal', 'tax', 'total'];
    for (const field of requiredFields) {
      if (!orderData[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    // Validate customer address
    const addressFields = ['street', 'city', 'country', 'zipCode'];
    for (const field of addressFields) {
      if (!orderData.customer_address[field]) {
        return res.status(400).json({ error: `Missing required address field: ${field}` });
      }
    }

    const order = new Order(orderData);
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all orders (admin only)
app.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single order
app.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status
app.put('/orders/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});