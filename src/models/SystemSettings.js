const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed,
    description: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);

// Helper to get or create a setting
SystemSettings.getSetting = async function (key, defaultValue = null) {
    let setting = await this.findOne({ key });
    if (!setting && defaultValue !== null) {
        setting = new this({ key, value: defaultValue });
        await setting.save();
    }
    return setting ? setting.value : defaultValue;
};

module.exports = SystemSettings;
