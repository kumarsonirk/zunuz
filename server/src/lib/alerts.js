// Admin alerts (growth): new-order emails + daily low-stock email.
//
//   notifyNewOrder(order)   called by the order routes when an order becomes
//                           real (COD placed / online payment verified).
//                           Fire-and-forget: returns immediately, never throws.
//   startAlertScheduler()   called once at server start; every 30 minutes,
//                           after 09:00 IST, sends the low-stock digest once a day.
//   sendLowStockAlert(opts) the digest itself (also used by
//                           POST /api/admin/notifications/send-low-stock).
//
// Recipients = the "Alert email" setting (comma-separated). Every send is
// recorded in EmailLog (ADMIN_NEW_ORDER / ADMIN_LOW_STOCK).
const settings = require('./settings');
const { sendMailHelper, CLIENT_URL } = require('./email');
const { newOrderAlertEmail, lowStockAlertEmail } = require('./mail/alerts');

const prisma = require('./prisma');

const LAST_LOW_STOCK_KEY = 'lastLowStockAlertDate';
const EMAIL_RE = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

// "a@x.com, b@y.com" → ['a@x.com', 'b@y.com'] (invalid / duplicate entries dropped).
function alertRecipients(raw = settings.get().alertEmail) {
  const seen = new Set();
  return String(raw || '').split(',').map((s) => s.trim()).filter((s) => {
    const k = s.toLowerCase();
    if (!EMAIL_RE.test(s) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Store dates/times are Indian Standard Time (fixed +05:30, no DST), whatever
// timezone the server runs in.
const IST_OFFSET_MS = 330 * 60 * 1000;
function istNow(now = new Date()) {
  const d = new Date(now.getTime() + IST_OFFSET_MS);
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
}

const isRealOrder = (o) => o.paymentMethod === 'COD' || o.paymentStatus === 'PAID';

// ── New order ──
// Double-send guards: ids being alerted right now, plus ids alerted in the
// last few minutes (EmailLog rows are written asynchronously).
const inFlight = new Set();
const recentlyAlerted = new Map(); // id → time
const RECENT_MS = 10 * 60 * 1000;

async function sendNewOrderAlert(orderOrId, { to } = {}) {
  const id = Number(typeof orderOrId === 'object' ? orderOrId?.id : orderOrId);
  if (!Number.isInteger(id) || id <= 0) return { sent: 0, skipped: 'no order id' };
  const s = settings.get();
  const recipients = to ? alertRecipients(Array.isArray(to) ? to.join(',') : to) : alertRecipients();
  if (!to && !s.newOrderAlerts) return { sent: 0, skipped: 'new-order alerts are off' };
  if (!recipients.length) return { sent: 0, skipped: 'no alert email set' };
  for (const [k, t] of recentlyAlerted) if (Date.now() - t > RECENT_MS) recentlyAlerted.delete(k);
  if (inFlight.has(id) || recentlyAlerted.has(id)) return { sent: 0, skipped: 'already alerted' };
  inFlight.add(id);
  try {
    const already = await prisma.emailLog.findFirst({ where: { type: 'ADMIN_NEW_ORDER', orderId: id, status: { in: ['SENT', 'SIMULATED'] } }, select: { id: true } });
    if (already) return { sent: 0, skipped: 'already alerted' };
    // Always reload: the passed object may lack items/customer/address or be stale.
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, email: true, phone: true } },
        address: true,
        items: { include: { product: { select: { name: true, image: true } } } },
      },
    });
    if (!order) return { sent: 0, skipped: 'order not found' };
    if (!isRealOrder(order)) return { sent: 0, skipped: 'payment not completed' };
    const mail = newOrderAlertEmail(order, CLIENT_URL);
    let sent = 0;
    for (const addr of recipients) {
      const r = await sendMailHelper({ to: addr, ...mail }, { type: 'ADMIN_NEW_ORDER', orderId: id });
      if (r) sent += 1;
    }
    if (sent) recentlyAlerted.set(id, Date.now());
    return { sent, to: recipients };
  } finally {
    inFlight.delete(id);
  }
}

function notifyNewOrder(order) {
  sendNewOrderAlert(order).catch((e) => console.error('New-order alert failed:', e.message));
  return order;
}

// ── Low stock ──
async function lowStockProducts() {
  const threshold = Number(settings.get().lowStockThreshold) || 0;
  const products = await prisma.product.findMany({
    where: { isActive: true, stock: { lte: threshold } },
    select: { id: true, name: true, slug: true, stock: true, price: true, image: true, category: { select: { name: true } } },
    orderBy: [{ stock: 'asc' }, { name: 'asc' }],
  });
  return { threshold, products };
}

// to: string | string[] (defaults to the alert-email setting).
async function sendLowStockAlert({ to } = {}) {
  const recipients = to ? alertRecipients(Array.isArray(to) ? to.join(',') : to) : alertRecipients();
  if (!recipients.length) return { sent: 0, count: 0, to: [], skipped: 'no recipient' };
  const { threshold, products } = await lowStockProducts();
  if (!products.length) return { sent: 0, count: 0, to: recipients, skipped: 'nothing is low on stock' };
  const mail = lowStockAlertEmail(products, threshold, CLIENT_URL);
  let sent = 0;
  for (const addr of recipients) {
    const r = await sendMailHelper({ to: addr, ...mail }, { type: 'ADMIN_LOW_STOCK' });
    if (r) sent += 1;
  }
  return { sent, count: products.length, to: recipients };
}

let checking = false;
async function dailyLowStockCheck() {
  if (checking) return;
  checking = true;
  try {
    await settings.load();
    const s = settings.get();
    if (!s.lowStockAlerts || !alertRecipients().length) return;
    const { date, hour } = istNow();
    if (hour < 9) return;
    const row = await prisma.storeSetting.findUnique({ where: { key: LAST_LOW_STOCK_KEY } });
    let last = null;
    try { last = row ? JSON.parse(row.value) : null; } catch { last = null; }
    if (last === date) return;
    const result = await sendLowStockAlert();
    // Only mark the day done once something went out (or there was nothing
    // to report and a later check today can still catch new low stock).
    if (result.sent > 0) {
      await prisma.storeSetting.upsert({
        where: { key: LAST_LOW_STOCK_KEY },
        update: { value: JSON.stringify(date) },
        create: { key: LAST_LOW_STOCK_KEY, value: JSON.stringify(date) },
      });
    }
  } catch (e) {
    console.error('Low-stock alert check failed:', e.message);
  } finally {
    checking = false;
  }
}

let timer = null;
function startAlertScheduler() {
  if (timer) return;
  const first = setTimeout(dailyLowStockCheck, 60 * 1000); // let the server settle first
  timer = setInterval(dailyLowStockCheck, 30 * 60 * 1000);
  first.unref?.();
  timer.unref?.();
}

module.exports = {
  notifyNewOrder,
  startAlertScheduler,
  sendNewOrderAlert,
  sendLowStockAlert,
  lowStockProducts,
  alertRecipients,
  dailyLowStockCheck,
};
