const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  getCustomerBills
} = require('../controllers/customerController');

const router = express.Router();

router.use(protect);

router.get('/', getCustomers);
router.get('/search', searchCustomers);
router.post('/', createCustomer);
router.get('/:id', getCustomer);
router.get('/:id/bills', getCustomerBills);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

module.exports = router;