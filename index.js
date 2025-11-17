const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const PRODUCTS_FILE = path.join(__dirname, 'products.json');

// Middleware to parse JSON bodies
app.use(express.json());

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
app.post('/products', (req, res) => {
  const products = readProducts();
  const newProduct = req.body;
  newProduct.product_id = Date.now().toString();  // Auto-generate unique ID using timestamp
  products.push(newProduct);
  writeProducts(products);
  res.status(201).json(newProduct);
});

// Read all products
app.get('/products', (req, res) => {
  const products = readProducts();
  res.json(products);
});

// Read a single product by ID
app.get('/products/:id', (req, res) => {
  const products = readProducts();
  const product = products.find(p => p.product_id === req.params.id);
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ message: 'Product not found' });
  }
});

// Update a product
app.put('/products/:id', (req, res) => {
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
app.delete('/products/:id', (req, res) => {
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