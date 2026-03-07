require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const makeUserAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find the admin user
    const user = await User.findOne({ username: 'admin' });
    
    if (!user) {
      console.log('❌ User "admin" not found in database');
      console.log('📝 Available users:');
      const allUsers = await User.find({}).select('username role');
      allUsers.forEach(u => console.log(`   - ${u.username} (${u.role})`));
      process.exit(1);
    }

    console.log('📝 Found user:', {
      username: user.username,
      currentRole: user.role,
      id: user._id
    });

    // Update role to admin using updateOne (bypasses pre-save hooks)
    const result = await User.updateOne(
      { _id: user._id },
      { $set: { role: 'admin' } }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ User role updated successfully!');
    } else {
      console.log('⚠️ User role may already be admin');
    }

    // Verify the update
    const verifiedUser = await User.findOne({ username: 'admin' });
    console.log('✅ Verification - User role is now:', verifiedUser.role);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

makeUserAdmin();