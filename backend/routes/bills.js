const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createBill,
  getBills,
  getBill,
  voidBill,
  getTodayBills,
  getBillByNumber,
  printBill
} = require('../controllers/billController');

const router = express.Router();

router.use(protect);

router.post('/', createBill);
router.get('/', getBills);
router.get('/today', getTodayBills);
router.get('/number/:billNumber', getBillByNumber);
router.get('/:id', getBill);
router.get('/:id/print', printBill);
router.put('/:id/void', voidBill);

module.exports = router;