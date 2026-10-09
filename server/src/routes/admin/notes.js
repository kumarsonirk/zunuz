const router = require('express').Router();

const prisma = require('../../lib/prisma');

// Admin-only notes + tags on customers (growth).
// Mounted at /api/admin/notes behind adminAuth + 'customers' permission.
//   PUT /customers/:id  { adminNote?, tags?: string[] }  → { id, adminNote, tags }
// Tags are stored comma-separated (no spaces around commas) in Customer.tags.

const MAX_NOTE = 5000;
const MAX_TAG = 30;
const MAX_TAGS_FIELD = 255;

// Clean a tag list: trim, collapse spaces, drop commas, dedupe (case-insensitive).
function cleanTags(input) {
  if (!Array.isArray(input)) throw new Error('Tags must be a list.');
  const seen = new Set();
  const out = [];
  for (const raw of input) {
    const t = String(raw ?? '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) continue;
    if (t.length > MAX_TAG) throw new Error(`Tag “${t.slice(0, 40)}” is too long (max ${MAX_TAG} characters).`);
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  if (out.join(',').length > MAX_TAGS_FIELD) throw new Error('Too many tags — remove a few and try again.');
  return out;
}

const splitTags = (s) => String(s || '').split(',').map((t) => t.trim()).filter(Boolean);

router.put('/customers/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid customer id.' });
  const { adminNote, tags } = req.body || {};
  const data = {};
  try {
    if (adminNote !== undefined) {
      const note = String(adminNote ?? '').replace(/\r\n/g, '\n').trim();
      if (note.length > MAX_NOTE) return res.status(400).json({ error: `Notes can be at most ${MAX_NOTE.toLocaleString('en-IN')} characters.` });
      data.adminNote = note || null;
    }
    if (tags !== undefined) {
      const list = cleanTags(tags);
      data.tags = list.length ? list.join(',') : null;
    }
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  if (!Object.keys(data).length) return res.status(400).json({ error: 'Nothing to save.' });
  try {
    const existing = await prisma.customer.findUnique({ where: { id }, select: { id: true, name: true, email: true } });
    if (!existing) return res.status(404).json({ error: 'Customer not found' });
    const c = await prisma.customer.update({ where: { id }, data, select: { id: true, adminNote: true, tags: true } });
    const what = [data.adminNote !== undefined && 'notes', data.tags !== undefined && 'tags'].filter(Boolean).join(' and ');
    res.locals.activitySummary = `Updated ${what} for customer #${id}${existing.name || existing.email ? ` “${String(existing.name || existing.email).slice(0, 80)}”` : ''}`;
    res.json({ id: c.id, adminNote: c.adminNote || '', tags: splitTags(c.tags) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
