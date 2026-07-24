const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../../middleware/adminAuth');
const { decrementStockAtomic } = require('../../lib/stock');

const prisma = new PrismaClient();

router.get('/', auth, async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  try {
    const where = status ? { status } : {};
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, skip: (page - 1) * limit, take: Number(limit),
        include: {
          customer: { select: { name: true, email: true, phone: true } },
          address: true,
          items: { include: { product: { select: { name: true, image: true } } } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.count({ where })
    ]);
    res.json({ orders, total, pages: Math.ceil(total / limit) });
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

    // Stock is only actually reserved for COD orders (decremented at creation) or
    // paid Razorpay orders (decremented at payment verification) — not for a
    // Razorpay order still pending/failed payment.
    const stockWasReserved = existing.paymentMethod === 'COD' || existing.paymentStatus === 'PAID';
    const items = existing.items.map(i => ({ productId: i.productId, quantity: i.quantity }));
    const ORDER_INCLUDE = {
      customer: { select: { name: true, email: true } },
      address: true,
      items: { include: { product: true } }
    };
    const updateData = { data: { status }, include: ORDER_INCLUDE };

    let order;
    if (status === 'CANCELLED' && existing.status !== 'CANCELLED' && stockWasReserved) {
      // Cancelling a previously-active order — give the reserved stock back.
      order = await prisma.$transaction(async (tx) => {
        for (const item of items) {
          await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        }
        return tx.order.update({ where: { id: existing.id }, ...updateData });
      });
    } else if (status !== 'CANCELLED' && existing.status === 'CANCELLED' && stockWasReserved) {
      // Un-cancelling — re-reserve stock, atomically, blocking if it's no longer available.
      try {
        order = await prisma.$transaction(async (tx) => {
          await decrementStockAtomic(tx, items);
          return tx.order.update({ where: { id: existing.id }, ...updateData });
        });
      } catch (e) {
        return res.status(409).json({ error: e.message || 'Cannot reactivate: insufficient stock.' });
      }
    } else {
      order = await prisma.order.update({ where: { id: existing.id }, ...updateData });
    }

    // Send order confirmation email if the status is transitioned to CONFIRMED
    if (status === 'CONFIRMED' && existing.status !== 'CONFIRMED') {
      const emailToUse = order.customer?.email || order.address?.email;
      if (emailToUse) {
        const { sendOrderConfirmationEmail } = require('../../lib/email');
        sendOrderConfirmationEmail(emailToUse, order).catch(err => 
          console.error('Error sending order confirmation email:', err)
        );
      }
    }

    res.json(order);
  } catch (error) {
    console.error(error);
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
    const ORDER_INCLUDE = {
      customer: { select: { name: true, email: true } },
      address: true,
      items: { include: { product: true } }
    };
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
