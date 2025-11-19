const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
if (mongoUri) {
  mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
} else {
  console.error('No MongoDB URI provided. Set MONGODB_URI or DATABASE_URL environment variable.');
  process.exit(1);
}

// Product schema
const productSchema = new mongoose.Schema({
  product_id: { type: String, required: true, unique: true },
  product_name: String,
  cover_image: String,
  other_images: [String],
  sizes: [String],
  colors: [String],
  fabric_type: String,
  short_description: String,
  long_description: String,
  price_ghc: Number,
  stock_status: String,
  categories: [String],
  sections: [String],
  promo: Boolean,
  promo_price: Number,
});

const Product = mongoose.model('Product', productSchema);

// Seeded credentials (hashed password for 'admin123')
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_HASH = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'auntie-araba-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/');
  }
}

// Routes
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.sendFile(path.join(__dirname, 'login.html'));
  }
});

app.use(express.static('.'));

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    req.session.user = username;
    res.status(200).send();
  } else {
    res.status(401).send();
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use('/uploads', express.static('uploads'));

// CRUD Routes

// Create (Add) a product
app.post('/products', requireAuth, upload.fields([{ name: 'cover_image', maxCount: 1 }, { name: 'other_images', maxCount: 10 }]), async (req, res) => {
  try {
    const newProduct = new Product({
      product_id: Date.now().toString(),
      product_name: req.body.product_name,
      cover_image: req.files.cover_image ? req.files.cover_image[0].path : '',
      other_images: req.files.other_images ? req.files.other_images.map(file => file.path) : [],
      sizes: JSON.parse(req.body.sizes),
      colors: JSON.parse(req.body.colors),
      fabric_type: req.body.fabric_type,
      short_description: req.body.short_description,
      long_description: req.body.long_description,
      price_ghc: parseFloat(req.body.price_ghc),
      stock_status: req.body.stock_status,
      categories: JSON.parse(req.body.categories),
      sections: JSON.parse(req.body.sections),
      promo: req.body.promo === 'true',
      promo_price: req.body.promo === 'true' ? parseFloat(req.body.promo_price) : null,
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (err) {
    console.error(err);
    res.status(500).send();
  }
});

// Read all products
app.get('/products', requireAuth, async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).send();
  }
});

// Read a single product by ID
app.get('/products/:id', requireAuth, async (req, res) => {
  try {
    const product = await Product.findOne({ product_id: req.params.id });
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send();
  }
});

// Update a product
app.put('/products/:id', requireAuth, upload.fields([{ name: 'cover_image', maxCount: 1 }, { name: 'other_images', maxCount: 10 }]), async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ product_id: id });
    if (product) {
      product.product_name = req.body.product_name || product.product_name;
      product.cover_image = req.files.cover_image ? req.files.cover_image[0].path : product.cover_image;
      product.other_images = req.files.other_images ? req.files.other_images.map(file => file.path) : product.other_images;
      product.sizes = req.body.sizes ? JSON.parse(req.body.sizes) : product.sizes;
      product.colors = req.body.colors ? JSON.parse(req.body.colors) : product.colors;
      product.fabric_type = req.body.fabric_type || product.fabric_type;
      product.short_description = req.body.short_description || product.short_description;
      product.long_description = req.body.long_description || product.long_description;
      product.price_ghc = req.body.price_ghc ? parseFloat(req.body.price_ghc) : product.price_ghc;
      product.stock_status = req.body.stock_status || product.stock_status;
      product.categories = req.body.categories ? JSON.parse(req.body.categories) : product.categories;
      product.sections = req.body.sections ? JSON.parse(req.body.sections) : product.sections;
      product.promo = req.body.promo === 'true';
      product.promo_price = req.body.promo === 'true' ? (req.body.promo_price ? parseFloat(req.body.promo_price) : product.promo_price) : null;

      await product.save();
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send();
  }
});

// Delete a product
app.delete('/products/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Product.deleteOne({ product_id: id });
    if (result.deletedCount > 0) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});