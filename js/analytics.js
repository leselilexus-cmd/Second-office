// Custom event helpers
function trackEvent(eventName, params) {
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, params || {});
  }
}

// WhatsApp clicks
document.querySelectorAll('a[href*="wa.me"]').forEach(function(link) {
  link.addEventListener('click', function() {
    trackEvent('whatsapp_click');
  });
});

// Package clicks
document.querySelectorAll('.package-card .btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    const pkg = this.closest('.package-card')?.querySelector('h3')?.textContent || 'unknown';
    trackEvent('package_select', { package: pkg });
  });
});