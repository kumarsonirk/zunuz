const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/customerAuth');
const { sendReturnUpdateEmail } = require('../lib/mail/fulfilment');

const prisma = require('../lib/prisma');

// Customer returns / replacements for damaged, defective, wrong or missing
// items. Policy: report within 24 hours of delivery, with photos and/or an
// unboxing video (uploaded first via /upload, then referenced by URL).

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const IMAGE_MAX = 5 * 1024 * 1024;
const VIDEO_MAX = 30 * 1024 * 1024;
const MAX_IMAGES = 5;
const MAX_VIDEOS = 1;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const TYPES = ['REPLACEMENT', 'REFUND'];
const REASONS = ['Damaged', 'Defective', 'Wrong item', 'Missing item', 'Other'];
const IMAGE_MIME = /^image\/(jpeg|jpg|png|webp)$/;
const VIDEO_MIME = { 'video/mp4': 'mp4', 'video/quicktime': 'mov' };

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: VIDEO_MAX, files: 1 },
  fileFilter: (req, file, cb) => {
    if (IMAGE_MIME.test(file.mimetype) || VIDEO_MIME[file.mimetype]) cb(null, true);
    else cb(new Error('Only JPG, PNG or WEBP photos, or MP4 / MOV videos are allowed'));
  },
});

// When the 24-hour reporting window closes (null if not delivered, or the
// delivery time is unknown — then the window counts as closed).
function windowEndsAt(order) {
  if (order.status !== 'DELIVERED' || !order.deliveredAt) return null;
  return new Date(new Date(order.deliveredAt).getTime() + WINDOW_MS);
}

const OPEN = ['PENDING', 'APPROVED'];
// A claim that was accepted — one per order (a rejected one can be retried).
const SETTLED = ['APPROVED', 'COMPLETED'];
const parseMedia = (raw) => { try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const shape = (r) => ({ ...r, media: parseMedia(r.media) });

// Public base for upload URLs (behind a proxy / CDN set API_PUBLIC_URL).
const publicBase = (req) => (process.env.API_PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');

// Uploads are named return-<customerId>-<time>-<rand>.<ext>, so a request can
// only attach files its own customer uploaded.
const ownFileRe = (customerId) => new RegExp(`^return-${Number(customerId)}-\\d+-\\d+\\.(webp|mp4|mov)$`, 'i');

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `customer-${req.customer.id}`,
  message: { error: 'Too many uploads — please wait a while and try again.' },
});

