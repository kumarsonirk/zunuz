const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const auth = require('../../middleware/adminAuth');

const uploadsDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Buffered in memory (not written to disk directly) so every upload can be
// re-encoded to WebP below — product photos otherwise land as whatever
// multi-MB JPEG/PNG the admin's phone camera produced, which is the biggest
// single drag on the storefront's image loading speed.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (req, file, cb) => {
    // SVG deliberately excluded — it's an XML format that can embed <script>
    // tags, making it a stored-XSS vector when served back from /uploads.
    const allowedMime = /^image\/(jpeg|jpg|png|gif|webp)$/;
    if (allowedMime.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed (JPG, PNG, GIF, WEBP)'));
  }
});

router.post('/', auth, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
    await sharp(req.file.buffer)
      // Product photos never need to display wider than this — capping it
      // keeps a huge camera-original from bloating the file even after
      // WebP compression. withoutEnlargement leaves smaller images untouched.
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path.join(uploadsDir, filename));
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({ url: `${baseUrl}/uploads/${filename}` });
  } catch (err) {
    console.error('Image conversion failed:', err);
    res.status(500).json({ error: 'Could not process image' });
  }
});

module.exports = router;
