const router = require('express').Router();
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/customerAuth');
const razorpay = require('../lib/razorpay');

const prisma = new PrismaClient();

const ORDER_INCLUDE = { items: { include: { product: true } }, address: true };

async function validateItemsAndTotal(items) {
  let total = 0;
  const orderItemsData = [];
  for (const item of items) {
    const product = await prisma.product.findUnique({ where: { id: Number(item.productId) } });
    if (!product || !product.isActive) throw new Error(`Product ${item.productId} not available`);
    if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);
    total += product.price * item.quantity;
    orderItemsData.push({ productId: product.id, quantity: item.quantity, price: product.price });
  }
  return { total, orderItemsData };
}

async function decrementStock(items) {
  for (const item of items) {
    await prisma.product.update({
      where: { id: Number(item.productId) },
      data: { stock: { decrement: item.quantity } }
    });
  }
}

// POST /api/orders  (place an order — COD confirms immediately, RAZORPAY needs verify-payment)
router.post('/', auth, async (req, res) => {
  const { addressId, items, paymentMethod = 'COD' } = req.body;
  if (!addressId || !items || items.length === 0) return res.status(400).json({ error: 'Address and items required' });
  if (!['COD', 'RAZORPAY'].includes(paymentMethod)) return res.status(400).json({ error: 'Invalid payment method' });

  try {
    const address = await prisma.address.findFirst({ where: { id: Number(addressId), customerId: req.customer.id } });
    if (!address) return res.status(404).json({ error: 'Address not found' });

    const { total, orderItemsData } = await validateItemsAndTotal(items);

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

    if (paymentMethod === 'COD') {
      await decrementStock(items);
      return res.status(201).json(order);
    }

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

    await decrementStock(order.items.map(i => ({ productId: i.productId, quantity: i.quantity })));
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      },
      include: ORDER_INCLUDE
    });
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
