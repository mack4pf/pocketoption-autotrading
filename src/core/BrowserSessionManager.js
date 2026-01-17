const { chromium } = require('playwright');
const EventEmitter = require('events');
const captchaService = require('../services/CaptchaService');

class BrowserSessionManager extends EventEmitter {
    constructor() {
        super();
        this.sessions = new Map(); // userId -> session data
        this.maxSessions = 50; // [OPTIMIZED] Increased limit due to better resource management
        this.timeout = 3600000; // 1 hour
        this.sharedBrowser = null; // [OPTIMIZED] Singleton instance
    }

    async createSession(userId) {
        console.log(`🖥️ Creating browser session for user: ${userId}`);
        return await this._initializeContext(userId);
    }


    async _initializeContext(userId, customUserAgent = null) {
        // Check max sessions
        if (this.sessions.size >= this.maxSessions) {
            throw new Error(`Maximum browser sessions reached (${this.maxSessions})`);
        }

        // [OPTIMIZED] Use Shared Browser Instance
        if (!this.sharedBrowser) {
            console.log('🚀 Launching Shared Browser Instance...');

            // [STEALTH] Use a realistic User Agent
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

            this.sharedBrowser = await chromium.launch({
                headless: false,
                args: [
                    '--start-maximized',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-accelerated-2d-canvas',
                    `--user-agent=${userAgent}`
                ]
            });
        }

        const contextOptions = { viewport: null };
        if (customUserAgent) {
            contextOptions.userAgent = customUserAgent;
        }

        const context = await this.sharedBrowser.newContext(contextOptions);
        const page = await context.newPage();

        const session = {
            context,
            page,
            lastActivity: new Date(),
            isActive: true,
            isOnTradingPage: false
        };

        this.sessions.set(userId, session);

        // Setup page monitoring
        await this.setupPageMonitoring(page, userId);

        this.emit('session_created', { userId });

        return session;
    }

    async setupPageMonitoring(page, userId) {
        // Monitor URL changes
        page.on('framenavigated', async (frame) => {
            if (frame === page.mainFrame()) {
                const url = frame.url();
                const session = this.sessions.get(userId);
                if (session) {
                    session.lastActivity = new Date();
                    session.currentUrl = url;
                    session.isOnTradingPage = url.includes('demo-quick-high-low') ||
                        url.includes('quick-high-low');

                    if (session.isOnTradingPage) {
                        this.emit('user_on_trading_page', { userId, url });
                    }
                }
            }
        });

        // Monitor page close
        page.on('close', () => {
            this.closeSession(userId);
        });
    }

