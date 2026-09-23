const DailySales = require('../models/DailySales');

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

// Normalize a date to UTC midnight for uniqueness
const normalizeDate = (dateInput) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const getDayName = (date) => DAY_NAMES[date.getDay()];

// @desc    Create or update daily sale (upsert by date)
// @route   POST /api/daily-sales
// @access  Private/Admin
exports.createOrUpdateDailySale = async (req, res) => {
  try {
    const { date, cash, online, notes } = req.body;

    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) {
      return res.status(400).json({ message: 'Invalid date' });
    }

    const cashAmount = Number(cash) || 0;
    const onlineAmount = Number(online) || 0;

    if (cashAmount < 0 || onlineAmount < 0) {
      return res.status(400).json({ message: 'Amounts cannot be negative' });
    }

    const dayOfWeek = getDayName(normalizedDate);
    const total = cashAmount + onlineAmount;

    // Upsert — one entry per date
    const record = await DailySales.findOneAndUpdate(
      { date: normalizedDate },
      {
        date: normalizedDate,
        dayOfWeek,
        cash: cashAmount,
        online: onlineAmount,
        total,
        notes: notes || '',
        createdBy: req.user._id
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(record);
  } catch (error) {
    console.error('Create daily sale error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all daily sales (with date filter + pagination)
// @route   GET /api/daily-sales
// @access  Private
exports.getDailySales = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 30 } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const s = normalizeDate(startDate);
        if (s) query.date.$gte = s;
      }
      if (endDate) {
        const e = normalizeDate(endDate);
        if (e) {
          e.setHours(23, 59, 59, 999);
          query.date.$lte = e;
        }
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sales, total] = await Promise.all([
      DailySales.find(query)
        .populate('createdBy', 'username name')
        .sort({ date: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      DailySales.countDocuments(query)
    ]);

    // Summary totals for the filtered range
    const summaryAgg = await DailySales.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalCash: { $sum: '$cash' },
          totalOnline: { $sum: '$online' },
          totalAmount: { $sum: '$total' },
          count: { $sum: 1 }
        }
      }
    ]);

    const summary = summaryAgg[0] || {
      totalCash: 0,
      totalOnline: 0,
      totalAmount: 0,
      count: 0
    };

    res.json({
      sales,
      summary,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
    });
  } catch (error) {
    console.error('Get daily sales error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get single daily sale
// @route   GET /api/daily-sales/:id
// @access  Private
exports.getDailySale = async (req, res) => {
  try {
    const sale = await DailySales.findById(req.params.id).populate(
      'createdBy',
      'username name'
    );
    if (!sale) {
      return res.status(404).json({ message: 'Daily sale not found' });
    }
    res.json(sale);
  } catch (error) {
    console.error('Get daily sale error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update daily sale
// @route   PUT /api/daily-sales/:id
// @access  Private/Admin
exports.updateDailySale = async (req, res) => {
  try {
    const { date, cash, online, notes } = req.body;

    const sale = await DailySales.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: 'Daily sale not found' });
    }

    if (date !== undefined) {
      const normalizedDate = normalizeDate(date);
      if (!normalizedDate) {
        return res.status(400).json({ message: 'Invalid date' });
      }
      // Check if another entry already exists for that date
      const duplicate = await DailySales.findOne({
        date: normalizedDate,
        _id: { $ne: sale._id }
      });
      if (duplicate) {
        return res.status(400).json({
          message: 'Another entry already exists for this date'
        });
      }
      sale.date = normalizedDate;
      sale.dayOfWeek = getDayName(normalizedDate);
    }

    if (cash !== undefined) sale.cash = Math.max(0, Number(cash) || 0);
    if (online !== undefined) sale.online = Math.max(0, Number(online) || 0);
    if (notes !== undefined) sale.notes = notes;

    // total will be recalculated by pre-save hook
    await sale.save();

    res.json(sale);
  } catch (error) {
    console.error('Update daily sale error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete daily sale
// @route   DELETE /api/daily-sales/:id
// @access  Private/Admin
exports.deleteDailySale = async (req, res) => {
  try {
    const sale = await DailySales.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: 'Daily sale not found' });
    }
    await sale.deleteOne();
    res.json({ message: 'Daily sale deleted successfully' });
  } catch (error) {
    console.error('Delete daily sale error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get monthly summary (for dashboard charts)
// @route   GET /api/daily-sales/summary/monthly
// @access  Private/Admin
exports.getMonthlySummary = async (req, res) => {
  try {
    const { year, month } = req.query;
    const now = new Date();
    const targetYear = parseInt(year) || now.getFullYear();
    const targetMonth = parseInt(month) || now.getMonth() + 1;

    const start = new Date(targetYear, targetMonth - 1, 1);
    const end = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const sales = await DailySales.find({
      date: { $gte: start, $lte: end }
    }).sort({ date: 1 });

    const totals = sales.reduce(
      (acc, s) => {
        acc.cash += s.cash;
        acc.online += s.online;
        acc.total += s.total;
        return acc;
      },
      { cash: 0, online: 0, total: 0 }
    );

    res.json({
      year: targetYear,
      month: targetMonth,
      sales,
      totals
    });
  } catch (error) {
    console.error('Get monthly summary error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};