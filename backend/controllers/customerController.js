const Customer = require('../models/Customer');
const Bill = require('../models/Bill');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
exports.getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Customer.countDocuments(query);

    res.json({
      customers,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
    });
  } catch (error) {
    console.error("Get customers error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Search customers
// @route   GET /api/customers/search
// @access  Private
exports.searchCustomers = async (req, res) => {
  try {
    const { q } = req.query;

    const customers = await Customer.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ],
      isActive: true
    }).limit(10);

    res.json(customers);
  } catch (error) {
    console.error("Search customers error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Get customer's recent bills
    const recentBills = await Bill.find({ 
      customer: customer._id,
      isVoided: false 
    })
    .sort({ createdAt: -1 })
    .limit(10);

    res.json({
      ...customer.toObject(),
      recentBills
    });
  } catch (error) {
    console.error("Get customer error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Create customer
// @route   POST /api/customers
// @access  Private
exports.createCustomer = async (req, res) => {
  try {
    const { phone } = req.body;

    // Check if customer exists
    const existing = await Customer.findOne({ phone });
    if (existing) {
      return res.status(400).json({ message: "Customer with this phone already exists" });
    }

    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (error) {
    console.error("Create customer error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Check phone uniqueness if changed
    if (req.body.phone && req.body.phone !== customer.phone) {
      const existing = await Customer.findOne({ phone: req.body.phone });
      if (existing) {
        return res.status(400).json({ message: "Phone number already exists" });
      }
    }

    Object.assign(customer, req.body);
    await customer.save();

    res.json(customer);
  } catch (error) {
    console.error("Update customer error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Check if customer has bills
    const billCount = await Bill.countDocuments({ customer: customer._id });
    if (billCount > 0) {
      return res.status(400).json({ 
        message: "Cannot delete customer with purchase history. You can deactivate instead." 
      });
    }

    // Soft delete
    customer.isActive = false;
    await customer.save();

    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Delete customer error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get customer bills
// @route   GET /api/customers/:id/bills
// @access  Private
exports.getCustomerBills = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bills = await Bill.find({ 
      customer: req.params.id,
      isVoided: false 
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

    const total = await Bill.countDocuments({ customer: req.params.id });

    res.json({
      bills,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
    });
  } catch (error) {
    console.error("Get customer bills error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};