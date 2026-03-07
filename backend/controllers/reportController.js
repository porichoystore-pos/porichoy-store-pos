const Bill = require('../models/Bill');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Sale = require('../models/Sale');

// @desc    Get sales report
// @route   GET /api/reports/sales
// @access  Private/Admin
exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const query = { isVoided: false };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    let groupFormat;
    switch (groupBy) {
      case 'hour':
        groupFormat = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' } };
        break;
      case 'day':
        groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        break;
      case 'month':
        groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      case 'year':
        groupFormat = { $dateToString: { format: '%Y', date: '$createdAt' } };
        break;
      default:
        groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    }

    const sales = await Bill.aggregate([
      { $match: query },
      {
        $group: {
          _id: groupFormat,
          count: { $sum: 1 },
          total: { $sum: '$total' },
          subtotal: { $sum: '$subtotal' },
          tax: { $sum: '$taxTotal' },
          discount: { $sum: '$discount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const totals = await Bill.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$total' },
          totalBills: { $sum: 1 },
          averageBill: { $avg: '$total' },
          totalTax: { $sum: '$taxTotal' },
          totalDiscount: { $sum: '$discount' }
        }
      }
    ]);

    res.json({
      sales,
      summary: totals[0] || {
        totalSales: 0,
        totalBills: 0,
        averageBill: 0,
        totalTax: 0,
        totalDiscount: 0
      }
    });
  } catch (error) {
    console.error("Sales report error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get inventory report
// @route   GET /api/reports/inventory
// @access  Private/Admin
exports.getInventoryReport = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate('category', 'name');

    const summary = {
      totalProducts: products.length,
      totalValue: products.reduce((sum, p) => sum + (p.price * p.stock), 0),
      totalMRP: products.reduce((sum, p) => sum + (p.mrp * p.stock), 0),
      lowStock: products.filter(p => p.isLowStock()).length,
      outOfStock: products.filter(p => p.stock === 0).length
    };

    const byCategory = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          totalValue: { $sum: { $multiply: ['$price', '$stock'] } }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' }
    ]);

    res.json({
      summary,
      byCategory,
      lowStockProducts: products.filter(p => p.isLowStock())
    });
  } catch (error) {
    console.error("Inventory report error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get top products
// @route   GET /api/reports/top-products
// @access  Private/Admin
exports.getTopProducts = async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    const match = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const topProducts = await Bill.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
          timesSold: { $sum: 1 }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json(topProducts);
  } catch (error) {
    console.error("Top products error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get category sales
// @route   GET /api/reports/category-sales
// @access  Private/Admin
exports.getCategorySales = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const match = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const categorySales = await Bill.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          categoryName: { $first: '$product.category' },
          totalSales: { $sum: '$items.subtotal' },
          totalQuantity: { $sum: '$items.quantity' },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $project: {
          categoryName: '$category.name',
          totalSales: 1,
          totalQuantity: 1,
          count: 1
        }
      },
      { $sort: { totalSales: -1 } }
    ]);

    res.json(categorySales);
  } catch (error) {
    console.error("Category sales error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get daily sales summary
// @route   GET /api/reports/daily
// @access  Private/Admin
exports.getDailySales = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const dailySales = await Bill.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          isVoided: false
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          total: { $sum: '$total' },
          count: { $sum: 1 },
          cash: {
            $sum: {
              $cond: [
                { $eq: ['$payments.method', 'cash'] },
                '$total',
                0
              ]
            }
          },
          card: {
            $sum: {
              $cond: [
                { $eq: ['$payments.method', 'card'] },
                '$total',
                0
              ]
            }
          },
          upi: {
            $sum: {
              $cond: [
                { $eq: ['$payments.method', 'upi'] },
                '$total',
                0
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(dailySales);
  } catch (error) {
    console.error("Daily sales error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get profit report
// @route   GET /api/reports/profit
// @access  Private/Admin
exports.getProfitReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const match = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    // This assumes you have cost price in your products
    // If not, you'll need to add that field
    const profitData = await Bill.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$items.subtotal' },
          totalCost: { 
            $sum: { 
              $multiply: ['$product.costPrice', '$items.quantity'] 
            } 
          },
          totalTax: { $sum: '$items.tax' },
          totalDiscount: { $sum: '$discount' }
        }
      },
      {
        $project: {
          totalRevenue: 1,
          totalCost: 1,
          totalTax: 1,
          totalDiscount: 1,
          grossProfit: { $subtract: ['$totalRevenue', '$totalCost'] },
          netProfit: { 
            $subtract: [
              { $subtract: ['$totalRevenue', '$totalCost'] },
              { $add: ['$totalTax', '$totalDiscount'] }
            ]
          },
          profitMargin: {
            $multiply: [
              {
                $divide: [
                  { $subtract: ['$totalRevenue', '$totalCost'] },
                  '$totalRevenue'
                ]
              },
              100
            ]
          }
        }
      }
    ]);

    res.json(profitData[0] || {
      totalRevenue: 0,
      totalCost: 0,
      totalTax: 0,
      totalDiscount: 0,
      grossProfit: 0,
      netProfit: 0,
      profitMargin: 0
    });
  } catch (error) {
    console.error("Profit report error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};