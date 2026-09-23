const Bill = require('../models/Bill');
const Sale = require('../models/Sale');
const Product = require('../models/Product');

// Shared: validate items, compute totals (price editable for manual entries)
const processManualItems = async (items, res) => {
  const processedItems = [];
  let subtotal = 0;
  let taxTotal = 0;

  for (const item of items) {
    const qty = Number(item.quantity);
    if (!item.product || !qty || qty < 1) {
      res.status(400).json({ message: 'Each item needs a product and quantity >= 1' });
      return null;
    }

    const product = await Product.findById(item.product);
    if (!product) {
      res.status(400).json({ message: `Product ${item.product} not found` });
      return null;
    }
    if (product.stock < qty) {
      res.status(400).json({
        message: `Insufficient stock for "${product.name}" (available: ${product.stock})`
      });
      return null;
    }

    const price = item.price != null && item.price !== '' && !isNaN(Number(item.price))
      ? Math.max(0, Number(item.price))
      : Number(product.price);

    const itemSubtotal = price * qty;
    const itemTax = (itemSubtotal * (Number(product.tax) || 0)) / 100;

    processedItems.push({
      product: product._id,
      name: product.name,
      barcode: product.barcode,
      mrp: Number(product.mrp),
      price,
      quantity: qty,
      tax: Number(product.tax) || 0,
      subtotal: itemSubtotal
    });

    subtotal += itemSubtotal;
    taxTotal += itemTax;
  }

  return { processedItems, subtotal, taxTotal, total: subtotal + taxTotal };
};

// Shared: apply stock deltas (delta > 0 restores, delta < 0 deducts)
const adjustStock = async (items, direction) => {
  for (const item of items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: direction * item.quantity, salesCount: -direction * item.quantity }
    });
  }
};

const validPaymentMethod = (m) => (['cash', 'card', 'upi'].includes(m) ? m : 'cash');

// @desc    Create a manual sale (backdated entry)
// @route   POST /api/sales/manual
// @access  Private/Admin
exports.createManualSale = async (req, res) => {
  try {
    const { date, customer, customerInfo, items, paymentMethod, notes } = req.body;

    // ---- Validate date ----
    if (!date) {
      return res.status(400).json({ message: 'Sale date is required' });
    }
    const saleDate = new Date(date);
    if (isNaN(saleDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date' });
    }
    if (saleDate.getTime() > Date.now() + 60 * 1000) {
      return res.status(400).json({ message: 'Sale date cannot be in the future' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    const processed = await processManualItems(items, res);
    if (!processed) return; // response already sent

    const { processedItems, subtotal, taxTotal, total } = processed;
    const method = validPaymentMethod(paymentMethod);

    const billData = {
      isManual: true,
      createdAt: saleDate,
      items: processedItems,
      subtotal,
      taxTotal,
      discount: 0,
      total,
      payments: [{ method, amount: total, status: 'completed' }],
      paymentStatus: 'paid',
      createdBy: req.user._id,
      notes: notes || ''
    };

    if (customer) {
      billData.customer = customer;
    } else if (customerInfo && (customerInfo.name || customerInfo.phone)) {
      billData.customerInfo = {
        name: customerInfo.name || 'Manual Customer',
        phone: customerInfo.phone || '',
        email: customerInfo.email || ''
      };
    }

    const bill = await Bill.create(billData);

    // Safeguard: guarantee createdAt honors the chosen date
    if (bill.createdAt.getTime() !== saleDate.getTime()) {
      await Bill.updateOne(
        { _id: bill._id },
        { $set: { createdAt: saleDate, updatedAt: saleDate } }
      );
      bill.createdAt = saleDate;
    }

    // Deduct stock + bump sales counters
    await adjustStock(processedItems, -1);

    // Update customer stats if linked
    if (customer) {
      const Customer = require('../models/Customer');
      await Customer.findByIdAndUpdate(customer, {
        $inc: { totalPurchases: total },
        lastPurchase: saleDate
      });
    }

    await Sale.create({
      bill: bill._id,
      date: saleDate,
      total,
      paymentMethod: method,
      profit: 0
    });

    res.status(201).json(bill);
  } catch (error) {
    console.error('Create manual sale error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// @desc    Update a manual sale (only isManual, non-voided bills)
// @route   PUT /api/sales/manual/:id
// @access  Private/Admin
exports.updateManualSale = async (req, res) => {
  try {
    const { date, customerInfo, items, paymentMethod, notes } = req.body;

    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    if (!bill.isManual) {
      return res.status(400).json({ message: 'Only manual sales can be edited here' });
    }
    if (bill.isVoided) {
      return res.status(400).json({ message: 'Cannot edit a voided bill' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    // Restore stock sold by the old items before re-validating new ones
    await adjustStock(bill.items, +1);

    const processed = await processManualItems(items, res);
    if (!processed) {
      // Validation failed after stock was restored — re-deduct old items to stay consistent
      await adjustStock(bill.items, -1);
      return;
    }

    const { processedItems, subtotal, taxTotal, total } = processed;
    const method = validPaymentMethod(paymentMethod);

    bill.items = processedItems;
    bill.subtotal = subtotal;
    bill.taxTotal = taxTotal;
    bill.total = total;
    bill.payments = [{ method, amount: total, status: 'completed' }];
    bill.notes = notes || '';

    if (date && !isNaN(new Date(date).getTime())) {
      bill.createdAt = new Date(date);
    }

    if (customerInfo && (customerInfo.name || customerInfo.phone)) {
      bill.customerInfo = {
        name: customerInfo.name || 'Manual Customer',
        phone: customerInfo.phone || '',
        email: customerInfo.email || ''
      };
    }

    await bill.save();

    // Deduct stock for the new items
    await adjustStock(processedItems, -1);

    // Keep the linked Sale record in sync
    await Sale.updateOne(
      { bill: bill._id },
      { $set: { total, date: bill.createdAt, paymentMethod: method } }
    );

    res.json(bill);
  } catch (error) {
    console.error('Update manual sale error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

