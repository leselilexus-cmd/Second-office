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

// POST /api/admin/leads
// Create a new lead record
router.post('/leads', async (req, res) => {
  try {
    const {
      business_name,
      contact_name,
      email,
      phone,
      industry,
      website,
      source,
      lead_owner,
      status,
      notes
    } = req.body;

    // Validate required fields
    if (!business_name || !email) {
      return res.status(400).json({
        error: 'Business name and email are required.'
      });
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([{
        business_name,
        contact_name,
        email,
        phone,
        industry,
        website,
        source,
        lead_owner,
        status: status || 'new',
        notes
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Lead created successfully',
      lead: data
    });
  } catch (err) {
    console.error('Error creating lead:', err);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// POST /api/admin/leads/:id/convert – Convert a lead to a client
router.post('/leads/:id/convert', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch the lead
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // 2. Check if already converted
    if (lead.converted_to_client) {
      return res.status(400).json({ error: 'Lead already converted to client' });
    }

    // 3. Check if client already exists with same email/business
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('email', lead.email)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'Client with this email already exists' });
    }

    // 4. Create client from lead data
    const { data: client, error: insertError } = await supabase
      .from('clients')
      .insert([{
        business_name: lead.business_name,
        contact_name: lead.contact_name,
        email: lead.email,
        phone: lead.phone,
        industry: lead.industry,
        website: lead.website,
        status: 'active',
        lead_source: 'converted_from_lead',
        notes: `Converted from lead #${lead.id} on ${new Date().toISOString()}`
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    // 5. Mark lead as converted
    await supabase
      .from('leads')
      .update({
        converted_to_client: true,
        converted_client_id: client.id,
        status: 'won'
      })
      .eq('id', id);

    // 6. Log admin action
    await supabase
      .from('admin_actions')
      .insert([{
        admin_id: req.user?.id || null,
        action: 'convert_lead_to_client',
        entity_type: 'leads',
        entity_id: id,
        created_at: new Date().toISOString()
      }]);

    res.json({
      message: 'Lead converted to client successfully',
      client: client,
      lead_id: id
    });

  } catch (err) {
    console.error('Error converting lead to client:', err);
    res.status(500).json({ error: 'Failed to convert lead to client' });
  }
});

// PATCH /api/admin/leads/:id
// Update an existing lead
router.patch('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      business_name,
      contact_name,
      email,
      phone,
      industry,
      website,
      source,
      lead_owner,
      status,
      notes
    } = req.body;

    // Build update object (only include provided fields)
    const updates = {};
    if (business_name !== undefined) updates.business_name = business_name;
    if (contact_name !== undefined) updates.contact_name = contact_name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (industry !== undefined) updates.industry = industry;
    if (website !== undefined) updates.website = website;
    if (source !== undefined) updates.source = source;
    if (lead_owner !== undefined) updates.lead_owner = lead_owner;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    updates.updated_at = new Date().toISOString();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({
      message: 'Lead updated successfully',
      lead: data
    });
  } catch (err) {
    console.error('Error updating lead:', err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE /api/admin/leads/:id
// Delete a lead permanently
router.delete('/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({
      message: 'Lead deleted successfully',
      lead: data
    });
  } catch (err) {
    console.error('Error deleting lead:', err);
    res.status(500).json({ error: 'Failed to delete lead' });
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

// POST /api/admin/inquiries – Create a new contact inquiry
router.post('/inquiries', async (req, res) => {
  try {
    const {
      name,
      business_name,
      email,
      phone,
      service,
      message,
      source,
      status
    } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        error: 'Name, email, and message are required.'
      });
    }

    const { data, error } = await supabase
      .from('contact_inquiries')
      .insert([{
        name,
        business_name,
        email,
        phone,
        service,
        message,
        source,
        status: status || 'new'
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Inquiry created successfully',
      inquiry: data
    });
  } catch (err) {
    console.error('Error creating inquiry:', err);
    res.status(500).json({ error: 'Failed to create inquiry' });
  }
});

// PATCH /api/admin/inquiries/:id – Update inquiry status
router.patch('/inquiries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const updates = {};
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('contact_inquiries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }

    res.json({
      message: 'Inquiry updated successfully',
      inquiry: data
    });
  } catch (err) {
    console.error('Error updating inquiry:', err);
    res.status(500).json({ error: 'Failed to update inquiry' });
  }
});

