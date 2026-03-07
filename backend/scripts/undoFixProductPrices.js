require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const undoFixProductPrices = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all products
    const products = await Product.find({});
    console.log(`📦 Found ${products.length} products`);

    let restoredCount = 0;

    for (const product of products) {
      let needsRestore = false;
      
      // Check if price was changed from 130 to 30
      if (product.price === 30) {
        console.log(`🔄 Restoring ${product.name}: price 30 -> 130`);
        product.price = 130;
        needsRestore = true;
      }
      
      // Check if price was changed from 70 to something else
      if (product.price === 70 && product.name.includes('25gm')) {
        console.log(`🔄 Restoring ${product.name}: price 70 -> 70 (unchanged)`);
        // Already correct
      }
      
      // Check if mrp was changed from 139 to 39
      if (product.mrp === 39) {
        console.log(`🔄 Restoring ${product.name}: mrp 39 -> 139`);
        product.mrp = 139;
        needsRestore = true;
      }
      
      // Check if mrp was changed from 72 to something else
      if (product.mrp === 72 && product.name.includes('25gm')) {
        console.log(`🔄 Restoring ${product.name}: mrp 72 -> 72 (unchanged)`);
        // Already correct
      }

      if (needsRestore) {
        await product.save();
        restoredCount++;
      }
    }

    console.log(`✅ Restored ${restoredCount} products to original values`);
    console.log('📝 Original values should be:');
    console.log('   - 50gm cream: price 130, mrp 139');
    console.log('   - 25gm cream: price 70, mrp 72');
    
    // Verify the current values
    const updatedProducts = await Product.find({});
    console.log('\n📊 Current product values:');
    updatedProducts.forEach(p => {
      console.log(`   - ${p.name}: price ${p.price}, mrp ${p.mrp}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

undoFixProductPrices();