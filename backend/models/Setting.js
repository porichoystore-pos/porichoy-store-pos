const mongoose = require('mongoose');

// Singleton document holding store configuration & app preferences
const settingSchema = new mongoose.Schema(
  {
    // Store profile (shown on receipts/invoices)
    storeName: { type: String, default: 'Porichoy Store', trim: true },
    address: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true },
    logo: { type: String, default: '' }, // Cloudinary URL
    receiptFooter: { type: String, default: 'Thank you for shopping with us!', trim: true },

    // Defaults applied across the app
    currencySymbol: { type: String, default: '₹', trim: true, maxlength: 4 },
    defaultTaxRate: { type: Number, default: 0, min: 0, max: 100 },
    defaultLowStockAlert: { type: Number, default: 5, min: 0 },
    defaultPaymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi'],
      default: 'cash'
    },

    // Feature toggles
    enableVisualSearch: { type: Boolean, default: true },
    enableBarcodeScanner: { type: Boolean, default: true },

    // UI preference
    theme: { type: String, enum: ['light', 'dark'], default: 'light' }
  },
  { timestamps: true }
);

// Helper: fetch (or create) the singleton document
settingSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) doc = await this.create({});
  return doc;
};

module.exports = mongoose.model('Setting', settingSchema);
