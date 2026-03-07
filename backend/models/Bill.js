const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: String,
  barcode: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  mrp: Number,
  price: Number,
  tax: Number,
  subtotal: Number
});

const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['cash', 'card', 'upi', 'mixed'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  reference: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  }
});

const billSchema = new mongoose.Schema({
  billNumber: {
    type: String,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  customerInfo: {
    name: String,
    phone: String,
    email: String
  },
  items: [billItemSchema],
  subtotal: {
    type: Number,
    required: true
  },
  taxTotal: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  payments: [paymentSchema],
  paymentStatus: {
    type: String,
    enum: ['paid', 'partial', 'unpaid'],
    default: 'paid'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: String,
  isVoided: {
    type: Boolean,
    default: false
  },
  voidReason: String
}, { 
  timestamps: true 
});

// Generate bill number before save - FIXED VERSION (no next() call in async function)
billSchema.pre('save', async function() {
  try {
    if (!this.billNumber) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      
      // Count existing bills to create sequential number
      const Bill = mongoose.model('Bill');
      const count = await Bill.countDocuments();
      
      this.billNumber = `BILL-${year}${month}${day}-${(count + 1).toString().padStart(4, '0')}`;
      
      console.log('Generated bill number:', this.billNumber);
    }
  } catch (error) {
    console.error('Error in bill number generation:', error);
    throw error; // Throw error instead of calling next(error)
  }
});

module.exports = mongoose.model('Bill', billSchema);