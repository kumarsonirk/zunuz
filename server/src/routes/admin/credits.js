const router = require('express').Router();
const credits = require('../../lib/credits');

const prisma = require('../../lib/prisma');

// Admin: a customer's ZUNUZ Credits (mounted at /api/admin/customers, next to
// the customers router; 'customers' permission; activity-logged).
//   GET  /:id/credits                      balance + history
//   POST /:id/credits { amount, note }     + adds, − removes (reason required)

router.get('/:id/credits', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid customer' });
  try {
    if (!(await prisma.customer.findUnique({ where: { id }, select: { id: true } }))) return res.status(404).json({ error: 'Customer not found' });
    const w = await credits.wallet(id, { limit: 100 });
    res.json({ balance: w.balance, history: w.history });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/credits', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid customer' });
  try {
    const c = await prisma.customer.findUnique({ where: { id }, select: { id: true, name: true, email: true } });
    if (!c) return res.status(404).json({ error: 'Customer not found' });
    const amount = Math.round(Number(req.body?.amount));
    await credits.adjust(id, amount, req.body?.note, req.adminAccess?.id || null);
    res.locals.activitySummary = `${amount > 0 ? 'Added' : 'Removed'} ₹${Math.abs(amount)} credits ${amount > 0 ? 'to' : 'from'} ${c.name || c.email || `customer #${id}`} (${String(req.body?.note || '').trim().slice(0, 80)})`;
    const w = await credits.wallet(id, { limit: 100 });
    res.json({ balance: w.balance, history: w.history });
  } catch (e) {
    if (e instanceof credits.CreditsError) return res.status(400).json({ error: e.message });
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
