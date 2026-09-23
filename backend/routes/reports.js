const express = require('express');
const { protect, admin } = require('../middleware/auth');
const {
  getSalesReport,
  getInventoryReport,
  getTopProducts,
  getCategorySales,
  getDailySales,
  getProfitReport,
  exportReport
} = require('../controllers/reportController');

const router = express.Router();

router.use(protect, admin);

router.get('/sales', getSalesReport);
router.get('/inventory', getInventoryReport);
router.get('/top-products', getTopProducts);
router.get('/category-sales', getCategorySales);
router.get('/daily', getDailySales);
router.get('/profit', getProfitReport);
router.get('/export', exportReport);

module.exports = router;