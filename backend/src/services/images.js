const cloudinary = require('cloudinary').v2;
const fs = require('fs/promises');

function detectImageFormat(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

async function validateImages(files) {
  try {
    for (const file of files) {
      const buffer = file.buffer || await fs.readFile(file.path);
      if (detectImageFormat(buffer) !== file.mimetype) {
        const error = new Error('Photo content must match its JPG, PNG, or WebP file type.');
        error.status = 400;
        throw error;
      }
    }
  } catch (error) {
    await Promise.all(files.filter((file) => file.path).map(async (file) => {
      try {
        await fs.unlink(file.path);
      } catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') throw cleanupError;
      }
    }));
    throw error;
  }
}

async function saveImages(files = []) {
  await validateImages(files);
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return files.map((file) => ({
      url: `/uploads/${file.filename}`,
      publicId: file.filename,
      originalName: file.originalname,
    }));
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return Promise.all(files.map((file) => new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder: 'findback/items', resource_type: 'image' }, (error, result) => {
      if (error) return reject(error);
      resolve({ url: result.secure_url, publicId: result.public_id, originalName: file.originalname });
    }).end(file.buffer);
  })));
}

module.exports = { saveImages, detectImageFormat };
