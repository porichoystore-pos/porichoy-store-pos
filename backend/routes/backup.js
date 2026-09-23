const express = require('express');
const { protect, admin } = require('../middleware/auth');
const { exportBackup, importBackup } = require('../controllers/backupController');

const router = express.Router();

router.use(protect, admin);
router.get('/export', exportBackup);
router.post('/import', importBackup);

module.exports = router;
