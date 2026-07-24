const router = require('express').Router();
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { decrementStockAtomic } = require('../lib/stock');
const { sendOrderConfirmationEmail } = require('../lib/email');

const prisma = new PrismaClient();

const ORDER_INCLUDE = { items: { include: { product: true } }, address: true, customer: { select: { name: true, email: true } } };

// POST /api/webhooks/razorpay — mounted with express.raw() so req.body is a Buffer.
// Configure this URL + RAZORPAY_WEBHOOK_SECRET in the Razorpay dashboard for production.
router.post('/razorpay', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return res.status(200).json({ message: 'Webhook secret not configured, skipping' });

  const signature = req.headers['x-razorpay-signature'];
  const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
  if (!signature || signature !== expected) return res.status(400).json({ error: 'Invalid signature' });

  let event;
  try { event = JSON.parse(req.body.toString('utf8')); } catch { return res.status(400).json({ error: 'Bad payload' }); }

  try {
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const rpOrderId = event.payload?.payment?.entity?.order_id;
      const rpPaymentId = event.payload?.payment?.entity?.id;
      if (rpOrderId) {
        const order = await prisma.order.findUnique({ where: { razorpayOrderId: rpOrderId }, include: ORDER_INCLUDE });
        if (order && order.paymentStatus !== 'PAID') {
          // Backstop for when the frontend never called verify-payment (tab closed after paying)
          const items = order.items.map(i => ({ productId: i.productId, quantity: i.quantity }));
          let updatedOrder;
          try {
            updatedOrder = await prisma.$transaction(async (tx) => {
              await decrementStockAtomic(tx, items);
              return tx.order.update({
                where: { id: order.id },
                data: { paymentStatus: 'PAID', status: 'CONFIRMED', razorpayPaymentId: rpPaymentId },
                include: ORDER_INCLUDE
              });
            });
          } catch {
            // Stock ran out while payment was pending — same handling as verify-payment:
            // money was taken, so mark PAID + CANCELLED for admin to manually refund.
            updatedOrder = await prisma.order.update({
              where: { id: order.id },
              data: { paymentStatus: 'PAID', status: 'CANCELLED', razorpayPaymentId: rpPaymentId },
              include: ORDER_INCLUDE
            });
          }

          if (updatedOrder) {
            const emailToUse = updatedOrder.customer?.email || updatedOrder.address?.email;
            if (emailToUse) {
              sendOrderConfirmationEmail(emailToUse, updatedOrder).catch(err => console.error('Error sending order confirmation email:', err));
            }
          }
        }
      }

    } else if (event.event === 'payment.failed') {
      const rpOrderId = event.payload?.payment?.entity?.order_id;
      if (rpOrderId) {
        const order = await prisma.order.findUnique({ where: { razorpayOrderId: rpOrderId } });
        if (order && order.paymentStatus === 'PENDING') {
          await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'FAILED' } });
        }
      }
    }
    res.json({ received: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
