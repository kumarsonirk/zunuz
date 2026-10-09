const router = require('express').Router();
const { BLOCKS, BY_KEY, defaultsOf, cleanBlock, loadOverrides, prisma, EDITABLE_KEYS } = require('../content');

// Only the editable blocks (routes/content.js EDITABLE_KEYS) are listed or
// can be saved / reset.
const editable = (key) => (EDITABLE_KEYS.includes(key) ? BY_KEY[key] : null);

// Admin storefront content editor (Homepage & Banners). Mounted behind
// adminAuth + the 'content' permission + activity logging (src/index.js).
// The block schema and validation live in routes/content.js.

const label = (block) => `${block.page.replace(/ page$/, '')} — ${block.title}`;

const shape = (block, override) => ({
  key: block.key,
  page: block.page,
  title: block.title,
  description: block.description,
  fields: block.fields,
  defaults: defaultsOf(block),
  value: { ...defaultsOf(block), ...(override?.value || {}) },
  customized: Object.keys(override?.value || {}),
  updatedAt: override?.updatedAt || null,
});

// GET /api/admin/content — every block with its schema, defaults and the
// current (merged) value.
router.get('/', async (req, res) => {
  try {
    const overrides = await loadOverrides();
    res.json({ blocks: BLOCKS.filter((b) => EDITABLE_KEYS.includes(b.key)).map((b) => shape(b, overrides[b.key])) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/content/:key — body { value: { field: … } } (or the fields
// directly). Missing fields keep their default. Saving values identical to
// the defaults removes the override.
router.put('/:key', async (req, res) => {
  const block = editable(req.params.key);
  if (!block) return res.status(404).json({ error: 'Unknown content block' });
  const input = req.body && typeof req.body === 'object' && 'value' in req.body ? req.body.value : req.body;
  let override;
  try { override = cleanBlock(block, input); } catch (e) { return res.status(400).json({ error: e.message }); }
  try {
    if (Object.keys(override).length) {
      const json = JSON.stringify(override);
      await prisma.contentBlock.upsert({ where: { key: block.key }, update: { value: json }, create: { key: block.key, value: json } });
    } else {
      await prisma.contentBlock.deleteMany({ where: { key: block.key } });
    }
    const overrides = await loadOverrides();
    res.locals.activitySummary = `Updated storefront content: ${label(block)}`;
    res.json(shape(block, overrides[block.key]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/content/:key — reset the block to its built-in default.
router.delete('/:key', async (req, res) => {
  const block = editable(req.params.key);
  if (!block) return res.status(404).json({ error: 'Unknown content block' });
  try {
    await prisma.contentBlock.deleteMany({ where: { key: block.key } });
    res.locals.activitySummary = `Reset storefront content to default: ${label(block)}`;
    res.json(shape(block, null));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
