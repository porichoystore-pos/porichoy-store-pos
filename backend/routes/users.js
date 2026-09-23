const express = require('express');
const { protect, admin } = require('../middleware/auth');
const { getUsers, createUser, updateUser, toggleUserActive, deleteUser } = require('../controllers/userController');

const router = express.Router();

// All user-management routes are admin-only
router.use(protect, admin);

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.put('/:id/toggle', toggleUserActive);
router.delete('/:id', deleteUser);

module.exports = router;
