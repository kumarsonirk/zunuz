const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../../middleware/adminAuth');

const prisma = new PrismaClient();

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function uniqueSlug(model, name) {
  const base = slugify(name) || 'item';
  let slug = base;
  let i = 2;
  while (await model.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

async function nextOrder(model) {
  const last = await model.findFirst({ orderBy: { order: 'desc' } });
  return (last?.order || 0) + 1;
}

router.get('/', auth, async (req, res) => {
  try {
    const [categories, subcategories] = await Promise.all([
      prisma.category.findMany({ orderBy: [{ order: 'asc' }, { id: 'asc' }], include: { _count: { select: { products: true } } } }),
      prisma.subcategory.findMany({ orderBy: [{ order: 'asc' }, { id: 'asc' }], include: { _count: { select: { products: true } } } })
    ]);
    res.json({ categories, subcategories });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/categories', auth, async (req, res) => {
  const { name, subtitle, image } = req.body;
  if (!name || !subtitle || !image) return res.status(400).json({ error: 'Name, subtitle, and image are required.' });
  try {
    const slug = await uniqueSlug(prisma.category, name);
    const order = await nextOrder(prisma.category);
    const category = await prisma.category.create({ data: { name, slug, subtitle, image, order } });
    res.status(201).json(category);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.put('/categories/:id', auth, async (req, res) => {
  const { name, subtitle, image } = req.body;
  try {
    const category = await prisma.category.update({
      where: { id: Number(req.params.id) },
      data: { name, subtitle, image }
    });
    res.json(category);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/categories/:id', auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) return res.status(409).json({ error: `Cannot delete: ${productCount} product(s) still use this category.` });
    await prisma.category.delete({ where: { id } });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.post('/subcategories', auth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required.' });
  try {
    const slug = await uniqueSlug(prisma.subcategory, name);
    const order = await nextOrder(prisma.subcategory);
    const sub = await prisma.subcategory.create({ data: { name, slug, order } });
    res.status(201).json(sub);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.put('/subcategories/:id', auth, async (req, res) => {
  const { name } = req.body;
  try {
    const sub = await prisma.subcategory.update({ where: { id: Number(req.params.id) }, data: { name } });
    res.json(sub);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/subcategories/:id', auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const productCount = await prisma.product.count({ where: { subcategoryId: id } });
    if (productCount > 0) return res.status(409).json({ error: `Cannot delete: ${productCount} product(s) still use this subcategory.` });
    await prisma.subcategory.delete({ where: { id } });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
