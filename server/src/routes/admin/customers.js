const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../../middleware/adminAuth');

const prisma = new PrismaClient();

// Only orders that are actually paid for (COD is paid on delivery; Razorpay
// only counts once confirmed) — hides abandoned/failed online-payment attempts.
const PAID_ORDER_FILTER = { OR: [{ paymentMethod: 'COD' }, { paymentMethod: 'RAZORPAY', paymentStatus: 'PAID' }] };

router.get('/', auth, async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  try {
    const where = search
      ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] }
      : {};
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where, skip: (page - 1) * limit, take: Number(limit),
        select: {
          id: true, name: true, email: true, phone: true, createdAt: true,
          _count: { select: { orders: { where: PAID_ORDER_FILTER }, addresses: true } },
          orders: { where: PAID_ORDER_FILTER, select: { total: true, status: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.customer.count({ where })
    ]);
    res.json({ customers, total, pages: Math.ceil(total / limit) });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: Number(req.params.id) },
      select: {
        id: true, name: true, email: true, phone: true, createdAt: true,
        addresses: true,
        orders: {
          where: PAID_ORDER_FILTER,
          include: { items: { include: { product: { select: { name: true, image: true } } } }, address: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
