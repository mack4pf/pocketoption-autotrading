const EventEmitter = require('events');
const User = require('../models/User');
const Trade = require('../models/Trade');

class TradingEngine extends EventEmitter {
    constructor(sessionManager, martingaleEngine) {
        super();
        this.sessionManager = sessionManager;
        this.martingaleEngine = martingaleEngine; // Injected dependency
        this.activeSignals = new Map(); // signalId -> trade info
    }

    /**
     * Broadcast a signal to all eligible users
     * @param {Object} signalData - { asset, direction, time, signalId }
     */
    async broadcastSignal(signalData) {
        const activeUserIds = Array.from(this.sessionManager.sessions.keys());
        console.log(`📡 Current Active Session Keys: [${activeUserIds.join(', ')}]`);

        if (activeUserIds.length === 0) {
            console.log('⚠️ No active sessions found in SessionManager.');
            return { placed: 0, errors: 0 };
        }

        const results = { placed: 0, errors: 0 };

        // Execute in parallel (but capped concurrency is better for Node)
        // For <20 users, Promise.all is fine.
        const promises = activeUserIds.map(async (userId) => {
            try {
                const user = await User.findById(userId);
                if (!user) {
                    console.log(`❌ User ID ${userId} not found in MongoDB. Skipping.`);
                    return;
                }

                console.log(`👤 Checking user: ${user.email} | Auto-Trading: ${user.tradingSettings.isAutoTrading} | Active: ${user.isActive}`);

                if (!user.isActive) {
                    console.log(`⏸️ User account ${user.email} is inactive. Skipping.`);
                    return;
                }

                if (!user.tradingSettings.isAutoTrading) {
                    console.log(`⏸️ Auto-trading Toggled OFF for ${user.email}. Skipping.`);
                    return;
                }

                await this.placeTrade(user, signalData);
                results.placed++;
                console.log(`✅ Signal successfully processed for ${user.email}`);
            } catch (error) {
                console.error(`❌ Trade placement failed for ${userId}:`, error.message);
                results.errors++;
            }
        });

        await Promise.all(promises);
        console.log(`🏁 Broadcast complete. Placed: ${results.placed}, Errors: ${results.errors}, Users checked: ${activeUserIds.length}`);

        return results;
    }

    /**
     * Synchronize user trading settings to their active browser session
     * @param {Object} user - The user document
     */
    async syncSettings(user) {
        const userId = user._id.toString();
        const page = await this.sessionManager.getPage(userId);

        if (!page) {
            console.log(`ℹ️ User ${user.email} has no active browser session to sync.`);
            return;
        }

        try {
            console.log(`🔄 Syncing trading amount for ${user.email}: $${user.tradingSettings.defaultAmount}`);
            await this.setAmount(page, user.tradingSettings.defaultAmount);
            console.log(`✅ Successfully synced settings for ${user.email}`);
        } catch (error) {
            console.error(`❌ Failed to sync settings for ${user.email}:`, error.message);
        }
    }

    /**
     * Process a result received from Admin
     * @param {Object} resultData - { signalId, outcome (win/loss) }
     */
    async processResult(resultData) {
        console.log(`📨 Processing result: ${resultData.outcome.toUpperCase()}`);

        const activeUserIds = Array.from(this.sessionManager.sessions.keys());

        for (const userId of activeUserIds) {
            try {
                const user = await User.findById(userId);
                if (!user || !user.tradingSettings.martingaleEnabled) continue;

                // Update martingale state
                await this.martingaleEngine.updateState(user, resultData.outcome);

            } catch (error) {
                console.error(`❌ Error processing result for user ${userId}:`, error);
            }
        }
    }

