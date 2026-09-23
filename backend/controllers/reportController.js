const Bill = require('../models/Bill');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Sale = require('../models/Sale');
const DailySales = require('../models/DailySales');
const { exportToCSV, exportToExcel } = require('../utils/exportHelper');

// Helper: parse a date in a query range. Date-only end values ("2026-09-21")
// are inclusive of the whole day.
const toRangeEnd = (endDate) => {
  const end = new Date(endDate);
  if (!/[T ]\d{2}:\d{2}/.test(endDate)) end.setHours(23, 59, 59, 999);
  return end;
};

// Helper: normalize a date to local midnight for grouping
const toLocalMidnight = (dateInput) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

// ============================================
// @desc    Get sales report (merges Bills + DailySales)
// @route   GET /api/reports/sales
// @access  Private/Admin
// ============================================
exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    // ---- Build date filters ----
    const billQuery = { isVoided: false };
    const dailyQuery = {};

    if (startDate || endDate) {
      billQuery.createdAt = {};
      dailyQuery.date = {};
      if (startDate) {
        billQuery.createdAt.$gte = new Date(startDate);
        const s = toLocalMidnight(startDate);
        if (s) dailyQuery.date.$gte = s;
      }
      if (endDate) {
        billQuery.createdAt.$lte = toRangeEnd(endDate);
        const e = toRangeEnd(endDate);
        dailyQuery.date.$lte = e;
      }
    }

    // ---- Determine group format ----
    let groupFormat;
    switch (groupBy) {
      case 'hour':
        groupFormat = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' } };
        break;
      case 'month':
        groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      case 'year':
        groupFormat = { $dateToString: { format: '%Y', date: '$createdAt' } };
        break;
      case 'day':
      default:
        groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    }

    let dailyFormat;
    switch (groupBy) {
      case 'month':
        dailyFormat = { $dateToString: { format: '%Y-%m', date: '$date' } };
        break;
      case 'year':
        dailyFormat = { $dateToString: { format: '%Y', date: '$date' } };
        break;
      case 'day':
      case 'hour':
      default:
        dailyFormat = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
    }

    // ---- POS sales (Bills) ----
    const billSales = await Bill.aggregate([
      { $match: billQuery },
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

    // ---- Manual daily sales (DailySales tracker) ----
    const dailySalesGrouped = await DailySales.aggregate([
      { $match: dailyQuery },
      {
        $group: {
          _id: dailyFormat,
          count: { $sum: 1 },
          total: { $sum: '$total' },
          cash: { $sum: '$cash' },
          online: { $sum: '$online' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // ---- Merge by group key ----
    const mergedMap = new Map();

    billSales.forEach((row) => {
      mergedMap.set(row._id, {
        _id: row._id,
        count: row.count,
        total: row.total,
        subtotal: row.subtotal,
        tax: row.tax,
        discount: row.discount,
        manualTotal: 0,
        manualCash: 0,
        manualOnline: 0,
        manualCount: 0
      });
    });

    dailySalesGrouped.forEach((row) => {
      if (mergedMap.has(row._id)) {
        const existing = mergedMap.get(row._id);
        existing.total += row.total;
        existing.manualTotal += row.total;
        existing.manualCash += row.cash;
        existing.manualOnline += row.online;
        existing.manualCount += row.count;
      } else {
        mergedMap.set(row._id, {
          _id: row._id,
          count: 0,
          total: row.total,
          subtotal: 0,
          tax: 0,
          discount: 0,
          manualTotal: row.total,
          manualCash: row.cash,
          manualOnline: row.online,
          manualCount: row.count
        });
      }
    });

    const sales = Array.from(mergedMap.values()).sort((a, b) =>
      a._id > b._id ? 1 : -1
    );

    // ---- Totals ----
    const billTotals = await Bill.aggregate([
      { $match: billQuery },
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

    const dailyTotals = await DailySales.aggregate([
      { $match: dailyQuery },
      {
        $group: {
          _id: null,
          manualSales: { $sum: '$total' },
          manualCash: { $sum: '$cash' },
          manualOnline: { $sum: '$online' },
          manualEntries: { $sum: 1 }
        }
      }
    ]);

    const billSummary = billTotals[0] || {
      totalSales: 0,
      totalBills: 0,
      averageBill: 0,
      totalTax: 0,
      totalDiscount: 0
    };
    const dailySummary = dailyTotals[0] || {
      manualSales: 0,
      manualCash: 0,
      manualOnline: 0,
      manualEntries: 0
    };

    const combinedTotalSales = (billSummary.totalSales || 0) + (dailySummary.manualSales || 0);
    const combinedBills = (billSummary.totalBills || 0) + (dailySummary.manualEntries || 0);
    const combinedAverage = combinedBills > 0 ? combinedTotalSales / combinedBills : 0;

    const summary = {
      totalSales: combinedTotalSales,
      totalBills: combinedBills,
      averageBill: combinedAverage,
      totalTax: billSummary.totalTax || 0,
      totalDiscount: billSummary.totalDiscount || 0,
      // Extra breakdown for UI
      posSales: billSummary.totalSales || 0,
      posBills: billSummary.totalBills || 0,
      manualSales: dailySummary.manualSales || 0,
      manualCash: dailySummary.manualCash || 0,
      manualOnline: dailySummary.manualOnline || 0,
      manualEntries: dailySummary.manualEntries || 0
    };

    // ---- Payment method breakdown ----
    const byPayment = await Bill.aggregate([
      { $match: billQuery },
      { $unwind: '$payments' },
      {
        $group: {
          _id: '$payments.method',
          total: { $sum: '$payments.amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Merge in manual sales into payment breakdown
    if (dailySummary.manualCash > 0) {
      const existing = byPayment.find((p) => p._id === 'cash');
      if (existing) {
        existing.total += dailySummary.manualCash;
      } else {
        byPayment.push({ _id: 'cash', total: dailySummary.manualCash, count: 0 });
      }
    }
    // Manual online sales are ambiguous — treat as "upi" by default
    if (dailySummary.manualOnline > 0) {
      const existing = byPayment.find((p) => p._id === 'upi');
      if (existing) {
        existing.total += dailySummary.manualOnline;
      } else {
        byPayment.push({ _id: 'upi', total: dailySummary.manualOnline, count: 0 });
      }
    }

    res.json({ sales, byPayment, summary });
  } catch (error) {
    console.error("Sales report error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ============================================
// @desc    Get inventory report
// @route   GET /api/reports/inventory
// @access  Private/Admin
// ============================================
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

// ============================================
// @desc    Get top products (POS only — needs product breakdown)
// @route   GET /api/reports/top-products
// @access  Private/Admin
// ============================================
exports.getTopProducts = async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    const match = { isVoided: false };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = toRangeEnd(endDate);
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
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: 1,
          totalQuantity: 1,
          totalRevenue: 1,
          timesSold: 1,
          image: '$product.image',
          stock: '$product.stock'
        }
      }
    ]);

    res.json(topProducts);
  } catch (error) {
    console.error("Top products error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ============================================
// @desc    Get category sales (POS only)
// @route   GET /api/reports/category-sales
// @access  Private/Admin
// ============================================
exports.getCategorySales = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const match = { isVoided: false };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = toRangeEnd(endDate);
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

// ============================================
// @desc    Get daily sales summary (merges Bills + DailySales)
// @route   GET /api/reports/daily
// @access  Private/Admin
// ============================================
exports.getDailySales = async (req, res) => {
  try {
    const { days = 30, startDate: startParam, endDate: endParam } = req.query;

    let startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);
    if (startParam) {
      const s = toLocalMidnight(startParam);
      if (s) startDate = s;
    }

    let endDate = null;
    if (endParam) endDate = toRangeEnd(endParam);

    // ---- POS (Bills) daily ----
    const billMatch = { createdAt: { $gte: startDate }, isVoided: false };
    if (endDate) billMatch.createdAt.$lte = endDate;

    const billDaily = await Bill.aggregate([
      { $match: billMatch },
      { $unwind: '$payments' },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          billNumbers: { $addToSet: '$billNumber' },
          total: { $sum: '$payments.amount' },
          cash: {
            $sum: {
              $cond: [{ $eq: ['$payments.method', 'cash'] }, '$payments.amount', 0]
            }
          },
          card: {
            $sum: {
              $cond: [{ $eq: ['$payments.method', 'card'] }, '$payments.amount', 0]
            }
          },
          upi: {
            $sum: {
              $cond: [{ $eq: ['$payments.method', 'upi'] }, '$payments.amount', 0]
            }
          }
        }
      },
      {
        $project: {
          total: 1,
          cash: 1,
          card: 1,
          upi: 1,
          count: { $size: '$billNumbers' }
        }
      }
    ]);

    // ---- Manual (DailySales) daily ----
    const dailyMatch = { date: { $gte: startDate } };
    if (endDate) dailyMatch.date.$lte = endDate;

    const manualDaily = await DailySales.aggregate([
      { $match: dailyMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          total: { $sum: '$total' },
          cash: { $sum: '$cash' },
          online: { $sum: '$online' },
          count: { $sum: 1 }
        }
      }
    ]);

    // ---- Merge by date ----
    const mergedMap = new Map();

    billDaily.forEach((row) => {
      mergedMap.set(row._id, {
        _id: row._id,
        count: row.count,
        total: row.total,
        cash: row.cash,
        card: row.card,
        upi: row.upi,
        manualTotal: 0,
        manualCash: 0,
        manualOnline: 0,
        manualCount: 0
      });
    });

    manualDaily.forEach((row) => {
      if (mergedMap.has(row._id)) {
        const existing = mergedMap.get(row._id);
        existing.total += row.total;
        existing.cash += row.cash;
        existing.upi += row.online; // treat manual online as UPI-like
        existing.manualTotal += row.total;
        existing.manualCash += row.cash;
        existing.manualOnline += row.online;
        existing.manualCount += row.count;
      } else {
        mergedMap.set(row._id, {
          _id: row._id,
          count: 0,
          total: row.total,
          cash: row.cash,
          card: 0,
          upi: row.online,
          manualTotal: row.total,
          manualCash: row.cash,
          manualOnline: row.online,
          manualCount: row.count
        });
      }
    });

    const dailySales = Array.from(mergedMap.values()).sort((a, b) =>
      a._id > b._id ? 1 : -1
    );

    res.json(dailySales);
  } catch (error) {
    console.error("Daily sales error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ============================================
// @desc    Export a report as CSV or Excel
// @route   GET /api/reports/export?type=...&format=csv|excel
// @access  Private/Admin
// ============================================
exports.exportReport = async (req, res) => {
  try {
    const { type, format = 'csv', startDate, endDate } = req.query;

    if (!['sales', 'inventory', 'top-products', 'category-sales', 'daily'].includes(type)) {
      return res.status(400).json({ message: 'Invalid report type' });
    }
    if (!['csv', 'excel'].includes(format)) {
      return res.status(400).json({ message: 'Invalid format (csv | excel)' });
    }

    const billQuery = { isVoided: false };
    const dailyQuery = {};
    if (startDate || endDate) {
      billQuery.createdAt = {};
      dailyQuery.date = {};
      if (startDate) {
        billQuery.createdAt.$gte = new Date(startDate);
        const s = toLocalMidnight(startDate);
        if (s) dailyQuery.date.$gte = s;
      }
      if (endDate) {
        const e = toRangeEnd(endDate);
        billQuery.createdAt.$lte = e;
        dailyQuery.date.$lte = e;
      }
    }

    let rows = [];
    let reportName = type;

    if (type === 'sales') {
      const billDays = await Bill.aggregate([
        { $match: billQuery },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            bills: { $sum: 1 },
            subtotal: { $sum: '$subtotal' },
            tax: { $sum: '$taxTotal' },
            discount: { $sum: '$discount' },
            total: { $sum: '$total' }
          }
        }
      ]);

      const manualDays = await DailySales.aggregate([
        { $match: dailyQuery },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            entries: { $sum: 1 },
            cash: { $sum: '$cash' },
            online: { $sum: '$online' },
            total: { $sum: '$total' }
          }
        }
      ]);

      const map = new Map();
      billDays.forEach((d) => {
        map.set(d._id, {
          Date: d._id,
          'POS Bills': d.bills,
          Subtotal: d.subtotal,
          Tax: d.tax,
          Discount: d.discount,
          'Manual Entries': 0,
          'Manual Cash': 0,
          'Manual Online': 0,
          Total: d.total
        });
      });
      manualDays.forEach((d) => {
        if (map.has(d._id)) {
          const row = map.get(d._id);
          row['Manual Entries'] = d.entries;
          row['Manual Cash'] = d.cash;
          row['Manual Online'] = d.online;
          row.Total += d.total;
        } else {
          map.set(d._id, {
            Date: d._id,
            'POS Bills': 0,
            Subtotal: 0,
            Tax: 0,
            Discount: 0,
            'Manual Entries': d.entries,
            'Manual Cash': d.cash,
            'Manual Online': d.online,
            Total: d.total
          });
        }
      });
      rows = Array.from(map.values()).sort((a, b) => (a.Date > b.Date ? 1 : -1));

    } else if (type === 'daily') {
      const billDays = await Bill.aggregate([
        { $match: billQuery },
        { $unwind: '$payments' },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            billNumbers: { $addToSet: '$billNumber' },
            total: { $sum: '$payments.amount' },
            cash: { $sum: { $cond: [{ $eq: ['$payments.method', 'cash'] }, '$payments.amount', 0] } },
            card: { $sum: { $cond: [{ $eq: ['$payments.method', 'card'] }, '$payments.amount', 0] } },
            upi: { $sum: { $cond: [{ $eq: ['$payments.method', 'upi'] }, '$payments.amount', 0] } }
          }
        },
        {
          $project: {
            total: 1, cash: 1, card: 1, upi: 1,
            count: { $size: '$billNumbers' }
          }
        }
      ]);

      const manualDays = await DailySales.aggregate([
        { $match: dailyQuery },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            entries: { $sum: 1 },
            cash: { $sum: '$cash' },
            online: { $sum: '$online' },
            total: { $sum: '$total' }
          }
        }
      ]);

      const map = new Map();
      billDays.forEach((d) => {
        map.set(d._id, {
          Date: d._id,
          'POS Bills': d.count,
          'POS Cash': d.cash,
          'POS Card': d.card,
          'POS UPI': d.upi,
          'Manual Entries': 0,
          'Manual Cash': 0,
          'Manual Online': 0,
          Total: d.total
        });
      });
      manualDays.forEach((d) => {
        if (map.has(d._id)) {
          const row = map.get(d._id);
          row['Manual Entries'] = d.entries;
          row['Manual Cash'] = d.cash;
          row['Manual Online'] = d.online;
          row.Total += d.total;
        } else {
          map.set(d._id, {
            Date: d._id,
            'POS Bills': 0,
            'POS Cash': 0,
            'POS Card': 0,
            'POS UPI': 0,
            'Manual Entries': d.entries,
            'Manual Cash': d.cash,
            'Manual Online': d.online,
            Total: d.total
          });
        }
      });
      rows = Array.from(map.values()).sort((a, b) => (a.Date > b.Date ? 1 : -1));

    } else if (type === 'top-products') {
      const top = await Bill.aggregate([
        { $match: billQuery },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            Product: { $first: '$items.name' },
            Quantity: { $sum: '$items.quantity' },
            Revenue: { $sum: '$items.subtotal' },
            'Times Sold': { $sum: 1 }
          }
        },
        { $sort: { Quantity: -1 } },
        { $limit: 50 }
      ]);
      rows = top;

    } else if (type === 'category-sales') {
      const cats = await Bill.aggregate([
        { $match: billQuery },
        { $unwind: '$items' },
        { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
        { $unwind: '$product' },
        {
          $group: {
            _id: '$product.category',
            Quantity: { $sum: '$items.quantity' },
            'Total Sales': { $sum: '$items.subtotal' }
          }
        },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'cat' } },
        { $unwind: '$cat' },
        { $project: { Category: '$cat.name', Quantity: 1, 'Total Sales': 1 } },
        { $sort: { 'Total Sales': -1 } }
      ]);
      rows = cats;

    } else if (type === 'inventory') {
      const products = await Product.find({ isActive: true }).populate('category', 'name').lean();
      reportName = 'inventory';
      rows = products.map((p) => ({
        Name: p.name,
        Category: p.category?.name || '',
        Stock: p.stock,
        'Low Stock Alert': p.lowStockAlert,
        Price: p.price,
        'Stock Value': Number((p.price * p.stock).toFixed(2))
      }));
    }

    const filename = `${reportName}-report-${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      const csv = exportToCSV(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
      return res.send(csv);
    }

    const buffer = await exportToExcel(rows, reportName);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ============================================
// @desc    Get profit report
// @route   GET /api/reports/profit
// @access  Private/Admin
// ============================================
exports.getProfitReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const match = { isVoided: false };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = toRangeEnd(endDate);
    }

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