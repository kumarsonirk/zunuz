const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const [categories, subcategories] = await Promise.all([
      prisma.category.findMany({ orderBy: [{ order: 'asc' }, { id: 'asc' }] }),
      prisma.subcategory.findMany({ orderBy: [{ order: 'asc' }, { id: 'asc' }] })
    ]);
    res.json({ categories, subcategories });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
