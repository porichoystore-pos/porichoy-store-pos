const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  phone: { 
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  gstNumber: {
    type: String,
    trim: true
  },
  totalPurchases: {
    type: Number,
    default: 0
  },
  lastPurchase: {
    type: Date
  },
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true 
});

// Update purchase stats
customerSchema.methods.addPurchase = function(amount) {
  this.totalPurchases += amount;
  this.lastPurchase = new Date();
  this.loyaltyPoints += Math.floor(amount / 100); // 1 point per 100 spent
  return this.save();
};

module.exports = mongoose.model('Customer', customerSchema);