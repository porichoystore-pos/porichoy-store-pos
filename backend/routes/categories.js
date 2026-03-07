const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getCategories,
  getFeaturedCategories,
  getBrands,
  getCategoryTree,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryProducts
} = require('../controllers/categoryController');

const router = express.Router();

// Protect all routes
router.use(protect);

// GET routes
router.get('/', getCategories);
router.get('/featured', getFeaturedCategories);
router.get('/brands', getBrands);
router.get('/tree', getCategoryTree);
router.get('/:id', getCategory);
router.get('/:id/products', getCategoryProducts);

// POST/PUT/DELETE routes - Allow all authenticated users (staff can create categories)
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;