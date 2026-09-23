const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    index: true
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  category: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true 
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  mrp: { 
    type: Number, 
    required: true,
    min: 0
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  barcode: { 
    type: String, 
    trim: true,
    default: undefined // This ensures null values aren't inserted
    // sparse index declared at schema level below
  },
  stock: { 
    type: Number, 
    default: 0,
    min: 0
  },
  lowStockAlert: {
    type: Number,
    default: 5,
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    type: String
  },
  images: [{
    type: String
  }],
  tax: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String
  }],
  ingredients: String,
  benefits: [String],
  howToUse: String,
  expiryDate: Date,
  manufacturer: String,
  countryOfOrigin: String,
  isFeatured: {
    type: Boolean,
    default: false
  },
  salesCount: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  reviews: [{
    user: String,
    rating: Number,
    comment: String,
    date: Date
  }]
}, { 
  timestamps: true 
});

// Index for search
productSchema.index({ 
  name: 'text', 
  barcode: 'text',
  tags: 'text',
  description: 'text'
});

// Performance indexes for frequent query patterns
productSchema.index({ isActive: 1, category: 1 });      // product lists filtered by category
productSchema.index({ isActive: 1, name: 1 });          // alphabetical listing / suggestions
productSchema.index({ isActive: 1, stock: 1 });         // stock filters (in/out)
productSchema.index({ barcode: 1 }, { sparse: true });  // barcode scan lookups
productSchema.index({ salesCount: -1 });                // popular products ordering
productSchema.index({ isActive: 1, createdAt: -1 });    // default "newest first" listing

// Check if stock is low
productSchema.methods.isLowStock = function() {
  return this.stock <= this.lowStockAlert;
};

// Update stock
productSchema.methods.updateStock = function(quantity) {
  this.stock += quantity;
  return this.save();
};

module.exports = mongoose.model('Product', productSchema);