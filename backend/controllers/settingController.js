const Setting = require('../models/Setting');
const { cloudinary } = require('../config/cloudinary');

// Whitelisted fields that admins can update
const EDITABLE_FIELDS = [
  'storeName', 'address', 'phone', 'email', 'receiptFooter',
  'currencySymbol', 'defaultTaxRate', 'defaultLowStockAlert',
  'defaultPaymentMethod', 'enableVisualSearch', 'enableBarcodeScanner', 'theme'
];

// @desc    Get store settings (any authenticated user)
// @route   GET /api/settings
// @access  Private
exports.getSettings = async (req, res) => {
  try {
    const settings = await Setting.getSingleton();
    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update store settings
// @route   PUT /api/settings
// @access  Private/Admin
exports.updateSettings = async (req, res) => {
  try {
    const settings = await Setting.getSingleton();

    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field];
      }
    }

    await settings.save();
    res.json(settings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Upload store logo (to Cloudinary)
// @route   POST /api/settings/logo
// @access  Private/Admin
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' });
    }

    const settings = await Setting.getSingleton();

    // Replace old logo on Cloudinary
    if (settings.logo && settings.logo.includes('cloudinary')) {
      try {
        const publicId = settings.logo.split('/').slice(-2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (e) {
        console.error('⚠️ Failed to delete old logo:', e.message);
      }
    }

    settings.logo = req.file.path; // Cloudinary URL from multer-storage-cloudinary
    await settings.save();

    res.json({ message: 'Logo uploaded', logo: settings.logo });
  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
