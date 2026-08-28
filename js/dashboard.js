(function () {
  'use strict';

  // =========================================================
  // CONFIGURATION
  // =========================================================

  const API_BASE =
  window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api/admin'
    : '/api/admin';

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
        localStorage.setItem('admin_logged_in', 'true');
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
  // API HELPER – Full CRUD Support
  // =========================================================

  async function apiRequest(endpoint, method = 'GET', body = null) {
    const token = getToken();

    if (!token) {
      window.location.href = 'login.html';
      return null;
    }

    const options = {
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${API_BASE}/${endpoint}`, options);

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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API request failed: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error(`API error (${method} ${endpoint}):`, error);
      throw error;
    }
  }

  // =========================================================
  // HELPER: GET DATA (shorthand)
  // =========================================================

  async function fetchData(endpoint) {
    try {
      const result = await apiRequest(endpoint, 'GET');
      return result?.data || result || [];
    } catch (error) {
      console.warn(`Could not fetch ${endpoint}:`, error);
      return [];
    }
  }

  // =========================================================
  // HELPER: POST DATA (create)
  // =========================================================

  async function createData(endpoint, data) {
    const result = await apiRequest(endpoint, 'POST', data);
    return result;
  }

  // =========================================================
  // HELPER: PATCH DATA (update)
  // =========================================================

  async function updateData(endpoint, id, data) {
    const result = await apiRequest(`${endpoint}/${id}`, 'PATCH', data);
    return result;
  }

  // =========================================================
  // HELPER: DELETE DATA
  // =========================================================

  async function deleteData(endpoint, id) {
    const result = await apiRequest(`${endpoint}/${id}`, 'DELETE');
    return result;
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
  // HELPER: GET COUNT
  // =========================================================

  function getCount(data) {
    if (Array.isArray(data)) return data.length;
    if (data && typeof data === 'object' && data.total !== undefined) return data.total;
    if (data && Array.isArray(data.data)) return data.data.length;
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
  // HELPER: SHOW TOAST/NOTIFICATION
  // =========================================================

  function showToast(message, type = 'success') {
    const toast = document.getElementById('toastMessage') || (() => {
      const div = document.createElement('div');
      div.id = 'toastMessage';
      div.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 12px;
        font-weight: 500;
        z-index: 9999;
        max-width: 400px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateY(20px);
        pointer-events: none;
      `;
      document.body.appendChild(div);
      return div;
    })();

    toast.textContent = message;
    toast.style.background = type === 'success' ? 'var(--sky)' : '#ff5252';
    toast.style.color = type === 'success' ? '#071326' : '#fff';
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    toast.style.pointerEvents = 'auto';

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.style.pointerEvents = 'none';
    }, 4000);
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
        if (row.querySelector('.empty-state')) return;

        const text = row.textContent.toLowerCase();
        const status = row.dataset.status || 'new';
        let show = true;

        if (searchTerm && !text.includes(searchTerm)) show = false;
        if (statusFilter !== 'all' && status !== statusFilter) show = false;

        row.style.display = show ? '' : 'none';
        if (show) visibleCount++;
      });

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
  // LOAD DASHBOARD STATS
  // =========================================================

  async function loadDashboard() {
    try {
      const [leads, inquiries, audits, reviews, projects, clients] = await Promise.all([
        fetchData('leads'),
        fetchData('inquiries'),
        fetchData('audits'),
        fetchData('reviews'),
        fetchData('projects'),
        fetchData('clients')
      ]);

      setStat('statLeads', getCount(leads));
      setStat('statInquiries', getCount(inquiries));
      setStat('statAudits', getCount(audits));
      setStat('statReviews', getCount(reviews));
      setStat('statFeedback', getCount(reviews));
      setStat('statProjects', getCount(projects));
      setStat('statClients', getCount(clients));

      // Recent activity
      const activityDiv = document.getElementById('recentActivity');
      if (!activityDiv) return;

      const all = [];

      if (Array.isArray(leads)) {
        leads.slice(0, 5).forEach(l => all.push({
          text: `New lead: ${escapeHTML(l.business_name || 'Unknown')}`,
          date: l.created_at,
          type: 'lead'
        }));
      }
      if (Array.isArray(inquiries)) {
        inquiries.slice(0, 5).forEach(i => all.push({
          text: `New inquiry: ${escapeHTML(i.name || 'Unknown')}`,
          date: i.created_at,
          type: 'inquiry'
        }));
      }
      if (Array.isArray(audits)) {
        audits.slice(0, 5).forEach(a => all.push({
          text: `Audit request: ${escapeHTML(a.business_name || 'Unknown')}`,
          date: a.created_at,
          type: 'audit'
        }));
      }
      if (Array.isArray(reviews)) {
        reviews.slice(0, 5).forEach(f => all.push({
          text: `New feedback: ${escapeHTML(f.client_name || 'Client')}`,
          date: f.created_at,
          type: 'feedback'
        }));
      }

      all.sort((a, b) => new Date(b.date) - new Date(a.date));
      const recent = all.slice(0, 10);

      if (recent.length === 0) {
        activityDiv.innerHTML = `<p class="empty-state">No activity yet. As you receive inquiries, audit requests, and feedback, they will appear here.</p>`;
      } else {
        activityDiv.innerHTML = `
          <ul style="list-style:none; padding:0; margin:0;">
            ${recent.map(item => `
              <li style="padding:0.5rem 0; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                <span>${item.text}</span>
                <span style="font-size:0.8rem; opacity:0.5;">${formatDate(item.date)}</span>
              </li>
            `).join('')}
          </ul>
        `;
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  }

  // =========================================================
  // PAGE LOADERS – Full CRUD Pages
  // =========================================================

  // ----- LEADS -----
  async function loadLeads() {
    const data = await fetchData('leads');
    const tbody = document.querySelector('#leadsTable tbody');
    if (!tbody) return;

    if (Array.isArray(data) && data.length > 0) {
      tbody.innerHTML = data.map(l => `
        <tr data-status="${escapeHTML(l.status || 'new')}" data-id="${l.id}">
          <td>${escapeHTML(l.business_name || '')}</td>
          <td>${escapeHTML(l.contact_name || '')}</td>
          <td>${escapeHTML(l.email || '')}</td>
          <td><span class="status-badge ${escapeHTML(l.status || 'new')}">${escapeHTML(l.status || 'new')}</span></td>
          <td>${formatDate(l.created_at)}</td>
          <td>
            <button class="btn-edit" data-id="${l.id}" data-type="leads" title="Edit"><i class="fas fa-edit"></i></button>
            <button class="btn-delete" data-id="${l.id}" data-type="leads" title="Delete"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No leads yet. When prospects submit the audit form or contact form, they will appear here.</td></tr>`;
    }

    setupFilterAndSearch('leadsTable', 'searchLeads', 'filterStatus', document.querySelectorAll('.filter-btn'));
    setupActionButtons('leads');
  }

  // ----- INQUIRIES -----
  async function loadInquiries() {
    const data = await fetchData('inquiries');
    const tbody = document.querySelector('#inquiriesTable tbody');
    if (!tbody) return;

    if (Array.isArray(data) && data.length > 0) {
      tbody.innerHTML = data.map(i => `
        <tr data-status="${escapeHTML(i.status || 'new')}" data-id="${i.id}">
          <td>${escapeHTML(i.name || '')}</td>
          <td>${escapeHTML(i.business_name || '')}</td>
          <td>${escapeHTML(i.email || '')}</td>
          <td>${escapeHTML(i.service || '')}</td>
          <td><span class="status-badge ${escapeHTML(i.status || 'new')}">${escapeHTML(i.status || 'new')}</span></td>
          <td>${formatDate(i.created_at)}</td>
          <td>
            <button class="btn-edit" data-id="${i.id}" data-type="inquiries" title="Edit"><i class="fas fa-edit"></i></button>
            <button class="btn-delete" data-id="${i.id}" data-type="inquiries" title="Delete"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No inquiries yet. When someone submits the contact form, they will appear here.</td></tr>`;
    }

    setupFilterAndSearch('inquiriesTable', 'searchInquiries', 'filterStatus', document.querySelectorAll('.filter-btn'));
    setupActionButtons('inquiries');
  }

  // ----- AUDITS -----
  async function loadAudits() {
    const data = await fetchData('audits');
    const tbody = document.querySelector('#auditsTable tbody');
    if (!tbody) return;

    if (Array.isArray(data) && data.length > 0) {
      tbody.innerHTML = data.map(a => `
        <tr data-status="${escapeHTML(a.status || 'new')}" data-id="${a.id}">
          <td>${escapeHTML(a.business_name || '')}</td>
          <td>${escapeHTML(a.email || '')}</td>
          <td>${escapeHTML(a.industry || '')}</td>
          <td>${escapeHTML(a.website || '')}</td>
          <td><span class="status-badge ${escapeHTML(a.status || 'new')}">${escapeHTML(a.status || 'new')}</span></td>
          <td>${formatDate(a.created_at)}</td>
          <td>
            <button class="btn-edit" data-id="${a.id}" data-type="audits" title="Edit"><i class="fas fa-edit"></i></button>
            <button class="btn-delete" data-id="${a.id}" data-type="audits" title="Delete"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No audit requests yet. When clients request a digital audit, they will appear here.</td></tr>`;
    }

    setupFilterAndSearch('auditsTable', 'searchAudits', 'filterStatus', document.querySelectorAll('.filter-btn'));
    setupActionButtons('audits');
  }

  // ----- PROJECTS -----
  async function loadProjects() {
    const data = await fetchData('projects');
    const container = document.getElementById('projectList');
    if (!container) return;

    if (Array.isArray(data) && data.length > 0) {
      container.innerHTML = data.map(p => `
        <div class="project-item" data-id="${p.id}" style="border-bottom:1px solid var(--border); padding:1rem 0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;">
          <div>
            <strong>${escapeHTML(p.name || 'Unnamed')}</strong>
            <span style="margin-left:0.5rem; font-size:0.8rem; opacity:0.6;">${escapeHTML(p.industry || '')}</span>
            <br>
            <span style="font-size:0.85rem; opacity:0.7;">${p.is_concept ? '🔹 CONCEPT PROJECT' : '✅ Real Client Work'}</span>
            <br>
            <span style="font-size:0.85rem; opacity:0.6;">${escapeHTML(p.description || '')}</span>
          </div>
          <div>
            <button class="btn-edit" data-id="${p.id}" data-type="projects" title="Edit" style="margin-right:0.5rem;"><i class="fas fa-edit"></i></button>
            <button class="btn-delete" data-id="${p.id}" data-type="projects" title="Delete"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = `<p class="empty-state">No projects yet. When you add real client projects or concept projects, they will appear here.</p>`;
    }

    setupActionButtons('projects');
  }

  // ----- REVIEWS (Feedback) -----
  async function loadReviews() {
    const data = await fetchData('reviews');
    const container = document.getElementById('feedbackList');
    if (!container) return;

    if (Array.isArray(data) && data.length > 0) {
      container.innerHTML = data.map(f => `
        <div class="feedback-item" data-id="${f.id}" style="border-bottom:1px solid var(--border); padding:1rem 0;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap;">
            <div>
              <strong>${escapeHTML(f.client_name || 'Anonymous')}</strong>
              <span style="opacity:0.6; margin-left:0.5rem;">${escapeHTML(f.business_name || '')}</span>
              <br>
              <span style="font-size:0.85rem;">Rating: ${escapeHTML(f.overall_rating || 'N/A')}/5</span>
              <br>
              <em style="font-size:0.85rem; opacity:0.7;">${escapeHTML(f.additional_comments || '')}</em>
              <br>
              <span style="font-size:0.8rem; opacity:0.5;">
                Status: ${escapeHTML(f.status || 'new')} | Public: ${f.is_public ? '✅ Yes' : '🔒 No'}
              </span>
            </div>
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.5rem;">
              ${f.status !== 'approved' && f.permission_to_publish ? `
                <button class="btn-approve" data-id="${f.id}" title="Approve for public"><i class="fas fa-check-circle"></i> Approve</button>
              ` : ''}
              ${f.status === 'new' ? `
                <button class="btn-review" data-id="${f.id}" title="Mark as reviewed"><i class="fas fa-eye"></i> Review</button>
              ` : ''}
              <button class="btn-delete" data-id="${f.id}" data-type="reviews" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        </div>
      `).join('');

      // Review action buttons
      document.querySelectorAll('.btn-approve').forEach(btn => {
        btn.addEventListener('click', async function() {
          const id = this.dataset.id;
          if (confirm('Approve this review for public display?')) {
            try {
              await updateData('reviews', id, { action: 'approve' });
              showToast('Review approved and published as testimonial!');
              loadReviews();
            } catch (error) {
              showToast('Failed to approve review', 'error');
            }
          }
        });
      });

      document.querySelectorAll('.btn-review').forEach(btn => {
        btn.addEventListener('click', async function() {
          const id = this.dataset.id;
          try {
            await updateData('reviews', id, { action: 'reviewed' });
            showToast('Review marked as reviewed');
            loadReviews();
          } catch (error) {
            showToast('Failed to update review', 'error');
          }
        });
      });

    } else {
      container.innerHTML = `<p class="empty-state">No client feedback yet. After clients submit the feedback form, their private reviews will appear here.</p>`;
    }

    setupActionButtons('reviews');
  }

  // ----- TESTIMONIALS -----
  async function loadTestimonials() {
    const data = await fetchData('testimonials');
    const container = document.getElementById('testimonialList');
    if (!container) return;

    if (Array.isArray(data) && data.length > 0) {
      container.innerHTML = data.map(t => `
        <div class="testimonial-item" data-id="${t.id}" style="border-bottom:1px solid var(--border); padding:1rem 0; display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap;">
          <div>
            <strong>${escapeHTML(t.display_name || 'Anonymous')}</strong>
            <span style="opacity:0.6; margin-left:0.5rem;">${escapeHTML(t.business_name || '')}</span>
            <br>
            <em style="font-size:0.9rem;">"${escapeHTML(t.quote || '')}"</em>
            <br>
            <span style="font-size:0.85rem;">Rating: ${escapeHTML(t.rating || 'N/A')}/5</span>
            <br>
            <span style="font-size:0.8rem; opacity:0.5;">Status: ${t.is_active ? '✅ Active' : '🔒 Inactive'}</span>
          </div>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.5rem;">
            <button class="btn-toggle" data-id="${t.id}" data-active="${t.is_active}" title="Toggle active status">
              <i class="fas ${t.is_active ? 'fa-eye' : 'fa-eye-slash'}"></i>
            </button>
            <button class="btn-delete" data-id="${t.id}" data-type="testimonials" title="Delete"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `).join('');

      document.querySelectorAll('.btn-toggle').forEach(btn => {
        btn.addEventListener('click', async function() {
          const id = this.dataset.id;
          const current = this.dataset.active === 'true';
          try {
            await updateData('testimonials', id, { is_active: !current });
            showToast(`Testimonial ${!current ? 'activated' : 'deactivated'}`);
            loadTestimonials();
          } catch (error) {
            showToast('Failed to update testimonial', 'error');
          }
        });
      });

    } else {
      container.innerHTML = `<p class="empty-state">No approved testimonials yet. Once you receive client feedback, review it, and approve it for publication, it will appear here.</p>`;
    }

    setupActionButtons('testimonials');
  }

  // ----- CLIENTS -----
  async function loadClients() {
    const data = await fetchData('clients');
    const tbody = document.querySelector('#clientsTable tbody');
    if (!tbody) return;

    const clients = Array.isArray(data) ? data : data?.clients || [];

    if (clients.length > 0) {
      tbody.innerHTML = clients.map(c => `
        <tr data-id="${c.id}">
          <td>${escapeHTML(c.business_name || '')}</td>
          <td>${escapeHTML(c.contact_name || '')}</td>
          <td>${escapeHTML(c.email || '')}</td>
          <td>${escapeHTML(c.phone || '')}</td>
          <td><span class="status-badge ${escapeHTML(c.status || 'active')}">${escapeHTML(c.status || 'active')}</span></td>
          <td>${formatDate(c.created_at)}</td>
          <td>
            <button class="btn-edit" data-id="${c.id}" data-type="clients" title="Edit"><i class="fas fa-edit"></i></button>
            <button class="btn-delete" data-id="${c.id}" data-type="clients" title="Delete"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No clients yet. When you convert leads into clients, they will appear here.</td></tr>`;
    }

    setupFilterAndSearch('clientsTable', 'searchClients', 'filterStatus', document.querySelectorAll('.filter-btn'));
    setupActionButtons('clients');
  }

  // =========================================================
  // ACTION BUTTONS (Edit, Delete, Create)
  // =========================================================

  function setupActionButtons(type) {
    // Delete buttons
    document.querySelectorAll(`.btn-delete[data-type="${type}"]`).forEach(btn => {
      btn.addEventListener('click', async function() {
        const id = this.dataset.id;
        if (confirm(`Are you sure you want to delete this ${type.slice(0, -1)}?`)) {
          try {
            await deleteData(type, id);
            showToast(`${type.slice(0, -1)} deleted successfully`);
            // Reload the appropriate page
            reloadPage(type);
          } catch (error) {
            showToast(`Failed to delete ${type.slice(0, -1)}`, 'error');
          }
        }
      });
    });

    // Edit buttons – open modal with data
    document.querySelectorAll(`.btn-edit[data-type="${type}"]`).forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.dataset.id;
        openEditModal(type, id);
      });
    });

    // Add/Create button
    const addBtn = document.getElementById('addBtn');
    if (addBtn) {
      addBtn.addEventListener('click', function() {
        openCreateModal(type);
      });
    }
  }

  // =========================================================
  // RELOAD PAGE HELPER
  // =========================================================

  function reloadPage(type) {
    const loaders = {
      leads: loadLeads,
      inquiries: loadInquiries,
      audits: loadAudits,
      projects: loadProjects,
      reviews: loadReviews,
      testimonials: loadTestimonials,
      clients: loadClients
    };
    if (loaders[type]) loaders[type]();
  }

  // =========================================================
  // EDIT/CREATE MODAL
  // =========================================================

  function openEditModal(type, id) {
    // Simple prompt-based editing for now – can be extended with a proper modal
    const fieldMap = {
      leads: ['business_name', 'contact_name', 'email', 'phone', 'industry', 'website', 'status'],
      inquiries: ['status'],
      audits: ['business_name', 'email', 'industry', 'website', 'status'],
      projects: ['name', 'client_name', 'industry', 'description', 'services', 'is_concept', 'public_visibility'],
      clients: ['business_name', 'contact_name', 'email', 'phone', 'industry', 'website', 'status']
    };

    const fields = fieldMap[type] || [];
    if (fields.length === 0) return;

    // Simple edit: prompt for each field
    // For a production system, you'd want a proper modal
    const row = document.querySelector(`[data-id="${id}"]`);
    if (!row) return;

    const currentValues = {};
    fields.forEach(field => {
      const cell = row.querySelector(`[data-field="${field}"]`);
      if (cell) currentValues[field] = cell.textContent;
    });

    // Build prompt
    let message = `Edit ${type.slice(0, -1)} (ID: ${id})\n\n`;
    let data = {};
    fields.forEach(field => {
      const current = prompt(`Enter ${field.replace('_', ' ')}:`, currentValues[field] || '');
      if (current !== null) data[field] = current;
    });

    if (Object.keys(data).length > 0) {
      updateData(type, id, data).then(() => {
        showToast(`${type.slice(0, -1)} updated successfully`);
        reloadPage(type);
      }).catch(() => {
        showToast(`Failed to update ${type.slice(0, -1)}`, 'error');
      });
    }
  }

  function openCreateModal(type) {
    const fieldMap = {
      leads: ['business_name', 'contact_name', 'email', 'phone', 'industry', 'website', 'status'],
      inquiries: ['name', 'business_name', 'email', 'phone', 'service', 'message'],
      audits: ['business_name', 'website', 'industry', 'email', 'phone', 'goals'],
      projects: ['name', 'client_name', 'industry', 'description', 'services'],
      clients: ['business_name', 'contact_name', 'email', 'phone', 'industry', 'website']
    };

    const fields = fieldMap[type] || [];
    if (fields.length === 0) return;

    let data = {};
    fields.forEach(field => {
      const value = prompt(`Enter ${field.replace('_', ' ')}:`);
      if (value !== null && value.trim() !== '') data[field] = value.trim();
    });

    if (Object.keys(data).length > 0) {
      createData(type, data).then(() => {
        showToast(`${type.slice(0, -1)} created successfully`);
        reloadPage(type);
      }).catch(() => {
        showToast(`Failed to create ${type.slice(0, -1)}`, 'error');
      });
    }
  }

  // =========================================================
  // PAGE ROUTER – Determine which page we're on and load it
  // =========================================================

  const page = window.location.pathname.split('/').pop().replace('.html', '').toLowerCase();

  switch (page) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'leads':
      loadLeads();
      break;
    case 'inquiries':
      loadInquiries();
      break;
    case 'audits':
      loadAudits();
      break;
    case 'projects':
      loadProjects();
      break;
    case 'feedback':
      loadReviews();
      break;
    case 'testimonials':
      loadTestimonials();
      break;
    case 'clients':
      loadClients();
      break;
    default:
      console.log('Admin page:', page || 'dashboard');
      if (!page || page === '') loadDashboard();
  }

  // =========================================================
  // ADD CSS FOR STATUS BADGES
  // =========================================================

  const style = document.createElement('style');
  style.textContent = `
    .status-badge {
      display: inline-block;
      padding: 2px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .status-badge.new { background: #38BDF8; color: #071326; }
    .status-badge.contacted { background: #fbbf24; color: #071326; }
    .status-badge.interested { background: #a78bfa; color: #fff; }
    .status-badge.discovery { background: #60a5fa; color: #fff; }
    .status-badge.proposal { background: #f472b6; color: #fff; }
    .status-badge.quotation { background: #f59e0b; color: #fff; }
    .status-badge.won { background: #34d399; color: #071326; }
    .status-badge.lost { background: #f87171; color: #fff; }
    .status-badge.active { background: #34d399; color: #071326; }
    .status-badge.inactive { background: #9ca3af; color: #fff; }
    .status-badge.approved { background: #34d399; color: #071326; }
    .status-badge.rejected { background: #f87171; color: #fff; }
    .status-badge.archived { background: #9ca3af; color: #fff; }

    .btn-edit, .btn-delete, .btn-approve, .btn-review, .btn-toggle {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: background 0.2s;
      color: var(--text);
      font-size: 0.85rem;
    }
    .btn-edit:hover { background: rgba(56,189,248,0.15); color: var(--sky); }
    .btn-delete:hover { background: rgba(255,82,82,0.15); color: #ff5252; }
    .btn-approve { color: var(--sky); }
    .btn-approve:hover { background: rgba(56,189,248,0.15); }
    .btn-review { color: #fbbf24; }
    .btn-review:hover { background: rgba(251,191,36,0.15); }
    .btn-toggle { color: #a78bfa; }
    .btn-toggle:hover { background: rgba(167,139,250,0.15); }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      opacity: 0.5;
      font-size: 1rem;
    }
    .empty-state i {
      font-size: 2rem;
      display: block;
      margin-bottom: 0.8rem;
      opacity: 0.3;
    }
  `;
  document.head.appendChild(style);

})();