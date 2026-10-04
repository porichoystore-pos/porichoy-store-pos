const multer = require('multer');
const path = require('path');
const { storage } = require('../config/cloudinary');

// Allowed image extensions (test against file extension only, not the full name)
const ALLOWED_EXTENSIONS = ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.bmp', '.svg'];

// File filter for images only
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const extOk = ALLOWED_EXTENSIONS.includes(ext);
  const mimeOk = file.mimetype && file.mimetype.startsWith('image/');

  if (extOk && mimeOk) {
    return cb(null, true);
  }

  // Log exactly what was rejected (helps debug on Render)
  console.warn('🚫 File rejected by filter:', {
    filename: file.originalname,
    extension: ext,
    mimetype: file.mimetype,
    reason: !extOk ? 'extension not allowed' : 'mimetype not an image'
  });

  cb(
    new Error(
      `Only image files are allowed (received: ${file.originalname}, type: ${file.mimetype})`
    )
  );
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  },
  fileFilter
});

module.exports = upload;