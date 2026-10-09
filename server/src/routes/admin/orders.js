const router = require('express').Router();
const auth = require('../../middleware/adminAuth');
const { decrementStockAtomic } = require('../../lib/stock');
const { release: releaseCoupon, redeem: redeemCoupon } = require('../../lib/coupons');
const { releaseHold } = require('../../lib/holds');
const { returnForOrder: returnCredits, lockCustomer: lockCustomerRow } = require('../../lib/credits');
const razorpay = require('../../lib/razorpay');
const { sendShippedEmail, sendDeliveredEmail, sendRefundEmail } = require('../../lib/mail/fulfilment');

const prisma = require('../../lib/prisma');

// Everything the admin Orders page needs for a row + the detail modal.
const ORDER_INCLUDE = {
  customer: { select: { id: true, name: true, email: true, phone: true } },
  address: true,
  items: { include: { product: { select: { id: true, name: true, image: true, slug: true } } } },
  review: true,
  returnRequests: { select: { id: true, type: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' } },
};

const COURIERS = ['Delhivery', 'Blue Dart', 'DTDC', 'India Post', 'Ekart', 'Xpressbees', 'Shiprocket', 'Other'];
const clean = (v, max) => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s.slice(0, max) : null;
};

// Did this order actually take the customer's money? (Razorpay paid, or a
// COD order that was collected — delivered or marked paid.)
const tookMoney = (o) => (o.paymentMethod === 'RAZORPAY' && o.paymentStatus === 'PAID')
  || (o.paymentMethod === 'COD' && (o.paymentStatus === 'PAID' || o.status === 'DELIVERED'));
const refundableOf = (o) => Math.max(0, o.total - (o.refundAmount || 0));

// A "real" order: COD, or online and paid. Unpaid / failed online checkouts
// aren't orders — they live on the Abandoned Checkouts page and can't be
// confirmed, shipped or delivered.
const isRealOrder = (o) => o.paymentMethod === 'COD' || o.paymentStatus === 'PAID';
const REAL_ORDER = { OR: [{ paymentMethod: 'COD' }, { paymentStatus: 'PAID' }] };

class StatusConflict extends Error {}

// GET /api/admin/orders/counts — order count per status (same filter as the
// list below), for the Orders page tabs.
router.get('/counts', auth, async (req, res) => {
  try {
    const groups = await prisma.order.groupBy({ by: ['status'], where: REAL_ORDER, _count: { _all: true } });
    const counts = { ALL: 0, PENDING: 0, CONFIRMED: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0 };
    groups.forEach((g) => { counts[g.status] = g._count._all; counts.ALL += g._count._all; });
    res.json(counts);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.get('/', auth, async (req, res) => {
  const status = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(req.query.status) ? req.query.status : null;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  try {
    const where = { ...REAL_ORDER, ...(status ? { status } : {}) };
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.count({ where })
    ]);
    res.json({ orders, total, pages: Math.ceil(total / limit) });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/admin/orders/:id — one order (deep links from Returns, etc.)
router.get('/:id(\\d+)', auth, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: Number(req.params.id) }, include: ORDER_INCLUDE });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const existing = await prisma.order.findUnique({ where: { id: Number(req.params.id) }, include: { items: true } });
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    if (existing.status !== 'PENDING' && status === 'PENDING') {
      return res.status(400).json({ error: 'Cannot revert order status back to PENDING.' });
    }

    if (['CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(status) && !isRealOrder(existing)) {
      return res.status(400).json({ error: "This online order hasn't been paid, so it can't be confirmed, shipped or delivered. It stays under Abandoned Checkouts until the customer pays." });
    }

    // Money has already gone back — bringing the order back would ship goods
    // for free. A fresh order is the way to go.
    if (existing.status === 'CANCELLED' && status !== 'CANCELLED' && (existing.refundAmount || 0) > 0) {
      return res.status(400).json({ error: 'This order has been refunded — create a new order instead.' });
    }
    // Its ZUNUZ Credits went back to the customer's wallet when it was cancelled.
    if (existing.status === 'CANCELLED' && status !== 'CANCELLED' && (existing.creditsUsed || 0) > 0) {
      return res.status(400).json({ error: 'The credits used on this order were returned to the customer when it was cancelled — ask them to place a new order.' });
    }

    const changed = existing.status !== status;
    if (!changed) {
      const order = await prisma.order.findUnique({ where: { id: existing.id }, include: ORDER_INCLUDE });
      return res.json(order);
    }

    // Stock is only actually reserved for COD orders (decremented at creation) or
    // paid Razorpay orders (decremented at payment verification) — not for a
    // Razorpay order still pending/failed payment.
    const stockWasReserved = isRealOrder(existing);
    const items = existing.items.map(i => ({ productId: i.productId, quantity: i.quantity }));

    // Fulfilment timestamps: stamped on the transition into SHIPPED /
    // DELIVERED, cleared again if the order is moved back to CONFIRMED. The
    // first delivery time is kept (it starts the 24-hour returns window), so
    // toggling an order back to Delivered can't re-open that window.
    const data = { status };
    if (status === 'SHIPPED') data.shippedAt = new Date();
    if (status === 'DELIVERED') { if (!existing.deliveredAt) data.deliveredAt = new Date(); if (!existing.shippedAt) data.shippedAt = new Date(); }
    if (status === 'CONFIRMED') { data.shippedAt = null; data.deliveredAt = null; }
    if (status === 'CANCELLED') { data.cancelledAt = new Date(); data.cancelledBy = 'ADMIN'; data.cancelReason = null; }
    if (existing.status === 'CANCELLED') { data.cancelledAt = null; data.cancelledBy = null; data.cancelReason = null; }

    // Conditional on the status (and payment) we just read: if the customer
    // cancels, the payment lands, or another admin changes it in between,
    // nothing is written and stock / coupons are never adjusted twice.
    let order;
    try {
      order = await prisma.$transaction(async (tx) => {
        // Customer row first when credits are involved (customer → coupon → products).
        if (existing.creditsUsed && status === 'CANCELLED') await lockCustomerRow(tx, existing.customerId);
        const n = await tx.order.updateMany({ where: { id: existing.id, status: existing.status, paymentStatus: existing.paymentStatus }, data });
        if (n.count !== 1) throw new StatusConflict();
        if (status === 'CANCELLED' && stockWasReserved) {
          // Cancelling a previously-active order — give the coupon use (if
          // any) and the reserved stock back (coupon first: same lock order
          // as placing an order).
          await releaseCoupon(tx, existing.id);
          for (const item of items) {
            await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
          }
          // ZUNUZ Credits used on it go back to the customer's wallet.
          await returnCredits(existing.id, tx);
        } else if (status === 'CANCELLED' && existing.stockHeld) {
          // Cancelling an unpaid online checkout: give its stock hold back.
          await releaseHold(existing.id, tx);
        } else if (existing.status === 'CANCELLED' && stockWasReserved) {
          // Un-cancelling — re-reserve stock, atomically, blocking if it's no
          // longer available. The customer already got this price, so honour
          // the coupon even if it has since run out (non-strict).
          await redeemCoupon(tx, existing, { strict: false });
          await decrementStockAtomic(tx, items);
        }
        return tx.order.findUnique({ where: { id: existing.id }, include: ORDER_INCLUDE });
      });
    } catch (e) {
      if (e instanceof StatusConflict) return res.status(409).json({ error: 'This order was just updated — refresh and try again.' });
      if (String(e.message).startsWith('Insufficient stock')) return res.status(409).json({ error: `Cannot reactivate: ${e.message}.` });
      throw e;
    }

    const emailToUse = order.customer?.email || order.address?.email;
    if (emailToUse) {
      const fail = (what) => (err) => console.error(`Error sending ${what} email:`, err);
      if (status === 'CONFIRMED') {
        const { sendOrderConfirmationEmail } = require('../../lib/email');
        sendOrderConfirmationEmail(emailToUse, order).catch(fail('order confirmation'));
      } else if (status === 'SHIPPED') {
        sendShippedEmail(order).catch(fail('shipped'));
      } else if (status === 'DELIVERED') {
        sendDeliveredEmail(order).catch(fail('delivered'));
      }
    }

    if (status === 'DELIVERED') {
      const referrals = require('../../lib/referrals');
      setImmediate(() => referrals.sweepReferrals().catch((e) => console.error('Referral sweep on delivery failed:', e)));
    }

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/orders/:id/tracking — courier, tracking number + URL.
router.put('/:id/tracking', auth, async (req, res) => {
  const courier = clean(req.body.courier, 80);
  const trackingNumber = clean(req.body.trackingNumber, 120);
  const trackingUrl = clean(req.body.trackingUrl, 500);
  if (courier && !COURIERS.includes(courier)) return res.status(400).json({ error: 'Pick a courier from the list.' });
  if (trackingUrl && !/^https?:\/\/\S+$/i.test(trackingUrl)) return res.status(400).json({ error: 'Tracking URL must start with http:// or https://' });
  try {
    const existing = await prisma.order.findUnique({ where: { id: Number(req.params.id) }, select: { id: true } });
    if (!existing) return res.status(404).json({ error: 'Order not found' });
    const order = await prisma.order.update({
      where: { id: existing.id },
      data: { courier, trackingNumber, trackingUrl },
      include: ORDER_INCLUDE,
    });
    res.locals.activitySummary = trackingNumber
      ? `Updated tracking for order #${order.id} (${courier || 'courier'} ${trackingNumber})`
      : `Cleared tracking for order #${order.id}`;
    res.json(order);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/orders/:id/note — internal admin note (never shown to customers).
router.put('/:id/note', auth, async (req, res) => {
  const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 5000) : '';
  try {
    const existing = await prisma.order.findUnique({ where: { id: Number(req.params.id) }, select: { id: true } });
    if (!existing) return res.status(404).json({ error: 'Order not found' });
    const order = await prisma.order.update({ where: { id: existing.id }, data: { adminNote: note || null }, include: ORDER_INCLUDE });
    res.locals.activitySummary = note ? `Updated the internal note on order #${order.id}` : `Removed the internal note on order #${order.id}`;
    res.json(order);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Refunds ──
// Shared by this router and admin/returns.js. Resolves to
// { status, body, summary } — never throws for Razorpay/business errors.
const refundLocks = new Set();
async function issueRefund(orderId, { amount, reason, manual = false, note } = {}) {
  const id = Number(orderId);
  if (refundLocks.has(id)) return { status: 409, body: { error: 'A refund for this order is already being processed — try again in a moment.' } };
  refundLocks.add(id);
  try {
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return { status: 404, body: { error: 'Order not found' } };
    if (!tookMoney(existing)) return { status: 400, body: { error: 'This order has not taken any payment, so there is nothing to refund.' } };

    const refundable = refundableOf(existing);
    const amt = amount == null || amount === '' ? refundable : Number(amount);
    if (!Number.isInteger(amt) || amt < 1) return { status: 400, body: { error: 'Enter a whole rupee amount of at least ₹1.' } };
    if (amt > refundable) return { status: 400, body: { error: refundable ? `You can refund at most ₹${refundable} on this order.` : 'This order has already been fully refunded.' } };
    const why = clean(reason, 200) || clean(note, 200);

    let data;
    let pending = false;
    if (manual) {
      data = {
        refundStatus: 'PROCESSED', refundId: null, refundError: null, refundedAt: new Date(),
        refundAmount: (existing.refundAmount || 0) + amt,
      };
    } else {
      if (existing.paymentMethod !== 'RAZORPAY' || existing.paymentStatus !== 'PAID' || !existing.razorpayPaymentId) {
        return { status: 400, body: { error: 'Only paid Razorpay orders can be refunded through Razorpay — record a manual refund instead.' } };
      }
      // A failed attempt only flips the order to FAILED when nothing has been
      // refunded yet — an earlier successful refund stays visible; the error
      // is kept in refundError either way (cleared on the next success).
      const failedStatus = (existing.refundAmount || 0) > 0 ? existing.refundStatus : 'FAILED';
      let rp;
      try {
        rp = await razorpay.payments.refund(existing.razorpayPaymentId, {
          amount: amt * 100,
          notes: { reason: why || 'Refund from ZUNUZ admin', orderId: String(id) },
        });
      } catch (e) {
        const byCode = {
          400: 'the request was rejected (amount may exceed what is left to refund).',
          401: 'the API keys were rejected — check RAZORPAY_KEY_ID / SECRET.',
          404: `payment ${existing.razorpayPaymentId} was not found on this Razorpay account (test vs live mode?).`,
        };
        const msg = e?.error?.description || byCode[e?.statusCode] || e?.message || `Razorpay rejected the refund${e?.statusCode ? ` (HTTP ${e.statusCode})` : ''}.`;
        await prisma.order.update({ where: { id }, data: { refundStatus: failedStatus, refundError: String(msg).slice(0, 2000) } });
        console.error(`Razorpay refund failed for order #${id}:`, msg);
        return { status: 502, body: { error: `Razorpay couldn't process this refund: ${msg}` }, summary: `Refund of ₹${amt} on order #${id} failed` };
      }
      if (rp?.status === 'failed') {
        await prisma.order.update({ where: { id }, data: { refundStatus: failedStatus, refundError: 'Razorpay marked the refund as failed.' } });
        return { status: 502, body: { error: 'Razorpay marked the refund as failed. Check the Razorpay dashboard and try again.' } };
      }
      pending = rp?.status !== 'processed';
      data = {
        refundStatus: pending ? 'PENDING' : 'PROCESSED', refundId: rp?.id || null, refundError: null, refundedAt: new Date(),
        refundAmount: (existing.refundAmount || 0) + amt,
      };
    }

    const order = await prisma.order.update({ where: { id }, data, include: ORDER_INCLUDE });
    sendRefundEmail(order, { amount: amt, pending, manual }).catch((err) => console.error('Error sending refund email:', err));
    const summary = manual
      ? `Recorded a manual refund of ₹${amt} on order #${id}${why ? ` (${why})` : ''}`
      : `Refunded ₹${amt} via Razorpay on order #${id}${why ? ` (${why})` : ''}`;
    return { status: 200, body: order, summary };
  } finally {
    refundLocks.delete(id);
  }
}

// POST /api/admin/orders/:id/refund — { amount, reason } via Razorpay, or
// { manual: true, amount, note } for money returned outside Razorpay.
router.post('/:id/refund', auth, async (req, res) => {
  try {
    const { amount, reason, manual, note } = req.body || {};
    const r = await issueRefund(req.params.id, { amount, reason, manual: manual === true, note });
    if (r.summary) res.locals.activitySummary = r.summary;
    res.status(r.status).json(r.body);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/orders/:id/refund/refresh — re-check a PENDING Razorpay refund.
router.post('/:id/refund/refresh', auth, async (req, res) => {
  try {
    const existing = await prisma.order.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) return res.status(404).json({ error: 'Order not found' });
    if (!existing.refundId || !existing.razorpayPaymentId) return res.status(400).json({ error: 'No Razorpay refund to check on this order.' });
    let rp;
    try {
      rp = await razorpay.payments.fetchRefund(existing.razorpayPaymentId, existing.refundId);
    } catch (e) {
      return res.status(502).json({ error: `Couldn't reach Razorpay: ${e?.error?.description || e?.message || 'unknown error'}` });
    }
    const map = { processed: 'PROCESSED', pending: 'PENDING', failed: 'FAILED' };
    const refundStatus = map[rp?.status] || existing.refundStatus;
    res.locals.skipActivity = refundStatus === existing.refundStatus;
    res.locals.activitySummary = `Refund on order #${existing.id} is now ${String(refundStatus).toLowerCase()}`;
    const order = await prisma.order.update({ where: { id: existing.id }, data: { refundStatus }, include: ORDER_INCLUDE });
    res.json(order);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/orders/:id/send-email
router.post('/:id/send-email', auth, async (req, res) => {
  const { template } = req.body;
  const validTemplates = ['CONFIRMED', 'CANCELLED'];
  if (!validTemplates.includes(template)) {
    return res.status(400).json({ error: 'Invalid template selection' });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: Number(req.params.id) },
      include: ORDER_INCLUDE
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const emailToUse = order.customer?.email || order.address?.email;
    if (!emailToUse) {
      return res.status(400).json({ error: 'Customer email not found on order' });
    }

    if (template === 'CONFIRMED') {
      const { sendOrderConfirmationEmail } = require('../../lib/email');
      await sendOrderConfirmationEmail(emailToUse, order);
    } else if (template === 'CANCELLED') {
      const { sendOrderCancellationEmail } = require('../../lib/email');
      await sendOrderCancellationEmail(emailToUse, order);
    }

    res.json({ message: `${template} email sent successfully!` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
module.exports.issueRefund = issueRefund;
module.exports.ORDER_INCLUDE = ORDER_INCLUDE;
