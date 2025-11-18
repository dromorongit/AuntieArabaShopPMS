document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    })
    .then(response => {
      if (response.ok) {
        window.location.href = '/dashboard';
      } else {
        alert('Invalid credentials');
      }
    })
    .catch(error => {
      console.error('Error logging in:', error);
      alert('Login failed');
    });
  });
});