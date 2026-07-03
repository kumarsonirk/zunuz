const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../../middleware/adminAuth');

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
    const order = await prisma.order.update({
      where: { id: Number(req.params.id) },
      data: { status },
      include: { customer: { select: { name: true, email: true } } }
    });
    res.json(order);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
