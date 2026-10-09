const router = require('express').Router();

const prisma = require('../../lib/prisma');

// Admin delivery pincodes (/api/admin/pincodes, "settings" permission).
// The list matters in two ways (see lib/stock.js → pincodeServiceability):
//  - always: per-pincode COD availability + delivery time shown to shoppers
//  - with the Settings switch "Only deliver to listed pincodes" on: only
//    active pincodes on this list can be delivered to.

const PIN_RE = /^[1-9]\d{5}$/;
const MAX_BULK = 5000;

// Clean one row; returns { data } or { error }.
function cleanRow(r, { partial = false } = {}) {
  const data = {};
  if (!partial || r.pincode !== undefined) {
    const pin = String(r.pincode ?? '').replace(/\s/g, '');
    if (!PIN_RE.test(pin)) return { error: `"${r.pincode ?? ''}" isn't a valid 6-digit pincode.` };
    data.pincode = pin;
  }
  for (const k of ['city', 'state']) {
    if (partial && r[k] === undefined) continue;
    const v = String(r[k] ?? '').trim();
    if (v.length > 80) return { error: `${k === 'city' ? 'City' : 'State'} must be at most 80 characters.` };
    data[k] = v || null;
  }
  if (!partial || r.etaDays !== undefined) {
    const v = String(r.etaDays ?? '').trim();
    if (v.length > 20) return { error: 'Delivery time must be at most 20 characters (e.g. "2–4 days").' };
    data.etaDays = v || null;
  }
  if (!partial || r.codAvailable !== undefined) data.codAvailable = r.codAvailable === undefined ? true : !!r.codAvailable;
  if (!partial || r.isActive !== undefined) data.isActive = r.isActive === undefined ? true : !!r.isActive;
  return { data };
}

// GET /?q=&take=&skip= → { items, total, stats }
router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const take = Math.min(Math.max(Number(req.query.take) || 100, 1), 500);
  const skip = Math.max(Number(req.query.skip) || 0, 0);
  const where = q ? { OR: [{ pincode: { startsWith: q } }, { city: { contains: q } }, { state: { contains: q } }] } : {};
  try {
    const [items, total, all, active, cod] = await Promise.all([
      prisma.pincode.findMany({ where, orderBy: { pincode: 'asc' }, take, skip }),
      prisma.pincode.count({ where }),
      prisma.pincode.count(),
      prisma.pincode.count({ where: { isActive: true } }),
      prisma.pincode.count({ where: { isActive: true, codAvailable: true } }),
    ]);
    res.json({ items, total, stats: { total: all, active, cod } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not load pincodes.' });
  }
});

router.post('/', async (req, res) => {
  const { data, error } = cleanRow(req.body || {});
  if (error) return res.status(400).json({ error });
  try {
    const created = await prisma.pincode.create({ data });
    res.locals.activitySummary = `Added delivery pincode ${created.pincode}${created.city ? ` (${created.city})` : ''}`;
    res.status(201).json(created);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: `${data.pincode} is already on the list.` });
    console.error(e);
    res.status(500).json({ error: 'Could not add the pincode.' });
  }
});

// POST /bulk { rows: [...], overwrite = true } → { created, updated, skipped }
// Existing pincodes are updated (or left alone with overwrite: false).
router.post('/bulk', async (req, res) => {
  const rows = req.body?.rows;
  const overwrite = req.body?.overwrite !== false;
  if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ error: 'Nothing to add.' });
  if (rows.length > MAX_BULK) return res.status(400).json({ error: `Add at most ${MAX_BULK} pincodes at a time.` });
  const clean = new Map();
  for (let i = 0; i < rows.length; i++) {
    const { data, error } = cleanRow(rows[i] || {});
    if (error) return res.status(400).json({ error: `Row ${i + 1}: ${error}` });
    clean.set(data.pincode, data); // last one wins for duplicates
  }
  try {
    const pins = [...clean.keys()];
    const existing = new Set((await prisma.pincode.findMany({ where: { pincode: { in: pins } }, select: { pincode: true } })).map((p) => p.pincode));
    const toCreate = pins.filter((p) => !existing.has(p)).map((p) => clean.get(p));
    const toUpdate = overwrite ? pins.filter((p) => existing.has(p)) : [];
    await prisma.$transaction([
      ...(toCreate.length ? [prisma.pincode.createMany({ data: toCreate, skipDuplicates: true })] : []),
      ...toUpdate.map((p) => {
        const { pincode, ...rest } = clean.get(p);
        return prisma.pincode.update({ where: { pincode }, data: rest });
      }),
    ]);
    const result = { created: toCreate.length, updated: toUpdate.length, skipped: existing.size - toUpdate.length };
    res.locals.activitySummary = `Bulk-added delivery pincodes: ${result.created} new, ${result.updated} updated`;
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not save the pincodes.' });
  }
});

// PUT /:pin — partial update (inline COD / active toggles, edit).
router.put('/:pin', async (req, res) => {
  const pin = String(req.params.pin);
  const { pincode: _ignored, ...body } = req.body || {};
  const { data, error } = cleanRow(body, { partial: true });
  if (error) return res.status(400).json({ error });
  try {
    const updated = await prisma.pincode.update({ where: { pincode: pin }, data });
    const keys = Object.keys(data);
    res.locals.activitySummary = keys.length === 1 && keys[0] === 'codAvailable'
      ? `${updated.codAvailable ? 'Allowed' : 'Stopped'} cash on delivery for pincode ${pin}`
      : keys.length === 1 && keys[0] === 'isActive'
        ? `${updated.isActive ? 'Activated' : 'Deactivated'} delivery pincode ${pin}`
        : `Updated delivery pincode ${pin}`;
    res.json(updated);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Pincode not found.' });
    console.error(e);
    res.status(500).json({ error: 'Could not save the pincode.' });
  }
});

router.delete('/:pin', async (req, res) => {
  const pin = String(req.params.pin);
  try {
    await prisma.pincode.delete({ where: { pincode: pin } });
    res.locals.activitySummary = `Removed delivery pincode ${pin}`;
    res.json({ message: 'Deleted' });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Pincode not found.' });
    console.error(e);
    res.status(500).json({ error: 'Could not delete the pincode.' });
  }
});

module.exports = router;
