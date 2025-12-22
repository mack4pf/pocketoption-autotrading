const mongoose = require('mongoose');
const crypto = require('crypto');

const accessCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    usage: {
        maxUses: {
            type: Number,
            default: 1,
            min: 1
        },
        timesUsed: {
            type: Number,
            default: 0
        },
        users: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    },

    expiresAt: Date,
    validFrom: {
        type: Date,
        default: Date.now
    },

    notes: String,

    permissions: {
        canTrade: { type: Boolean, default: true },
        canUseMartingale: { type: Boolean, default: true },
        maxDailyTrades: { type: Number, default: 100 },
        maxTradeAmount: { type: Number, default: 100 },
        allowedAssets: {
            type: [String],
            default: ['EURUSD', 'GBPUSD', 'USDJPY']
        }
    },

    isActive: {
        type: Boolean,
        default: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Check if code is valid
accessCodeSchema.methods.isValid = function () {
    if (!this.isActive) return false;

    if (this.expiresAt && new Date() > this.expiresAt) {
        return false;
    }

    if (this.usage.timesUsed >= this.usage.maxUses) {
        return false;
    }

    return true;
};

// Use the code for a user
accessCodeSchema.methods.useForUser = function (userId) {
    if (!this.isValid()) {
        throw new Error('Access code is no longer valid');
    }

    this.usage.timesUsed += 1;
    this.usage.users.push(userId);
    this.updatedAt = new Date();

    return this.save();
};

// Generate a new access code (static method)
accessCodeSchema.statics.generateCode = function () {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
};

const AccessCode = mongoose.model('AccessCode', accessCodeSchema);

module.exports = AccessCode;