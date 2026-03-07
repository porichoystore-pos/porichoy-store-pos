const express = require('express');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getProducts,
  getProduct,
  searchProducts,
  visualSearch,
  addProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  bulkImport,
  exportProducts
} = require('../controllers/productController');

const router = express.Router();

router.use(protect);

router.get('/', getProducts);
router.get('/search', searchProducts);
router.post('/visual-search', visualSearch);
router.get('/export', exportProducts);
router.post('/bulk-import', upload.single('file'), bulkImport);

// Make image optional - don't use multer for non-image requests
router.post('/', (req, res, next) => {
  // Check if request contains file
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    // If it's multipart, use multer
    upload.single('image')(req, res, (err) => {
      if (err) {
        console.log('Multer error:', err.message);
        // If error is not about file type, return error
        if (err.message !== 'Only images are allowed') {
          return res.status(400).json({ message: err.message });
        }
        // If it's a file type error but no file was actually uploaded, continue without image
        if (!req.file) {
          return addProduct(req, res);
        }
        return res.status(400).json({ message: err.message });
      }
      addProduct(req, res);
    });
  } else {
    // If not multipart, just process normally
    addProduct(req, res);
  }
});

router.put('/:id', (req, res, next) => {
  // Check if request contains file
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    // If it's multipart, use multer
    upload.single('image')(req, res, (err) => {
      if (err) {
        console.log('Multer error:', err.message);
        // If error is not about file type, return error
        if (err.message !== 'Only images are allowed') {
          return res.status(400).json({ message: err.message });
        }
        // If it's a file type error but no file was actually uploaded, continue without image
        if (!req.file) {
          return updateProduct(req, res);
        }
        return res.status(400).json({ message: err.message });
      }
      updateProduct(req, res);
    });
  } else {
    // If not multipart, just process normally
    updateProduct(req, res);
  }
});

router.get('/:id', getProduct);
router.put('/:id/stock', updateStock);
router.delete('/:id', deleteProduct);

module.exports = router;