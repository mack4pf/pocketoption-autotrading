const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
    // Identification
    tradeId: {
        type: String,
        required: true,
        unique: true
    },

    // User reference
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Trade details
    direction: {
        type: String,
        enum: ['CALL', 'PUT'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    asset: {
        type: String,
        default: 'EURUSD'
    },
    timeSeconds: {
        type: Number,
        default: 300
    },

    // Martingale info
    martingaleInfo: {
        isMartingale: { type: Boolean, default: false },
        sequenceIndex: { type: Number, default: 0 },
        baseAmount: { type: Number, default: 0 },
        lossStreak: { type: Number, default: 0 }
    },

    // Trade status
    status: {
        type: String,
        enum: ['pending', 'placed', 'executing', 'completed', 'cancelled', 'failed'],
        default: 'pending'
    },

    // Outcome
    outcome: {
        result: { type: String, enum: ['win', 'loss', 'pending'] },
        profit: { type: Number, default: 0 },
        payout: { type: Number, default: 0 },
        balanceBefore: { type: Number },
        balanceAfter: { type: Number }
    },

    // Source
    source: {
        type: String,
        enum: ['manual', 'api', 'signal', 'auto'],
        default: 'manual'
    },

    // Timestamps
    placedAt: Date,
    executedAt: Date,
    completedAt: Date,
    cancelledAt: Date,

    // Metadata
    metadata: {
        browserSessionId: String,
        pageUrl: String,
        screenshot: String,
        error: String
    }
}, {
    timestamps: true
});

// Indexes for faster queries (REMOVED DUPLICATE)
tradeSchema.index({ user: 1, createdAt: -1 });
tradeSchema.index({ status: 1 });
tradeSchema.index({ 'outcome.result': 1 });

// Virtual for duration
tradeSchema.virtual('duration').get(function () {
    if (this.executedAt && this.completedAt) {
        return this.completedAt - this.executedAt;
    }
    return null;
});

// Method to mark as completed
tradeSchema.methods.markCompleted = function (result, profit = 0, payout = 0) {
    this.status = 'completed';
    this.outcome.result = result;
    this.outcome.profit = profit;
    this.outcome.payout = payout;
    this.completedAt = new Date();
    return this.save();
};

// Method to mark as failed
tradeSchema.methods.markFailed = function (error) {
    this.status = 'failed';
    this.metadata.error = error;
    return this.save();
};

const Trade = mongoose.model('Trade', tradeSchema);

module.exports = Trade;