    async placeTrade(user, signalData) {
        const userId = user._id.toString();

        // 1. Calculate Amount using Martingale Engine
        let amount;
        try {
            amount = this.martingaleEngine.calculateNextAmount(user);
            console.log(`💰 Calculated amount for ${user.email}: $${amount}`);
        } catch (e) {
            console.error(`❌ Martingale calculation failed for ${user.email}:`, e.message);
            throw e;
        }

        if (!amount || amount <= 0) {
            throw new Error(`Invalid trade amount: $${amount}`);
        }

        console.log(`🚀 User ${user.email} -> Executing ${signalData.direction} on ${signalData.asset} for $${amount}`);

        // Get user's browser page
        const page = await this.sessionManager.getPage(userId);
        if (!page) {
            throw new Error('User browser session not found.');
        }

        try {
            // 2. Set trade amount
            await this.setAmount(page, amount);

            // 3. Set expiry time
            await this.setTime(page, signalData.time);

            // 4. Place the trade
            await this.clickTradeButton(page, signalData.direction);

            // 5. Save trade record to DB for history
            const trade = new Trade({
                tradeId: `auto_${Date.now()}_${userId.substring(0, 5)}`,
                user: user._id,
                direction: signalData.direction.toUpperCase(),
                amount: amount,
                asset: signalData.asset,
                timeSeconds: signalData.time,
                status: 'placed',
                placedAt: new Date(),
                source: 'auto',
                metadata: {
                    browserSessionId: user.pocketOptionConnection?.browserSessionId,
                    pageUrl: page.url()
                }
            });

            await trade.save();

            // Notify user via Socket (if handled in server)
            this.emit('trade_placed', {
                userId,
                amount,
                signal: signalData,
                timestamp: new Date()
            });

            return true;

        } catch (error) {
            throw error;
        }
    }

    // ... Helper functions (setAmount, setTime, clickTradeButton) remain same ...
    // Copying them back to ensure they exist

    async setAmount(page, amount) {
        // [ENHANCED SELECTORS]
        const selectors = [
            "div.value__val input[type='text']",
            "input[autocomplete='off']",
            "input.value__input",
            ".value__val input"
        ];

        console.log(`⏱️ Setting amount to ${amount}...`);

        for (const selector of selectors) {
            try {
                const element = await page.waitForSelector(selector, { timeout: 1500 });
                if (element) {
                    await element.click();
                    await page.keyboard.press("Control+A");
                    await page.keyboard.press("Backspace");
                    await page.keyboard.type(amount.toString());
                    await page.keyboard.press("Enter");
                    console.log(`✅ Amount set using: ${selector}`);
                    return true;
                }
            } catch (e) {
                // Try next selector
            }
        }

        // Final attempt using page.fill if selectors failed to find element with wait
        try {
            await page.fill("input[type='text']", amount.toString());
            console.log(`✅ Amount set using generic fill`);
            return true;
        } catch (e) {
            console.error('❌ Failed to set amount after all attempts');
            throw new Error('Amount input not found or not interactable');
        }
    }

    async setTime(page, timeSeconds) {
        if (timeSeconds === 300) return; // Default 5 mins

        // Simplified time setting for stability
        const minutes = Math.floor(timeSeconds / 60);

        try {
            // Try data-period first
            const timeSelector = `[data-period='${timeSeconds}']`;
            const timeButton = await page.$(timeSelector);
            if (timeButton) {
                await timeButton.click();
                return;
            }

            // Fallback logic could go here
            console.warn(`Time selector for ${timeSeconds}s not found, might use default.`);
        } catch (e) {
            console.error("Error setting time:", e.message);
        }
    }

    async clickTradeButton(page, direction) {
        const directionUpper = direction.toUpperCase();

        // [ENHANCED SELECTORS]
        const callSelectors = ['a.btn.btn-call', 'div.button-call', '.btn-call', 'text=HIGHER', 'text=CALL'];
        const putSelectors = ['a.btn.btn-put', 'div.button-put', '.btn-put', 'text=LOWER', 'text=PUT'];

        const selectors = directionUpper === 'CALL' ? callSelectors : putSelectors;

        console.log(`🚀 Clicking ${directionUpper} button...`);

        for (const selector of selectors) {
            try {
                const button = await page.waitForSelector(selector, { timeout: 1500 });
                if (button) {
                    await button.click({ force: true });
                    console.log(`✅ Clicked ${directionUpper} using: ${selector}`);
                    return true;
                }
            } catch (e) {
                // Try next selector
            }
        }

        // Last ditch effort: find by class name in page evaluate
        try {
            const clicked = await page.evaluate((dir) => {
                const className = dir === 'CALL' ? 'btn-call' : 'btn-put';
                const btn = document.querySelector(`.${className}`) ||
                    Array.from(document.querySelectorAll('a, button, div')).find(el =>
                        el.textContent.includes(dir) || el.className.includes(className)
                    );
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            }, directionUpper);

            if (clicked) {
                console.log(`✅ Clicked ${directionUpper} using JS Evaluate`);
                return true;
            }
        } catch (e) { }

        console.error(`❌ ${directionUpper} button not found after all attempts`);
        throw new Error(`${directionUpper} button not found`);
    }
}

module.exports = TradingEngine;