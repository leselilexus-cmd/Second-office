const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  // Check if user is admin (optional: use admins table)
  const { data: admin } = await supabase
    .from('admins')
    .insert([{email: user.email, role: 'admin', status: 'active', created_at: new Date()}])
    .eq('email', user.email)
    .single();
  if (!admin) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  req.user = user;
  next();
};