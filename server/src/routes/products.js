const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /api/products?category=core&subcategory=necklaces
router.get('/', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { category, subcategory } = req.query;
  try {
    const where = { isActive: true };
    if (category) where.category = { slug: category };
    if (subcategory) where.subcategory = { slug: subcategory };
    const products = await prisma.product.findMany({
      where,
      include: { category: true, subcategory: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json(products);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
      include: { category: true, subcategory: true }
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
