const Bill = require('../models/Bill');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const { generateInvoicePDF } = require('../utils/invoiceGenerator');

// @desc    Create new bill
// @route   POST /api/bills
// @access  Private
exports.createBill = async (req, res) => {
  try {
    const { customer, customerInfo, items, payments, discount, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items are required" });
    }

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ message: "Payment information is required" });
    }

    let subtotalTotal = 0;
    let taxTotal = 0;

    const processedItems = [];
    for (const item of items) {
      if (!item.product || !item.quantity) {
        return res.status(400).json({ message: "Each item must have product and quantity" });
      }

      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ message: `Product ${item.product} not found` });
      }
      
      const price = Number(product.price);
      const quantity = Number(item.quantity);
      const itemSubtotal = price * quantity;
      const itemTax = (itemSubtotal * (Number(product.tax) || 0)) / 100;

      console.log(`Product: ${product.name}, DB Price: ${price}, Request Price: ${item.price}, Qty: ${quantity}, Subtotal: ${itemSubtotal}`);

      processedItems.push({
        product: product._id,
        name: product.name,
        barcode: product.barcode,
        mrp: Number(product.mrp),
        price: price,
        quantity: quantity,
        tax: Number(product.tax) || 0,
        subtotal: itemSubtotal
      });

      subtotalTotal += itemSubtotal;
      taxTotal += itemTax;
    }

    const discountAmount = Number(discount) || 0;
    const total = subtotalTotal + taxTotal - discountAmount;

    console.log(`Subtotal: ${subtotalTotal}, Tax: ${taxTotal}, Discount: ${discountAmount}, Total: ${total}`);

    let customerData = {};
    if (customer) {
      customerData.customer = customer;
    } else if (customerInfo && (customerInfo.name || customerInfo.phone)) {
      customerData.customerInfo = {
        name: customerInfo.name || 'Walk-in Customer',
        phone: customerInfo.phone || '',
        email: customerInfo.email || ''
      };
    }

    let bill;
    try {
      bill = new Bill({
        ...customerData,
        items: processedItems,
        subtotal: subtotalTotal,
        taxTotal,
        discount: discountAmount,
        total,
        payments,
        createdBy: req.user._id,
        notes: notes || ''
      });
      
      await bill.save();
      
      console.log('Bill created successfully:', bill.billNumber);
      console.log('Bill items:', JSON.stringify(processedItems, null, 2));
      
    } catch (createError) {
      console.error("Error creating bill document:", createError);
      return res.status(500).json({ 
        message: "Failed to create bill", 
        error: createError.message,
        stack: createError.stack 
      });
    }

    if (customer) {
      await Customer.findByIdAndUpdate(customer, {
        $inc: { totalPurchases: total },
        lastPurchase: new Date()
      });
    }

    await Sale.create({
      bill: bill._id,
      date: new Date(),
      total,
      paymentMethod: payments.length > 1 ? 'mixed' : payments[0]?.method,
      profit: 0
    });

    await bill.populate([
      { path: 'customer', select: 'name phone' },
      { path: 'items.product', select: 'name price' },
      { path: 'createdBy', select: 'username' }
    ]);

    res.status(201).json(bill);
  } catch (error) {
    console.error("Create bill error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get all bills
// @route   GET /api/bills
// @access  Private
exports.getBills = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 20, paymentMethod, status, customer } = req.query;
    const query = {};

    if (status === 'voided') {
      query.isVoided = true;
    } else if (status !== 'all') {
      query.isVoided = false;
    }

    if (paymentMethod && ['cash', 'card', 'upi', 'mixed'].includes(paymentMethod)) {
      query['payments.method'] = paymentMethod;
    }

    if (customer && customer.trim()) {
      const escaped = customer.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = { $regex: escaped, $options: 'i' };
      const matchedIds = await Customer.find({
        $or: [{ name: regex }, { phone: regex }]
      }).distinct('_id');
      query.$or = [
        { 'customerInfo.name': regex },
        { 'customerInfo.phone': regex },
        { customer: { $in: matchedIds } }
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        if (!/[T ]\d{2}:\d{2}/.test(endDate)) end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const pageLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const pageNumber = Math.max(parseInt(page) || 1, 1);
    const skip = (pageNumber - 1) * pageLimit;

    const bills = await Bill.find(query)
      .populate('customer', 'name phone')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .limit(pageLimit)
      .skip(skip)
      .lean();

    const total = await Bill.countDocuments(query);

    res.json({
      bills,
      page: pageNumber,
      pages: Math.ceil(total / pageLimit),
      total
    });
  } catch (error) {
    console.error("Get bills error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get single bill
// @route   GET /api/bills/:id
// @access  Private
exports.getBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('customer')
      .populate('items.product')
      .populate('createdBy', 'username name');

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.json(bill);
  } catch (error) {
    console.error("Get bill error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get bill by number
// @route   GET /api/bills/number/:billNumber
// @access  Private
exports.getBillByNumber = async (req, res) => {
  try {
    const bill = await Bill.findOne({ billNumber: req.params.billNumber })
      .populate('customer')
      .populate('items.product')
      .populate('createdBy', 'username name');

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.json(bill);
  } catch (error) {
    console.error("Get bill by number error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get today's bills
// @route   GET /api/bills/today
// @access  Private
exports.getTodayBills = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const bills = await Bill.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      isVoided: false
    }).populate('customer', 'name');

    const summary = {
      count: bills.length,
      total: bills.reduce((sum, bill) => sum + bill.total, 0),
      cash: bills.filter(b => b.payments[0]?.method === 'cash')
        .reduce((sum, bill) => sum + bill.total, 0),
      card: bills.filter(b => b.payments[0]?.method === 'card')
        .reduce((sum, bill) => sum + bill.total, 0),
      upi: bills.filter(b => b.payments[0]?.method === 'upi')
        .reduce((sum, bill) => sum + bill.total, 0)
    };

    res.json({ bills, summary });
  } catch (error) {
    console.error("Get today's bills error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update bill (customer info, notes, discount, payment method)
// @route   PUT /api/bills/:id
// @access  Private
exports.updateBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    if (bill.isVoided) {
      return res.status(400).json({ message: 'Cannot edit a voided bill' });
    }

    const { customer, customerInfo, notes, discount, paymentMethod } = req.body;

    if (customer !== undefined) {
      bill.customer = customer || undefined;
    }
    if (customerInfo !== undefined) {
      bill.customerInfo = {
        name: customerInfo.name ?? bill.customerInfo?.name,
        phone: customerInfo.phone ?? bill.customerInfo?.phone,
        email: customerInfo.email ?? bill.customerInfo?.email
      };
    }
    if (notes !== undefined) {
      bill.notes = notes;
    }

    if (discount !== undefined) {
      const maxDiscount = bill.subtotal + bill.taxTotal;
      const d = Number(discount);
      if (isNaN(d) || d < 0 || d > maxDiscount + 0.001) {
        return res.status(400).json({
          message: `Discount must be between 0 and ${maxDiscount.toFixed(2)}`
        });
      }
      bill.discount = d;
    }
    bill.total = Number((bill.subtotal + bill.taxTotal - bill.discount).toFixed(2));

    if (paymentMethod !== undefined) {
      if (!['cash', 'card', 'upi', 'mixed'].includes(paymentMethod)) {
        return res.status(400).json({ message: 'Invalid payment method' });
      }
      if (bill.payments.length <= 1) {
        bill.payments = [{
          method: paymentMethod,
          amount: bill.total,
          status: 'completed'
        }];
      } else {
        const paidTotal = bill.payments.reduce((s, p) => s + p.amount, 0);
        bill.payments = bill.payments.map((p) => ({
          ...p.toObject(),
          amount: Number(((p.amount / (paidTotal || 1)) * bill.total).toFixed(2)),
          status: 'completed'
        }));
      }
    } else if (discount !== undefined && bill.payments.length === 1) {
      bill.payments[0].amount = bill.total;
    }

    await bill.save();

    await Sale.updateOne(
      { bill: bill._id },
      {
        $set: {
          total: bill.total,
          paymentMethod:
            bill.payments.length > 1 ? 'mixed' : bill.payments[0]?.method
        }
      }
    );

    await bill.populate([
      { path: 'customer' },
      { path: 'items.product' },
      { path: 'createdBy', select: 'username name' }
    ]);

    res.json(bill);
  } catch (error) {
    console.error('Update bill error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Void bill
// @route   PUT /api/bills/:id/void
// @access  Private
exports.voidBill = async (req, res) => {
  try {
    const { reason } = req.body;
    const bill = await Bill.findById(req.params.id);

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (bill.isVoided) {
      return res.status(400).json({ message: "Bill already voided" });
    }

    for (const item of bill.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity }
      });
    }

    bill.isVoided = true;
    bill.voidReason = reason;
    await bill.save();

    res.json({ message: "Bill voided successfully" });
  } catch (error) {
    console.error("Void bill error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Print bill
// @route   GET /api/bills/:id/print
// @access  Private
exports.printBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('customer')
      .populate('items.product')
      .populate('createdBy', 'username');

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    bill.items.forEach(item => {
      item.price = Number(item.price);
      item.subtotal = Number(item.subtotal);
    });
    
    bill.subtotal = Number(bill.subtotal);
    bill.taxTotal = Number(bill.taxTotal || 0);
    bill.discount = Number(bill.discount || 0);
    bill.total = Number(bill.total);

    const pdfBuffer = await generateInvoicePDF(bill);
    
    res.setHeader('Content-Type', 'application/pdf');
    // ✅ CHANGED: inline (opens in browser PDF viewer) instead of attachment (forces download)
    res.setHeader('Content-Disposition', `inline; filename=bill-${bill.billNumber}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Print bill error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};