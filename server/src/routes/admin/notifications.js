const router = require('express').Router();
const settings = require('../../lib/settings');
const { sendLowStockAlert, alertRecipients } = require('../../lib/alerts');

const prisma = require('../../lib/prisma');

// Admin notification feed for the top-bar bell (growth). Mounted at
// /api/admin/notifications behind adminAuth only — each group is filtered by
// the signed-in admin's permissions.
//   GET  /                  { items: [{ id, type, group, title, detail, createdAt, link, tone, highlight }], generatedAt }
//   POST /send-low-stock    email the low-stock digest now
// Inventory items have no event time (createdAt = null): they're standing
// "needs attention" items and never count as unread.
const REAL = { OR: [{ paymentMethod: 'COD' }, { paymentStatus: 'PAID' }] };
const DAY = 864e5;
const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const who = (c) => c?.name || c?.email || 'A customer';
const clip = (s, n = 80) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

router.get('/', async (req, res) => {
  const perms = req.adminAccess?.permissions || [];
  const can = (k) => perms.includes(k);
  const weekAgo = new Date(Date.now() - 7 * DAY);
  const items = [];
  try {
    const jobs = [];
    if (can('orders')) {
      jobs.push(prisma.order.findMany({
        where: { AND: [REAL, { createdAt: { gte: weekAgo } }] }, orderBy: { createdAt: 'desc' }, take: 15,
        select: { id: true, total: true, paymentMethod: true, createdAt: true, customer: { select: { name: true, email: true } }, items: { select: { quantity: true } } },
      }).then((rows) => rows.forEach((o) => {
        const n = o.items.reduce((s, i) => s + i.quantity, 0);
        items.push({ id: `order-${o.id}`, type: 'order', group: 'Orders', title: `New order #${o.id} · ${inr(o.total)}`, detail: `${who(o.customer)} · ${n} item${n === 1 ? '' : 's'} · ${o.paymentMethod === 'COD' ? 'Cash on delivery' : o.paymentMethod === 'CREDITS' ? 'Paid with credits' : 'Paid online'}`, createdAt: o.createdAt, link: '/admin/orders', tone: 'green' });
      })));
      // Orders the customer cancelled themselves (My orders → Cancel).
      jobs.push(prisma.order.findMany({
        where: { cancelledBy: 'CUSTOMER', cancelledAt: { gte: weekAgo } }, orderBy: { cancelledAt: 'desc' }, take: 10,
        select: { id: true, total: true, paymentMethod: true, cancelledAt: true, cancelReason: true, refundError: true, customer: { select: { name: true, email: true } } },
      }).then((rows) => rows.forEach((o) => {
        items.push({ id: `cancel-${o.id}`, type: 'cancel', group: 'Orders', title: `Cancelled by customer · order #${o.id} · ${inr(o.total)}`, detail: `${who(o.customer)}${o.cancelReason ? ` · ${clip(o.cancelReason, 60)}` : ''}${o.refundError ? ' · refund needs attention' : ''}`, createdAt: o.cancelledAt, link: `/admin/orders?open=${o.id}`, tone: 'red', highlight: !!o.refundError });
      })));
      // Unpaid online checkouts older than 30 minutes (younger ones may still be paying).
      jobs.push(prisma.order.findMany({
        where: { paymentMethod: 'RAZORPAY', paymentStatus: { in: ['PENDING', 'FAILED'] }, createdAt: { gte: weekAgo, lte: new Date(Date.now() - 30 * 60 * 1000) } },
        orderBy: { createdAt: 'desc' }, take: 10,
        select: { id: true, total: true, paymentStatus: true, createdAt: true, customer: { select: { name: true, email: true } } },
      }).then((rows) => rows.forEach((o) => {
        const failed = o.paymentStatus === 'FAILED';
        items.push({ id: `pay-${o.id}`, type: 'payment', group: 'Payments', title: failed ? `Payment failed · ${inr(o.total)}` : `Checkout not completed · ${inr(o.total)}`, detail: `${who(o.customer)} · checkout #${o.id}`, createdAt: o.createdAt, link: '/admin/abandoned', tone: failed ? 'red' : 'yellow' });
      })));
    }
    if (can('reviews')) {
      jobs.push(prisma.productReview.findMany({
        where: { OR: [{ createdAt: { gte: weekAgo } }, { isApproved: false }] }, orderBy: { createdAt: 'desc' }, take: 15,
        select: { id: true, rating: true, comment: true, isApproved: true, createdAt: true, customer: { select: { name: true, email: true } }, product: { select: { name: true } } },
      }).then((rows) => rows.forEach((r) => {
        items.push({
          id: `review-${r.id}`, type: 'review', group: 'Reviews',
          title: r.isApproved ? `New ${r.rating}★ review` : `Review awaiting approval · ${r.rating}★`,
          detail: `${who(r.customer)} on ${r.product?.name || 'a product'}${r.comment ? ` — “${clip(r.comment, 60)}”` : ''}`,
          createdAt: r.createdAt, link: '/admin/reviews', tone: r.isApproved ? 'purple' : 'yellow', highlight: !r.isApproved,
        });
      })));
    }
    if (can('returns')) {
      jobs.push(prisma.returnRequest.findMany({
        where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 15,
        select: { id: true, orderId: true, type: true, reason: true, createdAt: true, customer: { select: { name: true, email: true } } },
      }).then((rows) => rows.forEach((r) => {
        items.push({ id: `return-${r.id}`, type: 'return', group: 'Returns', title: `${r.type === 'REFUND' ? 'Refund' : 'Replacement'} request · order #${r.orderId}`, detail: `${who(r.customer)} · ${clip(r.reason, 60)}`, createdAt: r.createdAt, link: '/admin/returns', tone: 'pink', highlight: true });
      })));
    }
    if (can('products')) {
      const threshold = Number(settings.get().lowStockThreshold) || 0;
      jobs.push(prisma.product.findMany({
        where: { isActive: true, stock: { lte: threshold } }, orderBy: [{ stock: 'asc' }, { name: 'asc' }], take: 12,
        select: { id: true, name: true, stock: true },
      }).then((rows) => rows.forEach((p) => {
        const out = p.stock <= 0;
        items.push({ id: `stock-${p.id}`, type: out ? 'out-of-stock' : 'low-stock', group: 'Inventory', title: out ? `Out of stock · ${p.name}` : `Low stock · ${p.name}`, detail: out ? 'Hidden from buyers until restocked' : `${p.stock} left (alert at ${threshold} or fewer)`, createdAt: null, link: `/admin/products?search=${encodeURIComponent(p.name)}`, tone: out ? 'red' : 'yellow' });
      })));
    }
    if (can('coupons')) {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      jobs.push(prisma.coupon.findMany({
        where: {
          isActive: true,
          expiresAt: { not: null, gt: now, lte: in24h },
        },
        orderBy: { expiresAt: 'asc' },
        take: 10,
        select: { id: true, code: true, type: true, value: true, expiresAt: true, usedCount: true, usageLimit: true, createdAt: true, updatedAt: true },
      }).then((rows) => rows.forEach((c) => {
        const msLeft = new Date(c.expiresAt).getTime() - Date.now();
        const hoursLeft = Math.max(1, Math.round(msLeft / (3600 * 1000)));
        const urgent = hoursLeft <= 12;
        const windowStarted = new Date(new Date(c.expiresAt).getTime() - 24 * 60 * 60 * 1000);
        items.push({
          id: `coupon-exp-${c.id}`,
          type: 'coupon',
          group: 'Coupons',
          title: `Coupon expiring in ${hoursLeft}h · ${c.code}`,
          detail: `${c.type === 'PERCENT' ? `${c.value}% off` : `₹${c.value} off`} · Expires ${new Date(c.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}${c.usageLimit ? ` · ${c.usedCount}/${c.usageLimit} used` : ` · ${c.usedCount || 0} used`}`,
          createdAt: windowStarted,
          link: '/admin/coupons',
          tone: urgent ? 'red' : 'yellow',
          highlight: true,
        });
      })));
    }
    await Promise.all(jobs);
    items.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
    res.set('Cache-Control', 'no-store');
    res.json({ items, generatedAt: new Date() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/send-low-stock', async (req, res) => {
  const perms = req.adminAccess?.permissions || [];
  if (!['products', 'reports', 'settings'].some((k) => perms.includes(k))) return res.status(403).json({ error: "You don't have permission to do this." });
  try {
    const to = alertRecipients().length ? undefined : req.adminAccess.email;
    const result = await sendLowStockAlert({ to });
    if (!result.count) return res.json({ ...result, message: 'Nothing is low on stock right now — no email sent.' });
    if (!result.sent) return res.status(502).json({ error: 'The email could not be sent. Please try again later.' });
    res.json({ ...result, message: `Low-stock email sent to ${result.to.join(', ')} (${result.count} product${result.count === 1 ? '' : 's'}).` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
