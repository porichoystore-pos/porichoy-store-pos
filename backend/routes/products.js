const express = require('express');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getProducts,
  getProduct,
  searchProducts,
  getSuggestions,
  getProductsByCategory,
  getLowStockProducts,
  getRelatedProducts,
  getFrequentlyBought,
  getTopSelling,
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
router.get('/suggestions', getSuggestions);
router.get('/top-selling', getTopSelling);
router.get('/frequently-bought', getFrequentlyBought);
router.get('/low-stock', getLowStockProducts);
router.get('/category/:categoryId', getProductsByCategory);
router.get('/:id/related', getRelatedProducts);
router.post('/visual-search', visualSearch);
router.get('/export', exportProducts);
router.post('/bulk-import', upload.single('file'), bulkImport);

// ============================================================
// Helper — run multer and extract a real error message from any shape
// ============================================================
const runMulter = (req, res, next, controllerFn) => {
  const contentType = req.headers['content-type'] || '';

  // If not multipart, skip multer entirely (JSON body without image)
  if (!contentType.includes('multipart/form-data')) {
    return controllerFn(req, res);
  }

  upload.single('image')(req, res, (err) => {
    if (err) {
      // Multer / Cloudinary errors can arrive in many shapes.
      // Extract the most useful message we can find.
      const errMsg =
        err?.message ||
        err?.error?.message ||
        err?.error ||
        (typeof err === 'string' ? err : null) ||
        'File upload failed';

      // Full logging for Render logs
      console.error('❌ Upload middleware error:', {
        message: err?.message,
        error: err?.error,
        code: err?.code,
        name: err?.name,
        http_code: err?.http_code,
        keys: err && typeof err === 'object' ? Object.keys(err) : typeof err
      });

      return res.status(400).json({
        message: errMsg,
        code: err?.code || err?.http_code || null
      });
    }
    // No error → file was uploaded (or no file in request) → call controller
    return controllerFn(req, res);
  });
};

// POST /api/products (create)
router.post('/', (req, res) => runMulter(req, res, null, addProduct));

// PUT /api/products/:id (update)
router.put('/:id', (req, res) => runMulter(req, res, null, updateProduct));

router.get('/:id', getProduct);
router.put('/:id/stock', updateStock);
router.delete('/:id', deleteProduct);

module.exports = router;