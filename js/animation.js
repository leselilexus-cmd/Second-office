(function() {
  const cards = document.querySelectorAll('.card, .package-card, .tech-category');
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.15 });

  cards.forEach(function(c) {
    c.style.opacity = '0.8';
    c.style.transform = 'translateY(12px)';
    c.style.transition = 'all 0.5s ease';
    observer.observe(c);
  });
})();