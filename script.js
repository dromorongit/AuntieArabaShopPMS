let editingId = null;

document.addEventListener('DOMContentLoaded', () => {
  const addProductForm = document.getElementById('addProductForm');
  const promoCheckbox = document.getElementById('promo');
  const promoPriceLabel = document.getElementById('promo_price_label');
  const promoPriceInput = document.getElementById('promo_price');

  // Handle promo toggle
  promoCheckbox.addEventListener('change', () => {
    if (promoCheckbox.checked) {
      promoPriceLabel.style.display = 'block';
      promoPriceInput.style.display = 'block';
    } else {
      promoPriceLabel.style.display = 'none';
      promoPriceInput.style.display = 'none';
    }
  });

  // Load products
  loadProducts();

  // Handle form submission
  addProductForm.addEventListener('submit', (e) => {
    e.preventDefault();
  
    const formData = new FormData(addProductForm);
  
    // Add non-file fields
    formData.append('sizes', JSON.stringify(Array.from(document.getElementById('sizes').selectedOptions).map(option => option.value)));
    formData.append('colors', JSON.stringify(document.getElementById('colors').value.split(',').map(color => color.trim())));
    formData.append('categories', JSON.stringify(Array.from(document.getElementById('categories').selectedOptions).map(option => option.value)));
    formData.append('sections', JSON.stringify(Array.from(document.getElementById('sections').selectedOptions).map(option => option.value)));
  
    if (promoCheckbox.checked) {
      formData.append('promo', 'true');
      formData.append('promo_price', document.getElementById('promo_price').value);
    } else {
      formData.append('promo', 'false');
    }
  
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/products/${editingId}` : '/products';
  
    fetch(url, {
      method: method,
      body: formData,
    })
    .then(response => {
      if (!response.ok) {
        return response.text().then(text => { throw new Error(text || 'Server error'); });
      }
      return response.json();
    })
    .then(data => {
      alert(`Product ${editingId ? 'updated' : 'added'} successfully!`);
      addProductForm.reset();  // Clear form
      editingId = null;
      document.getElementById('form-title').textContent = 'Add New Product';
      loadProducts();
    })
    .catch(error => {
      console.error('Error saving product:', error);
      alert('Failed to save product: ' + error.message);
    });
  });
});

function loadProducts() {
  fetch('/products')
  .then(res => res.json())
  .then(products => {
    const container = document.getElementById('products');
    container.innerHTML = '';
    products.forEach(product => {
      const div = document.createElement('div');
      div.className = 'product-item';
      div.innerHTML = `
        <h3>${product.product_name}</h3>
        <p>Price: ${product.price_ghc}</p>
        <button onclick="editProduct('${product._id}')">Edit</button>
        <button onclick="deleteProduct('${product._id}')">Delete</button>
      `;
      container.appendChild(div);
    });
  })
  .catch(error => console.error('Error loading products:', error));
}

function editProduct(id) {
  fetch(`/products/${id}`)
  .then(res => res.json())
  .then(product => {
    // Populate form
    document.getElementById('product_name').value = product.product_name || '';
    document.getElementById('cover_image').value = ''; // Can't set file input
    // For other_images, can't set
    document.getElementById('sizes').value = product.sizes || [];
    setSelectMultiple('sizes', product.sizes || []);
    document.getElementById('colors').value = (product.colors || []).join(', ');
    document.getElementById('fabric_type').value = product.fabric_type || '';
    document.getElementById('short_description').value = product.short_description || '';
    document.getElementById('long_description').value = product.long_description || '';
    document.getElementById('price_ghc').value = product.price_ghc || '';
    document.getElementById('stock_status').value = product.stock_status || 'In Stock';
    setSelectMultiple('categories', product.categories || []);
    setSelectMultiple('sections', product.sections || []);
    document.getElementById('promo').checked = product.promo || false;
    if (product.promo) {
      document.getElementById('promo_price_label').style.display = 'block';
      document.getElementById('promo_price').style.display = 'block';
      document.getElementById('promo_price').value = product.promo_price || '';
    } else {
      document.getElementById('promo_price_label').style.display = 'none';
      document.getElementById('promo_price').style.display = 'none';
    }

    editingId = id;
    document.getElementById('form-title').textContent = 'Edit Product';
  })
  .catch(error => console.error('Error loading product:', error));
}

function setSelectMultiple(selectId, values) {
  const select = document.getElementById(selectId);
  Array.from(select.options).forEach(option => {
    option.selected = values.includes(option.value);
  });
}

function deleteProduct(id) {
  if (confirm('Are you sure you want to delete this product?')) {
    fetch(`/products/${id}`, {
      method: 'DELETE',
    })
    .then(response => {
      if (response.ok) {
        alert('Product deleted successfully!');
        loadProducts();
      } else {
        alert('Failed to delete product.');
      }
    })
    .catch(error => {
      console.error('Error deleting product:', error);
      alert('Failed to delete product.');
    });
  }
}