// DELETE /api/admin/inquiries/:id – Delete inquiry
router.delete('/inquiries/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('contact_inquiries')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }

    res.json({
      message: 'Inquiry deleted successfully',
      inquiry: data
    });
  } catch (err) {
    console.error('Error deleting inquiry:', err);
    res.status(500).json({ error: 'Failed to delete inquiry' });
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

// GET /api/admin/audits (already exists – keep)
// POST /api/admin/audits – Create a new audit request
router.post('/audits', async (req, res) => {
  try {
    const {
      business_name,
      website,
      industry,
      email,
      phone,
      goals,
      status,
      assigned_to
    } = req.body;

    if (!business_name || !email) {
      return res.status(400).json({
        error: 'Business name and email are required.'
      });
    }

    const { data, error } = await supabase
      .from('audit_requests')
      .insert([{
        business_name,
        website,
        industry,
        email,
        phone,
        goals,
        status: status || 'new',
        assigned_to
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Audit request created successfully',
      audit: data
    });
  } catch (err) {
    console.error('Error creating audit:', err);
    res.status(500).json({ error: 'Failed to create audit request' });
  }
});

// PATCH /api/admin/audits/:id – Update an audit
router.patch('/audits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      business_name,
      website,
      industry,
      email,
      phone,
      goals,
      status,
      assigned_to
    } = req.body;

    const updates = {};
    if (business_name !== undefined) updates.business_name = business_name;
    if (website !== undefined) updates.website = website;
    if (industry !== undefined) updates.industry = industry;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (goals !== undefined) updates.goals = goals;
    if (status !== undefined) updates.status = status;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('audit_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    res.json({
      message: 'Audit updated successfully',
      audit: data
    });
  } catch (err) {
    console.error('Error updating audit:', err);
    res.status(500).json({ error: 'Failed to update audit' });
  }
});

// DELETE /api/admin/audits/:id – Delete an audit
router.delete('/audits/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('audit_requests')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Audit not found' });
    }

    res.json({
      message: 'Audit deleted successfully',
      audit: data
    });
  } catch (err) {
    console.error('Error deleting audit:', err);
    res.status(500).json({ error: 'Failed to delete audit' });
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

// POST /api/admin/reviews – Create a new review (if needed manually)
router.post('/reviews', async (req, res) => {
  try {
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
      permission_to_publish,
      status
    } = req.body;

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
        permission_to_publish: permission_to_publish || false,
        is_public: false,
        status: status || 'new'
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Review created successfully',
      review: data
    });
  } catch (err) {
    console.error('Error creating review:', err);
    res.status(500).json({ error: 'Failed to create review' });
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

// DELETE /api/admin/reviews/:id – Delete a review
router.delete('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({
      message: 'Review deleted successfully',
      review: data
    });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ error: 'Failed to delete review' });
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

// PATCH /api/admin/projects/:id – Update a project
router.patch('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      client_name,
      industry,
      description,
      services,
      is_concept,
      public_visibility,
      featured
    } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (client_name !== undefined) updates.client_name = client_name;
    if (industry !== undefined) updates.industry = industry;
    if (description !== undefined) updates.description = description;
    if (services !== undefined) updates.services = services;
    if (is_concept !== undefined) updates.is_concept = is_concept;
    if (public_visibility !== undefined) updates.public_visibility = public_visibility;
    if (featured !== undefined) updates.featured = featured;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      message: 'Project updated successfully',
      project: data
    });
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/admin/projects/:id – Delete a project
router.delete('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      message: 'Project deleted successfully',
      project: data
    });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ error: 'Failed to delete project' });
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

