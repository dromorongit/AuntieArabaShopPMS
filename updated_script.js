// API Base URL
const API_BASE = 'https://auntiearabashoppms-production.up.railway.app';

// Product Data - will be populated from API
let products = {
    'new-arrivals': [],
    'top-deals': [],
    'fast-selling': []
};

// Shopping Cart
let cart = [];

// Fetch products from API
async function fetchProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        const data = await response.json();

        // Map API data to shop format
        const mappedProducts = data.map((product, index) => ({
            id: product._id || index + 1,
            _id: product._id, // Keep the original MongoDB _id
            name: product.product_name,
            price: product.promo && product.promo_price ? product.promo_price : product.price_ghc,
            originalPrice: product.promo ? product.price_ghc : null,
            image: product.cover_image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop',
            categories: product.categories || [], // Keep all categories as array
            category: product.categories ? product.categories[0] : 'general', // Keep for backward compatibility
            sections: product.sections || [],
            stock_status: product.stock_status,
            short_description: product.short_description
        }));

        // Assign to sections based on product's sections field
        products['new-arrivals'] = mappedProducts.filter(p => p.sections.includes('New Arrivals'));
        products['top-deals'] = mappedProducts.filter(p => p.sections.includes('Top Deals'));
        products['fast-selling'] = mappedProducts.filter(p => p.sections.includes('Fast Selling Products'));

    } catch (error) {
        console.error('Error fetching products:', error);
        // Fallback to hardcoded products if API fails
        products = {
            'new-arrivals': [
                {
                    id: 1,
                    name: 'Elegant Pink Crop Top',
                    price: 85.00,
                    image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=400&fit=crop',
                    category: 'crop-tops'
                },
                // ... rest of hardcoded
            ],
            'top-deals': [],
            'fast-selling': []
        };
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async function() {
    await fetchProducts();
    initializeCarousel();
    loadProducts();
    loadCart();
    updateCartCount();
    initializeMobileDropdowns();
});

// Mobile dropdown functionality
function initializeMobileDropdowns() {
    const dropdownTriggers = document.querySelectorAll('.dropdown > .nav-link');

    dropdownTriggers.forEach(trigger => {
        trigger.addEventListener('click', function(e) {
            e.preventDefault();
            const dropdown = this.parentElement;
            const menu = dropdown.querySelector('.dropdown-menu');
            const isVisible = menu.getAttribute('data-visible') === 'true';

            // Close any other open dropdowns
            document.querySelectorAll('.dropdown-menu').forEach(otherMenu => {
                if (otherMenu !== menu) {
                    otherMenu.style.opacity = '0';
                    otherMenu.style.visibility = 'hidden';
                    otherMenu.style.transform = 'translateY(-10px)';
                    otherMenu.setAttribute('data-visible', 'false');
                }
            });

            // Toggle current dropdown
            if (isVisible) {
                menu.style.opacity = '0';
                menu.style.visibility = 'hidden';
                menu.style.transform = 'translateY(-10px)';
                menu.setAttribute('data-visible', 'false');
            } else {
                menu.style.opacity = '1';
                menu.style.visibility = 'visible';
                menu.style.transform = 'translateY(0)';
                menu.setAttribute('data-visible', 'true');
            }
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.style.opacity = '0';
                menu.style.visibility = 'hidden';
                menu.style.transform = 'translateY(-10px)';
                menu.setAttribute('data-visible', 'false');
            });
        }
    });
}

// Carousel Functionality
function initializeCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.indicator');
    let currentSlide = 0;

    // Auto-play carousel
    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        indicators[currentSlide].classList.remove('active');

        currentSlide = (currentSlide + 1) % slides.length;

        slides[currentSlide].classList.add('active');
        indicators[currentSlide].classList.add('active');
    }, 5000);

    // Manual slide navigation
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            slides[currentSlide].classList.remove('active');
            indicators[currentSlide].classList.remove('active');

            currentSlide = index;

            slides[currentSlide].classList.add('active');
            indicators[currentSlide].classList.add('active');
        });
    });
}

// Load Products
function loadProducts() {
    // Load new arrivals
    const newArrivalsContainer = document.getElementById('new-arrivals');
    if (newArrivalsContainer) {
        products['new-arrivals'].forEach(product => {
            newArrivalsContainer.appendChild(createProductCard(product));
        });
    }

    // Load top deals
    const topDealsContainer = document.getElementById('top-deals');
    if (topDealsContainer) {
        products['top-deals'].forEach(product => {
            topDealsContainer.appendChild(createProductCard(product, true));
        });
    }

    // Load fast selling
    const fastSellingContainer = document.getElementById('fast-selling');
    if (fastSellingContainer) {
        products['fast-selling'].forEach(product => {
            fastSellingContainer.appendChild(createProductCard(product));
        });
    }
}

