const express = require('express');
const router = express.Router();
const adminAuth = require('../../middleware/adminAuth');
const User = require('../../models/User');
const Trade = require('../../models/Trade');
const AccessCode = require('../../models/AccessCode');

// Dashboard stats
router.get('/dashboard', adminAuth, async (req, res) => {
    try {
        const [totalUsers, activeUsers, totalTrades, accessCodes] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ 'pocketOptionConnection.isConnected': true }),
            Trade.countDocuments(),
            AccessCode.countDocuments({ isActive: true })
        ]);

        // Recent users
        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('email fullName createdAt pocketOptionConnection stats');

        // Recent trades
        const recentTrades = await Trade.find()
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('user', 'email');

        // Get session stats
        const sessionManager = req.app.get('sessionManager');
        const sessionStats = sessionManager.getStats();

        // Get trading stats
        const tradingEngine = req.app.get('tradingEngine');
        const tradingStats = tradingEngine.getStats ? tradingEngine.getStats() : { placed: 0, errors: 0 };

        res.json({
            success: true,
            stats: {
                totalUsers,
                activeUsers,
                totalTrades,
                accessCodes,
                sessions: {
                    ...sessionStats,
                    activeUserIds: Array.from(sessionManager.sessions.keys())
                },
                trading: tradingStats
            },
            recentUsers,
            recentTrades
        });

    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create access code
router.post('/access-codes/create', adminAuth, async (req, res) => {
    try {
        const { maxUses = 1, expiresInHours, notes } = req.body;

        // Generate code
        const code = AccessCode.generateCode();

        // Calculate expiry
        let expiresAt = null;
        if (expiresInHours) {
            expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + parseInt(expiresInHours));
        }

        // Create access code
        const accessCode = new AccessCode({
            code,
            createdBy: req.user._id,
            usage: { maxUses: parseInt(maxUses) },
            expiresAt,
            notes,
            isActive: true
        });

        await accessCode.save();

        res.json({
            success: true,
            message: 'Access code created',
            accessCode: {
                code,
                maxUses: accessCode.usage.maxUses,
                expiresAt: accessCode.expiresAt,
                notes: accessCode.notes
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List access codes
router.get('/access-codes', adminAuth, async (req, res) => {
    try {
        const accessCodes = await AccessCode.find()
            .populate('createdBy', 'email')
            .populate('usage.users', 'email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            accessCodes
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List users
router.get('/users', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const skip = (page - 1) * limit;

        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await User.countDocuments();

        res.json({
            success: true,
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user status
router.put('/users/:userId', adminAuth, async (req, res) => {
    try {
        const { isActive } = req.body;

        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { isActive },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // If deactivating, close their session
        if (!isActive) {
            const sessionManager = req.app.get('sessionManager');
            await sessionManager.closeSession(user._id.toString());
        }

        res.json({
            success: true,
            message: `User ${isActive ? 'activated' : 'deactivated'}`,
            user
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// System control
router.post('/system/restart-sessions', adminAuth, async (req, res) => {
    try {
        const sessionManager = req.app.get('sessionManager');
        await sessionManager.closeAll();

        res.json({
            success: true,
            message: 'All browser sessions restarted'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create New Admin
router.post('/create-admin', adminAuth, async (req, res) => {
    try {
        const { email, fullName, password: providedPassword } = req.body;

        if (!email || !fullName) {
            return res.status(400).json({ error: 'Email and Name are required' });
        }

        // Check if exists
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const crypto = require('crypto');
        const password = providedPassword || crypto.randomBytes(8).toString('hex');

        const newAdmin = new User({
            email,
            password,
            fullName,
            accessCode: 'ADMIN-' + Date.now(), // Dummy code for admins
            role: 'admin',
            isAdmin: true
        });

        await newAdmin.save();

        res.json({
            success: true,
            message: 'New Admin created successfully',
            admin: { email: newAdmin.email, role: newAdmin.role, password }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;