const mongoose = require('mongoose');
require('dotenv').config();

async function setup() {
    console.log('🚀 Setting up NielsAutoTrade-PO...');

    try {
        // Connect to MongoDB
        console.log('📦 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nielsautotrade');
        console.log('✅ MongoDB connected');

        // Import models
        const User = require('./src/models/User');
        const AccessCode = require('./src/models/AccessCode');

        // Create admin user
        console.log('👑 Creating admin user...');
        const existingAdmin = await User.findOne({ email: 'admin@example.com' });

        if (!existingAdmin) {
            const adminUser = new User({
                email: 'admin@example.com',
                password: 'admin123', // Will be hashed by pre-save hook
                fullName: 'System Administrator',
                accessCode: 'ADMIN',
                isAdmin: true,
                isActive: true
            });

            await adminUser.save();
            console.log('✅ Admin user created:');
            console.log('   Email: admin@example.com');
            console.log('   Password: admin123');
            console.log('   API Key:', adminUser.apiKey);
        } else {
            console.log('✅ Admin user already exists');
            console.log('   Email:', existingAdmin.email);
        }

        // Create a test access code
        console.log('🔑 Creating test access code...');
        const existingCode = await AccessCode.findOne({ code: 'TEST123' });

        if (!existingCode) {
            const crypto = require('crypto');
            const testCode = new AccessCode({
                code: 'TEST123',
                usage: { maxUses: 10 },
                notes: 'Test access code for development',
                isActive: true
            });

            await testCode.save();
            console.log('✅ Test access code created: TEST123');
            console.log('   Max uses: 10');
        } else {
            console.log('✅ Test access code already exists: TEST123');
        }

        console.log('\n🎉 Setup completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Run: npm run install-browsers');
        console.log('2. Run: npm run dev');
        console.log('3. Open: http://localhost:3000/login.html');
        console.log('4. Register with access code: TEST123');
        console.log('\nOR use admin account:');
        console.log('Email: admin@example.com');
        console.log('Password: admin123');

        process.exit(0);

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}

setup();