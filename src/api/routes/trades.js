const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const User = require('../../models/User');
const Trade = require('../../models/Trade');

// Place a trade
router.post('/place', auth, async (req, res) => {
    try {
        const user = req.user;
        const { direction, amount, asset = 'EURUSD', timeSeconds } = req.body;

        console.log(`📊 User ${user.email} placing trade:`, { direction, amount, asset });

        // Validation
        if (!['CALL', 'PUT'].includes(direction?.toUpperCase())) {
            return res.status(400).json({ error: 'Invalid direction. Use CALL or PUT.' });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // Check if user is connected to Pocket Option
        if (!user.pocketOptionConnection?.isConnected) {
            return res.status(400).json({
                error: 'Please connect to Pocket Option first',
                connectUrl: '/api/users/connect-pocketoption/start'
            });
        }

        // Get trading engine and martingale engine
        const tradingEngine = req.app.get('tradingEngine');
        const martingaleEngine = req.app.get('martingaleEngine');

        // Apply martingale if enabled
        let finalAmount = amount;
        let martingaleInfo = null;

        if (user.tradingSettings?.martingaleEnabled) {
            const martingaleResult = martingaleEngine.getNextBet(
                user._id.toString(),
                amount
            );

            finalAmount = martingaleResult.betAmount;
            martingaleInfo = {
                isMartingale: true,
                sequenceIndex: martingaleResult.streak,
                baseAmount: amount,
                lossStreak: martingaleResult.consecutiveLosses,
                multiplier: martingaleResult.multiplier
            };

            console.log(`📈 Martingale applied: ${amount} → ${finalAmount} (x${martingaleResult.multiplier})`);
        }

        // Use final time or default
        const finalTime = timeSeconds || user.tradingSettings?.defaultTime || 300;

        // Validate max amount
        const maxLimit = user.tradingSettings?.maxTradeAmount || 1000;
        if (finalAmount > maxLimit) {
            return res.status(400).json({
                error: `Amount $${finalAmount} exceeds maximum stakeholder limit ($${maxLimit}). Please adjust your settings.`
            });
        }

        console.log(`🎯 Executing trade: ${direction} $${finalAmount} ${asset} ${finalTime}s`);

        // ✅ FIXED: Use placeTrade method (not executeTrade)
        const tradeResult = await tradingEngine.placeTrade(user._id.toString(), {
            direction: direction.toUpperCase(),
            amount: finalAmount,
            asset,
            timeSeconds: finalTime
        });

        // Create trade record
        const trade = new Trade({
            tradeId: tradeResult.tradeId || `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            user: user._id,
            direction: direction.toUpperCase(),
            amount: finalAmount,
            asset,
            timeSeconds: finalTime,
            martingaleInfo,
            status: 'placed',
            placedAt: new Date(),
            source: 'manual'
        });

        await trade.save();

        // Update user stats
        await User.findByIdAndUpdate(user._id, {
            $inc: {
                'stats.totalTrades': 1,
                'stats.todayTrades': 1
            }
        });

        // Record martingale
        martingaleEngine.recordOutcome(user._id.toString(), 'pending', finalAmount);

        res.json({
            success: true,
            message: 'Trade placed successfully',
            trade: {
                id: trade._id,
                tradeId: trade.tradeId,
                direction: trade.direction,
                amount: trade.amount,
                asset: trade.asset,
                timeSeconds: trade.timeSeconds,
                martingaleApplied: !!martingaleInfo,
                status: trade.status,
                placedAt: trade.placedAt
            },
            martingale: martingaleInfo
        });

    } catch (error) {
        console.error('❌ Trade placement error:', error);
        res.status(500).json({
            error: error.message,
            details: 'Check if browser is still open and on trading page'
        });
    }
});

// Get trade history
router.get('/history', auth, async (req, res) => {
    try {
        const { limit = 20, page = 1 } = req.query;
        const skip = (page - 1) * limit;

        const trades = await Trade.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Trade.countDocuments({ user: req.user._id });

        res.json({
            success: true,
            trades,
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

// Get trade by ID
router.get('/:tradeId', auth, async (req, res) => {
    try {
        const trade = await Trade.findOne({
            tradeId: req.params.tradeId,
            user: req.user._id
        });

        if (!trade) {
            return res.status(404).json({ error: 'Trade not found' });
        }

        res.json({
            success: true,
            trade
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get martingale status
router.get('/martingale/status', auth, async (req, res) => {
    try {
        const martingaleEngine = req.app.get('martingaleEngine');
        const state = martingaleEngine.getUserState(req.user._id.toString());

        res.json({
            success: true,
            martingale: {
                sequence: [1, 2, 4, 8, 16, 36],
                currentStreak: state.currentStreak,
                nextMultiplier: state.currentStreak >= martingaleEngine.sequence.length
                    ? martingaleEngine.sequence[martingaleEngine.sequence.length - 1]
                    : martingaleEngine.sequence[state.currentStreak],
                consecutiveLosses: state.consecutiveLosses,
                lastOutcome: state.lastOutcome,
                totalTrades: state.totalTrades,
                totalWins: state.totalWins,
                totalLosses: state.totalLosses,
                totalProfit: state.totalProfit,
                lastUpdated: state.lastCalculated
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reset martingale
router.post('/martingale/reset', auth, async (req, res) => {
    try {
        const martingaleEngine = req.app.get('martingaleEngine');
        const state = martingaleEngine.resetUser(req.user._id.toString());

        res.json({
            success: true,
            message: 'Martingale sequence reset',
            martingale: {
                currentStreak: state.currentStreak,
                nextMultiplier: 1
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;