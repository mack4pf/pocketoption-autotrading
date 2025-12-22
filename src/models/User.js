const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    accessCode: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isAdmin: { type: Boolean, default: false },

    pocketOptionConnection: {
        lastActivity: Date,
        browserSessionId: String,
        tradingPageUrl: String,
        accountType: { type: String, default: 'demo' }
    },

    tradingSettings: {
        defaultAmount: { type: Number, default: 1.00 },
        defaultTime: { type: Number, default: 300 },
        maxTradeAmount: { type: Number, default: 1000.00 },
        isAutoTrading: { type: Boolean, default: false },
        martingaleEnabled: { type: Boolean, default: true },
        allowedAssets: {
            type: [String],
            default: ['EURUSD', 'EURUSD-OTC']
        }
    },

    martingale: {
        currentLevel: { type: Number, default: 0 },
        lossStreak: { type: Number, default: 0 },
        multiplier: { type: Number, default: 2.0 },
        maxSteps: { type: Number, default: 6 },
        activeTradeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trade' }
    },

    stats: {
        balance: { type: Number, default: 0.00 },
        totalTrades: { type: Number, default: 0 },
        winRate: { type: Number, default: 0 },
        totalProfit: { type: Number, default: 0.00 }
    },

    apiKey: {
        type: String,
        unique: true,
        default: () => crypto.randomBytes(32).toString('hex')
    },

    lastLogin: Date,
}, {
    timestamps: true
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;