const express = require('express');
const { protect, admin } = require('../middleware/auth');
const {
  createOrUpdateDailySale,
  getDailySales,
  getDailySale,
  updateDailySale,
  deleteDailySale,
  getMonthlySummary
} = require('../controllers/dailySalesController');

const router = express.Router();

router.use(protect);

// Public (any authenticated user) — read
router.get('/', getDailySales);
router.get('/summary/monthly', admin, getMonthlySummary);
router.get('/:id', getDailySale);

// Admin-only — write
router.post('/', admin, createOrUpdateDailySale);
router.put('/:id', admin, updateDailySale);
router.delete('/:id', admin, deleteDailySale);

module.exports = router;