const mongoose = require('mongoose');

const dailySalesSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true
    },
    dayOfWeek: {
      type: String,
      required: true
    },
    cash: {
      type: Number,
      default: 0,
      min: 0
    },
    online: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      default: 0,
      min: 0
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

// Auto-calculate total before save
dailySalesSchema.pre('save', function () {
  this.total = (Number(this.cash) || 0) + (Number(this.online) || 0);
});

// Index for date queries
dailySalesSchema.index({ date: -1 });

module.exports = mongoose.model('DailySales', dailySalesSchema);