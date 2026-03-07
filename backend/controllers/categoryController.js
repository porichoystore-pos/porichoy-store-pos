const Category = require('../models/Category');
const Product = require('../models/Product');

// @desc    Get all categories with hierarchy
// @route   GET /api/categories
// @access  Private
exports.getCategories = async (req, res) => {
  try {
    const { type, featured, parent } = req.query;
    const query = { isActive: true };

    if (type) query.type = type;
    if (featured === 'true') query.isFeatured = true;
    if (parent) query.parentCategory = parent === 'null' ? null : parent;

    const categories = await Category.find(query)
      .populate('subcategories')
      .populate('productCount')
      .sort({ displayOrder: 1, name: 1 });

    res.json(categories);
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get featured categories (top categories for display)
// @route   GET /api/categories/featured
// @access  Private
exports.getFeaturedCategories = async (req, res) => {
  try {
    const featured = await Category.find({ 
      isActive: true, 
      isFeatured: true,
      type: 'main'
    })
    .populate('productCount')
    .sort({ displayOrder: 1 })
    .limit(8);

    res.json(featured);
  } catch (error) {
    console.error("Get featured categories error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get brands
// @route   GET /api/categories/brands
// @access  Private
exports.getBrands = async (req, res) => {
  try {
    const brands = await Category.find({ 
      type: 'brand',
      isActive: true 
    })
    .sort({ name: 1 });

    res.json(brands);
  } catch (error) {
    console.error("Get brands error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get category tree (hierarchical)
// @route   GET /api/categories/tree
// @access  Private
exports.getCategoryTree = async (req, res) => {
  try {
    const mainCategories = await Category.find({ 
      type: 'main',
      isActive: true 
    })
    .sort({ displayOrder: 1 });

    const tree = await Promise.all(mainCategories.map(async (main) => {
      const subcategories = await Category.find({
        parentCategory: main._id,
        isActive: true
      }).sort({ name: 1 });

      return {
        ...main.toObject(),
        subcategories
      };
    }));

    res.json(tree);
  } catch (error) {
    console.error("Get category tree error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Private
exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('subcategories');
    
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const productCount = await Product.countDocuments({ 
      $or: [
        { category: category._id },
        { subcategory: category._id },
        { brand: category._id }
      ],
      isActive: true 
    });
    
    res.json({
      ...category.toObject(),
      productCount
    });
  } catch (error) {
    console.error("Get category error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res) => {
  try {
    const { name, description, parentCategory, type, image, icon, color, isFeatured, displayOrder, tags } = req.body;

    const existing = await Category.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = await Category.create({
      name,
      description,
      parentCategory: parentCategory || null,
      type: type || 'main',
      image,
      icon,
      color: color || '#3B82F6',
      isFeatured: isFeatured || false,
      displayOrder: displayOrder || 0,
      tags: tags || []
    });

    res.status(201).json(category);
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check name uniqueness if changed
    if (req.body.name && req.body.name !== category.name) {
      const existing = await Category.findOne({ name: req.body.name });
      if (existing) {
        return res.status(400).json({ message: "Category name already exists" });
      }
    }

    Object.assign(category, req.body);
    await category.save();

    res.json(category);
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check if category has subcategories
    const subcategories = await Category.countDocuments({ parentCategory: category._id });
    if (subcategories > 0) {
      return res.status(400).json({ 
        message: "Cannot delete category with subcategories. Please delete subcategories first." 
      });
    }

    // Check if category has products
    const productCount = await Product.countDocuments({ 
      $or: [
        { category: category._id },
        { subcategory: category._id },
        { brand: category._id }
      ] 
    });
    
    if (productCount > 0) {
      return res.status(400).json({ 
        message: "Cannot delete category with products. Please reassign products first." 
      });
    }

    // Soft delete
    category.isActive = false;
    await category.save();

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get products by category/brand
// @route   GET /api/categories/:id/products
// @access  Private
exports.getCategoryProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const query = { isActive: true };
    
    if (category.type === 'brand') {
      query.brand = id;
    } else if (category.type === 'main') {
      query.category = id;
    } else if (category.type === 'sub') {
      query.subcategory = id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('subcategory', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Product.countDocuments(query);

    res.json({
      products,
      category: {
        ...category.toObject(),
        productCount: total
      },
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
    });
  } catch (error) {
    console.error("Get category products error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};