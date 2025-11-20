const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const cookieParser = require('cookie-parser');

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

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Serve static files (CSS, JS, and uploads)
app.use('/style.css', express.static('style.css'));
app.use('/script.js', express.static('script.js'));
app.use('/login.js', express.static('login.js'));
app.use('/uploads', express.static('uploads'));

// Product Model
const productSchema = new mongoose.Schema({
  product_name: { type: String, required: true },
  cover_image: String,
  other_images: [String],
  sizes: [String],
  colors: [String],
  fabric_type: String,
  short_description: { type: String, required: true },
  long_description: String,
  price_ghc: { type: Number, required: true },
  stock_status: { type: String, default: 'In Stock' },
  promo: { type: Boolean, default: false },
  promo_price: Number,
  categories: [String],
  sections: [String],
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

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
app.post('/products', upload.fields([{ name: 'cover_image', maxCount: 1 }, { name: 'other_images', maxCount: 10 }]), async (req, res) => {
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

    if (req.files.cover_image) data.cover_image = req.files.cover_image[0].path;
    if (req.files.other_images) data.other_images = req.files.other_images.map(file => file.path);

    const product = new Product(data);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error('Error saving product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update product
app.put('/products/:id', upload.fields([{ name: 'cover_image', maxCount: 1 }, { name: 'other_images', maxCount: 10 }]), async (req, res) => {
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

    if (req.files.cover_image) data.cover_image = req.files.cover_image[0].path;
    if (req.files.other_images) data.other_images = req.files.other_images.map(file => file.path);

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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});