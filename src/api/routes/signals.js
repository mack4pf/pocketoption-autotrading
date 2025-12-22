const express = require('express');
const router = express.Router();
const User = require('../../models/User');

const requireAdminSecret = (req, res, next) => {
    const secret = req.header('X-Admin-Secret');
    if (secret === process.env.ADMIN_SECRET) {
        return next();
    }
    console.warn(`🔐 Unauthorized: Secret mismatch! Received: "${secret.substring(0, 2)}..." Expected: "${process.env.ADMIN_SECRET.substring(0, 2)}..."`);
    return res.status(401).json({
        error: 'Unauthorized: Invalid Admin Secret',
        hint: 'Check your .env file for ADMIN_SECRET value.'
    });
};

// Handle External & Internal Signals
router.post('/create', requireAdminSecret, async (req, res) => {
    try {
        let asset, direction, time;

        // [ADAPTER] Handle External Format: { ticker, signal: "buy", price, time }
        if (req.body.ticker && req.body.signal) {
            asset = req.body.ticker;

            const rawSignal = req.body.signal.toLowerCase();
            if (rawSignal === 'buy' || rawSignal === 'call') direction = 'call';
            else if (rawSignal === 'sell' || rawSignal === 'put') direction = 'put';

            // Default to 300s (5m) if not specified
            time = 300;
        } else {
            // Internal Format
            asset = req.body.asset;
            direction = req.body.direction;
            time = req.body.time;
        }

        if (!asset || !direction || !time) {
            return res.status(400).json({ error: 'Missing required fields or invalid signal format' });
        }

        const tradingEngine = req.app.get('tradingEngine');

        // Generate a signal ID to track this specific trade event
        const signalId = `SIG_${asset}_${Date.now()}`;

        const signalData = {
            signalId,
            asset,
            direction,
            time: parseInt(time)
        };

        // Broadcast to all users
        tradingEngine.broadcastSignal(signalData);

        res.json({
            success: true,
            message: 'Signal received',
            signalId,
            converted: { asset, direction, time }
        });

    } catch (error) {
        console.error('Signal Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Handle External & Internal Results
router.post('/result', requireAdminSecret, async (req, res) => {
    try {
        let outcome;
        let signalId = req.body.signalId;

        // [ADAPTER] Handle External Format: { ticker, signal: "WIN", ... }
        if (req.body.signal) {
            const rawResult = req.body.signal.toUpperCase();
            if (rawResult.includes('WIN')) outcome = 'win';
            else if (rawResult.includes('LOSS')) outcome = 'loss';
        } else {
            // Internal Format
            outcome = req.body.outcome;
        }

        if (!outcome || (outcome !== 'win' && outcome !== 'loss')) {
            return res.status(400).json({ error: 'Invalid outcome. Must contain "WIN" or "LOSS"' });
        }

        const tradingEngine = req.app.get('tradingEngine');

        // Process the result for all users
        await tradingEngine.processResult({
            signalId,
            outcome
        });

        res.json({
            success: true,
            message: `Result (${outcome}) processed for all users.`
        });

    } catch (error) {
        console.error('Result Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
