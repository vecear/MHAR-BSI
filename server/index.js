const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const { initializeDatabase } = require('./db/database');
const authRoutes = require('./routes/auth');
const formRoutes = require('./routes/forms');
const userRoutes = require('./routes/users');
const exportRoutes = require('./routes/export');
const deleteRequestRoutes = require('./routes/delete-requests');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Initialize database
initializeDatabase();

// Middleware
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
    origin: isProduction ? true : corsOrigin,
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Trust proxy for Render.com (required for secure cookies)
if (isProduction) {
    app.set('trust proxy', 1);
}

app.use(session({
    secret: process.env.SESSION_SECRET || 'mhar-bsi-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: isProduction ? 'none' : 'lax'
    }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/users', userRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/delete-requests', deleteRequestRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (isProduction) {
    const clientBuildPath = path.join(__dirname, '../client/dist');
    app.use(express.static(clientBuildPath));

    // Handle client-side routing - serve index.html for all non-API routes
    app.get('*', (req, res) => {
        res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: '伺服器錯誤' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (!isProduction) {
        console.log('Default admin credentials: username=admin, password=admin123');
    }
});
