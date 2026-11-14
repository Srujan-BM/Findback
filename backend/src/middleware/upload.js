const multer = require('multer');
const path = require('path');

const storage = process.env.CLOUDINARY_CLOUD_NAME
  ? multer.memoryStorage()
  : multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, path.resolve(process.cwd(), 'uploads')),
    filename: (_req, file, callback) => callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname).toLowerCase()}`),
  });

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      const error = new Error('Photos must be JPG, PNG, or WebP.');
      error.status = 400;
      return callback(error);
    }
    callback(null, true);
  },
});

module.exports = upload;
