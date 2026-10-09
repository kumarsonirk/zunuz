const router = require('express').Router();
const auth = require('../../middleware/adminAuth');

const prisma = require('../../lib/prisma');

const INCLUDE = {
  product: { select: { id: true, name: true, image: true, slug: true } },
  customer: { select: { name: true, email: true } }
};

// GET /api/admin/reviews — every product review across the whole catalog, in
// one place, newest first (pending ones included; `isApproved` tells them apart).
router.get('/', auth, async (req, res) => {
  try {
    const reviews = await prisma.productReview.findMany({ include: INCLUDE, orderBy: { createdAt: 'desc' } });
    res.json(reviews);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/admin/reviews/approve — bulk approve. Body { ids: [1, 2, …] }.
router.post('/approve', auth, async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? [...new Set(req.body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))] : [];
  if (!ids.length) return res.status(400).json({ error: 'Pick at least one review' });
  if (ids.length > 500) return res.status(400).json({ error: 'Too many reviews at once' });
  try {
    const { count } = await prisma.productReview.updateMany({ where: { id: { in: ids }, isApproved: false }, data: { isApproved: true } });
    res.locals.activitySummary = `Approved ${count} product review${count === 1 ? '' : 's'}`;
    res.json({ approved: count, ids });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/admin/reviews/:id — moderation/correction (customers themselves
// can never edit a review once submitted; this is admin-only). Accepts
// rating, comment and isApproved.
router.put('/:id', auth, async (req, res) => {
  const { rating, comment, isApproved } = req.body || {};
  if (rating != null && (!Number.isInteger(Number(rating)) || rating < 1 || rating > 5)) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }
  if (isApproved !== undefined && typeof isApproved !== 'boolean') {
    return res.status(400).json({ error: 'isApproved must be true or false' });
  }
  if (comment != null && String(comment).length > 1000) {
    return res.status(400).json({ error: 'Comment must be at most 1000 characters' });
  }
  try {
    const review = await prisma.productReview.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(rating != null ? { rating: Number(rating) } : {}),
        ...(comment !== undefined ? { comment: String(comment ?? '').trim() || null } : {}),
        ...(isApproved !== undefined ? { isApproved } : {})
      },
      include: INCLUDE
    });
    const onlyApproval = isApproved !== undefined && rating == null && comment === undefined;
    if (onlyApproval) res.locals.activitySummary = `${isApproved ? 'Approved' : 'Unapproved'} review #${review.id} on “${String(review.product?.name || '').slice(0, 80)}”`;
    res.json(review);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Review not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/reviews/:id (also how a pending review is rejected)
router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.productReview.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Review deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Review not found' });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
