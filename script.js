let editingId = null;
let deletingId = null;
let deletingProductName = null;

document.addEventListener('DOMContentLoaded', () => {
  const addProductForm = document.getElementById('addProductForm');
  const editProductForm = document.getElementById('editProductForm');
  const promoCheckbox = document.getElementById('promo');
  const editPromoCheckbox = document.getElementById('edit_promo');
  const editModal = document.getElementById('editModal');
  const deleteModal = document.getElementById('deleteModal');
  const modalClose = document.querySelector('.modal-close');

  // Handle promo toggle for add form
  promoCheckbox.addEventListener('change', () => {
    const promoGroup = document.getElementById('promo_price_group');
    if (promoCheckbox.checked) {
      promoGroup.style.display = 'block';
    } else {
      promoGroup.style.display = 'none';
    }
  });

  // Handle promo toggle for edit form
  editPromoCheckbox.addEventListener('change', () => {
    const promoGroup = document.getElementById('edit_promo_price_group');
    if (editPromoCheckbox.checked) {
      promoGroup.style.display = 'block';
    } else {
      promoGroup.style.display = 'none';
    }
  });

  // Handle stock quantity changes
  document.getElementById('stock_quantity').addEventListener('input', updateStockStatus);
  document.getElementById('edit_stock_quantity').addEventListener('input', updateEditStockStatus);

  // Modal close events
  modalClose.addEventListener('click', closeEditModal);
  window.addEventListener('click', (event) => {
    if (event.target === editModal) {
      closeEditModal();
    }
    if (event.target === deleteModal) {
      cancelDelete();
    }
  });

  // Handle edit form submission
  editProductForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(editProductForm);

    // Add non-file fields
    formData.append('product_name', document.getElementById('edit_product_name').value);
    formData.append('fabric_type', document.getElementById('edit_fabric_type').value);
    formData.append('short_description', document.getElementById('edit_short_description').value);
    formData.append('long_description', document.getElementById('edit_long_description').value);
    formData.append('price_ghc', document.getElementById('edit_price_ghc').value);
    formData.append('stock_quantity', document.getElementById('edit_stock_quantity').value);
    formData.append('low_stock_threshold', document.getElementById('edit_low_stock_threshold').value);
    formData.append('sizes', Array.from(document.getElementById('edit_sizes').selectedOptions).map(option => option.value).join(','));
    formData.append('colors', document.getElementById('edit_colors').value);
    formData.append('categories', Array.from(document.getElementById('edit_categories').selectedOptions).map(option => option.value).join(','));
    formData.append('sections', Array.from(document.getElementById('edit_sections').selectedOptions).map(option => option.value).join(','));

    if (document.getElementById('edit_promo').checked) {
      formData.append('promo', 'true');
      formData.append('promo_price', document.getElementById('edit_promo_price').value);
    } else {
      formData.append('promo', 'false');
    }

    fetch(`/products/${editingId}`, {
      method: 'PUT',
      body: formData,
    })
    .then(response => {
      if (!response.ok) {
        return response.text().then(text => { throw new Error(text || 'Server error'); });
      }
      return response.json();
    })
    .then(data => {
      showSuccessNotification('Product updated successfully!');
      closeEditModal();
      loadProducts();
    })
    .catch(error => {
      console.error('Error updating product:', error);
      alert('Failed to update product: ' + error.message);
    });
  });

  // Load products
  loadProducts();

  // Handle form submission
  addProductForm.addEventListener('submit', (e) => {
    e.preventDefault();
  
    const formData = new FormData(addProductForm);

    // Add non-file fields
    formData.append('product_name', document.getElementById('product_name').value);
    formData.append('fabric_type', document.getElementById('fabric_type').value);
    formData.append('short_description', document.getElementById('short_description').value);
    formData.append('long_description', document.getElementById('long_description').value);
    formData.append('price_ghc', document.getElementById('price_ghc').value);
    formData.append('stock_quantity', document.getElementById('stock_quantity').value);
    formData.append('low_stock_threshold', document.getElementById('low_stock_threshold').value);
    formData.append('sizes', Array.from(document.getElementById('sizes').selectedOptions).map(option => option.value).join(','));
    formData.append('colors', document.getElementById('colors').value);
    formData.append('categories', Array.from(document.getElementById('categories').selectedOptions).map(option => option.value).join(','));
    formData.append('sections', Array.from(document.getElementById('sections').selectedOptions).map(option => option.value).join(','));
  
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
      showSuccessNotification('Product added successfully!');
      addProductForm.reset();  // Clear form
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
    const totalProducts = document.getElementById('total-products');
    container.innerHTML = '';
    totalProducts.textContent = products.length;

    // Load low stock alerts
    loadLowStockAlerts();

    products.forEach(product => {
      const div = document.createElement('div');
      div.className = 'product-card';
      const stockQty = product.stock_quantity || 0;
      const lowThreshold = product.low_stock_threshold || 5;
      const isLowStock = stockQty <= lowThreshold;

      div.innerHTML = `
        <div class="product-card-header">
          <h3 class="product-name">${product.product_name}</h3>
          <span class="product-status ${product.stock_status === 'In Stock' ? 'in-stock' : 'out-of-stock'}">
            ${product.stock_status}
          </span>
        </div>

        <p class="product-price">GHS ${product.price_ghc}</p>

        <div class="product-meta">
          <div class="meta-item">
            <div class="meta-label">Category</div>
            <div class="meta-value">${product.categories ? product.categories[0] : 'N/A'}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Fabric</div>
            <div class="meta-value">${product.fabric_type || 'N/A'}</div>
          </div>
        </div>

        <div class="inventory-info">
          <div class="inventory-row">
            <span class="inventory-label">Current Stock</span>
            <span class="inventory-value">${stockQty} units</span>
          </div>
          <div class="inventory-row">
            <span class="inventory-label">Low Stock Alert</span>
            <span class="inventory-value">${lowThreshold} units</span>
          </div>
          ${isLowStock ? `<div class="inventory-alert">⚠️ Low stock alert triggered</div>` : ''}
        </div>

        <div class="product-actions">
          <button onclick="editProduct('${product._id}')" class="btn btn-success btn-sm">Edit</button>
          <button onclick="deleteProduct('${product._id}', '${product.product_name}')" class="btn btn-danger btn-sm">Delete</button>
        </div>
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
    // Populate edit modal form
    document.getElementById('edit_product_name').value = product.product_name || '';
    document.getElementById('edit_cover_image').value = ''; // Can't set file input
    // For other_images, can't set
    setSelectMultiple('edit_sizes', product.sizes || []);
    document.getElementById('edit_colors').value = (product.colors || []).join(', ');
    document.getElementById('edit_fabric_type').value = product.fabric_type || '';
    document.getElementById('edit_short_description').value = product.short_description || '';
    document.getElementById('edit_long_description').value = product.long_description || '';
    document.getElementById('edit_price_ghc').value = product.price_ghc || '';
    document.getElementById('edit_stock_quantity').value = product.stock_quantity || 0;
    document.getElementById('edit_low_stock_threshold').value = product.low_stock_threshold || 5;
    document.getElementById('edit_stock_status').value = product.stock_status || 'Out of Stock';
    setSelectMultiple('edit_categories', product.categories || []);
    setSelectMultiple('edit_sections', product.sections || []);
    document.getElementById('edit_promo').checked = product.promo || false;
    const promoGroup = document.getElementById('edit_promo_price_group');
    if (product.promo) {
      promoGroup.style.display = 'block';
      document.getElementById('edit_promo_price').value = product.promo_price || '';
    } else {
      promoGroup.style.display = 'none';
    }

    editingId = id;
    openEditModal();
  })
  .catch(error => console.error('Error loading product:', error));
}

function openEditModal() {
  document.getElementById('editModal').style.display = 'block';
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
  document.body.style.overflow = 'auto'; // Restore scrolling
  editingId = null;
}

function showSuccessNotification(message) {
  const notification = document.getElementById('successModal');
  const messageElement = document.getElementById('successMessage');
  messageElement.textContent = message;
  notification.style.display = 'block';

  // Auto-hide after 3 seconds
  setTimeout(() => {
    notification.style.display = 'none';
  }, 3000);
}

function logout() {
  if (confirm('Are you sure you want to logout?')) {
    fetch('/logout', {
      method: 'POST',
    })
    .then(response => {
      if (response.ok) {
        // Clear any local session data and redirect
        window.location.href = '/';
      } else {
        alert('Logout failed');
      }
    })
    .catch(error => {
      console.error('Error logging out:', error);
      alert('Logout failed');
    });
  }
}

function setSelectMultiple(selectId, values) {
  const select = document.getElementById(selectId);
  Array.from(select.options).forEach(option => {
    option.selected = values.includes(option.value);
  });
}

function deleteProduct(id, productName) {
  deletingId = id;
  deletingProductName = productName;
  document.getElementById('deleteProductName').textContent = productName;
  openDeleteModal();
}

function openDeleteModal() {
  document.getElementById('deleteModal').style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function cancelDelete() {
  document.getElementById('deleteModal').style.display = 'none';
  document.body.style.overflow = 'auto';
  deletingId = null;
  deletingProductName = null;
}

function confirmDelete() {
  if (!deletingId) return;

  fetch(`/products/${deletingId}`, {
    method: 'DELETE',
  })
  .then(response => {
    if (response.ok) {
      showSuccessNotification('Product deleted successfully!');
      loadProducts();
      cancelDelete();
    } else {
      alert('Failed to delete product.');
    }
  })
  .catch(error => {
    console.error('Error deleting product:', error);
    alert('Failed to delete product.');
  });
}

function loadLowStockAlerts() {
  fetch('/products/low-stock')
  .then(res => res.json())
  .then(products => {
    const lowStockCount = products.length;
    const lowStockValue = document.getElementById('low-stock-count');
    const lowStockChange = document.getElementById('low-stock-change');

    if (lowStockValue) {
      lowStockValue.textContent = lowStockCount;
    }

    if (lowStockChange) {
      if (lowStockCount > 0) {
        lowStockChange.textContent = 'Action Required';
        lowStockChange.style.color = 'var(--warning-color)';
      } else {
        lowStockChange.textContent = 'All Good';
        lowStockChange.style.color = 'var(--success-color)';
      }
    }
  })
  .catch(error => console.error('Error loading low stock alerts:', error));
}

function updateStockStatus() {
  const quantity = parseInt(document.getElementById('stock_quantity').value) || 0;
  const status = quantity > 0 ? 'In Stock' : 'Out of Stock';
  document.getElementById('stock_status').value = status;
}

function updateEditStockStatus() {
  const quantity = parseInt(document.getElementById('edit_stock_quantity').value) || 0;
  const status = quantity > 0 ? 'In Stock' : 'Out of Stock';
  document.getElementById('edit_stock_status').value = status;
}