const router = require('express').Router();
const { logActivity } = require('../../lib/adminPermissions');

const prisma = require('../../lib/prisma');

// Newsletter subscribers (admin → Marketing → Subscribers). Mounted behind
// adminAuth + the 'campaign' permission + activity logging (src/index.js).
//   GET    /?status=SUBSCRIBED|UNSUBSCRIBED&search=&page=   list + stats
//   GET    /export.csv?status=   CSV for a mailing tool (Mailchimp, Brevo…)
//   PUT    /:id { status }       unsubscribe / resubscribe someone by hand
//   DELETE /:id                  remove a row entirely (e.g. a data request)

const STATUSES = ['SUBSCRIBED', 'UNSUBSCRIBED'];
const DAY = 864e5;

function where(query) {
  const and = [];
  if (STATUSES.includes(query.status)) and.push({ status: query.status });
  const search = String(query.search || '').trim().slice(0, 100);
  if (search) and.push({ email: { contains: search } });
  return and.length ? { AND: and } : {};
}

const shape = (s, customers) => ({
  id: s.id, email: s.email, status: s.status, source: s.source, createdAt: s.createdAt,
  unsubscribedAt: s.unsubscribedAt, welcomeSentAt: s.welcomeSentAt,
  customer: s.customerId ? customers.get(s.customerId) || null : null,
});

router.get('/', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  try {
    const w = where(req.query);
    const [rows, total, subscribed, unsubscribed, last30] = await Promise.all([
      prisma.newsletterSubscriber.findMany({ where: w, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.newsletterSubscriber.count({ where: w }),
      prisma.newsletterSubscriber.count({ where: { status: 'SUBSCRIBED' } }),
      prisma.newsletterSubscriber.count({ where: { status: 'UNSUBSCRIBED' } }),
      prisma.newsletterSubscriber.count({ where: { status: 'SUBSCRIBED', createdAt: { gte: new Date(Date.now() - 30 * DAY) } } }),
    ]);
    const ids = [...new Set(rows.map((r) => r.customerId).filter(Boolean))];
    const customers = new Map((ids.length ? await prisma.customer.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : []).map((c) => [c.id, c]));
    res.json({ items: rows.map((r) => shape(r, customers)), total, page, pages: Math.max(1, Math.ceil(total / limit)), stats: { subscribed, unsubscribed, last30 } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// CSV: quote when needed; neutralise spreadsheet formulas.
function cell(v) {
  if (v == null) return '';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]|^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const csvDate = (d) => (d ? new Date(new Date(d).getTime() + 5.5 * 3600e3).toISOString().slice(0, 16).replace('T', ' ') : '');

router.get('/export.csv', async (req, res) => {
  const status = STATUSES.includes(req.query.status) ? req.query.status : 'SUBSCRIBED';
  try {
    const rows = await prisma.newsletterSubscriber.findMany({ where: { status }, orderBy: { createdAt: 'asc' } });
    const ids = [...new Set(rows.map((r) => r.customerId).filter(Boolean))];
    const names = new Map((ids.length ? await prisma.customer.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : []).map((c) => [c.id, c.name]));
    const header = ['Email', 'Name', 'Status', 'Joined (IST)', 'Source', 'Unsubscribed (IST)'];
    const body = rows.map((r) => [r.email, r.customerId ? names.get(r.customerId) || '' : '', r.status, csvDate(r.createdAt), r.source || '', csvDate(r.unsubscribedAt)]);
    const csv = [header, ...body].map((r) => r.map(cell).join(',')).join('\r\n');
    const stamp = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="zunuz-subscribers-${status.toLowerCase()}-${stamp}.csv"`, 'Cache-Control': 'no-store' });
    res.send(`﻿${csv}\r\n`);
    logActivity({ admin: req.adminAccess, action: 'EXPORT', section: 'subscribers', summary: `Exported ${rows.length} ${status === 'SUBSCRIBED' ? 'subscribers' : 'unsubscribed emails'} (CSV)`, ip: req.ip });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Export failed' });
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const status = req.body?.status;
  if (!Number.isInteger(id) || !STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid request' });
  try {
    const sub = await prisma.newsletterSubscriber.findUnique({ where: { id } });
    if (!sub) return res.status(404).json({ error: 'Subscriber not found' });
    const updated = await prisma.newsletterSubscriber.update({
      where: { id },
      data: status === 'UNSUBSCRIBED' ? { status, unsubscribedAt: new Date() } : { status, unsubscribedAt: null },
    });
    res.locals.activitySummary = `${status === 'UNSUBSCRIBED' ? 'Unsubscribed' : 'Resubscribed'} ${sub.email} from the newsletter`;
    res.json(shape(updated, new Map()));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid request' });
  try {
    const sub = await prisma.newsletterSubscriber.findUnique({ where: { id } });
    if (!sub) return res.status(404).json({ error: 'Subscriber not found' });
    await prisma.newsletterSubscriber.delete({ where: { id } });
    res.locals.activitySummary = `Deleted newsletter subscriber ${sub.email}`;
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
