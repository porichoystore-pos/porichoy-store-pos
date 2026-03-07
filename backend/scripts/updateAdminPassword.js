const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const updateAdminPassword = async () => {
  try {
    // Check if MONGO_URI is loaded
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI not found in .env file');
      process.exit(1);
    }

    console.log('✅ MONGO_URI found');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find the admin user
    const admin = await User.findOne({ username: 'admin' });
    
    if (!admin) {
      console.log('❌ Admin user not found. Creating new admin...');
      
      // Create new admin if doesn't exist
      const newAdmin = new User({
        username: 'admin',
        password: 'adminissuhel06',
        role: 'admin',
        isActive: true
      });
      
      await newAdmin.save();
      
      console.log('✅ New admin created successfully!');
      console.log('🔑 Username: admin');
      console.log('🔑 Password: adminissuhel06');
      
      process.exit(0);
    }

    console.log('📝 Found admin user:', admin.username);
    console.log('🔄 Updating password...');

    // Update password directly
    admin.password = 'adminissuhel06';
    await admin.save();

    console.log('✅ Admin password updated successfully!');
    console.log('🔑 New credentials:');
    console.log('   Username: admin');
    console.log('   Password: adminissuhel06');
    
    // Verify the password works
    const verifyAdmin = await User.findOne({ username: 'admin' });
    const isMatch = await verifyAdmin.matchPassword('adminissuhel06');
    console.log('🔍 Password verification:', isMatch ? '✅ SUCCESS' : '❌ FAILED');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

updateAdminPassword();