// POST /api/admin/testimonials – Create a new testimonial
router.post('/testimonials', async (req, res) => {
  try {
    const {
      display_name,
      business_name,
      quote,
      rating,
      image_url,
      is_active
    } = req.body;

    if (!display_name || !quote) {
      return res.status(400).json({
        error: 'Display name and quote are required.'
      });
    }

    const { data, error } = await supabase
      .from('testimonials')
      .insert([{
        display_name,
        business_name,
        quote,
        rating,
        image_url,
        approved_by: req.user?.email || 'Admin',
        approved_at: new Date().toISOString(),
        is_active: is_active !== undefined ? is_active : true
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Testimonial created successfully',
      testimonial: data
    });
  } catch (err) {
    console.error('Error creating testimonial:', err);
    res.status(500).json({ error: 'Failed to create testimonial' });
  }
});

// PATCH /api/admin/testimonials/:id – Update testimonial
router.patch('/testimonials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      display_name,
      business_name,
      quote,
      rating,
      image_url,
      is_active
    } = req.body;

    const updates = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (business_name !== undefined) updates.business_name = business_name;
    if (quote !== undefined) updates.quote = quote;
    if (rating !== undefined) updates.rating = rating;
    if (image_url !== undefined) updates.image_url = image_url;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('testimonials')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }

    res.json({
      message: 'Testimonial updated successfully',
      testimonial: data
    });
  } catch (err) {
    console.error('Error updating testimonial:', err);
    res.status(500).json({ error: 'Failed to update testimonial' });
  }
});


// DELETE /api/admin/testimonials/:id – Delete testimonial
router.delete('/testimonials/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }

    res.json({
      message: 'Testimonial deleted successfully',
      testimonial: data
    });
  } catch (err) {
    console.error('Error deleting testimonial:', err);
    res.status(500).json({ error: 'Failed to delete testimonial' });
  }
});

// =========================================================
// CLIENTS (Derived from leads and projects) – GET only
// =========================================================
// GET /api/admin/clients – Get all clients from clients table
router.get('/clients', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      clients: data || [],
      total: data?.length || 0
    });
  } catch (err) {
    console.error('Error fetching clients:', err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// POST /api/admin/clients – Create a new client
router.post('/clients', async (req, res) => {
  try {
    const {
      business_name,
      contact_name,
      email,
      phone,
      industry,
      website,
      address,
      notes,
      status,
      lead_source
    } = req.body;

    if (!business_name) {
      return res.status(400).json({
        error: 'Business name is required.'
      });
    }

    const { data, error } = await supabase
      .from('clients')
      .insert([{
        business_name,
        contact_name,
        email,
        phone,
        industry,
        website,
        address,
        notes,
        status: status || 'active',
        lead_source,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Log admin action
    await supabase
      .from('admin_actions')
      .insert([{
        admin_id: req.user?.id || null,
        action: 'create_client',
        entity_type: 'clients',
        entity_id: data.id,
        created_at: new Date().toISOString()
      }]);

    res.status(201).json({
      message: 'Client created successfully',
      client: data
    });
  } catch (err) {
    console.error('Error creating client:', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// PATCH /api/admin/clients/:id – Update a client
router.patch('/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      business_name,
      contact_name,
      email,
      phone,
      industry,
      website,
      address,
      notes,
      status,
      lead_source
    } = req.body;

    const updates = {};
    if (business_name !== undefined) updates.business_name = business_name;
    if (contact_name !== undefined) updates.contact_name = contact_name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (industry !== undefined) updates.industry = industry;
    if (website !== undefined) updates.website = website;
    if (address !== undefined) updates.address = address;
    if (notes !== undefined) updates.notes = notes;
    if (status !== undefined) updates.status = status;
    if (lead_source !== undefined) updates.lead_source = lead_source;
    updates.updated_at = new Date().toISOString();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Log admin action
    await supabase
      .from('admin_actions')
      .insert([{
        admin_id: req.user?.id || null,
        action: 'update_client',
        entity_type: 'clients',
        entity_id: data.id,
        created_at: new Date().toISOString()
      }]);

    res.json({
      message: 'Client updated successfully',
      client: data
    });
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// DELETE /api/admin/clients/:id – Delete a client
router.delete('/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if client exists
    const { data: existing, error: checkError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const { data, error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log admin action
    await supabase
      .from('admin_actions')
      .insert([{
        admin_id: req.user?.id || null,
        action: 'delete_client',
        entity_type: 'clients',
        entity_id: id,
        created_at: new Date().toISOString()
      }]);

    res.json({
      message: 'Client deleted successfully',
      client: data
    });
  } catch (err) {
    console.error('Error deleting client:', err);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// =========================================================
// ADMIN ACTIONS (Audit Trail) – GET only
// =========================================================

// GET /api/admin/actions – Get admin action log
router.get('/actions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('admin_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    console.error('Error fetching admin actions:', err);
    res.status(500).json({ error: 'Failed to fetch admin actions' });
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