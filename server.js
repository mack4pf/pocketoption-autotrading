const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import core systems
const BrowserSessionManager = require('./src/core/BrowserSessionManager');
const TradingEngine = require('./src/core/TradingEngine');
const MartingaleEngine = require('./src/core/MartingaleEngine');

// Import routes
const authRoutes = require('./src/api/routes/auth');
const userRoutes = require('./src/api/routes/users');
const tradeRoutes = require('./src/api/routes/trades');
const adminRoutes = require('./src/api/routes/admin');
const signalRoutes = require('./src/api/routes/signals');

// Import models
const User = require('./src/models/User');

// Initialize app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Robust Static File Serving
const frontendPath = path.join(__dirname, 'frontend', 'dist');
console.log(`📦 Serving frontend from: ${frontendPath}`);
app.use(express.static(frontendPath));

// Handle React Routing, return all requests to React app
app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.url.startsWith('/api') || req.url.startsWith('/socket.io')) {
        return next();
    }

    const indexPath = path.join(__dirname, 'frontend', 'dist', 'index.html');

    // Check if file exists to avoid ugly 404s
    const fs = require('fs');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({
            error: 'Frontend build not found',
            message: 'Please ensure "npm run build" has completed successfully.',
            checked_path: indexPath
        });
    }
});

// Initialize Engines
const sessionManager = new BrowserSessionManager();
const martingaleEngine = new MartingaleEngine();
const tradingEngine = new TradingEngine(sessionManager, martingaleEngine);

// Make them available to routes
app.set('sessionManager', sessionManager);
app.set('tradingEngine', tradingEngine);
app.set('martingaleEngine', martingaleEngine);

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Socket.io with CORS
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/signals', signalRoutes);



// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'running',
        timestamp: new Date(),
        sessions: sessionManager.getStats(),
        users: { total: 0 } // Will implement
    });
});

// WebSocket for real-time updates
io.on('connection', (socket) => {
    console.log(`🔌 New connection: ${socket.id}`);

    // User authentication
    socket.on('authenticate', async (data) => {
        try {
            const { token } = data;
            // Verify token and get user
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);

            if (!user) {
                socket.emit('auth_error', 'User not found');
                return;
            }

            socket.userId = user._id.toString();
            socket.join(`user:${user._id}`);

            socket.emit('authenticated', {
                user: {
                    id: user._id,
                    email: user.email,
                    isConnected: user.pocketOptionConnection?.isConnected || false
                }
            });

        } catch (error) {
            socket.emit('auth_error', error.message);
        }
    });

    // Admin connection
    socket.on('admin_join', (data) => {
        if (data.secret === process.env.ADMIN_SECRET) {
            socket.join('admin');
            socket.emit('admin_connected', { message: 'Welcome admin' });
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Disconnected: ${socket.id}`);
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`
    🚀 NielsAutoTrade-PO Server Started!
    =====================================
    📍 Port: ${PORT}
    🌐 Environment: ${process.env.NODE_ENV}
    🗄️  Database: ${process.env.MONGODB_URI}
    🤖 Session Manager: Ready
    🔌 WebSocket: Ready
    =====================================
    `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');

    // Close all browser sessions
    await sessionManager.closeAll();

    // Close server
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = { app, server };