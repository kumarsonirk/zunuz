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

// GET /api/products/:slugOrId — looks up by slug (the public URL), falling
// back to the numeric id for products that don't have one yet or for any
// already-shared link from before slugs existed.
router.get('/:slugOrId', async (req, res) => {
  const { slugOrId } = req.params;
  const isNumeric = /^\d+$/.test(slugOrId);
  try {
    const product = await prisma.product.findFirst({
      where: { OR: [{ slug: slugOrId }, ...(isNumeric ? [{ id: Number(slugOrId) }] : [])] },
      include: { category: true, subcategory: true }
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
