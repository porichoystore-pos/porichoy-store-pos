const Product = require('../models/Product');
const Category = require('../models/Category');
const Customer = require('../models/Customer');
const Bill = require('../models/Bill');

// @desc    Global search across products, categories, customers, bills
// @route   GET /api/search?q=...
// @access  Private
exports.globalSearch = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ products: [], categories: [], customers: [], bills: [] });

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = { $regex: escaped, $options: 'i' };

    // Run all searches in parallel
    const [products, categories, customers, bills] = await Promise.all([
      Product.find({
        $or: [{ name: regex }, { barcode: regex }],
        isActive: true
      })
        .select('name price stock image category brand')
        .populate('category', 'name')
        .populate('brand', 'name')
        .limit(5)
        .lean(),
      Category.find({ name: regex, isActive: true })
        .select('name type color')
        .limit(4)
        .lean(),
      Customer.find({
        $or: [{ name: regex }, { phone: regex }],
        isActive: true
      })
        .select('name phone totalPurchases')
        .limit(4)
        .lean(),
      Bill.find({ billNumber: regex })
        .select('billNumber total createdAt isVoided isManual')
        .sort({ createdAt: -1 })
        .limit(4)
        .lean()
    ]);

    res.json({ products, categories, customers, bills });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
