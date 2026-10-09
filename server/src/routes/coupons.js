const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const coupons = require('../lib/coupons');
const { verifyCustomerToken } = require('../middleware/customerAuth');

const prisma = require('../lib/prisma');

// Public coupon check for the checkout's "Apply" button. Signing in is
// optional: with a valid customer token the per-customer limit and the
// verified-email rule are checked too (anonymous callers only learn whether
// the code itself is valid). This is a preview only — POST /api/orders
// re-checks everything, verification included.
// Rate-limited so codes can't be brute-forced.
const limiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many coupon attempts — please wait a few minutes and try again.' } });

// Same token rules as customerAuth (current tokenVersion, no reset /
// verify-email tokens); anything else is treated as anonymous.
async function optionalCustomerId(req) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return null;
  try { return (await verifyCustomerToken(h.slice(7)))?.id || null; } catch { return null; }
}

// GET /api/coupons/available — public offers for the bag page: coupons the
// admin marked "Show on the bag page" that are switched on, already started,
// not expired and not used up. For a signed-in shopper, coupons they've
// already used up to the per-customer limit (e.g. once-only WELCOME codes)
// are left out. Whether one fits *this* order (minimum, verified email) is
// answered by /validate on Apply.
const listLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests — try again in a minute.' } });
router.get('/available', listLimiter, async (req, res) => {
  try {
    const now = new Date();
    const rows = await prisma.coupon.findMany({
      where: {
        isActive: true,
        isPublic: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
      },
      orderBy: [{ minOrder: 'asc' }, { value: 'desc' }],
      take: 20,
    });
    // This shopper's uses per coupon: completed redemptions + unpaid online
    // checkouts currently holding the code (same counting as evaluate()).
    const customerId = await optionalCustomerId(req);
    const usedByMe = new Map();
    if (customerId) {
      const limited = rows.filter((c) => c.perCustomerLimit != null);
      if (limited.length) {
        const [redeemed, reserved] = await Promise.all([
          prisma.couponRedemption.groupBy({ by: ['couponId'], where: { customerId, couponId: { in: limited.map((c) => c.id) } }, _count: { _all: true } }),
          prisma.order.groupBy({ by: ['couponCode'], where: { ...coupons.reservedWhere(), customerId, couponCode: { in: limited.map((c) => c.code) } }, _count: { _all: true } }),
        ]);
        const idByCode = new Map(limited.map((c) => [c.code, c.id]));
        redeemed.forEach((r) => usedByMe.set(r.couponId, (usedByMe.get(r.couponId) || 0) + r._count._all));
        reserved.forEach((r) => { const id = idByCode.get(r.couponCode); if (id) usedByMe.set(id, (usedByMe.get(id) || 0) + r._count._all); });
      }
    }
    res.set('Cache-Control', 'no-store');
    res.json(rows
      .filter((c) => c.usageLimit == null || c.usedCount < c.usageLimit)
      .filter((c) => c.perCustomerLimit == null || (usedByMe.get(c.id) || 0) < c.perCustomerLimit)
      .map((c) => ({ code: c.code, description: c.description || null, rule: coupons.describeRule(c), minOrder: c.minOrder, expiresAt: c.expiresAt })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not load offers right now.' });
  }
});

// POST /api/coupons/validate { code, itemsTotal } →
//   { ok, code, discount, message, rule, description, needsVerification? }
router.post('/validate', limiter, async (req, res) => {
  const itemsTotal = Number(req.body?.itemsTotal);
  if (!Number.isFinite(itemsTotal) || itemsTotal < 0) return res.status(400).json({ error: 'itemsTotal must be a positive number.' });
  try {
    const result = await coupons.evaluate(req.body?.code, itemsTotal, await optionalCustomerId(req));
    const c = result.coupon;
    res.json({
      ok: result.ok,
      code: c?.code || coupons.normalizeCode(req.body?.code),
      discount: result.discount,
      message: result.message,
      ...(result.message === coupons.UNVERIFIED_MSG || result.message === coupons.NO_EMAIL_MSG ? { needsVerification: true } : {}),
      // Only describe the coupon when it actually exists and is live.
      ...(result.ok || (c && c.isActive) ? { rule: coupons.describeRule(c), description: c.description || null, minOrder: c.minOrder } : {}),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not check the coupon right now.' });
  }
});

module.exports = router;
