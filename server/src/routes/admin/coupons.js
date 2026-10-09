const router = require('express').Router();
const { CODE_RE, normalizeCode, couponStatus, describeRule } = require('../../lib/coupons');

const prisma = require('../../lib/prisma');

// Admin coupons (/api/admin/coupons, "coupons" permission). Successful
// writes are activity-logged by the section middleware (see src/index.js).

const MAX_INT = 10000000;

class BadInput extends Error {}
const bad = (msg) => { throw new BadInput(msg); };

const optInt = (v, label, min, max = MAX_INT) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) bad(`${label} must be a whole number${max < MAX_INT ? ` between ${min} and ${max}` : ` of at least ${min}`}.`);
  return n;
};
const optDate = (v, label) => {
  if (v === undefined || v === null || v === '') return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) bad(`${label} isn't a valid date.`);
  return d;
};

// Validate a full coupon (create) or merge a partial update onto `current`.
function clean(body, current = null) {
  const has = (k) => body[k] !== undefined;
  const src = { ...(current || {}), ...Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)) };
  const out = {};

  if (!current || has('code')) {
    const code = normalizeCode(src.code);
    if (!code) bad('Enter a coupon code.');
    if (!CODE_RE.test(code)) bad('Code must be 3–20 characters: letters A–Z, numbers, "-" or "_".');
    out.code = code;
  }
  if (!current || has('description')) {
    const d = String(src.description ?? '').trim();
    if (d.length > 255) bad('Description must be at most 255 characters.');
    out.description = d || null;
  }
  const type = String(src.type || '').toUpperCase();
  if (!['PERCENT', 'FLAT'].includes(type)) bad('Pick a discount type: percent or flat amount.');
  out.type = type;
  out.value = type === 'PERCENT' ? optInt(src.value, 'Percent off', 1, 100) : optInt(src.value, 'Discount amount', 1);
  if (out.value == null) bad(type === 'PERCENT' ? 'Enter the percent off (1–100).' : 'Enter the discount amount in ₹.');
  out.minOrder = optInt(src.minOrder, 'Minimum order', 0) ?? 0;
  out.maxDiscount = type === 'PERCENT' ? optInt(src.maxDiscount, 'Max discount', 1) : null;
  out.startsAt = optDate(src.startsAt, 'Start date');
  out.expiresAt = optDate(src.expiresAt, 'End date');
  if (out.startsAt && out.expiresAt && out.expiresAt <= out.startsAt) bad('The end date must be after the start date.');
  out.usageLimit = optInt(src.usageLimit, 'Total usage limit', 1);
  out.perCustomerLimit = optInt(src.perCustomerLimit, 'Per-customer limit', 1);
  out.isActive = src.isActive === undefined ? true : !!src.isActive;
  // Listed on the shoppers' bag page ("Offers for you").
  out.isPublic = src.isPublic === undefined ? (current ? current.isPublic : true) : !!src.isPublic;
  if (current && has('usageLimit') && out.usageLimit != null && out.usageLimit < current.usedCount) {
    bad(`The usage limit can't be lower than the ${current.usedCount} times it's already been used.`);
  }
  return out;
}

const withMeta = (c, agg) => ({
  ...c,
  status: couponStatus(c),
  rule: describeRule(c),
  redemptions: agg?._count?._all || 0,
  discountGiven: agg?._sum?.discount || 0,
});

async function aggregates(ids) {
  if (!ids.length) return new Map();
  const rows = await prisma.couponRedemption.groupBy({ by: ['couponId'], where: { couponId: { in: ids } }, _count: { _all: true }, _sum: { discount: true } });
  return new Map(rows.map((r) => [r.couponId, r]));
}

// GET / → { coupons, stats }
router.get('/', async (req, res) => {
  try {
    const list = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    const agg = await aggregates(list.map((c) => c.id));
    const coupons = list.map((c) => withMeta(c, agg.get(c.id)));
    const totals = await prisma.couponRedemption.aggregate({ _count: { _all: true }, _sum: { discount: true } });
    res.json({
      coupons,
      stats: {
        total: coupons.length,
        active: coupons.filter((c) => c.status === 'ACTIVE').length,
        scheduled: coupons.filter((c) => c.status === 'SCHEDULED').length,
        redemptions: totals._count._all,
        discountGiven: totals._sum.discount || 0,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not load coupons.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = clean(req.body || {});
    const created = await prisma.coupon.create({ data });
    res.locals.activitySummary = `Created coupon ${created.code} (${describeRule(created)})`;
    res.status(201).json(withMeta(created));
  } catch (e) {
    if (e instanceof BadInput) return res.status(400).json({ error: e.message });
    if (e.code === 'P2002') return res.status(409).json({ error: 'A coupon with this code already exists.' });
    console.error(e);
    res.status(500).json({ error: 'Could not create the coupon.' });
  }
});

// PUT /:id — full or partial update (e.g. { isActive } from the row toggle).
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const current = await prisma.coupon.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: 'Coupon not found.' });
    const data = clean(req.body || {}, current);
    if (data.code && data.code !== current.code) {
      const used = await prisma.couponRedemption.count({ where: { couponId: id } });
      if (used) return res.status(400).json({ error: `${current.code} has already been used on ${used} order${used === 1 ? '' : 's'}, so its code can't change — create a new coupon instead.` });
    }
    const updated = await prisma.coupon.update({ where: { id }, data });
    const onlyToggle = Object.keys(req.body || {}).length === 1 && 'isActive' in req.body;
    res.locals.activitySummary = onlyToggle
      ? `${updated.isActive ? 'Switched on' : 'Switched off'} coupon ${updated.code}`
      : `Updated coupon ${updated.code} (${describeRule(updated)})`;
    const agg = await aggregates([id]);
    res.json(withMeta(updated, agg.get(id)));
  } catch (e) {
    if (e instanceof BadInput) return res.status(400).json({ error: e.message });
    if (e.code === 'P2002') return res.status(409).json({ error: 'A coupon with this code already exists.' });
    console.error(e);
    res.status(500).json({ error: 'Could not save the coupon.' });
  }
});

// DELETE /:id — only for coupons that were never used (deleting would also
// delete their redemption history); used ones should be switched off.
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const current = await prisma.coupon.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: 'Coupon not found.' });
    const used = await prisma.couponRedemption.count({ where: { couponId: id } });
    if (used) {
      return res.status(409).json({ error: `${current.code} has been used on ${used} order${used === 1 ? '' : 's'}. Switch it off instead to keep its history.`, code: 'COUPON_REDEEMED' });
    }
    await prisma.coupon.delete({ where: { id } });
    res.locals.activitySummary = `Deleted coupon ${current.code}`;
    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not delete the coupon.' });
  }
});

module.exports = router;
