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

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items are required" });
    }

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ message: "Payment information is required" });
    }

    // Calculate totals
    let subtotalTotal = 0;
    let taxTotal = 0;

    // Validate and process items
    const processedItems = [];
    for (const item of items) {
      if (!item.product || !item.quantity) {
        return res.status(400).json({ message: "Each item must have product and quantity" });
      }

      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ message: `Product ${item.product} not found` });
      }
      
      // Use the price from the database, NOT from the request body
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
        price: price, // Use database price, NOT item.price
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

    // Prepare customer data
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

    // Create bill
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
      
      // Save the bill instance
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

    // Update customer purchase stats if customer exists
    if (customer) {
      await Customer.findByIdAndUpdate(customer, {
        $inc: { totalPurchases: total },
        lastPurchase: new Date()
      });
    }

    // Create sale record
    await Sale.create({
      bill: bill._id,
      date: new Date(),
      total,
      paymentMethod: payments[0]?.method,
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
    const { startDate, endDate, page = 1, limit = 20 } = req.query;
    const query = { isVoided: false };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bills = await Bill.find(query)
      .populate('customer', 'name phone')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Bill.countDocuments(query);

    res.json({
      bills,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
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

    // Restore stock
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

    // Ensure all prices are numbers
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
    res.setHeader('Content-Disposition', `attachment; filename=bill-${bill.billNumber}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Print bill error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};