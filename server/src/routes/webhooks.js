const router = require('express').Router();
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
        const order = await prisma.order.findUnique({ where: { razorpayOrderId: rpOrderId }, include: { items: true } });
        if (order && order.paymentStatus !== 'PAID') {
          // Backstop for when the frontend never called verify-payment (tab closed after paying)
          for (const item of order.items) {
            await prisma.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
          }
          await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: 'PAID', status: 'CONFIRMED', razorpayPaymentId: rpPaymentId }
          });
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
