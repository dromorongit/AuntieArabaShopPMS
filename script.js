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

  // Handle form submission
  addProductForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const product = {
      product_name: document.getElementById('product_name').value,
      cover_image: document.getElementById('cover_image').value,
      other_images: document.getElementById('other_images').value.split(',').map(img => img.trim()),  // Convert to array
      sizes: Array.from(document.getElementById('sizes').selectedOptions).map(option => option.value),
      colors: document.getElementById('colors').value.split(',').map(color => color.trim()),  // Convert to array
      fabric_type: document.getElementById('fabric_type').value,
      short_description: document.getElementById('short_description').value,
      long_description: document.getElementById('long_description').value,
      price_ghc: parseFloat(document.getElementById('price_ghc').value),
      stock_status: document.getElementById('stock_status').value,
      categories: Array.from(document.getElementById('categories').selectedOptions).map(option => option.value),
    };

    if (promoCheckbox.checked) {
      product.promo = true;
      product.promo_price = parseFloat(document.getElementById('promo_price').value);
    } else {
      product.promo = false;
    }

    fetch('http://localhost:3000/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    })
    .then(response => response.json())
    .then(data => {
      alert('Product added successfully!');
      addProductForm.reset();  // Clear form
    })
    .catch(error => {
      console.error('Error adding product:', error);
      alert('Failed to add product.');
    });
  });
});