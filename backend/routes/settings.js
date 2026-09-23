const express = require('express');
const { protect, admin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { getSettings, updateSettings, uploadLogo } = require('../controllers/settingController');

const router = express.Router();

router.get('/', protect, getSettings);
router.put('/', protect, admin, updateSettings);
router.post('/logo', protect, admin, upload.single('logo'), uploadLogo);

module.exports = router;
