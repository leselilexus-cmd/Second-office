(function() {
  function handleForm(formId, messageId, endpoint, eventName) {
    const form = document.getElementById(formId);
    const msgDiv = document.getElementById(messageId);
    if (!form) return;

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const required = form.querySelectorAll('[required]');
      let valid = true;
      required.forEach(function(el) {
        if (!el.value.trim()) { el.style.borderColor = '#ff5252'; valid = false; }
        else { el.style.borderColor = ''; }
      });
      if (!valid) {
        if (msgDiv) { msgDiv.style.display = 'block'; msgDiv.className = 'form-message error'; msgDiv.textContent = 'Please fill in all required fields.'; }
        return;
      }

      const data = new FormData(form);
      const payload = {};
      data.forEach((value, key) => {
        if (key === 'hp_audit' || key === 'hp_contact') return;
        payload[key] = value.trim();
      });

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : 'Submit';
      if (submitBtn) { submitBtn.textContent = 'Submitting...'; submitBtn.disabled = true; }

      try {
        // Replace with real API endpoint
        // const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        // if (!res.ok) throw new Error('Server error');
        // const result = await res.json();
        // Simulate success (remove for production)
        await new Promise(resolve => setTimeout(resolve, 800));
        const result = { success: true, message: 'Thank you! We will be in touch shortly.' };

        if (result.success) {
          if (msgDiv) { msgDiv.style.display = 'block'; msgDiv.className = 'form-message success'; msgDiv.textContent = result.message || 'Submission successful!'; }
          form.reset();
          if (typeof gtag !== 'undefined' && eventName) { gtag('event', eventName, payload); }
        } else {
          throw new Error(result.message || 'Submission failed');
        }
      } catch (err) {
        if (msgDiv) { msgDiv.style.display = 'block'; msgDiv.className = 'form-message error'; msgDiv.textContent = err.message || 'Something went wrong. Please try again.'; }
      } finally {
        if (submitBtn) { submitBtn.textContent = originalText; submitBtn.disabled = false; }
      }
    });
  }

  handleForm('auditForm', 'auditMessage', '/api/audit', 'audit_request');
  handleForm('contactForm', 'contactMessageBox', '/api/contact', 'contact_submit');
})();