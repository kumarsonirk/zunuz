const router = require('express').Router();
const { issueRefund } = require('./orders');
const { sendReturnUpdateEmail } = require('../../lib/mail/fulfilment');

const prisma = require('../../lib/prisma');

// Admin side of returns / replacements (mounted behind adminAuth +
// the 'returns' permission + activity logging in src/index.js).
const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'];
// Allowed moves from each status.
const NEXT = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['COMPLETED', 'REJECTED'],
  REJECTED: ['PENDING'],
  COMPLETED: [],
};

const INCLUDE = {
  customer: { select: { id: true, name: true, email: true, phone: true } },
  order: {
    select: {
      id: true, total: true, discount: true, couponCode: true, status: true, paymentMethod: true, paymentStatus: true,
      razorpayPaymentId: true, deliveredAt: true, updatedAt: true, createdAt: true,
      refundStatus: true, refundAmount: true, refundedAt: true, refundError: true, refundId: true,
      address: { select: { name: true, phone: true, email: true, city: true, state: true, pincode: true } },
      items: { select: { id: true, quantity: true, price: true, product: { select: { id: true, name: true, image: true } } } },
    },
  },
};

const parseMedia = (raw) => { try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const shape = (r) => ({ ...r, media: parseMedia(r.media) });

// GET /api/admin/returns/counts
router.get('/counts', async (req, res) => {
  try {
    const groups = await prisma.returnRequest.groupBy({ by: ['status'], _count: { _all: true } });
    const counts = { ALL: 0, PENDING: 0, APPROVED: 0, REJECTED: 0, COMPLETED: 0 };
    groups.forEach((g) => { counts[g.status] = (counts[g.status] || 0) + g._count._all; counts.ALL += g._count._all; });
    res.json(counts);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/admin/returns?status=PENDING&page=1
router.get('/', async (req, res) => {
  const status = STATUSES.includes(req.query.status) ? req.query.status : null;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const where = status ? { status } : {};
  try {
    const [rows, total] = await Promise.all([
      prisma.returnRequest.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.returnRequest.count({ where }),
    ]);
    res.json({ requests: rows.map(shape), total, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id(\\d+)', async (req, res) => {
  try {
    const r = await prisma.returnRequest.findUnique({ where: { id: Number(req.params.id) }, include: INCLUDE });
    if (!r) return res.status(404).json({ error: 'Request not found' });
    res.json(shape(r));
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/admin/returns/:id — { status?, adminNote? }. The note is shown to
// the customer; every status change emails them.
router.put('/:id(\\d+)', async (req, res) => {
  const { status } = req.body || {};
  const hasNote = typeof req.body?.adminNote === 'string';
  const adminNote = hasNote ? req.body.adminNote.trim().slice(0, 2000) : undefined;
  if (status != null && !STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const existing = await prisma.returnRequest.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) return res.status(404).json({ error: 'Request not found' });
    const changed = status != null && status !== existing.status;
    if (changed && !NEXT[existing.status].includes(status)) {
      return res.status(400).json({ error: `A ${existing.status.toLowerCase()} request can't be moved to ${status.toLowerCase()}.` });
    }
    if (!changed && !hasNote) return res.status(400).json({ error: 'Nothing to update.' });

    // One accepted claim per order: approving (or re-opening a rejected
    // request) is blocked while another request on the same order is
    // already approved / completed — or, when re-opening, still pending.
    if (changed && ['APPROVED', 'PENDING'].includes(status)) {
      const blocking = status === 'APPROVED' ? ['APPROVED', 'COMPLETED'] : ['PENDING', 'APPROVED', 'COMPLETED'];
      const other = await prisma.returnRequest.findFirst({ where: { orderId: existing.orderId, id: { not: existing.id }, status: { in: blocking } } });
      if (other) return res.status(409).json({ error: `Order #${existing.orderId} already has ${other.status.toLowerCase()} request #${other.id} — only one claim per order.` });
    }

    const data = {};
    if (changed) data.status = status;
    if (hasNote) data.adminNote = adminNote || null;
    // Conditional on the status we read, so two admins can't both move it.
    const n = await prisma.returnRequest.updateMany({ where: { id: existing.id, status: existing.status }, data });
    if (!n.count) return res.status(409).json({ error: 'This request was just updated — refresh and try again.' });
    const updated = await prisma.returnRequest.findUnique({ where: { id: existing.id }, include: INCLUDE });

    if (changed) {
      const order = await prisma.order.findUnique({ where: { id: existing.orderId }, include: { customer: { select: { name: true, email: true } }, address: true } });
      if (order) sendReturnUpdateEmail(updated, order).catch((e) => console.error('Error sending return update email:', e));
    }
    res.locals.activitySummary = changed
      ? `Marked return request #${existing.id} (order #${existing.orderId}) as ${status.toLowerCase()}`
      : `Updated the note on return request #${existing.id}`;
    res.json(shape(updated));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/returns/:id/refund — refund the order behind an approved
// REFUND request (same rules as the Orders refund; lets admins with only
// the Returns permission settle a return).
router.post('/:id(\\d+)/refund', async (req, res) => {
  try {
    const r = await prisma.returnRequest.findUnique({ where: { id: Number(req.params.id) } });
    if (!r) return res.status(404).json({ error: 'Request not found' });
    if (r.type !== 'REFUND' || !['APPROVED', 'COMPLETED'].includes(r.status)) {
      return res.status(400).json({ error: 'Only approved refund requests can be refunded from here.' });
    }
    const { amount, reason, manual, note } = req.body || {};
    const out = await issueRefund(r.orderId, { amount, reason: reason || `Return request #${r.id}: ${r.reason}`, manual: manual === true, note });
    if (out.summary) res.locals.activitySummary = `${out.summary} — return request #${r.id}`;
    if (out.status !== 200) return res.status(out.status).json(out.body);
    const updated = await prisma.returnRequest.findUnique({ where: { id: r.id }, include: INCLUDE });
    res.json(shape(updated));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
