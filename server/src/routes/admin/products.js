const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../../middleware/adminAuth');

const prisma = new PrismaClient();

router.get('/', auth, async (req, res) => {
  const { category, subcategory, search } = req.query;
  try {
    const where = {};
    if (category) where.category = { slug: category };
    if (subcategory) where.subcategory = { slug: subcategory };
    if (search) where.name = { contains: search };
    const products = await prisma.product.findMany({
      where,
      include: { category: true, subcategory: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(products);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', auth, async (req, res) => {
  const { name, price, stock, image, images, categoryId, subcategoryId, isActive, description, materials } = req.body;
  try {
    const product = await prisma.product.create({
      data: {
        name, price: Number(price), stock: Number(stock), image,
        images: images ? JSON.stringify(images) : '[]',
        categoryId: Number(categoryId), subcategoryId: Number(subcategoryId),
        isActive: isActive !== undefined ? isActive : true,
        description: description || null,
        materials: materials || null
      },
      include: { category: true, subcategory: true }
    });
    res.status(201).json(product);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', auth, async (req, res) => {
  const { name, price, stock, image, images, categoryId, subcategoryId, isActive, description, materials } = req.body;
  try {
    const product = await prisma.product.update({
      where: { id: Number(req.params.id) },
      data: {
        name, price: Number(price), stock: Number(stock), image,
        images: images ? JSON.stringify(images) : undefined,
        categoryId: Number(categoryId), subcategoryId: Number(subcategoryId),
        isActive,
        description: description || null,
        materials: materials || null
      },
      include: { category: true, subcategory: true }
    });
    res.json(product);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const orderItemCount = await prisma.orderItem.count({ where: { productId: id } });
    if (orderItemCount > 0) {
      return res.status(409).json({ error: `Cannot delete: this product appears in ${orderItemCount} past order(s). Set it to "Inactive" instead to hide it from the store while keeping order history intact.` });
    }
    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Product deleted' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET stats summary for dashboard
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const [totalProducts, totalOrders, totalCustomers, revenueAgg] = await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.customer.count(),
      prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: 'CANCELLED' } } })
    ]);
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { name: true, email: true } }, items: true }
    });
    res.json({ totalProducts, totalOrders, totalCustomers, totalRevenue: revenueAgg._sum.total || 0, recentOrders });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
