const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../../middleware/adminAuth');

const uploadsDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (req, file, cb) => {
    // SVG deliberately excluded — it's an XML format that can embed <script>
    // tags, making it a stored-XSS vector when served back from /uploads.
    const allowedMime = /^image\/(jpeg|jpg|png|gif|webp)$/;
    if (allowedMime.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed (JPG, PNG, GIF, WEBP)'));
  }
});

router.post('/', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({ url: `${baseUrl}/uploads/${req.file.filename}` });
});

module.exports = router;
