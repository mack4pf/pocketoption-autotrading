const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

async function checkStatus() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const user = await User.findOne({ email: /cclogsusa11|iyeritufu/i });
        if (user) {
            console.log(`\n🎯 TARGET USER FOUND:`);
            console.log(`Email: ${user.email}`);
            console.log(`Active: ${user.isActive}`);
            console.log(`Auto-Trading: ${user.tradingSettings.isAutoTrading}`);
            console.log(`Connection Verified: ${user.pocketOptionConnection?.verified}`);
            console.log(`Connection Status (DB): ${user.pocketOptionConnection?.isConnected ? 'YES' : 'NO'}`);
            console.log(`Account Type: ${user.pocketOptionConnection?.accountType}`);
        } else {
            console.log(`\n❌ User not found!`);
        }

        const allUsers = await User.find({}).select('email isAdmin isActive tradingSettings.isAutoTrading pocketOptionConnection.isConnected');
        console.log(`\n👥 All Users Summary:`);
        allUsers.forEach(u => {
            console.log(`- ${u.email} | Admin: ${u.isAdmin} | Auto: ${u.tradingSettings.isAutoTrading} | Conn: ${u.pocketOptionConnection?.isConnected}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkStatus();
