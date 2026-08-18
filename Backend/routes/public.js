const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');

// POST /api/contact
router.post('/contact', async (req, res) => {
  const { name, business, email, phone, service, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const { data, error } = await supabase
    .from('contact_inquiries')
    .insert([{ name, business_name: business, email, phone, service, message, status: 'new' }]);
  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database error' });
  }
  res.status(201).json({ message: 'Inquiry received' });
});

// POST /api/audit
router.post('/audit', async (req, res) => {
  const { business_name, website, industry, phone, email, goals } = req.body;
  if (!business_name || !website || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const { data, error } = await supabase
    .from('audit_requests')
    .insert([{ business_name, website, industry, phone, email, goals, status: 'new' }]);
  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database error' });
  }
  res.status(201).json({ message: 'Audit request received' });
});

// GET /api/projects/public
router.get('/projects/public', async (req, res) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('public_visibility', true);
  if (error) return res.status(500).json({ error });
  res.json(data);
});

// GET /api/testimonials/public
router.get('/testimonials/public', async (req, res) => {
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .eq('is_active', true);
  if (error) return res.status(500).json({ error });
  res.json(data);
});

module.exports = router;