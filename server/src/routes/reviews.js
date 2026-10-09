const router = require('express').Router({ mergeParams: true });
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/customerAuth');
const settings = require('../lib/settings');

const prisma = require('../lib/prisma');

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Customer review photos are casual phone snapshots, not product hero shots —
// a much smaller cap than the admin product-photo upload (8MB) is intentional
// here, both to keep storage/bandwidth sane across many customers and because
// the frontend already rejects anything over this before it's even sent.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    const allowedMime = /^image\/(jpeg|jpg|png|webp)$/;
    if (allowedMime.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, or WEBP images are allowed'));
  }
});

// Customer id from an optional Bearer token (GET is public, so a missing or
// bad token just means "anonymous"). Same token rules as customerAuth.
async function optionalCustomerId(req) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return null;
  try { return (await auth.verifyCustomerToken(h.slice(7)))?.id ?? null; } catch { return null; }
}

// Reviews (and their photo) come from verified buyers only: the customer
// must have a delivered order containing this product.
const NOT_A_BUYER = 'Only customers who received this item can review it.';
const hasReceived = async (customerId, productId) => !!(await prisma.order.findFirst({
  where: { customerId, status: 'DELIVERED', items: { some: { productId } } },
  select: { id: true },
}));

const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `customer-${req.customer.id}`,
  message: { error: 'Too many reviews in a short time — please try again later.' },
});

// GET /api/products/:productId/reviews/eligibility — can the signed-in
// customer review this product? { canReview, reviewed, message? }
router.get('/eligibility', auth, async (req, res) => {
  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId)) return res.status(400).json({ error: 'Invalid product' });
  try {
    const [received, existing] = await Promise.all([
      hasReceived(req.customer.id, productId),
      prisma.productReview.findFirst({ where: { productId, customerId: req.customer.id }, select: { id: true } }),
    ]);
    res.set('Cache-Control', 'no-store');
    res.json({ canReview: received && !existing, reviewed: !!existing, ...(received ? {} : { message: NOT_A_BUYER }) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/products/:productId/reviews — public. Only approved reviews are
// listed (so the rating/average the product page computes uses approved
// reviews only). If the request carries a valid customer token, that
// customer's own review still awaiting approval is included too, flagged
// `pending: true`, so the page can say "Your review is awaiting approval".
router.get('/', async (req, res) => {
  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId)) return res.status(400).json({ error: 'Invalid product' });
  try {
    const customerId = await optionalCustomerId(req);
    const reviews = await prisma.productReview.findMany({
      where: {
        productId,
        OR: [{ isApproved: true }, ...(customerId ? [{ isApproved: false, customerId }] : [])],
      },
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { name: true } } }
    });
    res.set('Cache-Control', 'no-store');
    res.json(reviews.map((r) => (r.isApproved ? r : { ...r, pending: true })));
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/products/:productId/reviews — requires login, one per customer
// per product (enforced by the @@unique constraint, not just checked here),
// and never editable afterward — there is deliberately no PUT for customers.
// The buyer check runs before the photo is even read.
router.post('/', auth, reviewLimiter, async (req, res, next) => {
  const productId = Number(req.params.productId);
  if (!Number.isInteger(productId)) return res.status(400).json({ error: 'Invalid product' });
  try {
    if (!(await hasReceived(req.customer.id, productId))) return res.status(403).json({ error: NOT_A_BUYER });
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
}, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
    next();
  });
}, async (req, res) => {
  const productId = Number(req.params.productId);
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment ?? '').trim().slice(0, 1000) || null;

  if (!Number.isInteger(productId)) return res.status(400).json({ error: 'Invalid product' });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    let imageUrl = null;
    if (req.file) {
      const base = `review-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      await sharp(req.file.buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(path.join(uploadsDir, `${base}.webp`));
      // Configured public API address when set (never trust the Host header).
    const baseUrl = String(process.env.API_PUBLIC_URL || '').replace(/\/+$/, '') || `${req.protocol}://${req.get('host')}`;
      imageUrl = `${baseUrl}/uploads/${base}.webp`;
    }

    // With review moderation on (admin Settings), new reviews stay hidden
    // until an admin approves them in Reviews → Pending.
    const moderated = !!settings.get().reviewModeration;
    const review = await prisma.productReview.create({
      data: { productId, customerId: req.customer.id, rating, comment, image: imageUrl, isApproved: !moderated },
      include: { customer: { select: { name: true } } }
    });
    res.status(201).json(moderated
      ? { ...review, pending: true, message: "Thanks! Your review is awaiting approval — it'll appear once our team has checked it." }
      : review);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: "You've already reviewed this product" });
    }
    if (err.code === 'P2003') return res.status(404).json({ error: 'Product not found' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
