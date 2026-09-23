const express = require('express');
const { protect, admin } = require('../middleware/auth');
const { createManualSale, updateManualSale } = require('../controllers/saleController');

const router = express.Router();

// Manual sales are admin-only operations
router.use(protect, admin);

router.post('/manual', createManualSale);
router.put('/manual/:id', updateManualSale);

module.exports = router;
