const router = require('express').Router();
const { sendMailHelper, CLIENT_URL } = require('../../lib/email');
const settings = require('../../lib/settings');
const { checkoutReminderEmail } = require('../../lib/mail/reminders');

const prisma = require('../../lib/prisma');

// Abandoned checkouts (growth). Mounted at /api/admin/abandoned behind
// adminAuth + 'orders' permission.
//   GET  /?range=7|30|90|all&search=&page=   list + stats
//   POST /:id/remind                          email one customer
//   POST /remind-all { range, search }        email everyone not yet reminded
//
// "Abandoned" = online (Razorpay) checkout whose payment is PENDING or FAILED.
// "Recovered" = the same customer placed a real order (COD, or online and
// paid) after it, which wasn't cancelled.
const ABANDONED = { paymentMethod: 'RAZORPAY', paymentStatus: { in: ['PENDING', 'FAILED'] } };
const REAL = { OR: [{ paymentMethod: 'COD' }, { paymentStatus: 'PAID' }] };
const RANGES = { 7: 7, 30: 30, 90: 90, all: null };
const DAY = 864e5;
const REMIND_GAP = DAY; // never email the same customer twice within 24h
// A checkout started a few minutes ago may still be in progress.
const MIN_AGE = 30 * 60 * 1000;

