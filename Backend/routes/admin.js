(function() {
  // --- Authentication check ---
  if (window.location.pathname.includes('/admin/') && !window.location.pathname.includes('login.html')) {
    if (!localStorage.getItem('admin_logged_in')) {
      window.location.href = 'login.html';
    }
  }

  // --- Logout ---
  const logoutBtn = document.getElementById('adminLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      localStorage.removeItem('admin_logged_in');
      window.location.href = 'login.html';
    });
  }

  // --- Login form ---
  const loginForm = document.getElementById('adminLogin');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const email = document.getElementById('adminEmail').value;
      const password = document.getElementById('adminPassword').value;
      const msg = document.getElementById('loginMessage');
      if (email && password) {
        localStorage.setItem('admin_logged_in', 'true');
        window.location.href = 'dashboard.html';
      } else {
        if (msg) { msg.style.display = 'block'; msg.className = 'form-message error'; msg.textContent = 'Invalid credentials.'; }
      }
    });
  }

  // --- Helper: fetch data from API ---
  async function fetchData(endpoint) {
    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch(`/api/admin/${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch (err) {
      console.warn('Could not fetch', endpoint, err);
      return null;
    }
  }

  // --- Dashboard stats ---
  async function loadDashboard() {
    const leads = await fetchData('leads') || [];
    const inquiries = await fetchData('inquiries') || [];
    const audits = await fetchData('audits') || [];
    const feedback = await fetchData('reviews') || [];
    const projects = await fetchData('projects') || [];

    document.getElementById('statLeads').textContent = leads.length;
    document.getElementById('statInquiries').textContent = inquiries.length;
    document.getElementById('statAudits').textContent = audits.length;
    document.getElementById('statFeedback').textContent = feedback.length;
    document.getElementById('statProjects').textContent = projects.length;

    const activityDiv = document.getElementById('recentActivity');
    if (activityDiv) {
      const all = [
        ...leads.map(l => ({ text: `New lead: ${l.business_name || 'Unknown'}`, date: l.created_at })),
        ...inquiries.map(i => ({ text: `New inquiry from ${i.name || 'Unknown'}`, date: i.created_at })),
        ...audits.map(a => ({ text: `Audit request from ${a.business_name || 'Unknown'}`, date: a.created_at })),
        ...feedback.map(f => ({ text: `Feedback received from ${f.client_name || 'Client'}`, date: f.created_at })),
      ];
      all.sort((a,b) => new Date(b.date) - new Date(a.date));
      if (all.length === 0) {
        activityDiv.innerHTML = `<p class="empty-state">No activity yet. As you receive inquiries, audit requests, and feedback, they will appear here.</p>`;
      } else {
        const list = all.slice(0, 10).map(item => `<li>${item.text} – ${new Date(item.date).toLocaleDateString()}</li>`).join('');
        activityDiv.innerHTML = `<ul style="list-style:none;">${list}</ul>`;
      }
    }
  }

  // --- Filter and Search functionality ---
  function setupFilterAndSearch(tableId, searchInputId, filterSelectId, filterButtons) {
    const table = document.getElementById(tableId);
    const searchInput = document.getElementById(searchInputId);
    const filterSelect = document.getElementById(filterSelectId);
    if (!table) return;

    function filterTable() {
      const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
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

      // Show empty state if no results
      const emptyRow = table.querySelector('.empty-state')?.closest('tr');
      if (emptyRow) {
        emptyRow.style.display = visibleCount === 0 ? '' : 'none';
      }
    }

    if (searchInput) searchInput.addEventListener('input', filterTable);
    if (filterSelect) filterSelect.addEventListener('change', filterTable);

    // Filter buttons
    if (filterButtons) {
      filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
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

  // --- Load page-specific data ---
  const page = window.location.pathname.split('/').pop().replace('.html', '');
  if (page === 'dashboard') {
    loadDashboard();
  } else if (page === 'leads') {
    fetchData('leads').then(data => {
      const tbody = document.querySelector('#leadsTable tbody');
      if (data && data.length > 0) {
        tbody.innerHTML = data.map(l => `
          <tr data-status="${l.status || 'new'}">
            <td>${l.business_name || ''}</td>
            <td>${l.contact_name || ''}</td>
            <td>${l.email || ''}</td>
            <td><span style="background:var(--sky);color:#071326;padding:2px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">${l.status || 'new'}</span></td>
            <td>${new Date(l.created_at).toLocaleDateString()}</td>
          </tr>
        `).join('');
      } else {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No leads yet. When prospects submit the audit form or contact form, they will appear here.</td></tr>`;
      }
      setupFilterAndSearch('leadsTable', 'searchLeads', 'filterStatus', document.querySelectorAll('.filter-btn'));
    });
  } else if (page === 'inquiries') {
    fetchData('inquiries').then(data => {
      const tbody = document.querySelector('#inquiriesTable tbody');
      if (data && data.length > 0) {
        tbody.innerHTML = data.map(i => `
          <tr data-status="${i.status || 'new'}">
            <td>${i.name || ''}</td>
            <td>${i.business_name || ''}</td>
            <td>${i.service || ''}</td>
            <td><span style="background:var(--sky);color:#071326;padding:2px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">${i.status || 'new'}</span></td>
            <td>${new Date(i.created_at).toLocaleDateString()}</td>
          </tr>
        `).join('');
      } else {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No inquiries yet. When someone submits the contact form, they will appear here.</td></tr>`;
      }
      setupFilterAndSearch('inquiriesTable', 'searchInquiries', 'filterStatus', document.querySelectorAll('.filter-btn'));
    });
  } else if (page === 'feedback') {
    fetchData('reviews').then(data => {
      const container = document.getElementById('feedbackList');
      if (data && data.length > 0) {
        container.innerHTML = data.map(f => `
          <div class="feedback-item">
            <strong>${f.client_name || 'Anonymous'}</strong> – ${f.business_name || ''}<br/>
            Rating: ${f.overall_rating || 'N/A'}/5<br/>
            <em>${f.additional_comments || ''}</em><br/>
            <span style="opacity:0.6;">Status: ${f.status || 'new'} | Public: ${f.is_public ? 'Yes' : 'No'}</span>
          </div>
        `).join('');
      } else {
        container.innerHTML = `<p class="empty-state">No client feedback yet. After clients submit the feedback form, their private reviews will appear here.</p>`;
      }
    });
  } else if (page === 'projects') {
    fetchData('projects').then(data => {
      const container = document.getElementById('projectList');
      if (data && data.length > 0) {
        container.innerHTML = data.map(p => `
          <div style="border-bottom:1px solid var(--border); padding:1rem 0;">
            <strong>${p.name || 'Unnamed'}</strong> – ${p.industry || ''}<br/>
            ${p.is_concept ? '🔹 CONCEPT PROJECT' : '✅ Real Client Work'}<br/>
            ${p.description || ''}
          </div>
        `).join('');
      } else {
        container.innerHTML = `<p class="empty-state">No projects yet. When you add real client projects or concept projects, they will appear here. Remember to label concept projects clearly.</p>`;
      }
    });
  } else if (page === 'clients') {
    Promise.all([fetchData('leads'), fetchData('projects')]).then(([leads, projects]) => {
      const tbody = document.querySelector('#clientsTable tbody');
      const clientMap = new Map();
      if (leads) leads.forEach(l => {
        if (l.business_name && !clientMap.has(l.business_name)) {
          clientMap.set(l.business_name, { business: l.business_name, contact: l.contact_name || '', email: l.email || '', projects: 0 });
        }
      });
      if (projects) projects.forEach(p => {
        if (p.client_name && !clientMap.has(p.client_name)) {
          clientMap.set(p.client_name, { business: p.client_name, contact: '', email: '', projects: 1 });
        } else if (p.client_name) {
          const existing = clientMap.get(p.client_name);
          if (existing) existing.projects += 1;
        }
      });
      const clients = Array.from(clientMap.values());
      if (clients.length > 0) {
        tbody.innerHTML = clients.map(c => `
          <tr><td>${c.business}</td><td>${c.contact}</td><td>${c.email}</td><td>${c.projects}</td></tr>
        `).join('');
      } else {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No clients yet. When you convert leads into projects, they will appear here.</td></tr>`;
      }
    });
  } else if (page === 'testimonials') {
    fetchData('testimonials').then(data => {
      const container = document.getElementById('testimonialList');
      if (data && data.length > 0) {
        container.innerHTML = data.map(t => `
          <div style="border-bottom:1px solid var(--border); padding:1rem 0;">
            <strong>${t.display_name || 'Anonymous'}</strong> – ${t.business_name || ''}<br/>
            <em>"${t.quote || ''}"</em><br/>
            Rating: ${t.rating || 'N/A'}/5
          </div>
        `).join('');
      } else {
        container.innerHTML = `<p class="empty-state">No approved testimonials yet. Once you receive client feedback, review it, and approve it for publication, it will appear here.</p>`;
      }
    });
  }
})();