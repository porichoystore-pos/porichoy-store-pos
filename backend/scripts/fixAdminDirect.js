const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const fixAdminDirect = async () => {
  let client;
  try {
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI not found in .env file');
      process.exit(1);
    }

    console.log('✅ MONGO_URI found');
    
    // Connect directly to MongoDB
    client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('porichoydb');
    const usersCollection = db.collection('users');

    // Generate new bcrypt hash for adminissuhel06
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('adminissuhel06', salt);
    console.log('🔑 Generated new hash:', hashedPassword);

    // Update admin user directly
    const result = await usersCollection.updateOne(
      { username: 'admin' },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      console.log('❌ Admin user not found. Creating new admin...');
      
      // Create new admin
      const newAdmin = {
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await usersCollection.insertOne(newAdmin);
      console.log('✅ New admin created successfully!');
    } else {
      console.log('✅ Admin password updated successfully!');
    }

    console.log('🔑 New credentials:');
    console.log('   Username: admin');
    console.log('   Password: adminissuhel06');

    // Verify the password works
    const admin = await usersCollection.findOne({ username: 'admin' });
    const isMatch = await bcrypt.compare('adminissuhel06', admin.password);
    console.log('🔍 Password verification:', isMatch ? '✅ SUCCESS' : '❌ FAILED');

    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    if (client) await client.close();
    process.exit(1);
  }
};

fixAdminDirect();