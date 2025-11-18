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
    const sizes = Array.from(document.querySelectorAll('input[name="sizes"]:checked')).map(cb => cb.value);
    formData.append('sizes', JSON.stringify(sizes));
    formData.append('colors', JSON.stringify(document.getElementById('colors').value.split(',').map(color => color.trim())));
    const categories = Array.from(document.querySelectorAll('input[name="categories"]:checked')).map(cb => cb.value);
    formData.append('categories', JSON.stringify(categories));
    const sections = Array.from(document.querySelectorAll('input[name="sections"]:checked')).map(cb => cb.value);
    formData.append('sections', JSON.stringify(sections));
  
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