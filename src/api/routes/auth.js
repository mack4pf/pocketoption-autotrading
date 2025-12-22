const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const AccessCode = require('../../models/AccessCode');

// Register with access code
router.post('/register', async (req, res) => {
    try {
        const { email, password, fullName, accessCode } = req.body;

        // Validate access code
        const code = await AccessCode.findOne({ code: accessCode.toUpperCase() });
        if (!code || !code.isValid()) {
            return res.status(400).json({
                error: 'Invalid or expired access code'
            });
        }

        // Check if email exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                error: 'Email already registered'
            });
        }

        // Create user
        const user = new User({
            email,
            password,
            fullName,
            accessCode: code.code
        });

        await user.save();

        // Mark code as used
        await code.useForUser(user._id);

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
            return res.status(503).json({
                error: 'Database connection timeout. This often happens if your IP address is not whitelisted in MongoDB Atlas.'
            });
        }
        res.status(500).json({ error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(403).json({ error: 'Account disabled' });
        }

        // Update last login
        user.lastLogin = new Date();
        if (!user.fullName) user.fullName = 'Valued User'; // Fix for legacy users
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                apiKey: user.apiKey,
                isActive: user.isActive,
                isAdmin: user.isAdmin,
                role: user.role,
                pocketOptionConnection: user.pocketOptionConnection,
                stats: user.stats
            },
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
            return res.status(503).json({
                error: 'Database connection timeout. Please ensure your IP is whitelisted in MongoDB Atlas and the database is accessible.'
            });
        }
        res.status(500).json({ error: error.message });
    }
});

// Verify API key
router.post('/verify-api', async (req, res) => {
    try {
        const { apiKey } = req.body;

        const user = await User.findOne({ apiKey });
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                email: user.email,
                isActive: user.isActive
            }
        });

    } catch (error) {
        console.error('API Verification error:', error);
        if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
            return res.status(503).json({
                error: 'Database unavailable.'
            });
        }
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;