// Create Product Card
function createProductCard(product, isDeal = false) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
        <div class="product-image">
            <img src="${product.image}" alt="${product.name}">
        </div>
        <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <p class="product-price">GHS ${product.price.toFixed(2)}</p>
            ${isDeal && product.originalPrice ?
                `<p class="original-price">GHS ${product.originalPrice.toFixed(2)}</p>` :
                ''}
            <div class="product-buttons">
                <button class="btn btn-primary" onclick="viewProduct('${product.id}')">View More</button>
                <button class="btn btn-secondary" onclick="addToCart('${product.id}')">Add to Cart</button>
            </div>
        </div>
    `;
    return card;
}

// Add to Cart
function addToCart(productId) {
    // Find product in all categories
    let product = null;
    for (const category in products) {
        product = products[category].find(p => p.id === productId);
        if (product) break;
    }

    if (product) {
        const existingItem = cart.find(item => item.id === productId);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({...product, quantity: 1});
        }

        saveCart();
        updateCartCount();
        showNotification('Product added to cart!');
    }
}

// Remove from Cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartCount();
    renderCart();
    showNotification('Product removed from cart');
}

// Update Cart Count
function updateCartCount() {
    const cartCountElement = document.querySelector('.cart-count');
    if (cartCountElement) {
        const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
        cartCountElement.textContent = totalItems;
    }
}

// Save Cart to LocalStorage
function saveCart() {
    localStorage.setItem('auntieArabaCart', JSON.stringify(cart));
}

// Load Cart from LocalStorage
function loadCart() {
    const savedCart = localStorage.getItem('auntieArabaCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

// View Product
function viewProduct(productId) {
    window.location.href = `product.html?id=${productId}`;
}

// Show Notification
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;

    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'linear-gradient(135deg, #e91e63 0%, #9c27b0 100%)',
        color: 'white',
        padding: '1rem 1.5rem',
        borderRadius: '10px',
        boxShadow: '0 10px 30px rgba(233, 30, 99, 0.3)',
        zIndex: '10000',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontWeight: '500',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease'
    });

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Category Page Functions
async function loadCategoryProducts(categorySlug) {
    await fetchProducts(); // Ensure products are loaded
    const categoryProducts = [];

    // Map URL slugs to database category names
    const categoryMapping = {
        'ladies-tops': 'Ladies Basic Tops',
        'crop-tops': 'Crop Tops',
        'night-wear': 'Night Wear',
        'bum-shorts': 'Bum Shorts',
        'two-in-one-night': '2-in-1 Night Wears',
        'two-in-one-tops': '2-in-1 Tops and Downs',
        'elegant-dresses': 'Elegant Dresses',
        'stylish-dresses': 'Stylish Dresses',
        'office-dresses': 'Office Dresses',
        'panties': 'Panties',
        'nfl-jerseys': 'Unisex NFL Jerseys',
        'other-ladies': 'Other Ladies Fashion Items'
    };

    const targetCategory = categoryMapping[categorySlug];

    if (!targetCategory) {
        console.warn('Unknown category slug:', categorySlug);
        return categoryProducts;
    }

    console.log('Loading products for category:', categorySlug, '->', targetCategory);

    // Filter products from all sections that have this category
    Object.values(products).forEach(sectionProducts => {
        sectionProducts.forEach(product => {
            if (product.categories && product.categories.includes(targetCategory)) {
                categoryProducts.push(product);
            }
        });
    });

    console.log('Found', categoryProducts.length, 'products for category:', targetCategory);
    return categoryProducts;
}

// Get URL Parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Initialize category page if on category page
if (window.location.pathname.includes('category.html')) {
    document.addEventListener('DOMContentLoaded', async function() {
        const category = getUrlParameter('cat');
        const categoryTitle = document.getElementById('category-title');
        const productsContainer = document.getElementById('category-products');

        if (categoryTitle && productsContainer) {
            const categoryNames = {
                'ladies-tops': 'Ladies Basic Tops',
                'crop-tops': 'Crop Tops',
                'night-wear': 'Night Wear',
                'bum-shorts': 'Bum Shorts',
                'two-in-one-night': '2-in-1 Night Wears',
                'two-in-one-tops': '2-in-1 Tops and Downs',
                'elegant-dresses': 'Elegant Dresses',
                'stylish-dresses': 'Stylish Dresses',
                'office-dresses': 'Office Dresses',
                'panties': 'Panties',
                'nfl-jerseys': 'Unisex NFL Jerseys',
                'other-ladies': 'Other Ladies Fashion Items'
            };

            categoryTitle.textContent = categoryNames[category] || 'Products';

            const categoryProducts = await loadCategoryProducts(category);
            categoryProducts.forEach(product => {
                productsContainer.appendChild(createProductCard(product));
            });
        }
    });
}

// Cart page functions
if (window.location.pathname.includes('cart.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        renderCart();
        updateCartSummary();
    });
}

function renderCart() {
    const cartContainer = document.getElementById('cart-items');
    if (!cartContainer) return;

    cartContainer.innerHTML = '';

    if (cart.length === 0) {
        cartContainer.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <h3>Your cart is empty</h3>
                <p>Start shopping to add items to your cart</p>
                <a href="index.html" class="btn btn-primary">Continue Shopping</a>
            </div>
        `;
        return;
    }

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;

        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-image">
                <img src="${item.image}" alt="${item.name}">
            </div>
            <div class="cart-item-info">
                <h3>${item.name}</h3>
                <p>GHS ${item.price.toFixed(2)}</p>
                <div class="quantity-controls">
                    <button onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
            </div>
            <div class="cart-item-total">
                GHS ${itemTotal.toFixed(2)}
            </div>
            <button class="remove-item" onclick="removeFromCart('${item.id}')">
                <i class="fas fa-trash"></i>
            </button>
        `;

        cartContainer.appendChild(cartItem);
    });
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
            updateCartCount();
            renderCart();
            updateCartSummary();
        }
    }
}

function updateCartSummary() {
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartTax = document.getElementById('cart-tax');
    const cartTotal = document.getElementById('cart-total');

    if (cartSubtotal && cartTax && cartTotal) {
        const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        const tax = subtotal * 0.12; // 12% tax
        const total = subtotal + tax + 15; // +15 shipping

        cartSubtotal.textContent = `GHS ${subtotal.toFixed(2)}`;
        cartTax.textContent = `GHS ${tax.toFixed(2)}`;
        cartTotal.textContent = `GHS ${total.toFixed(2)}`;
    }
}

function proceedToCheckout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty!');
        return;
    }
    // Redirect to checkout page
    window.location.href = 'checkout.html';
}

// Product page functions
if (window.location.pathname.includes('product.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        const productId = getUrlParameter('id');
        if (productId) {
            loadProductDetails(productId);
        }
    });
}

function loadProductDetails(productId) {
    fetch(`${API_BASE}/products/${productId}`)
        .then(response => response.json())
        .then(product => {
            displayProductDetails(product);
        })
        .catch(error => {
            console.error('Error loading product details:', error);
            showNotification('Error loading product details');
        });
}

function displayProductDetails(product) {
    document.getElementById('product-name').textContent = product.product_name;
    document.getElementById('product-price').textContent = `GHS ${product.price_ghc.toFixed(2)}`;
    if (product.promo && product.promo_price) {
        document.getElementById('product-price').innerHTML = `<span class="original-price">GHS ${product.price_ghc.toFixed(2)}</span> <span class="promo-price">GHS ${product.promo_price.toFixed(2)}</span>`;
    }
    document.getElementById('product-image').src = product.cover_image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop';

    // Display video if available
    const videoContainer = document.getElementById('product-video');
    if (product.video) {
        videoContainer.innerHTML = `<video controls style="width: 100%; max-width: 400px;"><source src="${product.video}" type="video/mp4">Your browser does not support the video tag.</video>`;
        videoContainer.style.display = 'block';
    } else {
        videoContainer.style.display = 'none';
    }

    document.getElementById('short-description').textContent = product.short_description || '';
    document.getElementById('long-description').textContent = product.long_description || '';
    document.getElementById('fabric-type').textContent = product.fabric_type || 'N/A';
    document.getElementById('stock-status').textContent = product.stock_status || 'In Stock';

    // Sizes
    const sizesContainer = document.getElementById('product-sizes');
    if (product.sizes && product.sizes.length > 0) {
        sizesContainer.innerHTML = product.sizes.map(size => `<span class="size-tag">${size}</span>`).join('');
    } else {
        sizesContainer.textContent = 'N/A';
    }

    // Colors
    const colorsContainer = document.getElementById('product-colors');
    if (product.colors && product.colors.length > 0) {
        colorsContainer.innerHTML = product.colors.map(color => `<span class="color-tag">${color}</span>`).join('');
    } else {
        colorsContainer.textContent = 'N/A';
    }

    // Categories
    const categoriesContainer = document.getElementById('product-categories');
    if (product.categories && product.categories.length > 0) {
        categoriesContainer.textContent = product.categories.join(', ');
    } else {
        categoriesContainer.textContent = 'N/A';
    }

    // Add to cart button
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    addToCartBtn.onclick = () => addToCart(product._id);
}

// Contact form handling
if (window.location.pathname.includes('contact.html')) {
    document.addEventListener('DOMContentLoaded', function() {
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', function(e) {
                e.preventDefault();
                showNotification('Thank you for your message! We will get back to you soon.');
                contactForm.reset();
            });
        }
    });
}