    async navigateToLogin(userId) {
        const session = this.sessions.get(userId);
        if (!session) {
            throw new Error('Session not found');
        }

        await session.page.goto('https://pocketoption.com/en/login', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        session.lastActivity = new Date();

        return {
            success: true,
            message: 'Please login to Pocket Option in the opened browser',
            userId
        };
    }

    /**
     * Automated login with Anti-Captcha support
     * @param {string} userId - User ID
     * @param {string} email - Pocket Option email
     * @param {string} password - Pocket Option password
     * @param {string} accountType - 'DEMO' or 'REAL'
     */
    async loginWithCredentials(userId, email, password, accountType = 'DEMO') {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🔐 AUTOMATED LOGIN STARTING`);
        console.log(`   User ID: ${userId}`);
        console.log(`   PO Email: ${email}`);
        console.log(`   Account Type: ${accountType}`);
        console.log(`${'='.repeat(60)}\n`);

        const session = this.sessions.get(userId);
        if (!session) {
            console.error('❌ ERROR: Session not found for userId:', userId);
            throw new Error('Session not found');
        }

        const { page } = session;

        try {
            // Step 1: Navigate to login page
            console.log('📍 STEP 1: Navigating to login page...');
            console.log('   URL: https://pocketoption.com/en/login');

            await page.goto('https://pocketoption.com/en/login', {
                waitUntil: 'load',
                timeout: 60000
            });
            console.log('   ✅ Page loaded successfully');
            console.log('   Current URL:', page.url());
            await page.waitForTimeout(2000);

            // Step 2: Fill in credentials with human-like typing
            console.log('\n📍 STEP 2: Entering credentials...');
            console.log('   Looking for email input field...');

            await this._humanType(page, 'input[name="email"], input[type="email"]', email);
            console.log('   ✅ Email entered');

            const randomDelay1 = Math.random() * 500 + 300;
            console.log(`   ⏳ Waiting ${randomDelay1.toFixed(0)}ms...`);
            await page.waitForTimeout(randomDelay1);

            console.log('   Looking for password input field...');
            await this._humanType(page, 'input[name="password"], input[type="password"]', password);
            console.log('   ✅ Password entered');

            const randomDelay2 = Math.random() * 500 + 300;
            console.log(`   ⏳ Waiting ${randomDelay2.toFixed(0)}ms...`);
            await page.waitForTimeout(randomDelay2);

            // Step 2: Entering credentials...
            console.log('\n📍 STEP 2: Entering credentials...');

            let loginSuccess = false;
            let captchaAttempts = 0;
            const maxAttempts = 6;

            while (captchaAttempts < maxAttempts) {
                console.log(`\n   🔄 Login attempt ${captchaAttempts + 1}/${maxAttempts}...`);

                // 1. FAST CHECK: Did we already redirect?
                const currentUrl = page.url();
                if (currentUrl.includes('/cabinet') || currentUrl.includes('/trading')) {
                    console.log('   ✅ Success detected via URL redirect!');
                    loginSuccess = true;
                    break;
                }

                // 2. Find and click login button
                let loginClicked = false;
                const activeSelectors = [
                    'button[type="submit"]',
                    'input[type="submit"]',
                    'button:has-text("Sign in")',
                    'button:has-text("Login")',
                    'button.btn-primary',
                    '.login-btn',
                    '#login-button'
                ];

                for (const selector of activeSelectors) {
                    try {
                        const btn = page.locator(selector).first();
                        if (await btn.isVisible({ timeout: 1000 })) {
                            await btn.click({ timeout: 2000 });
                            loginClicked = true;
                            console.log(`   ✅ Clicked login button: ${selector}`);
                            break;
                        }
                    } catch (e) { continue; }
                }

                // ONLY check for captcha if we actually clicked the sign-in button
                if (loginClicked) {
                    // Wait after click to see what happens (longer wait for captcha to appear)
                    console.log('   ⏳ Waiting 5s for platform response (login or captcha)...');
                    await page.waitForTimeout(5000);

                    // IMPORTANT: Check for Captcha AFTER the sign-in button click
                    console.log('   🔍 Checking for reCAPTCHA (may appear after sign-in)...');
                    const captchaDetected = await this._detectAndSolveCaptcha(page);

                    if (captchaDetected) {
                        console.log(`   ✨ Captcha interaction completed!`);
                        await page.waitForTimeout(3000); // Wait after solving

                        // Check if login succeeded after captcha interaction
                        if (page.url().includes('/cabinet') || page.url().includes('/trading')) {
                            console.log('   ✅ Login successful after captcha!');
                            loginSuccess = true;
                            break;
                        }

                        // Captcha was interacted with but login not complete
                        // Try clicking Sign In again
                        console.log('   🔄 Attempting to submit form again...');
                        for (const selector of activeSelectors) {
                            try {
                                const btn = page.locator(selector).first();
                                if (await btn.isVisible({ timeout: 2000 })) {
                                    await btn.click({ timeout: 2000 });
                                    console.log(`   ✅ Re-clicked login button: ${selector}`);
                                    await page.waitForTimeout(3000);
                                    break;
                                }
                            } catch (e) { continue; }
                        }
                    }

                    // Check if redirect happened after all interactions
                    if (page.url().includes('/cabinet') || page.url().includes('/trading')) {
                        console.log('   ✅ Login successful!');
                        loginSuccess = true;
                        break;
                    }
                } else {
                    // Could not find login button
                    console.warn(`   ⚠️ Could not find login button at: ${page.url()}`);
                    console.warn(`   Page Title: ${await page.title().catch(() => 'Unknown')}`);

                    // Check if we're already logged in somehow
                    if (page.url().includes('/cabinet') || page.url().includes('/trading')) {
                        console.log('   ✅ Already logged in!');
                        loginSuccess = true;
                        break;
                    }
                }

                // Check if redirect happened (successful login without captcha)
                if (page.url().includes('/cabinet') || page.url().includes('/trading')) {
                    console.log('   ✅ Redirect detected: Login Success!');
                    loginSuccess = true;
                    break;
                }

                // Error Check - Check for login failures
                const errorSelector = '.alert-danger, .error-message, .error, .notification-item-error, .form-error';
                const hasError = await page.locator(errorSelector).isVisible({ timeout: 1000 }).catch(() => false);
                if (hasError) {
                    const errorText = await page.locator(errorSelector).innerText();
                    console.error(`   ❌ Platform returned error: ${errorText}`);
                    throw new Error(`Login failed: ${errorText}`);
                }

                captchaAttempts++;
            }

            // If we exited the loop without success
            if (!loginSuccess) {
                throw new Error('Login failed after maximum attempts. Please check your credentials or try again later.');
            }

            // Step 5: Wait for successful login landing
            console.log('\n📍 STEP 5: Finalizing login state...');
            await page.waitForURL(/\/(cabinet|trading|demo-quick)/, { timeout: 20000 }).catch(() => {
                console.log('   Note: Success URL wait timed out, but we might still be okay if manual checks passed.');
            });
            const loginSuccessUrl = page.url();
            console.log('   ✅ Login successful!');
            console.log('   Current URL:', loginSuccessUrl);

            // Step 6: Popup Bypass Strategy
            // Navigate to demo page first to clear any popups
            console.log('\n📍 STEP 6: Bypassing popups...');
            console.log('   Navigating to demo page first...');

            // [RELIABILITY] Use 'domcontentloaded' and catch timeout for better resilience
            try {
                await page.goto('https://pocketoption.com/en/cabinet/demo-quick-high-low/', {
                    waitUntil: 'domcontentloaded',
                    timeout: 45000
                });
                console.log('   ✅ Demo page loaded (popups cleared)');
            } catch (e) {
                console.log('   ⚠️ Navigation to demo page timed out, but we might be okay.');
                console.log('   Current URL:', page.url());
            }

            await page.waitForTimeout(3000); // Let demo page settle

            // Step 7: Route to final destination based on account type
            console.log('\n📍 STEP 7: Final routing...');
            if (accountType === 'REAL') {
                console.log('   Target: REAL account');
                console.log('   Navigating to: https://pocketoption.com/en/cabinet/');
                await page.goto('https://pocketoption.com/en/cabinet/', {
                    waitUntil: 'load',
                    timeout: 60000
                });
                console.log('   ✅ Successfully routed to REAL account');
            } else {
                console.log('   Target: DEMO account');
                console.log('   ✅ Staying on DEMO page (already there)');
            }

            const finalUrl = page.url();

            // Step 8: Proactive Popup Dismissal
            console.log('\n📍 STEP 8: Checking for intrusive popups...');
            await this._dismissPopups(page);

            session.lastActivity = new Date();
            session.isOnTradingPage = true;

            return {
                success: true,
                message: 'Login successful and routed to trading page',
                accountType,
                userId
            };

        } catch (error) {
            console.error('\n❌ ==================== LOGIN FAILED ====================');
            console.error(`Error: ${error.message}`);
            console.error('======================================================\n');

            // Close the browser for this user so they can try again
            try {
                console.log('🔄 Closing browser session...');
                await this.closeSession(userId);
                console.log('✅ Browser closed successfully.');
            } catch (closeError) {
                console.error('⚠️ Error closing browser:', closeError.message);
            }

            // Throw a user-friendly error
            throw new Error(
                `Login failed: ${error.message}\n\n` +
                `Please close this error and try connecting your account again.\n` +
                `Make sure your email and password are correct.`
            );
        }
    }

    /**
     * Detect and solve captcha if present
     * @returns {boolean} - True if captcha was detected and solved
     */
    async _detectAndSolveCaptcha(page) {
        try {
            console.log('      🔍 Looking for reCAPTCHA iframe...');

            // Wait for the reCAPTCHA iframe to appear (it loads after clicking sign-in)
            // Try to find the iframe with multiple attempts
            let recaptchaIframe = null;
            let attempts = 0;
            const maxWaitAttempts = 10; // 10 x 500ms = 5 seconds total

            while (attempts < maxWaitAttempts && !recaptchaIframe) {
                // Check if iframe exists in DOM
                const iframeExists = await page.evaluate(() => {
                    try {
                        const iframes = document.querySelectorAll('iframe[src*="recaptcha"]');
                        return iframes.length > 0;
                    } catch (e) {
                        return false;
                    }
                }).catch(() => false); // Catch "execution context was destroyed"

                if (iframeExists) {
                    console.log('      ✓ reCAPTCHA iframe found in DOM');
                    recaptchaIframe = page.frameLocator('iframe[src*="recaptcha"]').first();
                    break;
                }

                attempts++;
                if (attempts < maxWaitAttempts) {
                    console.log(`      ⏳ Waiting for reCAPTCHA iframe... (${attempts}/${maxWaitAttempts})`);
                    await page.waitForTimeout(500);
                }
            }

            if (!recaptchaIframe) {
                console.log('      ℹ️ No reCAPTCHA detected');
                return false;
            }

            // IMPORTANT: Wait for the iframe content to fully load
            console.log('      ⏳ Waiting for captcha content to load inside iframe...');
            await page.waitForTimeout(2000); // Give the iframe 2 seconds to load its content

            // STEP 1: Look for and CLICK the checkbox to trigger the challenge
            console.log('      🖱️ Looking for "I\'m not a robot" checkbox...');

            let checkboxClicked = false;
            try {
                // The checkbox is usually in the anchor iframe
                const checkbox = recaptchaIframe.locator('.recaptcha-checkbox-border, #recaptcha-anchor, .recaptcha-checkbox').first();
                const isCheckboxVisible = await checkbox.isVisible({ timeout: 3000 }).catch(() => false);

                if (isCheckboxVisible) {
                    console.log('      ✓ Checkbox found - clicking it to trigger challenge...');
                    await checkbox.click({ timeout: 3000 });
                    checkboxClicked = true;
                    console.log('      ✅ Checkbox clicked!');

                    // Wait for the challenge to appear after clicking
                    console.log('      ⏳ Waiting for challenge to load after click...');
                    await page.waitForTimeout(3000);
                } else {
                    console.log('      ℹ️ Checkbox not found - might be invisible captcha');
                }
            } catch (e) {
                console.log('      ⚠️ Could not click checkbox:', e.message);
            }

            // STEP 2: Now check if a challenge appeared (images, puzzles, etc.)
            console.log('      🔍 Checking if challenge appeared...');
            let challengeVisible = false;

            try {
                // Look for challenge iframe (bframe = challenge frame)
                challengeVisible = await page.frameLocator('iframe[src*="recaptcha"][src*="bframe"]')
                    .locator('#rc-imageselect, .rc-imageselect-target, .challenge-container')
                    .isVisible({ timeout: 3000 })
                    .catch(() => false);
            } catch (e) {
                challengeVisible = false;
            }

            // Whether challenge appeared or not, we MUST get the token from Anti-Captcha
            // Just clicking the checkbox is NOT enough!
            if (challengeVisible) {
                console.log('      ✓ Challenge appeared - will solve with Anti-Captcha');
            } else if (checkboxClicked) {
                console.log('      ℹ️ No visual challenge, but we still need to get token from Anti-Captcha');
            } else {
                console.log('      🔍 Checking if invisible reCAPTCHA...');
                const hasInvisibleCaptcha = await page.evaluate(() => {
                    const iframes = document.querySelectorAll('iframe[src*="recaptcha"]');
                    for (const iframe of iframes) {
                        if (iframe.src.includes('invisible') || iframe.src.includes('size=invisible')) {
                            return true;
                        }
                    }
                    return iframes.length > 0;
                });

                if (!hasInvisibleCaptcha) {
                    console.log('      ℹ️ No captcha detected at all');
                    return false;
                }

                console.log('      ✓ Invisible reCAPTCHA detected');
            }

            console.log('🧩 ==================== reCAPTCHA DETECTED ====================');
            console.log('   Preparing to solve with Anti-Captcha service...');

            // Extract site key more robustly
            const siteKey = await page.evaluate(() => {
                const findKey = () => {
                    // 1. Look for data-sitekey attribute
                    const el = document.querySelector('[data-sitekey], .g-recaptcha, [src*="recaptcha"]');
                    if (el) {
                        const key = el.getAttribute('data-sitekey');
                        if (key) return key;
                    }

                    // 2. Look for sitekey in iframes
                    const iframes = Array.from(document.querySelectorAll('iframe[src*="recaptcha"]'));
                    for (const frame of iframes) {
                        try {
                            const url = new URL(frame.src);
                            const k = url.searchParams.get('k');
                            if (k) return k;
                        } catch (e) { }
                    }

                    // 3. Look for sitekey in window or scripts
                    const scripts = Array.from(document.querySelectorAll('script'));
                    for (const script of scripts) {
                        const content = script.textContent || '';
                        const match = content.match(/sitekey['"]?\s*[:=]\s*['"]([A-Za-z0-9_-]+)['"]/);
                        if (match) return match[1];
                    }

                    return null;
                };
                return findKey();
            });

            if (!siteKey) {
                console.error('⚠️ Could not extract sitekey from reCAPTCHA');
                console.error('   The captcha iframe is present but we cannot solve it without the sitekey.');
                return false;
            }

            console.log(`   🔑 SiteKey found: ${siteKey.substring(0, 15)}...`);
            console.log('   📤 Sending captcha to Anti-Captcha service...');

            // Solve captcha
            const token = await captchaService.solveRecaptchaV2(page.url(), siteKey);

            if (!token) {
                console.error('   ❌ Anti-Captcha service did not return a token');
                return false;
            }

            console.log('   ✅ Captcha solved! Token received.');
            console.log('   📥 Injecting token into page...');

            // Inject the token and trigger callbacks
            await page.evaluate((captchaToken) => {
                // 1. Fill standard fields
                const fields = [
                    '[name="g-recaptcha-response"]',
                    '#g-recaptcha-response',
                    '.g-recaptcha-response'
                ];
                fields.forEach(s => {
                    const el = document.querySelector(s);
                    if (el) {
                        el.innerHTML = captchaToken;
                        el.value = captchaToken;
                    }
                });

                // 2. Try to find and call the callback function
                if (window.___grecaptcha_cfg && window.___grecaptcha_cfg.clients) {
                    const clients = window.___grecaptcha_cfg.clients;
                    for (const clientId in clients) {
                        const client = clients[clientId];
                        for (const prop in client) {
                            if (client[prop] && client[prop].callback) {
                                if (typeof client[prop].callback === 'function') {
                                    client[prop].callback(captchaToken);
                                } else if (typeof client[prop].callback === 'string') {
                                    window[client[prop].callback](captchaToken);
                                }
                            }
                        }
                    }
                }
            }, token);

            console.log('   ✅ Token injected & callbacks triggered');

            // Manual Verification Click if needed
            const verifyButton = recaptchaIframe.locator('#recaptcha-verify-button, button:has-text("Verify")').first();
            if (await verifyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                await verifyButton.click();
                console.log('   ✅ Clicked captcha verify button');
            }

            console.log('=============================================================\n');
            await page.waitForTimeout(1000);
            return true;

            // 2. Check for hCaptcha (keeping original code)
            const hcaptchaFrame = page.frameLocator('iframe[src*="hcaptcha.com"]').first();
            const hcaptchaVisible = await hcaptchaFrame.locator('#checkbox, #anchor').isVisible({ timeout: 2000 }).catch(() => false);

            if (hcaptchaVisible) {
                console.log('🧩 hCaptcha detected!');
                // ... logic for hCaptcha if needed ...
                console.log('⚠️ hCaptcha solve logic not fully implemented yet, but detected.');
            }

            return false;

        } catch (error) {
            console.error('❌ Captcha detection/solving error:', error.message);
            return false;
        }
    }

    /**
     * Type text with human-like delays
     */
    async _humanType(page, selector, text) {
        await page.waitForSelector(selector, { timeout: 10000 });
        await page.click(selector);

        for (const char of text) {
            await page.keyboard.type(char, { delay: Math.random() * 150 + 50 }); // Randomize per-char delay
        }
    }

    /**
     * Proactively dismiss known Pocket Option intrusive popups
     */
    async _dismissPopups(page) {
        console.log('   📋 Checking for popups...');

        // List of close button selectors (in order of priority)
        const closeButtonSelectors = [
            'a.modal-close',                    // The welcome bonus modal close button
            '.modal-close',
            '.svg-icon.modal-close-icon',
            '.close-button',
            'button.close',
            '.close',
            '[class*="modal"] .close',
            '[class*="modal"] button[aria-label*="close"]'
        ];

        let popupClosed = false;

        // Try to click any close button
        for (const selector of closeButtonSelectors) {
            try {
                const closeBtn = page.locator(selector).first();
                if (await closeBtn.isVisible({ timeout: 1000 })) {
                    console.log(`   🎯 Found close button: ${selector}`);

                    // Try both Playwright click and JS click
                    await closeBtn.click({ force: true, timeout: 2000 }).catch(() => { });

                    // JS fallback
                    await page.evaluate((sel) => {
                        const el = document.querySelector(sel);
                        if (el) {
                            el.click();
                            // Also try parent if it's an SVG
                            if (el.tagName === 'svg' || el.tagName === 'SVG') {
                                if (el.parentElement) el.parentElement.click();
                            }
                        }
                    }, selector).catch(() => { });

                    popupClosed = true;
                    console.log(`   ✅ Clicked close button`);
                    await page.waitForTimeout(1000);
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        // REFRESH THE PAGE to clear everything
        console.log('   🔄 Refreshing page to clear all popups...');
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000); // Let the page settle
        console.log('   ✅ Page refreshed - all popups cleared');
    }

    async isOnTradingPage(userId) {
        const session = this.sessions.get(userId);
        if (!session) return false;

        const url = session.page.url();
        return url.includes('demo-quick-high-low') || url.includes('quick-high-low');
    }

    async getPage(userId) {
        const session = this.sessions.get(userId);
        return session ? session.page : null;
    }

    async closeSession(userId) {
        const session = this.sessions.get(userId);
        if (session) {
            try {
                // [OPTIMIZED] Only close the Context (Tab), NOT the Browser
                await session.context.close();
            } catch (error) {
                console.error(`Error closing context for ${userId}:`, error);
            }
            this.sessions.delete(userId);
            this.emit('session_closed', { userId });
        }
    }

    async closeAll() {
        console.log('Closing all browser sessions...');
        const promises = [];
        for (const [userId, session] of this.sessions) {
            promises.push(this.closeSession(userId));
        }
        await Promise.all(promises);

        // [OPTIMIZED] Close shared browser at the very end
        if (this.sharedBrowser) {
            await this.sharedBrowser.close();
            this.sharedBrowser = null;
        }
    }

    getStats() {
        let activeCount = 0;
        let tradingPageCount = 0;

        for (const session of this.sessions.values()) {
            if (session.isActive) activeCount++;
            if (session.isOnTradingPage) tradingPageCount++;
        }

        return {
            total: this.sessions.size,
            active: activeCount,
            onTradingPage: tradingPageCount,
            maxSessions: this.maxSessions
        };
    }
}

module.exports = BrowserSessionManager;