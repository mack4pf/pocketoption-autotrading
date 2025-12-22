const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function createAdmin() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'iyeritufu@gmail.com' });

        if (existingAdmin) {
            console.log('⚠️  Admin user already exists. Updating...');
            existingAdmin.isAdmin = true;
            existingAdmin.role = 'admin';
            existingAdmin.fullName = 'Mack Admin';
            existingAdmin.password = 'Mack4pf$$'; // This will be hashed by the pre-save hook
            await existingAdmin.save();
            console.log('✅ Admin user updated successfully!');
        } else {
            console.log('👤 Creating new admin user...');
            const admin = new User({
                email: 'iyeritufu@gmail.com',
                password: 'Mack4pf$$', // Will be hashed automatically
                fullName: 'Mack Admin',
                accessCode: 'ADMIN-' + Date.now(),
                isAdmin: true,
                role: 'admin',
                isActive: true
            });

            await admin.save();
            console.log('✅ Admin user created successfully!');
        }

        console.log('\n📧 Admin Credentials:');
        console.log('Email: iyeritufu@gmail.com');
        console.log('Password: Mack4pf$$');
        console.log('Role: admin');
        console.log('isAdmin: true\n');

        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error creating admin:', error);
        process.exit(1);
    }
}

createAdmin();
