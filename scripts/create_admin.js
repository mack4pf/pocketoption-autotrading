const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to DB');

        const email = 'Mackiyeritufu@gmail.com';
        const password = 'Mack4pf$$';

        // Check if exists
        let admin = await User.findOne({ email });

        if (admin) {
            console.log('User exists, updating role and password...');
            admin.password = password; // Request triggered pre-save hook hash
            admin.role = 'admin';
            admin.isAdmin = true;
            admin.accessCode = 'ADMIN-MASTER';
            await admin.save();
            console.log('✅ Admin updated successfully');
        } else {
            console.log('Creating new admin...');
            admin = new User({
                email,
                password,
                fullName: 'Master Admin',
                accessCode: 'ADMIN-MASTER',
                role: 'admin',
                isAdmin: true,
                isActive: true
            });
            await admin.save();
            console.log('✅ Admin created successfully');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

createAdmin();
