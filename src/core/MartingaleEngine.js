const User = require('../models/User');
const SystemSettings = require('../models/SystemSettings');

class MartingaleEngine {
    constructor() {
        // Default sequence if not defined in user
        this.defaultSequence = [1, 2, 4, 8, 16, 36];
    }

    /**
     * Calculate the next trade amount based on user's martingale state
     * @param {Object} user - The user document
     * @returns {Number} The amount to trade
     */
    async calculateNextAmount(user) {
        const settings = user.tradingSettings;
        const state = user.martingale;

        // Safety checks
        if (!state || !settings) {
            console.error(`Missing settings for user ${user._id}`);
            return 1.0;
        }

        // If martingale is disabled globally by ADMIN, always return base amount
        const globalEnabled = await SystemSettings.getSetting('martingaleEnabledGlobal', true);
        if (!globalEnabled) {
            console.log(`ℹ️ Martingale disabled globally by Admin. Using base amount for user ${user._id}`);
            return settings.defaultAmount;
        }

        // If martingale is disabled by user, always return base amount
        if (!settings.martingaleEnabled) {
            return settings.defaultAmount;
        }

        // Calculate based on level
        // Level 0 = base * 1
        // Level 1 = base * 2
        // Level 2 = base * 4 ...
        const multiplier = Math.pow(state.multiplier, state.currentLevel);

        let amount = settings.defaultAmount * multiplier;

        // Cap at max trade amount
        if (amount > settings.maxTradeAmount) {
            amount = settings.maxTradeAmount;
        }

        return parseFloat(amount.toFixed(2));
    }

    /**
     * Update user state after a trade result (WIN/LOSS)
     * @param {Object} user - The user document
     * @param {String} result - 'win' or 'loss'
     */
    async updateState(user, result) {
        const state = user.martingale;

        if (result === 'win') {
            // Reset on WIN
            state.lossStreak = 0;
            state.currentLevel = 0;
            console.log(`✅ User ${user._id} WON. Resetting Martingale to Level 0.`);
        } else if (result === 'loss') {
            // Increment on LOSS
            state.lossStreak++;

            const maxSteps = state.maxSteps || 6;
            if (state.currentLevel < maxSteps) {
                state.currentLevel++;
                console.log(`❌ User ${user._id} LOST. Increasing Martingale to Level ${state.currentLevel}.`);
            } else {
                // Max steps reached (6 times) - Reset to avoid massive losses.
                console.log(`⚠️ User ${user._id} LOST at Max Level (${maxSteps}). Resetting to 0.`);
                state.currentLevel = 0;
                state.lossStreak = 0; // Reset streak too
            }
        }

        // Save changes to DB
        // We mark modified just in case mixed types cause issues, though simple fields should be fine.
        user.markModified('martingale');
        await user.save();

        return state;
    }
}

module.exports = MartingaleEngine;