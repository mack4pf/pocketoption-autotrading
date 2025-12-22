module.exports = {
    PORT: process.env.PORT || 3000,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/nielsautotrade',
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-this',
    ADMIN_SECRET: process.env.ADMIN_SECRET || 'admin123456789',
    NODE_ENV: process.env.NODE_ENV || 'development',

    // Session settings
    SESSION_TIMEOUT: parseInt(process.env.SESSION_TIMEOUT) || 3600000, // 1 hour
    MAX_BROWSERS: parseInt(process.env.MAX_BROWSERS) || 20,

    // Trading settings
    DEFAULT_TRADE_TIME: 300, // 5 minutes in seconds
    DEFAULT_TRADE_AMOUNT: 1.00,
    MAX_TRADE_AMOUNT: 100.00,

    // Pocket Option URLs
    PO_LOGIN_URL: 'https://pocketoption.com/en/login',
    PO_DEMO_TRADING_URL: 'https://pocketoption.com/en/cabinet/demo-quick-high-low/',
    PO_REAL_TRADING_URL: 'https://pocketoption.com/en/cabinet/trading'
};