const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  bill: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  total: Number,
  paymentMethod: String,
  profit: Number
}, { 
  timestamps: true 
});

// Index for date queries
saleSchema.index({ date: -1 });

module.exports = mongoose.model('Sale', saleSchema);