document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.querySelector('.login-btn');
  const btnText = document.querySelector('.btn-text');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    // Show loading state
    const originalText = btnText.textContent;
    btnText.textContent = 'Signing In...';
    loginBtn.disabled = true;

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        // Success - redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        // Invalid credentials
        showLoginError('Invalid email or password. Please try again.');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      showLoginError('Login failed. Please check your connection and try again.');
    } finally {
      // Reset button state
      btnText.textContent = originalText;
      loginBtn.disabled = false;
    }
  });
});

function showLoginError(message) {
  // Remove existing error message
  const existingError = document.querySelector('.login-error');
  if (existingError) {
    existingError.remove();
  }

  // Create and show error message
  const errorDiv = document.createElement('div');
  errorDiv.className = 'login-error';
  errorDiv.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; color: #e53e3e; font-size: 0.9em; margin-top: 15px;">
      <span>⚠️</span>
      <span>${message}</span>
    </div>
  `;

  const loginForm = document.querySelector('.login-form');
  loginForm.appendChild(errorDiv);

  // Shake animation for inputs
  const inputs = document.querySelectorAll('.login-form input');
  inputs.forEach(input => {
    input.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
      input.style.animation = '';
    }, 500);
  });

  // Auto-hide error after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 5000);
}