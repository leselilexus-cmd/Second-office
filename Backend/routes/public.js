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
  console.error('Supabase contact error:', error);

  return res.status(500).json({
    error: error.message,
    details: error.details,
    hint: error.hint
  });
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

// POST /api/feedback
router.post('/feedback', async (req, res) => {
    const {
        client_name,
        business_name,
        service,
        overall_rating,
        communication_rating,
        quality_rating,
        timeliness_rating,
        value_rating,
        liked_most,
        improvement,
        additional_comments,
        permission_to_publish
    } = req.body;

    if (!business_name || !service || !overall_rating) {
        return res.status(400).json({
            error: 'Missing required fields'
        });
    }

    const { data, error } = await supabase
        .from('reviews')
        .insert([{
            client_name,
            business_name,
            service,
            overall_rating,
            communication_rating,
            quality_rating,
            timeliness_rating,
            value_rating,
            liked_most,
            improvement,
            additional_comments,
            permission_to_publish: Boolean(permission_to_publish),
            is_public: false,
            status: 'new'
        }]);

    if (error) {
        console.error('Supabase feedback error:', error);

        return res.status(500).json({
            error: error.message,
            details: error.details,
            hint: error.hint
        });
    }

    res.status(201).json({
        message: 'Feedback received'
    });
});

// GET /api/projects/public
router.get('/projects/public', async (req, res) => {
  const { data, error } = await supabase
    .from('projects')
    .insert([{id, title, slug, description, category, services, client_name, status: 'new', created_at, publicity}])
    .eq('public_visibility', true);
  if (error) return res.status(500).json({ error });
  res.json(data);
});

// GET /api/testimonials/public
router.get('/testimonials/public', async (req, res) => {
  const { data, error } = await supabase
    .from('testimonials')
    .insert([{id, client_name, company_name, client_role, content, rating, project_id, is_active, featured, status: 'new', created_at}])
    .eq('is_active', true);
  if (error) return res.status(500).json({ error });
  res.json(data);
});

module.exports = router;