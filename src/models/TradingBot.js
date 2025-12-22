const mongoose = require('mongoose');

const tradingBotSchema = new mongoose.Schema({
    // Bot identification
    botId: { type: String, unique: true, required: true },
    name: { type: String, default: 'Trading Bot' },
    status: {
        type: String,
        enum: ['active', 'inactive', 'maintenance', 'error'],
        default: 'inactive'
    },

    // Connection info
    pocketOptionCredentials: {
        email: String,
        password: String,
        isDemo: { type: Boolean, default: true },
        sessionCookies: mongoose.Schema.Types.Mixed,
        lastLogin: Date,
        sessionExpires: Date
    },

    // Capacity management
    capacity: {
        maxUsers: { type: Number, default: 50 },
        currentUsers: { type: Number, default: 0 },
        userSlots: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            assignedAt: Date
        }]
    },

    // Performance stats
    performance: {
        totalTradesExecuted: { type: Number, default: 0 },
        successfulTrades: { type: Number, default: 0 },
        failedTrades: { type: Number, default: 0 },
        uptime: { type: Number, default: 0 }, // in seconds
        lastActivity: Date
    },

    // WebSocket/Playwright instance (not stored in DB)
    instanceInfo: {
        browserPid: Number,
        pageUrl: String,
        connected: Boolean
    },

    // Health check
    lastHealthCheck: Date,
    errors: [{
        timestamp: Date,
        message: String,
        stack: String
    }],

    // Settings
    settings: {
        autoReconnect: { type: Boolean, default: true },
        tradeDelay: { type: Number, default: 1000 }, // ms between trades
        headless: { type: Boolean, default: true },
        screenshotsOnError: { type: Boolean, default: true }
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Method to assign user to bot
tradingBotSchema.methods.assignUser = function (userId) {
    if (this.capacity.currentUsers >= this.capacity.maxUsers) {
        throw new Error('Bot at full capacity');
    }

    this.capacity.userSlots.push({
        userId: userId,
        assignedAt: new Date()
    });

    this.capacity.currentUsers += 1;
    this.updatedAt = new Date();

    return this;
};

// Method to remove user from bot
tradingBotSchema.methods.removeUser = function (userId) {
    const initialLength = this.capacity.userSlots.length;
    this.capacity.userSlots = this.capacity.userSlots.filter(
        slot => slot.userId.toString() !== userId.toString()
    );

    this.capacity.currentUsers = this.capacity.userSlots.length;
    this.updatedAt = new Date();

    return initialLength !== this.capacity.userSlots.length;
};

// Static method to find bot with available capacity
tradingBotSchema.statics.findAvailableBot = async function () {
    return this.findOne({
        status: 'active',
        $expr: { $lt: ['$capacity.currentUsers', '$capacity.maxUsers'] }
    }).sort({ 'capacity.currentUsers': 1 }); // Use least loaded bot first
};

module.exports = mongoose.model('TradingBot', tradingBotSchema);