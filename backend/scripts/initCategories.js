require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');

const categories = [
  // Main Categories
  { name: 'Face Care', type: 'main', isFeatured: true, displayOrder: 1, icon: '😊', color: '#FF6B6B' },
  { name: 'Hair Care', type: 'main', isFeatured: true, displayOrder: 2, icon: '💇', color: '#4ECDC4' },
  { name: 'Skin Care', type: 'main', isFeatured: true, displayOrder: 3, icon: '🧴', color: '#45B7D1' },
  { name: 'Makeup', type: 'main', isFeatured: true, displayOrder: 4, icon: '💄', color: '#96CEB4' },
  { name: 'Fragrance', type: 'main', isFeatured: true, displayOrder: 5, icon: '🌸', color: '#FFEAA7' },
  { name: 'Jewelry', type: 'main', isFeatured: true, displayOrder: 6, icon: '💍', color: '#D4A5A5' },
  { name: 'Accessories', type: 'main', isFeatured: true, displayOrder: 7, icon: '🕶️', color: '#9B59B6' },
  { name: 'Bath & Body', type: 'main', isFeatured: true, displayOrder: 8, icon: '🛀', color: '#3498DB' },
  { name: 'Mens Grooming', type: 'main', isFeatured: true, displayOrder: 9, icon: '👨', color: '#2C3E50' },
  { name: 'Gift Sets', type: 'main', isFeatured: true, displayOrder: 10, icon: '🎁', color: '#E67E22' },

  // Face Care Subcategories
  { name: 'Face Wash', parentName: 'Face Care', type: 'sub', tags: ['cleanser', 'daily'] },
  { name: 'Face Cream', parentName: 'Face Care', type: 'sub', tags: ['moisturizer', 'daily'] },
  { name: 'Face Serum', parentName: 'Face Care', type: 'sub', tags: ['treatment', 'anti-aging'] },
  { name: 'Face Mask', parentName: 'Face Care', type: 'sub', tags: ['treatment', 'mask'] },
  { name: 'Face Pack', parentName: 'Face Care', type: 'sub', tags: ['treatment', 'clay'] },
  { name: 'Face Scrub', parentName: 'Face Care', type: 'sub', tags: ['exfoliator', 'scrub'] },
  { name: 'Face Powder', parentName: 'Face Care', type: 'sub', tags: ['makeup', 'finish'] },
  { name: 'Face Primer', parentName: 'Face Care', type: 'sub', tags: ['makeup', 'base'] },
  { name: 'Face Fixer', parentName: 'Face Care', type: 'sub', tags: ['makeup', 'setting'] },
  { name: 'Face Mist', parentName: 'Face Care', type: 'sub', tags: ['refresh', 'mist'] },
  { name: 'Rose Water', parentName: 'Face Care', type: 'sub', tags: ['toner', 'natural'] },
  { name: 'Multani Mitti', parentName: 'Face Care', type: 'sub', tags: ['clay', 'natural'] },

  // Skin Care Subcategories
  { name: 'Moisturizer', parentName: 'Skin Care', type: 'sub', tags: ['daily', 'hydration'] },
  { name: 'Sunscreen', parentName: 'Skin Care', type: 'sub', tags: ['spf', 'protection'] },
  { name: 'Body Lotion', parentName: 'Skin Care', type: 'sub', tags: ['body', 'hydration'] },
  { name: 'Body Oil', parentName: 'Skin Care', type: 'sub', tags: ['body', 'oil'] },
  { name: 'Body Wash', parentName: 'Skin Care', type: 'sub', tags: ['bath', 'cleanser'] },
  { name: 'Body Scrub', parentName: 'Skin Care', type: 'sub', tags: ['exfoliator', 'body'] },
  { name: 'Body Spray', parentName: 'Skin Care', type: 'sub', tags: ['fragrance', 'body'] },
  { name: 'Aloe Vera Gel', parentName: 'Skin Care', type: 'sub', tags: ['natural', 'soothing'] },
  { name: 'Hair Removal Cream', parentName: 'Skin Care', type: 'sub', tags: ['hair removal'] },
  { name: 'Wipes', parentName: 'Skin Care', type: 'sub', tags: ['cleaning', 'travel'] },

  // Hair Care Subcategories
  { name: 'Shampoo', parentName: 'Hair Care', type: 'sub', tags: ['hair', 'cleanser'] },
  { name: 'Conditioner', parentName: 'Hair Care', type: 'sub', tags: ['hair', 'conditioner'] },
  { name: 'Hair Oil', parentName: 'Hair Care', type: 'sub', tags: ['hair', 'oil'] },
  { name: 'Hair Serum', parentName: 'Hair Care', type: 'sub', tags: ['hair', 'serum'] },
  { name: 'Hair Gel', parentName: 'Hair Care', type: 'sub', tags: ['hair', 'styling'] },
  { name: 'Hair Color', parentName: 'Hair Care', type: 'sub', tags: ['hair', 'color'] },
  { name: 'Henna', parentName: 'Hair Care', type: 'sub', tags: ['natural', 'color'] },
  { name: 'Hair Mask', parentName: 'Hair Care', type: 'sub', tags: ['treatment', 'mask'] },

  // Makeup Subcategories
  { name: 'Foundation', parentName: 'Makeup', type: 'sub', tags: ['base', 'face'] },
  { name: 'Concealer', parentName: 'Makeup', type: 'sub', tags: ['cover', 'face'] },
  { name: 'Highlighter', parentName: 'Makeup', type: 'sub', tags: ['glow', 'face'] },
  { name: 'Eyeshadow', parentName: 'Makeup', type: 'sub', tags: ['eyes', 'color'] },
  { name: 'Eye Liner', parentName: 'Makeup', type: 'sub', tags: ['eyes', 'liner'] },
  { name: 'Mascara', parentName: 'Makeup', type: 'sub', tags: ['eyes', 'lashes'] },
  { name: 'kajal', parentName: 'Makeup', type: 'sub', tags: ['eyes', 'eyekajal'] },
  { name: 'Lipstick', parentName: 'Makeup', type: 'sub', tags: ['lips', 'color'] },
  { name: 'Lip Gloss', parentName: 'Makeup', type: 'sub', tags: ['lips', 'gloss'] },
  { name: 'Makeup Remover', parentName: 'Makeup', type: 'sub', tags: ['cleanser', 'makeup'] },
  { name: 'Makeup Box', parentName: 'Makeup', type: 'sub', tags: ['storage', 'organizer'] },
  { name: 'Powder Box', parentName: 'Makeup', type: 'sub', tags: ['storage', 'organizer'] },
  { name: 'Makeup Brushes', parentName: 'Makeup', type: 'sub', tags: ['tools', 'brushes'] },

  // Jewelry Subcategories
  { name: 'Golden Long Har', parentName: 'Jewelry', type: 'sub', tags: ['necklace', 'gold'] },
  { name: 'Putir Har', parentName: 'Jewelry', type: 'sub', tags: ['necklace', 'traditional'] },
  { name: 'Choker', parentName: 'Jewelry', type: 'sub', tags: ['necklace', 'choker'] },
  { name: 'Chain', parentName: 'Jewelry', type: 'sub', tags: ['necklace', 'chain'] },
  { name: 'Earrings', parentName: 'Jewelry', type: 'sub', tags: ['earrings'] },
  { name: 'Golden Earrings', parentName: 'Jewelry', type: 'sub', tags: ['earrings', 'gold'] },

  // Accessories Subcategories
  { name: 'Sunglasses', parentName: 'Accessories', type: 'sub', tags: ['eyewear', 'sun'] },
  { name: 'Mens Belt', parentName: 'Accessories', type: 'sub', tags: ['belt', 'men'] },
  { name: 'Mens Wallet', parentName: 'Accessories', type: 'sub', tags: ['wallet', 'men'] },
  { name: 'Womens Wallet', parentName: 'Accessories', type: 'sub', tags: ['wallet', 'women'] },
  { name: 'Watch', parentName: 'Accessories', type: 'sub', tags: ['watch'] },
  { name: 'Hair Accessories', parentName: 'Accessories', type: 'sub', tags: ['hair', 'clips'] },

  // Brands
  { name: 'Lakme', type: 'brand', tags: ['makeup', 'cosmetics'] },
  { name: 'Maybelline', type: 'brand', tags: ['makeup', 'cosmetics'] },
  { name: 'Loreal', type: 'brand', tags: ['hair', 'skin'] },
  { name: 'Garnier', type: 'brand', tags: ['skin', 'hair'] },
  { name: 'Nivea', type: 'brand', tags: ['skin', 'body'] },
  { name: 'Dove', type: 'brand', tags: ['body', 'hair'] },
  { name: 'Ponds', type: 'brand', tags: ['skin', 'face'] },
  { name: 'Himalaya', type: 'brand', tags: ['natural', 'herbal'] },
  { name: 'Mamaearth', type: 'brand', tags: ['natural', 'baby'] },
  { name: 'Plum', type: 'brand', tags: ['vegan', 'natural'] },
  { name: 'Sugar', type: 'brand', tags: ['makeup', 'cosmetics'] },
  { name: 'Swiss Beauty', type: 'brand', tags: ['makeup'] },
  { name: 'Insight', type: 'brand', tags: ['makeup'] },
  { name: 'Forest Essentials', type: 'brand', tags: ['luxury', 'ayurvedic'] },
  { name: 'Kama Ayurveda', type: 'brand', tags: ['ayurvedic', 'natural'] },
  { name: 'Biotique', type: 'brand', tags: ['ayurvedic', 'herbal'] },
  { name: 'Khadi Natural', type: 'brand', tags: ['herbal', 'natural'] },
  { name: 'Patanjali', type: 'brand', tags: ['ayurvedic', 'herbal'] }
];

const initCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing categories
    await Category.deleteMany({});
    console.log('Cleared existing categories');

    // First, create main categories and brands
    const mainCategories = [];
    const brands = [];

    for (const cat of categories) {
      if (cat.type === 'main') {
        const category = await Category.create({
          name: cat.name,
          type: cat.type,
          isFeatured: cat.isFeatured,
          displayOrder: cat.displayOrder,
          icon: cat.icon,
          color: cat.color,
          tags: cat.tags || []
        });
        mainCategories.push({ name: cat.name, id: category._id });
        console.log(`Created main category: ${cat.name}`);
      } else if (cat.type === 'brand') {
        const brand = await Category.create({
          name: cat.name,
          type: cat.type,
          tags: cat.tags || []
        });
        brands.push({ name: cat.name, id: brand._id });
        console.log(`Created brand: ${cat.name}`);
      }
    }

    // Then create subcategories with parent references
    for (const cat of categories) {
      if (cat.type === 'sub') {
        const parent = mainCategories.find(m => m.name === cat.parentName);
        if (parent) {
          await Category.create({
            name: cat.name,
            type: cat.type,
            parentCategory: parent.id,
            tags: cat.tags || []
          });
          console.log(`Created subcategory: ${cat.name} under ${cat.parentName}`);
        }
      }
    }

    console.log('✅ Categories initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing categories:', error);
    process.exit(1);
  }
};

initCategories();