const Product = require('../models/Product');
const Category = require('../models/Category');
const Bill = require('../models/Bill');
const { exportToCSV, exportToExcel } = require('../utils/exportHelper');
const { cloudinary } = require('../config/cloudinary');
const cache = require('../utils/cache');

// @desc    Get all products
// @route   GET /api/products
// @access  Private
exports.getProducts = async (req, res) => {
  try {
    const { category, stock, search, page = 1, limit = 50, sort = 'createdAt' } = req.query;
    const query = { isActive: true };

    // Pagination guardrails: default 50, hard cap at 100 to prevent huge responses
    const pageLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const pageNumber = Math.max(parseInt(page) || 1, 1);

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

    const skip = (pageNumber - 1) * pageLimit;

    // Determine sort order
    let sortOption = { createdAt: -1 };
    if (sort === 'name') sortOption = { name: 1 };
    if (sort === 'price') sortOption = { price: 1 };
    if (sort === 'stock') sortOption = { stock: 1 };
    if (sort === 'popular') sortOption = { salesCount: -1 }; // fixed: 'sales' field didn't exist

    const products = await Product.find(query)
      .populate('category', 'name color')
      .populate('brand', 'name')
      .sort(sortOption)
      .limit(pageLimit)
      .skip(skip)
      .lean();

    const total = await Product.countDocuments(query);

    // Get popular products (most sold) — cached for 5 minutes, rarely changes
    let popularProducts = cache.get('popularProducts');
    if (!popularProducts) {
      popularProducts = await Product.find({ isActive: true })
        .populate('category', 'name')
        .populate('brand', 'name')
        .sort({ salesCount: -1 })
        .limit(10)
        .lean();
      cache.set('popularProducts', popularProducts, 5 * 60 * 1000);
    }

    res.json({
      products,
      popularProducts,
      page: pageNumber,
      pages: Math.ceil(total / pageLimit),
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

    if (!q || q.trim().length < 1) {
      return res.json([]);
    }
    const query = q.trim();

    // ---- 1. Exact barcode match (scanner input) — fastest path ----
    const exactBarcode = await Product.findOne({ barcode: query, isActive: true })
      .populate('category', 'name')
      .populate('brand', 'name')
      .lean();

    if (exactBarcode) {
      return res.json([exactBarcode]);
    }

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const terms = escaped.split(/\s+/).filter(Boolean);

    // ---- 2. Standard matches: name / barcode / tags ----
    const products = await Product.find({
      $or: [
        { name: { $regex: escaped, $options: 'i' } },
        { barcode: { $regex: escaped, $options: 'i' } },
        { tags: { $regex: escaped, $options: 'i' } }
      ],
      isActive: true
    })
      .populate('category', 'name')
      .populate('brand', 'name')
      .limit(30)
      .lean();

    // ---- 3. Fuzzy typo-tolerant fallback (char-subsequence regex) ----
    if (products.length < 3 && query.length >= 3) {
      // Char-subsequence pattern: "lpstck" matches "Lipstick"
      const fuzzyPattern = escaped.split('').map((c) => (c === ' ' ? '.*' : `${c}.*`)).join('');
      const fuzzyProducts = await Product.find({
        name: { $regex: fuzzyPattern, $options: 'i' },
        isActive: true,
        _id: { $nin: products.map((p) => p._id) }
      })
        .populate('category', 'name')
        .populate('brand', 'name')
        .limit(10)
        .lean();
      products.push(...fuzzyProducts);
    }

    // ---- 4. Category/brand search fallback ----
    if (products.length === 0) {
      const catIds = await Category.find({ name: { $regex: escaped, $options: 'i' } }).distinct('_id');
      if (catIds.length > 0) {
        const categoryProducts = await Product.find({
          $or: [{ category: { $in: catIds } }, { brand: { $in: catIds } }],
          isActive: true
        })
          .populate('category', 'name')
          .populate('brand', 'name')
          .limit(10)
          .lean();
        return res.json(categoryProducts);
      }
    }

    // ---- 5. Score by relevance ----
    const qLower = query.toLowerCase();
    const isSubsequence = (s, t) => {
      let i = 0;
      for (const ch of s) if (ch === t[i]) i++;
      return i === t.length;
    };
    const scored = products.map((p) => {
      const name = (p.name || '').toLowerCase();
      let score = 0;
      if (name === qLower) score += 100;                    // exact name
      else if (name.startsWith(qLower)) score += 50;        // prefix match
      else if (name.includes(qLower)) score += 30;          // substring
      else if (isSubsequence(name, qLower)) score += 10;    // fuzzy/typo match
      if (terms.every((t) => name.includes(t))) score += 20; // all words present
      if (p.barcode && p.barcode.toLowerCase().includes(qLower)) score += 15;
      if (p.tags?.some((t) => t.toLowerCase().includes(qLower))) score += 15;
      if (p.stock > 0) score += 2;                           // prefer in-stock
      return { ...p, _score: score };
    });

    scored.sort((a, b) => b._score - a._score);
    res.json(scored.slice(0, 20));
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
    console.log('📥 Add product request received');
    console.log('📦 Request body:', req.body);
    console.log('📸 Request file:', req.file ? 'File present' : 'No file');

    // Handle both JSON and FormData
    let productData;
    
    // Check if there's a file in the request
    if (req.file) {
      // Cloudinary returns the full URL in req.file.path
      productData = {
        name: req.body.name,
        category: req.body.category,
        brand: req.body.brand || null,
        mrp: parseFloat(req.body.mrp),
        price: parseFloat(req.body.price),
        barcode: req.body.barcode && req.body.barcode.trim() !== '' ? req.body.barcode.trim() : undefined,
        description: req.body.description || '',
        tax: parseFloat(req.body.tax) || 0,
        image: req.file.path // ✅ Cloudinary URL
      };
      console.log('📸 Product with Cloudinary image:', req.file.path);
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
      // If new image was uploaded to Cloudinary
      // Delete old image from Cloudinary if it exists
      if (product.image && product.image.includes('cloudinary')) {
        try {
          const publicId = product.image.split('/').slice(-2).join('/').split('.')[0];
          await cloudinary.uploader.destroy(publicId);
          console.log('✅ Old image deleted from Cloudinary:', publicId);
        } catch (cloudinaryError) {
          console.error('⚠️ Failed to delete old image from Cloudinary:', cloudinaryError.message);
        }
      }

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
        image: req.file.path // ✅ Cloudinary URL
      };
      console.log('📸 Updated with Cloudinary image:', req.file.path);
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

    // If product has a Cloudinary image, delete it from Cloudinary
    if (product.image && product.image.includes('cloudinary')) {
      try {
        const publicId = product.image.split('/').slice(-2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(publicId);
        console.log('✅ Deleted image from Cloudinary:', publicId);
      } catch (cloudinaryError) {
        console.error('⚠️ Failed to delete from Cloudinary:', cloudinaryError.message);
        // Don't fail the whole request if image deletion fails
      }
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

    // Delete old image from Cloudinary if it exists
    if (product.image && product.image.includes('cloudinary')) {
      try {
        const publicId = product.image.split('/').slice(-2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudinaryError) {
        console.error('⚠️ Failed to delete old image:', cloudinaryError.message);
      }
    }

    // Save new Cloudinary URL
    product.image = req.file.path;
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

// @desc    Get related products ("You may also like" — same category/brand)
// @route   GET /api/products/:id/related
// @access  Private
exports.getRelatedProducts = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const related = await Product.find({
      _id: { $ne: product._id },
      isActive: true,
      $or: [
        { category: product.category },
        ...(product.brand ? [{ brand: product.brand }] : [])
      ]
    })
      .populate('category', 'name')
      .populate('brand', 'name')
      // In-stock + same-brand first, then best sellers
      .sort({ isActive: 1, salesCount: -1, createdAt: -1 })
      .limit(8)
      .lean();

    // Sort: in-stock first, then salesCount
    related.sort((a, b) => (b.stock > 0) - (a.stock > 0) || (b.salesCount || 0) - (a.salesCount || 0));

    res.json(related.slice(0, 6));
  } catch (error) {
    console.error("Related products error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Frequently bought together (co-occurrence across past bills)
// @route   GET /api/products/frequently-bought?productIds=id1,id2
// @access  Private
exports.getFrequentlyBought = async (req, res) => {
  try {
    const ids = (req.query.productIds || '').split(',').filter(Boolean);
    if (ids.length === 0) return res.json([]);

    const mongoose = require('mongoose');
    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));

    // Bills that contain ANY of the given products
    const coProducts = await Bill.aggregate([
      { $match: { isVoided: false, 'items.product': { $in: objectIds } } },
      { $unwind: '$items' },
      { $match: { 'items.product': { $nin: objectIds } } },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          pairs: { $sum: 1 },
          totalQty: { $sum: '$items.quantity' }
        }
      },
      { $sort: { pairs: -1, totalQty: -1 } },
      { $limit: 6 }
    ]);

    const resultIds = coProducts.map((c) => c._id);
    const products = await Product.find({ _id: { $in: resultIds }, isActive: true })
      .populate('category', 'name')
      .populate('brand', 'name')
      .lean();
    const byId = Object.fromEntries(products.map((p) => [p._id.toString(), p]));

    res.json(
      coProducts.map((c) => ({ ...byId[c._id.toString()], pairCount: c.pairs })).filter((p) => p.name)
    );
  } catch (error) {
    console.error("Frequently bought error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Top selling products in the last 7 days (dashboard, staff-visible)
// @route   GET /api/products/top-selling
// @access  Private
exports.getTopSelling = async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 90);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const top = await Bill.aggregate([
      { $match: { isVoided: false, createdAt: { $gte: since } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 }
    ]);

    res.json(top);
  } catch (error) {
    console.error("Top selling error:", error);
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