const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const PRODUCTS_FILE = path.join(__dirname, 'products.json');
const upload = multer({ dest: 'uploads/' });

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

// Read products from file
function readProducts() {
  try {
    const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];  // Return empty array if file doesn't exist or is empty
  }
}

// Write products to file
function writeProducts(products) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

// CRUD Routes

// Create (Add) a product
app.post('/products', requireAuth, upload.fields([{ name: 'cover_image', maxCount: 1 }, { name: 'other_images', maxCount: 10 }]), (req, res) => {
  const products = readProducts();
  const newProduct = {
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
  };
  newProduct.product_id = Date.now().toString();  // Auto-generate unique ID using timestamp

  if (req.body.promo === 'true') {
    newProduct.promo = true;
    newProduct.promo_price = parseFloat(req.body.promo_price);
  } else {
    newProduct.promo = false;
  }

  products.push(newProduct);
  writeProducts(products);
  res.status(201).json(newProduct);
});

// Read all products
app.get('/products', requireAuth, (req, res) => {
  const products = readProducts();
  res.json(products);
});

// Read a single product by ID
app.get('/products/:id', requireAuth, (req, res) => {
  const products = readProducts();
  const product = products.find(p => p.product_id === req.params.id);
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ message: 'Product not found' });
  }
});

// Update a product
app.put('/products/:id', requireAuth, (req, res) => {
  const products = readProducts();
  const index = products.findIndex(p => p.product_id === req.params.id);
  if (index !== -1) {
    products[index] = { ...products[index], ...req.body, product_id: products[index].product_id };  // Preserve ID
    writeProducts(products);
    res.json(products[index]);
  } else {
    res.status(404).json({ message: 'Product not found' });
  }
});

// Delete a product
app.delete('/products/:id', requireAuth, (req, res) => {
  let products = readProducts();
  const initialLength = products.length;
  products = products.filter(p => p.product_id !== req.params.id);
  if (products.length < initialLength) {
    writeProducts(products);
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'Product not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});