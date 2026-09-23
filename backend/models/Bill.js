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
  voidReason: String,
  isManual: {
    type: Boolean,
    default: false // true = entered manually (not via POS)
  }
}, { 
  timestamps: true 
});

// Performance indexes for frequent query patterns
billSchema.index({ isVoided: 1, createdAt: -1 }); // bill list + reports default sort
billSchema.index({ createdAt: -1 });            // date-range queries (reports, today)
billSchema.index({ customer: 1, createdAt: -1 }); // customer bill history

// Build the store prefix from store name (first 4 letters, uppercase, A-Z only)
const buildStorePrefix = (storeName) => {
  const cleaned = (storeName || 'PORI')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  return (cleaned + 'XXXX').slice(0, 4);
};

// Generate bill number before save
// Format: [STORE4][YY][MM][DD][SEQ4]  →  e.g., PORI2609230007
billSchema.pre('save', async function () {
  try {
    if (!this.billNumber) {
      // Use the bill's own date when set (manual entries backdate the number)
      const date = this.createdAt ? new Date(this.createdAt) : new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');

      // Get store name from settings for the prefix
      let storeName = 'Porichoy Store';
      try {
        const Setting = mongoose.model('Setting');
        const settings = await Setting.getSingleton();
        if (settings?.storeName) storeName = settings.storeName;
      } catch {
        // Setting model may not be registered — fall back to default
      }

      const prefix = buildStorePrefix(storeName);

      // Count existing bills to create sequential number
      const Bill = mongoose.model('Bill');
      const count = await Bill.countDocuments();
      const seq = (count + 1).toString().padStart(4, '0');

      this.billNumber = `${prefix}${year}${month}${day}${seq}`;

      console.log('Generated bill number:', this.billNumber);
    }
  } catch (error) {
    console.error('Error in bill number generation:', error);
    throw error;
  }
});

module.exports = mongoose.model('Bill', billSchema);