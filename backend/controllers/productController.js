const Product = require('../models/Product');
const Category = require('../models/Category');
const { exportToCSV, exportToExcel } = require('../utils/exportHelper');

// @desc    Get all products
// @route   GET /api/products
// @access  Private
exports.getProducts = async (req, res) => {
  try {
    const { category, stock, search, page = 1, limit = 50, sort = 'createdAt' } = req.query;
    const query = { isActive: true };

    // Filters
    if (category) query.category = category;
    if (stock === 'low') query.$expr = { $lte: ["$stock", "$lowStockAlert"] };
    if (stock === 'out') query.stock = 0;
    if (stock === 'in') query.stock = { $gt: 0 };
    
    // Enhanced search with multiple fields
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'category.name': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Determine sort order
    let sortOption = { createdAt: -1 };
    if (sort === 'name') sortOption = { name: 1 };
    if (sort === 'price') sortOption = { price: 1 };
    if (sort === 'stock') sortOption = { stock: 1 };
    if (sort === 'popular') sortOption = { sales: -1 };

    const products = await Product.find(query)
      .populate('category', 'name color')
      .populate('brand', 'name')
      .sort(sortOption)
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Product.countDocuments(query);

    // Get popular products (most sold)
    const popularProducts = await Product.find({ isActive: true })
      .populate('category', 'name')
      .populate('brand', 'name')
      .sort({ sales: -1 })
      .limit(10);

    res.json({
      products,
      popularProducts,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('brand', 'name');
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Search products with real-time suggestions
// @route   GET /api/products/search
// @access  Private
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 1) {
      return res.json([]);
    }

    // Case-insensitive partial matching
    const products = await Product.find({
      name: { $regex: q, $options: 'i' },
      isActive: true
    })
    .populate('category', 'name')
    .populate('brand', 'name')
    .limit(20)
    .sort({ name: 1 });

    // If no results by name, search by category or brand
    if (products.length === 0) {
      const categoryProducts = await Product.find({
        $or: [
          { category: { $in: await Category.find({ name: { $regex: q, $options: 'i' } }).distinct('_id') } },
          { brand: { $in: await Category.find({ name: { $regex: q, $options: 'i' } }).distinct('_id') } }
        ],
        isActive: true
      })
      .populate('category', 'name')
      .populate('brand', 'name')
      .limit(10);

      return res.json(categoryProducts);
    }

    res.json(products);
  } catch (error) {
    console.error("Search products error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Quick search for real-time suggestions
// @route   GET /api/products/suggestions
// @access  Private
exports.getSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 1) {
      return res.json([]);
    }

    const suggestions = await Product.find({
      name: { $regex: q, $options: 'i' },
      isActive: true
    })
    .select('name price barcode category brand')
    .populate('category', 'name')
    .populate('brand', 'name')
    .limit(10);

    res.json(suggestions);
  } catch (error) {
    console.error("Get suggestions error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get products by category
// @route   GET /api/products/category/:categoryId
// @access  Private
exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find({ 
      category: categoryId,
      isActive: true
    })
    .populate('category', 'name')
    .populate('brand', 'name')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

    const total = await Product.countDocuments({ category: categoryId, isActive: true });

    res.json({
      products,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
    });
  } catch (error) {
    console.error("Get products by category error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get low stock products
// @route   GET /api/products/low-stock
// @access  Private
exports.getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.find({
      $expr: { $lte: ["$stock", "$lowStockAlert"] },
      isActive: true
    })
    .populate('category', 'name')
    .populate('brand', 'name')
    .sort({ stock: 1 });

    res.json(products);
  } catch (error) {
    console.error("Get low stock error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Add product
// @route   POST /api/products
// @access  Private
exports.addProduct = async (req, res) => {
  try {
    // Handle both JSON and FormData
    let productData;
    
    // Check if there's a file in the request
    if (req.file) {
      // If image was uploaded via multer
      productData = {
        name: req.body.name,
        category: req.body.category,
        brand: req.body.brand || null,
        mrp: parseFloat(req.body.mrp),
        price: parseFloat(req.body.price),
        barcode: req.body.barcode && req.body.barcode.trim() !== '' ? req.body.barcode.trim() : undefined,
        description: req.body.description || '',
        tax: parseFloat(req.body.tax) || 0,
        image: `/uploads/${req.file.filename}`
      };
      console.log('📸 Product with image:', req.file.filename);
    } else {
      // If no image, use req.body directly
      productData = {
        name: req.body.name,
        category: req.body.category,
        brand: req.body.brand || null,
        mrp: parseFloat(req.body.mrp),
        price: parseFloat(req.body.price),
        barcode: req.body.barcode && req.body.barcode.trim() !== '' ? req.body.barcode.trim() : undefined,
        description: req.body.description || '',
        tax: parseFloat(req.body.tax) || 0,
        image: null
      };
      console.log('📦 Product without image');
    }

    // Check if barcode is provided and unique
    if (productData.barcode) {
      const existing = await Product.findOne({ barcode: productData.barcode });
      if (existing) {
        return res.status(400).json({ message: "Barcode already exists" });
      }
    }

    // Verify category exists
    const categoryExists = await Category.findById(productData.category);
    if (!categoryExists) {
      return res.status(400).json({ message: "Invalid category" });
    }

    // If brand is provided, verify it exists
    if (productData.brand) {
      const brandExists = await Category.findById(productData.brand);
      if (!brandExists) {
        return res.status(400).json({ message: "Invalid brand" });
      }
    }

    const product = new Product(productData);
    await product.save();
    await product.populate('category', 'name');
    if (product.brand) {
      await product.populate('brand', 'name');
    }

    console.log('✅ Product added successfully:', product.name);
    res.status(201).json(product);
  } catch (error) {
    console.error("❌ Add product error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Handle both JSON and FormData
    let updateData;
    
    if (req.file) {
      // If new image was uploaded
      updateData = {
        name: req.body.name,
        category: req.body.category,
        brand: req.body.brand || null,
        mrp: parseFloat(req.body.mrp),
        price: parseFloat(req.body.price),
        barcode: req.body.barcode && req.body.barcode.trim() !== '' ? req.body.barcode.trim() : undefined,
        stock: parseInt(req.body.stock) || 0,
        lowStockAlert: parseInt(req.body.lowStockAlert) || 5,
        description: req.body.description || '',
        tax: parseFloat(req.body.tax) || 0,
        image: `/uploads/${req.file.filename}`
      };
    } else {
      // If no new image, use req.body
      updateData = {
        name: req.body.name,
        category: req.body.category,
        brand: req.body.brand || null,
        mrp: parseFloat(req.body.mrp),
        price: parseFloat(req.body.price),
        barcode: req.body.barcode && req.body.barcode.trim() !== '' ? req.body.barcode.trim() : undefined,
        stock: parseInt(req.body.stock) || 0,
        lowStockAlert: parseInt(req.body.lowStockAlert) || 5,
        description: req.body.description || '',
        tax: parseFloat(req.body.tax) || 0
      };
      
      // Preserve existing image if not provided in update
      if (product.image) {
        updateData.image = product.image;
      }
    }

    // Check barcode uniqueness if changed and provided
    if (updateData.barcode && updateData.barcode !== product.barcode) {
      const existing = await Product.findOne({ barcode: updateData.barcode });
      if (existing) {
        return res.status(400).json({ message: "Barcode already exists" });
      }
    }

    // Verify category exists if changed
    if (updateData.category && updateData.category !== product.category?.toString()) {
      const categoryExists = await Category.findById(updateData.category);
      if (!categoryExists) {
        return res.status(400).json({ message: "Invalid category" });
      }
    }

    // Verify brand exists if provided
    if (updateData.brand) {
      const brandExists = await Category.findById(updateData.brand);
      if (!brandExists) {
        return res.status(400).json({ message: "Invalid brand" });
      }
    }

    // Update fields
    Object.assign(product, updateData);
    await product.save();
    await product.populate('category', 'name');
    if (product.brand) {
      await product.populate('brand', 'name');
    }

    res.json(product);
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Soft delete
    product.isActive = false;
    await product.save();

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update stock
// @route   PUT /api/products/:id/stock
// @access  Private
exports.updateStock = async (req, res) => {
  try {
    const { quantity } = req.body;
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await product.updateStock(quantity);

    res.json({ 
      message: "Stock updated successfully",
      stock: product.stock,
      isLowStock: product.isLowStock()
    });
  } catch (error) {
    console.error("Update stock error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Bulk import products
// @route   POST /api/products/bulk-import
// @access  Private
exports.bulkImport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload a file" });
    }

    // Parse CSV/Excel file
    const products = []; // Parse from file
    
    // Validate and insert products
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const productData of products) {
      try {
        // Validate category
        const category = await Category.findOne({ name: productData.category });
        if (!category) {
          throw new Error(`Category ${productData.category} not found`);
        }

        productData.category = category._id;
        await Product.create(productData);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          product: productData.name,
          error: error.message
        });
      }
    }

    res.json({
      message: "Bulk import completed",
      results
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Export products
// @route   GET /api/products/export
// @access  Private
exports.exportProducts = async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    
    const products = await Product.find({ isActive: true })
      .populate('category', 'name')
      .populate('brand', 'name')
      .lean();

    const exportData = products.map(p => ({
      Name: p.name,
      Category: p.category?.name || '',
      Brand: p.brand?.name || '',
      MRP: p.mrp,
      Price: p.price,
      Barcode: p.barcode || '',
      Stock: p.stock,
      'Low Stock Alert': p.lowStockAlert,
      Description: p.description || '',
      Tax: p.tax + '%'
    }));

    if (format === 'csv') {
      const csv = await exportToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
      res.send(csv);
    } else if (format === 'excel') {
      const buffer = await exportToExcel(exportData, 'Products');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=products.xlsx');
      res.send(buffer);
    } else {
      res.status(400).json({ message: "Invalid format" });
    }
  } catch (error) {
    console.error("Export products error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update product image
// @route   POST /api/products/:id/image
// @access  Private
exports.updateProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an image" });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Save image path
    product.image = `/uploads/${req.file.filename}`;
    await product.save();

    res.json({ 
      message: "Image uploaded successfully",
      image: product.image 
    });
  } catch (error) {
    console.error("Update image error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Visual search products
// @route   POST /api/products/visual-search
// @access  Private
exports.visualSearch = async (req, res) => {
  try {
    const { keywords } = req.body;
    
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.json([]);
    }

    // Search products matching any of the keywords
    const products = await Product.find({
      $or: keywords.map(keyword => ({
        $or: [
          { name: { $regex: keyword, $options: 'i' } },
          { description: { $regex: keyword, $options: 'i' } },
          { tags: { $in: [new RegExp(keyword, 'i')] } }
        ]
      })),
      isActive: true
    })
    .populate('category', 'name')
    .populate('brand', 'name')
    .limit(30);

    // Calculate relevance score
    const scoredProducts = products.map(product => {
      let score = 0;
      const productText = `${product.name} ${product.description || ''} ${product.tags?.join(' ') || ''}`.toLowerCase();
      
      keywords.forEach(keyword => {
        const regex = new RegExp(keyword.toLowerCase(), 'g');
        const matches = (productText.match(regex) || []).length;
        score += matches * 10;
        
        // Bonus for exact matches in name
        if (product.name.toLowerCase().includes(keyword.toLowerCase())) {
          score += 20;
        }
      });
      
      return { ...product.toObject(), score };
    });

    // Sort by score and remove duplicates
    scoredProducts.sort((a, b) => b.score - a.score);
    
    res.json(scoredProducts.slice(0, 20));
  } catch (error) {
    console.error("Visual search error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};