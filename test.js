console.log('🧪 Testing NielsAutoTrade-PO Setup...\n');

// Test 1: Check Node version
console.log('1. Node version:', process.version);

// Test 2: Check dependencies
try {
    const deps = [
        'express',
        'mongoose',
        'bcrypt',
        'jsonwebtoken',
        'dotenv',
        'playwright'
    ];

    console.log('2. Checking dependencies...');
    deps.forEach(dep => {
        try {
            require(dep);
            console.log(`   ✅ ${dep}`);
        } catch {
            console.log(`   ❌ ${dep} - not installed`);
        }
    });

} catch (error) {
    console.log('Dependency check error:', error.message);
}

// Test 3: Check MongoDB connection
console.log('\n3. Testing MongoDB connection...');
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nielsautotrade', {
    serverSelectionTimeoutMS: 3000
})
    .then(() => {
        console.log('   ✅ MongoDB connected');
        mongoose.connection.close();
    })
    .catch(err => {
        console.log('   ❌ MongoDB connection failed:', err.message);
        console.log('   💡 Make sure MongoDB is running:');
        console.log('   Windows: Run "mongod" in Command Prompt');
        console.log('   Mac/Linux: Run "sudo systemctl start mongod"');
    });

console.log('\n🎯 Tests completed!');