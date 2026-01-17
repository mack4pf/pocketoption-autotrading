const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const User = require('../../models/User');

/**
 * @route   POST /api/users/connect-pocketoption/login
 * @desc    Automated login with user's Pocket Option credentials
 */
router.post('/connect-pocketoption/login', auth, async (req, res) => {
    try {
        const user = req.user;
        const { email, password, accountType } = req.body;
        const sessionManager = req.app.get('sessionManager');

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        const selectedAccountType = (accountType || 'DEMO').toUpperCase();
        if (!['DEMO', 'REAL'].includes(selectedAccountType)) {
            return res.status(400).json({
                success: false,
                error: 'Account type must be either DEMO or REAL'
            });
        }

        console.log(`🔐 Starting automated login for: ${user.email} → PO Account: ${email}`);

        // Create browser session if not exists
        let session = sessionManager.sessions.get(user._id.toString());
        if (!session) {
            console.log('📱 Creating new browser session...');
            session = await sessionManager.createSession(user._id.toString());
        }

        // Perform automated login with captcha solving
        const result = await sessionManager.loginWithCredentials(
            user._id.toString(),
            email,
            password,
            selectedAccountType
        );

        // Update user status (not verified yet - user needs to click verify)
        await User.findByIdAndUpdate(user._id, {
            'pocketOptionConnection': {
                isConnected: false, // Not verified yet
                connectionDate: new Date(),
                lastActivity: new Date(),
                browserSessionId: `session_${user._id}`,
                accountType: result.accountType.toLowerCase(),
                verified: false // User needs to click verify button
            }
        });

        res.json({
            success: true,
            message: '✅ Login completed! Please click "Verify Connection" to confirm.',
            accountType: result.accountType,
            needsVerification: true
        });

    } catch (error) {
        console.error('❌ Automated login error:', error);

        res.status(500).json({
            success: false,
            error: 'Login failed',
            message: error.message
        });
    }
});

/**
 * @route   POST /api/users/connect-pocketoption/verify
 * @desc    Verify connection status - Returns modal-friendly response
 */
router.post('/connect-pocketoption/verify', auth, async (req, res) => {
    try {
        const user = req.user;
        const sessionManager = req.app.get('sessionManager');

        console.log(`🔍 Verifying connection for user: ${user.email}`);

        // Check if session exists
        const session = sessionManager.sessions.get(user._id.toString());
        if (!session) {
            return res.json({
                success: false,
                status: 'not_connected',
                title: 'Not Connected',
                message: 'No active browser session found. Please login first.',
                modalType: 'error'
            });
        }

        // Check if user is on trading page
        const isOnTradingPage = await sessionManager.isOnTradingPage(user._id.toString());

        if (!isOnTradingPage) {
            const currentUrl = session?.page?.url() || 'Unknown';

            return res.json({
                success: false,
                status: 'not_ready',
                title: 'Connection Failed',
                message: 'Browser is not on the trading page yet. Please wait for login to complete.',
                currentUrl,
                modalType: 'warning'
            });
        }

        // Success - User is on trading page
        const currentUrl = session.page.url();
        const isDemo = currentUrl.includes('demo');
        const accountType = isDemo ? 'demo' : 'real';

        // Update user connection status in DB
        await User.findByIdAndUpdate(user._id, {
            'pocketOptionConnection': {
                isConnected: true,
                connectionDate: new Date(),
                lastActivity: new Date(),
                browserSessionId: `session_${user._id}`,
                tradingPageUrl: currentUrl,
                accountType,
                verified: true
            },
            'tradingSettings.isAutoTrading': true // AUTO-ENABLE
        });

        console.log(`✅ Verified: ${user.email} → ${accountType.toUpperCase()} account`);

        res.json({
            success: true,
            status: 'connected',
            title: `Connected to ${accountType.toUpperCase()} Account`,
            message: `Your browser is connected and ready for auto-trading on ${isDemo ? 'DEMO' : 'REAL'} account.`,
            connection: {
                isConnected: true,
                accountType,
                tradingUrl: currentUrl
            },
            modalType: 'success'
        });

    } catch (error) {
        console.error('❌ Connection verify error:', error);
        res.json({
            success: false,
            status: 'error',
            title: 'Verification Error',
            message: `Failed to verify connection: ${error.message}`,
            modalType: 'error'
        });
    }
});

/**
 * @route   POST /api/users/connect-pocketoption/disconnect
 * @desc    Close the browser session and mark user as disconnected
 */
router.post('/connect-pocketoption/disconnect', auth, async (req, res) => {
    try {
        const user = req.user;
        const sessionManager = req.app.get('sessionManager');

        await sessionManager.closeSession(user._id.toString());

        await User.findByIdAndUpdate(user._id, {
            'pocketOptionConnection.isConnected': false,
            'pocketOptionConnection.lastActivity': new Date(),
            'tradingSettings.isAutoTrading': false
        });

        res.json({
            success: true,
            message: 'Disconnected from Pocket Option'
        });

    } catch (error) {
        console.error('❌ Disconnect error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/users/connect-pocketoption/status
 * @desc    Get real-time browser and connection status
 */
router.get('/connect-pocketoption/status', auth, async (req, res) => {
    try {
        const user = req.user;
        const sessionManager = req.app.get('sessionManager');

        const session = sessionManager.sessions.get(user._id.toString());
        const isOnTradingPage = session ? await sessionManager.isOnTradingPage(user._id.toString()) : false;

        res.json({
            success: true,
            status: {
                connected: user.pocketOptionConnection?.isConnected || false,
                onTradingPage: isOnTradingPage,
                sessionActive: !!session,
                currentUrl: session?.page?.url() || null,
                accountType: user.pocketOptionConnection?.accountType,
                isAutoTrading: user.tradingSettings?.isAutoTrading || false
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/users/profile
 * @desc    Get complete user profile
 */
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password').lean();
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   PUT /api/users/settings
 * @desc    Update trading preferences (auto-trading, martingale, etc)
 */
router.put('/settings', auth, async (req, res) => {
    try {
        const { tradingSettings } = req.body;
        const user = req.user;

        if (tradingSettings) {
            user.tradingSettings = {
                ...user.tradingSettings,
                ...tradingSettings
            };
            await user.save();

            // Immediately sync with browser if active
            const tradingEngine = req.app.get('tradingEngine');
            if (tradingEngine) {
                tradingEngine.syncSettings(user);
            }
        }

        res.json({
            success: true,
            message: 'Settings updated successfully',
            tradingSettings: user.tradingSettings
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;