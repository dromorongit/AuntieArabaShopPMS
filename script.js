let editingId = null;
let deletingId = null;
let deletingProductName = null;

// API Base URL - same as shop frontend
const API_BASE = 'https://auntiearabashoppms-production.up.railway.app';

document.addEventListener('DOMContentLoaded', () => {
  const addProductForm = document.getElementById('addProductForm');
  const editProductForm = document.getElementById('editProductForm');
  const promoCheckbox = document.getElementById('promo');
  const editPromoCheckbox = document.getElementById('edit_promo');
  const editModal = document.getElementById('editModal');
  const deleteModal = document.getElementById('deleteModal');
  const modalClose = document.querySelector('.modal-close');

  // Mobile menu functionality
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const mobileOverlay = document.getElementById('mobile-overlay');

  if (mobileMenuToggle && sidebar && mobileOverlay) {
    const toggleMobileMenu = () => {
      mobileMenuToggle.classList.toggle('active');
      sidebar.classList.toggle('mobile-open');
      mobileOverlay.classList.toggle('active');
    };

    mobileMenuToggle.addEventListener('click', toggleMobileMenu);

    // Close mobile menu when clicking overlay
    mobileOverlay.addEventListener('click', toggleMobileMenu);

    // Close mobile menu when clicking outside (but not on toggle)
    document.addEventListener('click', (e) => {
      if (!mobileMenuToggle.contains(e.target) &&
          !sidebar.contains(e.target) &&
          !mobileOverlay.contains(e.target) &&
          sidebar.classList.contains('mobile-open')) {
        toggleMobileMenu();
      }
    });
  }

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

    fetch(`${API_BASE}/products/${editingId}`, {
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

  // Load products and orders
  loadProducts();
  loadOrders();

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
    const url = editingId ? `${API_BASE}/products/${editingId}` : `${API_BASE}/products`;

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
  fetch(`${API_BASE}/products`)
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
  fetch(`${API_BASE}/products/${id}`)
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
    fetch(`${API_BASE}/logout`, {
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

  fetch(`${API_BASE}/products/${deletingId}`, {
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
  fetch(`${API_BASE}/products/low-stock`)
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

// Order Management Functions
function loadOrders() {
  console.log('Loading orders from:', `${API_BASE}/orders`);
  fetch(`${API_BASE}/orders`)
    .then(res => {
      console.log('Orders response status:', res.status);
      return res.json();
    })
    .then(orders => {
      console.log('Orders loaded:', orders.length, 'orders');
      displayOrders(orders);
    })
    .catch(error => {
      console.error('Error loading orders:', error);
      // Show error in UI
      const tbody = document.getElementById('orders-table-body');
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 40px; color: red;">
              Error loading orders: ${error.message}
            </td>
          </tr>
        `;
      }
    });
}

function displayOrders(orders) {
  const tbody = document.getElementById('orders-table-body');
  tbody.innerHTML = '';

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-secondary);">
          No orders found
        </td>
      </tr>
    `;
    return;
  }

  orders.forEach(order => {
    const orderDate = new Date(order.createdAt).toLocaleDateString();
    const itemsText = order.items.map(item => `${item.product_name} (${item.quantity})`).join(', ');

    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="order-id">${order._id.slice(-8)}</td>
      <td class="customer-name">${order.customer_name}</td>
      <td class="order-items" title="${itemsText}">${itemsText.length > 50 ? itemsText.substring(0, 50) + '...' : itemsText}</td>
      <td class="order-total">GHS ${order.total.toFixed(2)}</td>
      <td>
        <span class="order-status ${order.status}">${order.status}</span>
      </td>
      <td class="order-date">${orderDate}</td>
      <td class="order-actions">
        <select class="status-select" onchange="updateOrderStatus('${order._id}', this.value)">
          <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>Processing</option>
          <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
          <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
          <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
        <button class="btn btn-outline btn-sm" onclick="viewOrderDetails('${order._id}')">View</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function updateOrderStatus(orderId, newStatus) {
  fetch(`${API_BASE}/orders/${orderId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: newStatus })
  })
  .then(response => {
    if (response.ok) {
      showSuccessNotification('Order status updated successfully!');
      loadOrders(); // Reload orders to reflect changes
    } else {
      alert('Failed to update order status');
    }
  })
  .catch(error => {
    console.error('Error updating order status:', error);
    alert('Error updating order status');
  });
}

function viewOrderDetails(orderId) {
  fetch(`${API_BASE}/orders/${orderId}`)
    .then(res => res.json())
    .then(order => {
      // Create a modal to show order details
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.display = 'block';

      const orderDate = new Date(order.createdAt).toLocaleString();
      const itemsHtml = order.items.map(item => `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
          <div>
            <strong>${item.product_name}</strong><br>
            <small>Quantity: ${item.quantity} × GHS ${item.price.toFixed(2)}</small>
          </div>
          <div>GHS ${(item.price * item.quantity).toFixed(2)}</div>
        </div>
      `).join('');

      modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
          <div class="modal-header">
            <h2>Order Details - ${order._id.slice(-8)}</h2>
            <span class="modal-close" onclick="this.closest('.modal').remove()">&times;</span>
          </div>
          <div class="modal-body">
            <div style="margin-bottom: 20px;">
              <h3>Customer Information</h3>
              <p><strong>Name:</strong> ${order.customer_name}</p>
              <p><strong>Email:</strong> ${order.customer_email}</p>
              <p><strong>Phone:</strong> ${order.customer_phone}</p>
              <p><strong>Address:</strong> ${order.customer_address.street}, ${order.customer_address.city}, ${order.customer_address.country} ${order.customer_address.zipCode}</p>
            </div>

            <div style="margin-bottom: 20px;">
              <h3>Order Items</h3>
              ${itemsHtml}
            </div>

            <div style="margin-bottom: 20px;">
              <h3>Order Summary</h3>
              <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span>GHS ${order.subtotal.toFixed(2)}</span></div>
              <div style="display: flex; justify-content: space-between;"><span>Tax:</span><span>GHS ${order.tax.toFixed(2)}</span></div>
              <div style="display: flex; justify-content: space-between;"><span>Shipping:</span><span>GHS ${order.shipping.toFixed(2)}</span></div>
              <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px solid #e2e8f0; padding-top: 8px;"><span>Total:</span><span>GHS ${order.total.toFixed(2)}</span></div>
            </div>

            <div style="margin-bottom: 20px;">
              <h3>Order Information</h3>
              <p><strong>Status:</strong> <span class="order-status ${order.status}">${order.status}</span></p>
              <p><strong>Payment Method:</strong> ${order.payment_method}</p>
              <p><strong>Order Date:</strong> ${orderDate}</p>
              ${order.order_notes ? `<p><strong>Notes:</strong> ${order.order_notes}</p>` : ''}
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Close modal when clicking outside
      window.addEventListener('click', function closeModal(e) {
        if (e.target === modal) {
          modal.remove();
          window.removeEventListener('click', closeModal);
        }
      });
    })
    .catch(error => {
      console.error('Error loading order details:', error);
      alert('Error loading order details');
    });
}