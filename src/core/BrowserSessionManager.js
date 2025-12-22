const { chromium } = require('playwright');
const EventEmitter = require('events');

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

        // Check max sessions
        if (this.sessions.size >= this.maxSessions) {
            throw new Error(`Maximum browser sessions reached (${this.maxSessions})`);
        }

        // [OPTIMIZED] Use Shared Browser Instance
        if (!this.sharedBrowser) {
            console.log('🚀 Launching Shared Browser Instance...');
            this.sharedBrowser = await chromium.launch({
                headless: false,
                args: [
                    '--start-maximized',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-accelerated-2d-canvas'
                ]
            });
        }

        const context = await this.sharedBrowser.newContext({ viewport: null });
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