const router = require('express').Router();
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/customerAuth');
const razorpay = require('../lib/razorpay');
const { validateItemsAndTotal, decrementStockAtomic } = require('../lib/stock');

const prisma = new PrismaClient();

const ORDER_INCLUDE = { items: { include: { product: true } }, address: true };
const MAX_QUANTITY_PER_ITEM = 10;

// POST /api/orders  (place an order — COD confirms immediately, RAZORPAY needs verify-payment)
router.post('/', auth, async (req, res) => {
  const { addressId, items, paymentMethod = 'COD' } = req.body;
  if (!addressId || !items || items.length === 0) return res.status(400).json({ error: 'Address and items required' });
  if (!['COD', 'RAZORPAY'].includes(paymentMethod)) return res.status(400).json({ error: 'Invalid payment method' });
  const invalidQty = items.find(i => !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > MAX_QUANTITY_PER_ITEM);
  if (invalidQty) return res.status(400).json({ error: `Quantity must be between 1 and ${MAX_QUANTITY_PER_ITEM} per item.` });

  try {
    const address = await prisma.address.findFirst({ where: { id: Number(addressId), customerId: req.customer.id } });
    if (!address) return res.status(404).json({ error: 'Address not found' });

    if (paymentMethod === 'COD') {
      // Validate, create the order, and reserve stock atomically in one transaction —
      // if stock runs out between the check and the reservation, everything rolls back
      // and the order is never created (instead of being created with unavailable items).
      const order = await prisma.$transaction(async (tx) => {
        const { total, orderItemsData } = await validateItemsAndTotal(tx, items);
        const created = await tx.order.create({
          data: { customerId: req.customer.id, addressId: Number(addressId), total, paymentMethod, items: { create: orderItemsData } },
          include: ORDER_INCLUDE
        });
        await decrementStockAtomic(tx, items);
        return created;
      });
      return res.status(201).json(order);
    }

    const { total, orderItemsData } = await validateItemsAndTotal(prisma, items);
    const order = await prisma.order.create({
      data: {
        customerId: req.customer.id,
        addressId: Number(addressId),
        total,
        paymentMethod,
        items: { create: orderItemsData }
      },
      include: ORDER_INCLUDE
    });

    // RAZORPAY: create a gateway order, hold stock until payment is verified
    try {
      const rpOrder = await razorpay.orders.create({
        amount: total * 100,
        currency: 'INR',
        receipt: `order_${order.id}`,
      });
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: { razorpayOrderId: rpOrder.id },
        include: ORDER_INCLUDE
      });
      return res.status(201).json({ order: updated, razorpayOrderId: rpOrder.id, keyId: process.env.RAZORPAY_KEY_ID, amount: rpOrder.amount });
    } catch (rpError) {
      await prisma.order.delete({ where: { id: order.id } });
      console.error(rpError);
      return res.status(502).json({ error: 'Could not initiate payment. Try again.' });
    }
  } catch (e) {
    console.error(e);
    res.status(e.message?.startsWith('Product') || e.message?.startsWith('Insufficient') ? 400 : 500).json({ error: e.message || 'Server error' });
  }
});

// POST /api/orders/:id/verify-payment
router.post('/:id/verify-payment', auth, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment details' });
  }
  try {
    const order = await prisma.order.findFirst({
      where: { id: Number(req.params.id), customerId: req.customer.id },
      include: { items: true }
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.paymentMethod !== 'RAZORPAY' || order.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ error: 'Order/payment mismatch' });
    }
    if (order.paymentStatus === 'PAID') {
      const full = await prisma.order.findUnique({ where: { id: order.id }, include: ORDER_INCLUDE });
      return res.json(full);
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    const providedSignature = Buffer.from(String(razorpay_signature));
    const expectedBuf = Buffer.from(expectedSignature);
    const valid = providedSignature.length === expectedBuf.length && crypto.timingSafeEqual(expectedBuf, providedSignature);

    if (!valid) {
      await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'FAILED' } });
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    const items = order.items.map(i => ({ productId: i.productId, quantity: i.quantity }));
    let updated;
    try {
      updated = await prisma.$transaction(async (tx) => {
        await decrementStockAtomic(tx, items);
        return tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'PAID',
            status: 'CONFIRMED',
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
          },
          include: ORDER_INCLUDE
        });
      });
    } catch (stockErr) {
      // Payment succeeded but stock ran out while it was pending (e.g. someone else
      // bought the last unit via COD first). Money was taken — mark PAID + CANCELLED
      // so it's visible to admin as needing a manual refund, instead of overselling.
      updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          status: 'CANCELLED',
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
        },
        include: ORDER_INCLUDE
      });
      return res.status(409).json({
        error: "Payment succeeded, but this item just sold out. Your order has been cancelled and will be refunded — contact support if you don't see it within a few days.",
        order: updated
      });
    }
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/orders/:id/cancel-payment  (user closed the Razorpay checkout without paying)
router.post('/:id/cancel-payment', auth, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: Number(req.params.id), customerId: req.customer.id } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.paymentMethod === 'RAZORPAY' && order.paymentStatus === 'PENDING') {
      await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'FAILED' } });
    }
    res.json({ message: 'ok' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/orders  (my orders)
router.get('/', auth, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        customerId: req.customer.id,
        OR: [{ paymentMethod: 'COD' }, { paymentMethod: 'RAZORPAY', paymentStatus: 'PAID' }]
      },
      include: { items: { include: { product: { select: { name: true, image: true } } } }, address: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/orders/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: Number(req.params.id), customerId: req.customer.id },
      include: ORDER_INCLUDE
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
