const router = require('express').Router();
const { Prisma } = require('@prisma/client');
const auth = require('../../middleware/adminAuth');

const prisma = require('../../lib/prisma');

// Only orders that are actually paid for (COD is paid on delivery; Razorpay
// only counts once confirmed) — hides abandoned/failed online-payment attempts.
const PAID_ORDER_FILTER = { OR: [{ paymentMethod: 'COD' }, { paymentStatus: 'PAID' }] };

// Customer.tags is stored "VIP,Wholesale" → ['VIP', 'Wholesale'].
const splitTags = (s) => String(s || '').split(',').map((t) => t.trim()).filter(Boolean);

// Every tag in use, with how many customers have it (for the filter).
router.get('/tags', auth, async (req, res) => {
  try {
    const rows = await prisma.customer.findMany({ where: { tags: { not: null } }, select: { tags: true } });
    const counts = new Map();
    rows.forEach((r) => splitTags(r.tags).forEach((t) => {
      const k = t.toLowerCase();
      const cur = counts.get(k) || { tag: t, count: 0 };
      cur.count += 1;
      counts.set(k, cur);
    }));
    res.json([...counts.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)));
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.get('/', auth, async (req, res) => {
  const { search, tag } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  try {
    const and = [];
    if (search) and.push({ OR: [{ name: { contains: search } }, { email: { contains: search } }, { phone: { contains: search } }] });
    if (tag) {
      // Exact tag match inside the comma-separated column.
      const ids = await prisma.$queryRaw(Prisma.sql`SELECT id FROM Customer WHERE FIND_IN_SET(${String(tag).trim()}, tags) > 0`);
      and.push({ id: { in: ids.map((r) => Number(r.id)) } });
    }
    const where = and.length ? { AND: and } : {};
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where, skip: (page - 1) * limit, take: limit,
        select: {
          id: true, name: true, email: true, phone: true, createdAt: true, adminNote: true, tags: true,
          _count: { select: { orders: { where: PAID_ORDER_FILTER }, addresses: true } },
          orders: { where: PAID_ORDER_FILTER, select: { total: true, status: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.customer.count({ where })
    ]);
    res.json({
      customers: customers.map((c) => ({ ...c, adminNote: c.adminNote || '', tags: splitTags(c.tags) })),
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', auth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(404).json({ error: 'Customer not found' });
  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, phone: true, createdAt: true, adminNote: true, tags: true,
        addresses: true,
        orders: {
          where: PAID_ORDER_FILTER,
          include: { items: { include: { product: { select: { name: true, image: true } } } }, address: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ ...customer, adminNote: customer.adminNote || '', tags: splitTags(customer.tags) });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
