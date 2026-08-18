(function() {
  const toggle = document.getElementById('themeToggle');
  const icon = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  const body = document.body;

  function setTheme(theme) {
    body.setAttribute('data-theme', theme);
    localStorage.setItem('so-theme', theme);
    if (theme === 'night') {
      if (icon) icon.className = 'fas fa-moon';
      if (label) label.textContent = 'AFTER HOURS';
    } else {
      if (icon) icon.className = 'fas fa-sun';
      if (label) label.textContent = 'WORK HOURS';
    }
  }

  const saved = localStorage.getItem('so-theme') || 'day';
  setTheme(saved);

  if (toggle) {
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      const current = body.getAttribute('data-theme') || 'day';
      setTheme(current === 'day' ? 'night' : 'day');
      if (typeof gtag !== 'undefined') {
        gtag('event', 'theme_switch', { theme: current === 'day' ? 'night' : 'day' });
      }
    });
  }
})();