function filters(query) {
  const range = Object.prototype.hasOwnProperty.call(RANGES, String(query.range)) ? String(query.range) : '30';
  const days = RANGES[range];
  const and = [ABANDONED];
  if (days) and.push({ createdAt: { gte: new Date(Date.now() - days * DAY) } });
  const search = String(query.search || '').trim();
  if (search) {
    const idNum = Number(search.replace(/^#/, ''));
    and.push({
      OR: [
        { customer: { name: { contains: search } } },
        { customer: { email: { contains: search } } },
        { customer: { phone: { contains: search } } },
        { address: { phone: { contains: search } } },
        ...(Number.isInteger(idNum) && idNum > 0 ? [{ id: idNum }] : []),
      ],
    });
  }
  return { range, where: { AND: and } };
}

const emailOf = (o) => o.customer?.email || o.address?.email || null;

// For each abandoned order: the first non-cancelled real order the same
// customer placed afterwards (or null).
async function recoveries(orders) {
  if (!orders.length) return new Map();
  const customerIds = [...new Set(orders.map((o) => o.customerId))];
  const earliest = new Date(Math.min(...orders.map((o) => new Date(o.createdAt).getTime())));
  const real = await prisma.order.findMany({
    where: { AND: [REAL, { customerId: { in: customerIds } }, { createdAt: { gt: earliest } }, { status: { not: 'CANCELLED' } }] },
    select: { id: true, customerId: true, total: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  const byCustomer = new Map();
  real.forEach((r) => { if (!byCustomer.has(r.customerId)) byCustomer.set(r.customerId, []); byCustomer.get(r.customerId).push(r); });
  const out = new Map();
  orders.forEach((o) => {
    const hit = (byCustomer.get(o.customerId) || []).find((r) => r.createdAt > o.createdAt);
    out.set(o.id, hit || null);
  });
  return out;
}

// Latest reminder per customer (any of their abandoned checkouts).
async function lastReminders(customerIds) {
  if (!customerIds.length) return new Map();
  const rows = await prisma.order.groupBy({
    by: ['customerId'],
    where: { ...ABANDONED, customerId: { in: customerIds }, reminderSentAt: { not: null } },
    _max: { reminderSentAt: true },
  });
  return new Map(rows.map((r) => [r.customerId, r._max.reminderSentAt]));
}

const LIST_INCLUDE = {
  customer: { select: { id: true, name: true, email: true, phone: true } },
  address: { select: { name: true, phone: true, email: true, city: true, pincode: true } },
  items: { include: { product: { select: { id: true, name: true, image: true, slug: true, isActive: true } } } },
};

// Why a reminder can't go out right now (null = it can).
function blockReason(o, { recovered, lastReminder }) {
  if (!emailOf(o)) return 'No email address on this account';
  if (recovered) return `Already ordered (#${recovered.id})`;
  const last = [o.reminderSentAt, lastReminder].filter(Boolean).map((d) => new Date(d).getTime());
  const latest = last.length ? Math.max(...last) : 0;
  if (latest && Date.now() - latest < REMIND_GAP) return 'Reminded in the last 24 hours';
  if (Date.now() - new Date(o.createdAt).getTime() < MIN_AGE) return 'Checkout started less than 30 minutes ago';
  return null;
}

router.get('/', async (req, res) => {
  const { range, where } = filters(req.query);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  try {
    // Stats cover the whole filtered set; rows are paginated.
    const all = await prisma.order.findMany({ where, select: { id: true, customerId: true, total: true, createdAt: true, reminderSentAt: true }, orderBy: { createdAt: 'desc' } });
    const rec = await recoveries(all);
    const recoveredOrderIds = new Set();
    let recoveredCount = 0;
    let recoveredValue = 0;
    all.forEach((o) => {
      const r = rec.get(o.id);
      if (!r) return;
      recoveredCount += 1;
      if (!recoveredOrderIds.has(r.id)) { recoveredOrderIds.add(r.id); recoveredValue += r.total; }
    });
    const pageIds = all.slice((page - 1) * limit, page * limit).map((o) => o.id);
    const rows = await prisma.order.findMany({ where: { id: { in: pageIds } }, include: LIST_INCLUDE, orderBy: { createdAt: 'desc' } });
    const reminders = await lastReminders([...new Set(rows.map((o) => o.customerId))]);
    const items = rows.map((o) => {
      const recovered = rec.get(o.id) || null;
      const email = emailOf(o);
      return {
        id: o.id,
        createdAt: o.createdAt,
        total: o.total,
        paymentStatus: o.paymentStatus,
        reminderSentAt: o.reminderSentAt,
        customer: {
          id: o.customer?.id, name: o.customer?.name || o.address?.name || null, email,
          phone: o.customer?.phone || o.address?.phone || null,
          city: o.address?.city || null,
        },
        items: o.items.map((it) => ({ id: it.id, quantity: it.quantity, price: it.price, product: it.product })),
        recovered,
        blockedReason: blockReason(o, { recovered, lastReminder: reminders.get(o.customerId) }),
      };
    });
    const remindable = await countRemindable(all, rec);
    res.json({
      range,
      items,
      total: all.length,
      pages: Math.max(1, Math.ceil(all.length / limit)),
      page,
      stats: {
        count: all.length,
        value: all.reduce((s, o) => s + o.total, 0),
        reminded: all.filter((o) => o.reminderSentAt).length,
        recoveredCount,
        recoveredValue,
        remindable,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Customers "Remind all" would email (one per customer).
async function remindTargets(all, rec) {
  const candidates = all.filter((o) => !o.reminderSentAt && !rec.get(o.id) && Date.now() - new Date(o.createdAt).getTime() >= MIN_AGE);
  if (!candidates.length) return [];
  const reminders = await lastReminders([...new Set(candidates.map((o) => o.customerId))]);
  const byCustomer = new Map(); // customerId → latest candidate (all is newest first)
  candidates.forEach((o) => {
    const last = reminders.get(o.customerId);
    if (last && Date.now() - new Date(last).getTime() < REMIND_GAP) return;
    if (!byCustomer.has(o.customerId)) byCustomer.set(o.customerId, { latest: o, ids: [] });
    byCustomer.get(o.customerId).ids.push(o.id);
  });
  return [...byCustomer.values()];
}

async function countRemindable(all, rec) {
  const targets = await remindTargets(all, rec);
  if (!targets.length) return 0;
  // Exclude customers without any email.
  const withEmail = await prisma.order.findMany({
    where: { id: { in: targets.map((t) => t.latest.id) } },
    select: { id: true, customer: { select: { email: true } }, address: { select: { email: true } } },
  });
  return withEmail.filter((o) => o.customer?.email || o.address?.email).length;
}

async function sendReminder(orderId) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: LIST_INCLUDE });
  const to = emailOf(order);
  const mail = checkoutReminderEmail(order, CLIENT_URL, { supportEmail: settings.get().supportEmail });
  const r = await sendMailHelper({ to, ...mail }, { type: 'CHECKOUT_REMINDER', orderId: order.id });
  return !!r;
}

router.post('/remind-all', async (req, res) => {
  const { where } = filters(req.body || {});
  try {
    const all = await prisma.order.findMany({ where, select: { id: true, customerId: true, total: true, createdAt: true, reminderSentAt: true }, orderBy: { createdAt: 'desc' } });
    const rec = await recoveries(all);
    const targets = (await remindTargets(all, rec)).slice(0, 100);
    let sent = 0;
    let failed = 0;
    let noEmail = 0;
    for (const t of targets) {
      const o = await prisma.order.findUnique({ where: { id: t.latest.id }, select: { customer: { select: { email: true } }, address: { select: { email: true } } } });
      if (!o?.customer?.email && !o?.address?.email) { noEmail += 1; continue; }
      const ok = await sendReminder(t.latest.id).catch(() => false);
      if (!ok) { failed += 1; continue; }
      sent += 1;
      // One email covers all of this customer's un-reminded checkouts.
      await prisma.order.updateMany({ where: { id: { in: t.ids } }, data: { reminderSentAt: new Date() } });
    }
    if (!sent) res.locals.skipActivity = true;
    res.locals.activitySummary = `Sent ${sent} abandoned-checkout reminder${sent === 1 ? '' : 's'}`;
    res.json({ sent, failed, noEmail });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/remind', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid checkout id.' });
  try {
    const order = await prisma.order.findFirst({ where: { id, ...ABANDONED }, include: LIST_INCLUDE });
    if (!order) return res.status(404).json({ error: 'Abandoned checkout not found (it may have been paid since).' });
    const rec = await recoveries([order]);
    const reminders = await lastReminders([order.customerId]);
    const reason = blockReason(order, { recovered: rec.get(order.id), lastReminder: reminders.get(order.customerId) });
    if (reason) return res.status(409).json({ error: `Can't send a reminder: ${reason.charAt(0).toLowerCase()}${reason.slice(1)}.` });
    const ok = await sendReminder(order.id);
    if (!ok) return res.status(502).json({ error: 'The email could not be sent. Please try again later.' });
    const updated = await prisma.order.update({ where: { id }, data: { reminderSentAt: new Date() }, select: { reminderSentAt: true } });
    res.locals.activitySummary = `Sent an abandoned-checkout reminder for #${id} to ${emailOf(order)}`;
    res.json({ id, reminderSentAt: updated.reminderSentAt });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
