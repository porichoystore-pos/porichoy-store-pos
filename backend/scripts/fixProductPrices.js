require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const fixProductPrices = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all products
    const products = await Product.find({});
    console.log(`📦 Found ${products.length} products`);

    let fixedCount = 0;

    for (const product of products) {
      let needsFix = false;
      
      // Check if price has extra 1 prefix (e.g., 170 should be 70)
      if (product.price > 100 && product.price < 200 && product.price.toString().startsWith('1')) {
        const correctPrice = product.price - 100;
        console.log(`🔄 Fixing ${product.name}: price ${product.price} -> ${correctPrice}`);
        product.price = correctPrice;
        needsFix = true;
      }
      
      // Check if mrp has extra 1 prefix
      if (product.mrp > 100 && product.mrp < 200 && product.mrp.toString().startsWith('1')) {
        const correctMrp = product.mrp - 100;
        console.log(`🔄 Fixing ${product.name}: mrp ${product.mrp} -> ${correctMrp}`);
        product.mrp = correctMrp;
        needsFix = true;
      }

      if (needsFix) {
        await product.save();
        fixedCount++;
      }
    }

    console.log(`✅ Fixed ${fixedCount} products`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixProductPrices();