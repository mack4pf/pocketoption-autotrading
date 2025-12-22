const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const User = require('../../models/User');

/**
 * @route   POST /api/users/connect-pocketoption/start
 * @desc    Launch a new browser session and navigate to Pocket Option login
 */
router.post('/connect-pocketoption/start', auth, async (req, res) => {
    try {
        const user = req.user;
        const sessionManager = req.app.get('sessionManager');

        console.log(`🚀 Starting Pocket Option connection for: ${user.email}`);

        // Create browser session for this user
        const session = await sessionManager.createSession(user._id.toString());

        if (!session) {
            throw new Error('Failed to create browser session');
        }

        // Navigate to Pocket Option login
        await sessionManager.navigateToLogin(user._id.toString());

        res.json({
            success: true,
            message: `
                ✅ Browser window opened!
                
                PLEASE FOLLOW THESE STEPS:
                1. Login to your Pocket Option account
                2. Solve CAPTCHA if required
                3. Navigate to trading page:
                   - Demo: https://pocketoption.com/en/cabinet/demo-quick-high-low/
                   - Real: https://pocketoption.com/en/cabinet/quick-high-low/
                4. Keep the browser window OPEN
                5. Come back here and click "Verify Connection"
                
                IMPORTANT: DO NOT CLOSE THE BROWSER WINDOW!
            `,
            connectionId: user._id.toString()
        });

    } catch (error) {
        console.error('❌ Connection start error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/users/connect-pocketoption/verify
 * @desc    Verify that the user is on the Pocket Option trading page and enable auto-trading
 */
router.post('/connect-pocketoption/verify', auth, async (req, res) => {
    try {
        const user = req.user;
        const sessionManager = req.app.get('sessionManager');

        console.log(`🔍 Verifying connection for user: ${user.email}`);

        // Check if user is on trading page
        const isOnTradingPage = await sessionManager.isOnTradingPage(user._id.toString());

        if (!isOnTradingPage) {
            const session = sessionManager.sessions.get(user._id.toString());
            const currentUrl = session?.page?.url() || 'No active session';

            return res.status(400).json({
                error: 'Not on Pocket Option trading page',
                message: `The browser is currently at: ${currentUrl}`,
                instructions: `
                    Please navigate to:
                    1. DEMO: https://pocketoption.com/en/cabinet/demo-quick-high-low/
                    2. REAL: https://pocketoption.com/en/cabinet/quick-high-low/
                    
                    Then click Verify again. Do not close the window.
                `
            });
        }

        // Get session info
        const session = sessionManager.sessions.get(user._id.toString());
        const currentUrl = session.page.url();
        const isDemo = currentUrl.includes('demo');

        // Update user connection status in DB
        await User.findByIdAndUpdate(user._id, {
            'pocketOptionConnection': {
                isConnected: true,
                connectionDate: new Date(),
                lastActivity: new Date(),
                browserSessionId: `session_${user._id}`,
                tradingPageUrl: currentUrl,
                accountType: isDemo ? 'demo' : 'real',
                verified: true
            },
            'tradingSettings.isAutoTrading': true // AUTO-ENABLE ON SUCCESS
        });

        res.json({
            success: true,
            message: '✅ Pocket Option account connected and automation activated!',
            connection: {
                isConnected: true,
                accountType: isDemo ? 'demo' : 'real',
                tradingUrl: currentUrl
            }
        });

    } catch (error) {
        console.error('❌ Connection verify error:', error);
        res.status(500).json({ error: error.message });
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