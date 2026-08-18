(function() {
  // Admin login
  const loginForm = document.getElementById('adminLogin');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const email = document.getElementById('adminEmail').value;
      const password = document.getElementById('adminPassword').value;
      const msg = document.getElementById('loginMessage');
      // In production, use Supabase Auth or your own auth endpoint
      // For now, simulate a successful login
      if (email && password) {
        localStorage.setItem('admin_logged_in', 'true');
        window.location.href = 'dashboard.html';
      } else {
        if (msg) { msg.style.display = 'block'; msg.className = 'form-message error'; msg.textContent = 'Invalid credentials.'; }
      }
    });
  }

  // Admin logout
  const logoutBtn = document.getElementById('adminLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      localStorage.removeItem('admin_logged_in');
      window.location.href = 'login.html';
    });
  }

  // Protect admin pages (basic)
  if (window.location.pathname.includes('/admin/') && !window.location.pathname.includes('login.html')) {
    if (!localStorage.getItem('admin_logged_in')) {
      window.location.href = 'login.html';
    }
  }

  // Dashboard stats (placeholder – fetch from API in production)
  const statLeads = document.getElementById('statLeads');
  const statInquiries = document.getElementById('statInquiries');
  const statAudits = document.getElementById('statAudits');
  const statReviews = document.getElementById('statReviews');
  if (statLeads) statLeads.textContent = '24';
  if (statInquiries) statInquiries.textContent = '8';
  if (statAudits) statAudits.textContent = '6';
  if (statReviews) statReviews.textContent = '17';
})();