// Only customers with a delivery still inside its 24-hour window may upload.
async function canReportProblem(req, res, next) {
  try {
    const since = new Date(Date.now() - WINDOW_MS);
    const recent = await prisma.order.findFirst({ where: { customerId: req.customer.id, status: 'DELIVERED', deliveredAt: { gte: since } }, select: { id: true } });
    if (!recent) return res.status(400).json({ error: 'Uploads are only for reporting a problem with a recent delivery.' });
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/returns/upload — one photo or video per request.
router.post('/upload', auth, uploadLimiter, canReportProblem, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'That file is too large — videos can be up to 30 MB.' : (err.message || 'Upload failed');
      return res.status(400).json({ error: msg });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose a photo or video to upload.' });
  const base = `return-${req.customer.id}-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const baseUrl = publicBase(req);
  try {
    if (IMAGE_MIME.test(req.file.mimetype)) {
      if (req.file.size > IMAGE_MAX) return res.status(400).json({ error: 'Photos can be up to 5 MB each.' });
      // Re-encode: normalises orientation and strips EXIF (location etc.).
      await sharp(req.file.buffer)
        .rotate()
        .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(path.join(uploadsDir, `${base}.webp`));
      return res.status(201).json({ url: `${baseUrl}/uploads/${base}.webp`, kind: 'image' });
    }
    const ext = VIDEO_MIME[req.file.mimetype];
    await fs.promises.writeFile(path.join(uploadsDir, `${base}.${ext}`), req.file.buffer);
    res.status(201).json({ url: `${baseUrl}/uploads/${base}.${ext}`, kind: 'video' });
  } catch (e) {
    console.error('Return upload failed:', e);
    res.status(400).json({ error: 'We couldn\'t read that file — try a different photo or video.' });
  }
});

// GET /api/returns — my requests (newest first).
router.get('/', auth, async (req, res) => {
  try {
    const list = await prisma.returnRequest.findMany({
      where: { customerId: req.customer.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, orderId: true, type: true, reason: true, description: true, media: true, status: true, adminNote: true, createdAt: true, updatedAt: true },
    });
    res.json(list.map(shape));
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/returns — { orderId, type, reason, description, media: [{ url, kind }] }
router.post('/', auth, async (req, res) => {
  const { orderId, type, reason } = req.body || {};
  const description = typeof req.body?.description === 'string' ? req.body.description.trim().slice(0, 2000) : '';
  if (!TYPES.includes(type)) return res.status(400).json({ error: 'Choose a replacement or a refund.' });
  if (!REASONS.includes(reason)) return res.status(400).json({ error: 'Choose what went wrong.' });
  if (description.length < 10) return res.status(400).json({ error: 'Please describe the problem in a few words (at least 10 characters).' });

  // Only files this customer stored through /upload are accepted: we take
  // just the file name from what was sent, check it's theirs and exists,
  // and rebuild the URL ourselves.
  const raw = Array.isArray(req.body?.media) ? req.body.media.slice(0, MAX_IMAGES + MAX_VIDEOS + 1) : [];
  const mine = ownFileRe(req.customer.id);
  const base = publicBase(req);
  const media = [];
  const seen = new Set();
  for (const m of raw) {
    const url = typeof m === 'string' ? m : m?.url;
    const name = typeof url === 'string' ? url.split(/[?#]/)[0].split('/').pop() : '';
    const match = name.match(mine);
    if (!match) return res.status(400).json({ error: 'One of the attachments is invalid — please upload it again.' });
    if (!fs.existsSync(path.join(uploadsDir, name))) return res.status(400).json({ error: 'One of the attachments is missing — please upload it again.' });
    if (seen.has(name)) continue;
    seen.add(name);
    media.push({ url: `${base}/uploads/${name}`, kind: match[1].toLowerCase() === 'webp' ? 'image' : 'video' });
  }
  const images = media.filter((m) => m.kind === 'image').length;
  const videos = media.length - images;
  if (!media.length) return res.status(400).json({ error: 'Add at least one photo or your unboxing video.' });
  if (images > MAX_IMAGES) return res.status(400).json({ error: `You can attach up to ${MAX_IMAGES} photos.` });
  if (videos > MAX_VIDEOS) return res.status(400).json({ error: 'You can attach one video.' });

  try {
    const order = await prisma.order.findFirst({
      where: { id: Number(orderId), customerId: req.customer.id },
      include: { customer: { select: { name: true, email: true } }, address: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'DELIVERED') return res.status(400).json({ error: 'You can report a problem once your order has been delivered.' });
    const ends = windowEndsAt(order);
    if (!ends || Date.now() > ends.getTime()) {
      return res.status(400).json({ error: 'Problems must be reported within 24 hours of delivery. Please contact customer care for help.' });
    }
    // One accepted claim per order; checked under a lock on the order row so
    // two simultaneous submissions can't both get through.
    const created = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT \`id\` FROM \`Order\` WHERE \`id\` = ${order.id} FOR UPDATE`;
      const prev = await tx.returnRequest.findFirst({ where: { orderId: order.id, status: { in: [...OPEN, ...SETTLED] } }, orderBy: { createdAt: 'desc' } });
      if (prev) return { conflict: prev.status === 'PENDING' ? 'open' : 'settled' };
      return tx.returnRequest.create({
        data: { orderId: order.id, customerId: req.customer.id, type, reason, description, media: JSON.stringify(media) },
      });
    });
    if (created.conflict === 'open') return res.status(409).json({ error: 'You already have an open request for this order.' });
    if (created.conflict) return res.status(409).json({ error: 'A request for this order has already been approved, so another one can’t be opened. Please contact customer care if you need more help.' });
    sendReturnUpdateEmail(created, order).catch((e) => console.error('Error sending return email:', e));
    res.status(201).json(shape(created));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
