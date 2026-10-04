const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Verify credentials are present on startup
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  console.warn('⚠️  Cloudinary credentials missing — image uploads will fail');
}

// Create storage engine for Multer
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    // Preserve the original extension so Cloudinary stores it correctly
    const originalExt = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
    const safeExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(originalExt)
      ? originalExt
      : 'jpg';

    // Unique filename base
    const baseName = `product-${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    return {
      folder: 'porichoy-store/products',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      public_id: baseName,
      format: safeExt,
      transformation: [{ width: 800, height: 800, crop: 'limit' }]
    };
  }
});

module.exports = { cloudinary, storage };