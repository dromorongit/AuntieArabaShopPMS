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
  
    fetch('/products', {
      method: 'POST',
      body: formData,
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