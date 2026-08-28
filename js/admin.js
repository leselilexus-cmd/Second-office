(function () {
  'use strict';

  // =========================================================
  // CONFIGURATION
  // =========================================================

  const API_BASE = '/api/admin';


  // =========================================================
  // AUTHENTICATION HELPERS
  // =========================================================

  function getToken() {
    return localStorage.getItem('admin_token');
  }

  function saveToken(token) {
    localStorage.setItem('admin_token', token);
  }

  function clearToken() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_logged_in');
  }


  // =========================================================
  // ADMIN LOGIN
  // =========================================================

  const loginForm = document.getElementById('adminLogin');

  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const emailInput = document.getElementById('adminEmail');
      const passwordInput = document.getElementById('adminPassword');
      const message = document.getElementById('loginMessage');
      const submitButton = loginForm.querySelector('button[type="submit"]');

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      if (message) {
        message.style.display = 'none';
        message.textContent = '';
      }

      if (!email || !password) {
        if (message) {
          message.style.display = 'block';
          message.className = 'form-message error';
          message.textContent = 'Please enter your email and password.';
        }
        return;
      }

      try {
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = 'Signing in...';
        }

        const response = await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        let data = {};
        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (!response.ok) {
          throw new Error(data.message || data.error || 'Invalid email or password.');
        }

        if (!data.token) {
          throw new Error('Login succeeded, but no authentication token was returned.');
        }

        saveToken(data.token);
        window.location.href = 'dashboard.html';

      } catch (error) {
        console.error('Admin login error:', error);
        if (message) {
          message.style.display = 'block';
          message.className = 'form-message error';
          message.textContent = error.message || 'Unable to sign in.';
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Login';
        }
      }
    });
  }


  // =========================================================
  // LOGOUT
  // =========================================================

  const logoutButton = document.getElementById('adminLogout');

  if (logoutButton) {
    logoutButton.addEventListener('click', async function (e) {
      e.preventDefault();

      const token = getToken();

      try {
        if (token) {
          await fetch(`${API_BASE}/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        }
      } catch (error) {
        console.warn('Logout API request failed:', error);
      } finally {
        clearToken();
        window.location.href = 'login.html';
      }
    });
  }


  // =========================================================
  // PROTECT ADMIN PAGES
  // =========================================================

  const token = getToken();
  const currentPage = window.location.pathname.split('/').pop().toLowerCase();
  const isLoginPage = currentPage === 'login.html' || currentPage === '';

  if (!isLoginPage && !token) {
    window.location.href = 'login.html';
    return;
  }


  // =========================================================
  // API HELPER
  // =========================================================

  async function fetchData(endpoint) {
    const token = getToken();
    if (!token) {
      window.location.href = 'login.html';
      return null;
    }

    try {
      const response = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        clearToken();
        window.location.href = 'login.html';
        return null;
      }

      if (response.status === 403) {
        console.error(`Access denied for /api/admin/${endpoint}`);
        return null;
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error(`Could not fetch ${endpoint}:`, error);
      return null;
    }
  }


  // =========================================================
  // HELPER: ESCAPE HTML
  // =========================================================

  function escapeHTML(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }


  // =========================================================
  // HELPER: FORMAT DATE
  // =========================================================

  function formatDate(date) {
    if (!date) return 'Unknown date';
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return 'Unknown date';
    return parsed.toLocaleDateString();
  }


  // =========================================================
  // HELPER: GET COUNT FROM API RESPONSE
  // =========================================================

  function getCount(data) {
    if (Array.isArray(data)) return data.length;
    if (data && Array.isArray(data.data)) return data.data.length;
    if (data && typeof data.count === 'number') return data.count;
    return 0;
  }


  // =========================================================
  // HELPER: SET STAT ELEMENT
  // =========================================================

  function setStat(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) element.textContent = value;
  }


  // =========================================================
  // FILTER + SEARCH (reusable)
  // =========================================================

  function setupFilterAndSearch(tableId, searchInputId, filterSelectId, filterButtons) {
    const table = document.getElementById(tableId);
    const searchInput = document.getElementById(searchInputId);
    const filterSelect = document.getElementById(filterSelectId);

    if (!table) return;

    function filterTable() {
      const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
      const statusFilter = filterSelect ? filterSelect.value : 'all';
      const rows = table.querySelectorAll('tbody tr');
      let visibleCount = 0;

      rows.forEach(row => {
        // Skip empty state rows
        if (row.querySelector('.empty-state')) return;

        const text = row.textContent.toLowerCase();
        const status = row.dataset.status || 'new';
        let show = true;

        if (searchTerm && !text.includes(searchTerm)) show = false;
        if (statusFilter !== 'all' && status !== statusFilter) show = false;

        row.style.display = show ? '' : 'none';
        if (show) visibleCount++;
      });

      // Show/hide empty state row
      const emptyRow = table.querySelector('.empty-state')?.closest('tr');
      if (emptyRow) {
        emptyRow.style.display = visibleCount === 0 ? '' : 'none';
      }
    }

    if (searchInput) searchInput.addEventListener('input', filterTable);
    if (filterSelect) filterSelect.addEventListener('change', filterTable);

    if (filterButtons) {
      filterButtons.forEach(btn => {
        btn.addEventListener('click', function () {
          filterButtons.forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          const filter = this.dataset.filter;
          if (filterSelect) filterSelect.value = filter;
          filterTable();
        });
      });
    }

    return filterTable;
  }


  // =========================================================
  // DASHBOARD PAGE
  // =========================================================

  async function loadDashboard() {
    const [clients, leads, inquiries, audits, reviews, projects, testimonials] = await Promise.all([
      fetchData('clients'),
      fetchData('leads'),
      fetchData('inquiries'),
      fetchData('audits'),
      fetchData('reviews'),
      fetchData('projects'),
      fetchData('testimonials')
    ]);

    setStat('statClients', getCount(clients));
    setStat('statLeads', getCount(leads));
    setStat('statInquiries', getCount(inquiries));
    setStat('statAudits', getCount(audits));
    setStat('statReviews', getCount(reviews));
    setStat('statFeedback', getCount(reviews)); // compatibility
    setStat('statProjects', getCount(projects));
    setStat('statTestimonials', getCount(testimonials));

    // Recent activity
    const activityDiv = document.getElementById('recentActivity');
    if (!activityDiv) return;

    const all = [];

    if (Array.isArray(clients)) {
      clients.forEach(c => all.push({
        text: `New client: ${escapeHTML(c.clients_name || 'Unknown')}`,
        date: c.created_at
      }));
    }
    if (Array.isArray(leads)) {
      leads.forEach(l => all.push({
        text: `New lead: ${escapeHTML(l.business_name || 'Unknown')}`,
        date: l.created_at
      }));
    }
    if (Array.isArray(inquiries)) {
      inquiries.forEach(i => all.push({
        text: `New inquiry from ${escapeHTML(i.name || 'Unknown')}`,
        date: i.created_at
      }));
    }
    if (Array.isArray(audits)) {
      audits.forEach(a => all.push({
        text: `Audit request from ${escapeHTML(a.business_name || 'Unknown')}`,
        date: a.created_at
      }));
    }
    if (Array.isArray(reviews)) {
      reviews.forEach(f => all.push({
        text: `Feedback received from ${escapeHTML(f.client_name || 'Client')}`,
        date: f.created_at
      }));
    }
    if (Array.isArray(testimonials)) {
      testimonials.forEach(t => all.push({
        text: `New testimonial: ${escapeHTML(t.client_name || 'Unknown')}`,
        date: t.created_at
      }));
    }

    all.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (all.length === 0) {
      activityDiv.innerHTML = `<p class="empty-state">No activity yet. As you receive inquiries, audit requests, and feedback, they will appear here.</p>`;
      return;
    }

    const recent = all.slice(0, 10);
    const list = recent.map(item => `
      <li>${item.text} – ${formatDate(item.date)}</li>
    `).join('');

    activityDiv.innerHTML = `<ul style="list-style:none; padding:0; margin:0;">${list}</ul>`;
  }


  // =========================================================
  // PAGE DETECTION & ROUTING
  // =========================================================

  const page = window.location.pathname.split('/').pop().replace('.html', '').toLowerCase();

  switch (page) {

    case 'dashboard':
      loadDashboard();
      break;

    case 'clients':
      fetchData('clients').then(data => {
        const tbody = document.querySelector('#clientsTable tbody');
        if (!tbody) return;

        if (Array.isArray(data) && data.length > 0) {
          tbody.innerHTML = data.map(l => `
            <tr data-status="${escapeHTML(l.status || 'new')}">
              <td>${escapeHTML(l.business_name || '')}</td>
              <td>${escapeHTML(l.contact_name || '')}</td>
              <td>${escapeHTML(l.email || '')}</td>
              <td><span style="background:var(--sky);color:#071326;padding:2px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">${escapeHTML(l.status || 'new')}</span></td>
              <td>${formatDate(l.created_at)}</td>
            </tr>
          `).join('');
        } else {
          tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No clients yet. When new clients are added, they will appear here.</td></tr>`;
        }

        setupFilterAndSearch('clientsTable', 'searchClients', 'filterStatus', document.querySelectorAll('.filter-btn'));
      });
      break;

    case 'leads':
      fetchData('leads').then(data => {
        const tbody = document.querySelector('#leadsTable tbody');
        if (!tbody) return;

        if (Array.isArray(data) && data.length > 0) {
          tbody.innerHTML = data.map(l => `
            <tr data-status="${escapeHTML(l.status || 'new')}">
              <td>${escapeHTML(l.business_name || '')}</td>
              <td>${escapeHTML(l.contact_name || '')}</td>
              <td>${escapeHTML(l.email || '')}</td>
              <td><span style="background:var(--sky);color:#071326;padding:2px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">${escapeHTML(l.status || 'new')}</span></td>
              <td>${formatDate(l.created_at)}</td>
            </tr>
          `).join('');
        } else {
          tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No leads yet. When prospects submit the audit form or contact form, they will appear here.</td></tr>`;
        }

        setupFilterAndSearch('leadsTable', 'searchLeads', 'filterStatus', document.querySelectorAll('.filter-btn'));
      });
      break;

    case 'inquiries':
      fetchData('inquiries').then(data => {
        const tbody = document.querySelector('#inquiriesTable tbody');
        if (!tbody) return;

        if (Array.isArray(data) && data.length > 0) {
          tbody.innerHTML = data.map(i => `
            <tr data-status="${escapeHTML(i.status || 'new')}">
              <td>${escapeHTML(i.name || '')}</td>
              <td>${escapeHTML(i.business_name || '')}</td>
              <td>${escapeHTML(i.service || '')}</td>
              <td><span style="background:var(--sky);color:#071326;padding:2px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">${escapeHTML(i.status || 'new')}</span></td>
              <td>${formatDate(i.created_at)}</td>
            </tr>
          `).join('');
        } else {
          tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No inquiries yet. When someone submits the contact form, they will appear here.</td></tr>`;
        }

        setupFilterAndSearch('inquiriesTable', 'searchInquiries', 'filterStatus', document.querySelectorAll('.filter-btn'));
      });
      break;

    case 'feedback':
      fetchData('reviews').then(data => {
        const container = document.getElementById('feedbackList');
        if (!container) return;

        if (Array.isArray(data) && data.length > 0) {
          container.innerHTML = data.map(f => `
            <div class="feedback-item">
              <strong>${escapeHTML(f.client_name || 'Anonymous')}</strong> – ${escapeHTML(f.business_name || '')}<br>
              Rating: ${escapeHTML(f.overall_rating || 'N/A')}/5<br>
              <em>${escapeHTML(f.additional_comments || '')}</em><br>
              <span style="opacity:0.6;">Status: ${escapeHTML(f.status || 'new')} | Public: ${f.is_public ? 'Yes' : 'No'}</span>
            </div>
          `).join('');
        } else {
          container.innerHTML = `<p class="empty-state">No client feedback yet. After clients submit the feedback form, their private reviews will appear here.</p>`;
        }
      });
      break;

    case 'projects':
      fetchData('projects').then(data => {
        const container = document.getElementById('projectList');
        if (!container) return;

        if (Array.isArray(data) && data.length > 0) {
          container.innerHTML = data.map(p => `
            <div style="border-bottom:1px solid var(--border); padding:1rem 0;">
              <strong>${escapeHTML(p.name || 'Unnamed')}</strong> – ${escapeHTML(p.industry || '')}<br>
              ${p.is_concept ? '🔹 CONCEPT PROJECT' : '✅ Real Client Work'}<br>
              ${escapeHTML(p.description || '')}
            </div>
          `).join('');
        } else {
          container.innerHTML = `<p class="empty-state">No projects yet. When you add real client projects or concept projects, they will appear here. Remember to label concept projects clearly.</p>`;
        }
      });
      break;

    case 'testimonials':
      fetchData('testimonials').then(data => {
        const container = document.getElementById('testimonialList');
        if (!container) return;

        if (Array.isArray(data) && data.length > 0) {
          container.innerHTML = data.map(t => `
            <div style="border-bottom:1px solid var(--border); padding:1rem 0;">
              <strong>${escapeHTML(t.display_name || 'Anonymous')}</strong> – ${escapeHTML(t.business_name || '')}<br>
              <em>"${escapeHTML(t.quote || '')}"</em><br>
              Rating: ${escapeHTML(t.rating || 'N/A')}/5
            </div>
          `).join('');
        } else {
          container.innerHTML = `<p class="empty-state">No approved testimonials yet. Once you receive client feedback, review it, and approve it for publication, it will appear here.</p>`;
        }
      });
      break;

    default:
      console.log('Admin page loaded:', page);
  }

})();