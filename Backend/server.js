require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

console.log('adminRoutes type:', typeof adminRoutes);
console.log('adminRoutes:', adminRoutes);

const supabase = require('./services/supabase');
const app = express();
const PORT = process.env.PORT || 5000;

//supabase
app.get('/api/test-supabase', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('contact_inquiries')
            .select('id')
            .limit(1);

        if (error) {
            console.error('Supabase error:', error);

            return res.status(500).json({
                success: false,
                message: error.message
            });
        }

        res.json({
            success: true,
            message: 'Supabase connection is working.',
            data
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
});
app.use('/api/', limiter);

// Routes
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`Second Office backend running on port ${PORT}`);
});