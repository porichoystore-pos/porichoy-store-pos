require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');

const checkImages = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const products = await Product.find({ image: { $ne: null } });
    console.log(`📦 Found ${products.length} products with images`);

    const uploadsDir = path.join(__dirname, '../uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      console.log('❌ Uploads directory does not exist!');
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Created uploads directory');
    }

    let missingCount = 0;
    for (const product of products) {
      const imagePath = product.image.replace('/uploads/', '');
      const fullPath = path.join(uploadsDir, imagePath);
      
      if (fs.existsSync(fullPath)) {
        console.log(`✅ Image exists: ${imagePath}`);
      } else {
        console.log(`❌ Missing image: ${imagePath} for product: ${product.name}`);
        missingCount++;
      }
    }

    console.log(`\n📊 Summary: ${missingCount} images missing out of ${products.length}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkImages();