const router = require('express').Router();
const crypto = require('crypto');
const { confirmOnlinePayment, REFUND_OUTCOMES, BLOCK_REASONS } = require('../lib/stock');
const { sendOrderConfirmationEmail } = require('../lib/email');
const { notifyNewOrder } = require('../lib/alerts');
const { refundSoldOut } = require('../lib/holds');
const { sendRefundEmail } = require('../lib/mail/fulfilment');

const prisma = require('../lib/prisma');

const ORDER_INCLUDE = { items: { include: { product: true } }, address: true, customer: { select: { name: true, email: true, phone: true } } };

// POST /api/webhooks/razorpay — mounted with express.raw() so req.body is a Buffer.
// Configure this URL + RAZORPAY_WEBHOOK_SECRET in the Razorpay dashboard for production.
router.post('/razorpay', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return res.status(200).json({ message: 'Webhook secret not configured, skipping' });

  const signature = String(req.headers['x-razorpay-signature'] || '');
  const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
  // Constant-time comparison (no timing hints about the expected value).
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(400).json({ error: 'Invalid signature' });

  let event;
  try { event = JSON.parse(req.body.toString('utf8')); } catch { return res.status(400).json({ error: 'Bad payload' }); }

  try {
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const rpOrderId = event.payload?.payment?.entity?.order_id;
      const rpPaymentId = event.payload?.payment?.entity?.id;
      if (rpOrderId) {
        const order = await prisma.order.findUnique({ where: { razorpayOrderId: rpOrderId } });
        if (order && order.paymentStatus !== 'PAID') {
          // Backstop for when the frontend never called verify-payment (tab
          // closed after paying). confirmOnlinePayment takes the stock and
          // records the coupon use exactly once, even if verify-payment runs
          // at the same moment; if stock ran out it marks PAID + CANCELLED
          // and we refund it automatically.
          const { outcome, order: updatedOrder } = await confirmOnlinePayment(order.id, { razorpayPaymentId: rpPaymentId }, ORDER_INCLUDE);
          if (outcome === 'CONFIRMED') {
            const emailToUse = updatedOrder.customer?.email || updatedOrder.address?.email;
            if (emailToUse) {
              sendOrderConfirmationEmail(emailToUse, updatedOrder).catch(err => console.error('Error sending order confirmation email:', err));
            }
            try {
              Promise.resolve(notifyNewOrder(updatedOrder)).catch((e) => console.error('New-order alert failed:', e));
            } catch (e) { console.error('New-order alert failed:', e); }
          }
          if (REFUND_OUTCOMES.includes(outcome)) await refundSoldOut(order.id, BLOCK_REASONS[outcome]);
        }
      }

    } else if (event.event === 'refund.created' || event.event === 'refund.processed' || event.event === 'refund.failed') {
      await handleRefundEvent(event);

    } else if (event.event === 'payment.failed') {
      const rpOrderId = event.payload?.payment?.entity?.order_id;
      if (rpOrderId) {
        const order = await prisma.order.findUnique({ where: { razorpayOrderId: rpOrderId } });
        if (order && order.paymentStatus === 'PENDING') {
          await prisma.order.updateMany({ where: { id: order.id, paymentStatus: 'PENDING' }, data: { paymentStatus: 'FAILED' } });
        }
      }
    }
    res.json({ received: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Razorpay refund events (enable refund.created / refund.processed /
// refund.failed on the webhook in the Razorpay dashboard). Keeps the order's
// refund fields in step with Razorpay, including refunds started from the
// Razorpay dashboard rather than the ZUNUZ admin. Safe to receive twice.
//   Admin refunds carry notes.orderId (set in issueRefund) — the admin route
//   already recorded the amount and emailed the customer, so here we only
//   move the status on (PENDING → PROCESSED, or FAILED with the amount taken
//   back off).
//   Dashboard refunds are recorded here: amount = what Razorpay says has been
//   refunded on the payment, and the customer is emailed once (refund.created).
const REFUND_FAILED_MSG = 'Razorpay reported that this refund failed. Check the Razorpay dashboard and try again.';
async function handleRefundEvent(event) {
  const refund = event.payload?.refund?.entity;
  if (!refund?.id || !refund.payment_id) return;
  const order = await prisma.order.findFirst({ where: { razorpayPaymentId: refund.payment_id }, include: ORDER_INCLUDE });
  if (!order) return;
  const amount = Math.round((refund.amount || 0) / 100);
  const fromAdmin = !!refund.notes?.orderId;
  const isLatest = refund.id === order.refundId;

  if (event.event === 'refund.failed') {
    // Only the refund the order is tracking can be "taken back"; skip repeats.
    if (!isLatest || order.refundError === REFUND_FAILED_MSG) return;
    const left = Math.max(0, (order.refundAmount || 0) - amount);
    await prisma.order.update({
      where: { id: order.id },
      data: { refundAmount: left, refundStatus: left > 0 ? 'PROCESSED' : 'FAILED', refundError: REFUND_FAILED_MSG },
    });
    return;
  }

  const status = refund.status === 'processed' || event.event === 'refund.processed' ? 'PROCESSED' : 'PENDING';
  if (fromAdmin) {
    if (isLatest && order.refundStatus !== status && order.refundStatus !== 'PROCESSED') {
      await prisma.order.update({ where: { id: order.id }, data: { refundStatus: status, refundError: null } });
    }
    return;
  }

  // Dashboard refund: total refunded on the payment, per Razorpay.
  let refundedPaise = event.payload?.payment?.entity?.amount_refunded;
  if (refundedPaise == null) {
    try { refundedPaise = (await require('../lib/razorpay').payments.fetch(refund.payment_id)).amount_refunded; } catch { refundedPaise = null; }
  }
  const total = refundedPaise != null ? Math.round(refundedPaise / 100) : (order.refundAmount || 0) + (isLatest ? 0 : amount);
  // Never lower the recorded amount here (manual refunds recorded in the
  // admin aren't known to Razorpay).
  const refundAmount = Math.max(order.refundAmount || 0, total);
  const data = { refundAmount, refundError: null };
  // Events can arrive out of order: never move this refund back to PENDING.
  const downgrade = isLatest && order.refundStatus === 'PROCESSED' && status === 'PENDING';
  if (!downgrade && (isLatest || !order.refundId || order.refundStatus !== 'PENDING')) {
    Object.assign(data, { refundId: refund.id, refundStatus: status });
  }
  if (!order.refundedAt) data.refundedAt = new Date();
  const updated = await prisma.order.update({ where: { id: order.id }, data, include: ORDER_INCLUDE });
  if (event.event === 'refund.created' && !isLatest) {
    sendRefundEmail(updated, { amount, pending: status !== 'PROCESSED' }).catch((err) => console.error('Error sending refund email:', err));
  }
}

module.exports = router;
module.exports.handleRefundEvent = handleRefundEvent; // for scripts/tests
