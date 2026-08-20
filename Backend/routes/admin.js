const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const authMiddleware = require('../middleware/auth');

// =========================================================
// All admin routes are protected by authentication
// =========================================================
router.use(authMiddleware);

// =========================================================
// GET /api/admin/leads
// =========================================================
router.get('/leads', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// =========================================================
// GET /api/admin/inquiries
// =========================================================
router.get('/inquiries', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contact_inquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('Error fetching inquiries:', err);
    res.status(500).json({ error: 'Failed to fetch inquiries' });
  }
});

// =========================================================
// GET /api/admin/audits
// =========================================================
router.get('/audits', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('audit_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('Error fetching audits:', err);
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
});

// =========================================================
// GET /api/admin/reviews
// =========================================================
router.get('/reviews', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// =========================================================
// GET /api/admin/projects
// =========================================================
router.get('/projects', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// =========================================================
// GET /api/admin/testimonials
// =========================================================
router.get('/testimonials', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('Error fetching testimonials:', err);
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
});

// =========================================================
// PATCH /api/admin/reviews/:id
// =========================================================
router.patch('/reviews/:id', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'approve', 'reject', 'archive'

  try {
    const update = { status: action };

    if (action === 'approve') {
      update.is_public = true;

      // Fetch the review details to insert into testimonials
      const { data: review, error: fetchError } = await supabase
        .from('reviews')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (review && review.permission_to_publish) {
        // Insert into testimonials table
        const { error: insertError } = await supabase
          .from('testimonials')
          .insert([{
            review_id: id,
            display_name: review.client_name || 'Client',
            business_name: review.business_name,
            quote: review.additional_comments || 'Great service!',
            rating: review.overall_rating,
            is_active: true
          }]);

        if (insertError) throw insertError;
      }
    }

    const { error: updateError } = await supabase
      .from('reviews')
      .update(update)
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({ message: 'Review updated successfully' });
  } catch (err) {
    console.error('Error updating review:', err);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// =========================================================
// POST /api/admin/projects (add new project)
// =========================================================
router.post('/projects', async (req, res) => {
  const {
    name,
    client_name,
    industry,
    description,
    services,
    is_concept,
    public_visibility
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([{
        name,
        client_name,
        industry,
        description,
        services,
        is_concept: is_concept || false,
        public_visibility: public_visibility || false
      }]);

    if (error) throw error;

    res.status(201).json({ message: 'Project added successfully' });
  } catch (err) {
    console.error('Error adding project:', err);
    res.status(500).json({ error: 'Failed to add project' });
  }
});

// =========================================================
// (Optional) POST /api/admin/login – if you want a backend login
// However, login is handled directly by Supabase on the frontend.
// This is kept for completeness, but not required.
// =========================================================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // Return the access token and user info
    res.json({
      token: data.session.access_token,
      user: data.user
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// =========================================================
// (Optional) POST /api/admin/logout – client-side only
// =========================================================
router.post('/logout', (req, res) => {
  // Logout is handled on the client by removing the token.
  // We can just send a success response.
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;