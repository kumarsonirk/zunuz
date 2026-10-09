const settings = require('./settings');

const prisma = require('./prisma');

// ZUNUZ Credits — store credit from Refer & Earn (and admin goodwill). It
// can only be spent on ZUNUZ orders: never withdrawn, cashed out or
// transferred. Ledger in CreditTransaction:
//   positive rows (earned): amount = what was added, remaining = what's still
//     unspent; each expires `creditExpiryDays` after it was added;
//   negative rows: SPENT (order), EXPIRED, REVERSED, ADJUSTMENT (admin −).
// Balance = sum(remaining) of positive rows that haven't expired.
// Spending takes the oldest credit first (so the soonest-expiring goes first).
// Every write that changes a balance runs in a transaction holding the
// customer row lock, so two checkouts can't spend the same credit.

const EARN_TYPES = ['REFERRAL_REWARD', 'FRIEND_BONUS', 'RETURNED', 'ADJUSTMENT'];
const LABELS = {
  REFERRAL_REWARD: 'Referral reward',
  FRIEND_BONUS: 'Welcome bonus (referred by a friend)',
  RETURNED: 'Credits returned',
  ADJUSTMENT: 'Adjustment by ZUNUZ',
  SPENT: 'Used on order',
  EXPIRED: 'Expired',
  REVERSED: 'Reward reversed',
};
const DAY = 864e5;

const expiryFromNow = () => new Date(Date.now() + (Number(settings.get().creditExpiryDays) || 180) * DAY);
const liveWhere = (customerId, now = new Date()) => ({
  customerId: Number(customerId), amount: { gt: 0 }, remaining: { gt: 0 },
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

const lockCustomer = (tx, customerId) => tx.$queryRaw`SELECT \`id\` FROM \`Customer\` WHERE \`id\` = ${Number(customerId)} FOR UPDATE`;

async function balance(customerId, client = prisma) {
  const r = await client.creditTransaction.aggregate({ where: liveWhere(customerId), _sum: { remaining: true } });
  return r._sum.remaining || 0;
}

// Add credit (amount > 0). `tx` must already hold the customer lock when
// called inside a larger transaction; standalone calls take it themselves.
async function grant(tx, { customerId, amount, type, note = null, orderId = null, referralId = null, adminId = null, expiresAt = null }) {
  const amt = Math.round(Number(amount));
  if (!Number.isInteger(amt) || amt <= 0) throw new Error('Credit amount must be a positive whole number');
  if (!EARN_TYPES.includes(type)) throw new Error(`Not an earning type: ${type}`);
  return tx.creditTransaction.create({
    data: { customerId: Number(customerId), amount: amt, remaining: amt, type, note, orderId, referralId, adminId, expiresAt: expiresAt || expiryFromNow() },
  });
}

// Take `amount` from the customer's live credit, oldest first. Throws if
// there isn't enough. Records one negative row (type SPENT / ADJUSTMENT /
// REVERSED). Caller must hold the customer lock (lockCustomer) in `tx`.
async function take(tx, { customerId, amount, type = 'SPENT', orderId = null, note = null, adminId = null, referralId = null }) {
  const amt = Math.round(Number(amount));
  if (!Number.isInteger(amt) || amt <= 0) return null;
  const rows = await tx.creditTransaction.findMany({ where: liveWhere(customerId), orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }] });
  const have = rows.reduce((s, r) => s + r.remaining, 0);
  if (have < amt) throw new CreditsError(`Only ₹${have} of credits available.`);
  let left = amt;
  for (const r of rows) {
    if (!left) break;
    const use = Math.min(r.remaining, left);
    await tx.creditTransaction.update({ where: { id: r.id }, data: { remaining: { decrement: use } } });
    left -= use;
  }
  return tx.creditTransaction.create({ data: { customerId: Number(customerId), amount: -amt, remaining: 0, type, orderId, note, adminId, referralId } });
}

// Credits spent on this order that haven't been given back yet.
async function outstandingForOrder(tx, orderId) {
  const r = await tx.creditTransaction.groupBy({ by: ['type'], where: { orderId: Number(orderId), type: { in: ['SPENT', 'RETURNED'] } }, _sum: { amount: true } });
  const spent = -(r.find((x) => x.type === 'SPENT')?._sum.amount || 0);
  const returned = r.find((x) => x.type === 'RETURNED')?._sum.amount || 0;
  return Math.max(0, spent - returned);
}

// Give back whatever credit an order still holds (cancelled / failed /
// closed checkout). Idempotent — calling it twice returns nothing the 2nd
// time. Returned credit gets a fresh expiry. Returns the amount given back.
async function returnForOrder(orderId, client = null) {
  const run = async (tx) => {
    const order = await tx.order.findUnique({ where: { id: Number(orderId) }, select: { id: true, customerId: true, creditsUsed: true } });
    if (!order || !order.creditsUsed) return 0;
    await lockCustomer(tx, order.customerId);
    const owed = await outstandingForOrder(tx, order.id);
    if (!owed) return 0;
    await grant(tx, { customerId: order.customerId, amount: owed, type: 'RETURNED', orderId: order.id, note: `Order #${order.id} cancelled` });
    return owed;
  };
  return client ? run(client) : prisma.$transaction(run);
}

// Daily: credit past its expiry → recorded as EXPIRED, remaining zeroed.
async function expireCredits(now = new Date()) {
  const rows = await prisma.creditTransaction.findMany({ where: { amount: { gt: 0 }, remaining: { gt: 0 }, expiresAt: { lte: now } }, take: 500 });
  for (const r of rows) {
    await prisma.$transaction(async (tx) => {
      await lockCustomer(tx, r.customerId);
      const n = await tx.creditTransaction.updateMany({ where: { id: r.id, remaining: r.remaining }, data: { remaining: 0 } });
      if (n.count) await tx.creditTransaction.create({ data: { customerId: r.customerId, amount: -r.remaining, remaining: 0, type: 'EXPIRED', note: `₹${r.remaining} of ${LABELS[r.type] || 'credit'} expired` } });
    }).catch((e) => console.error(`Expiring credit #${r.id} failed:`, e));
  }
  return rows.length;
}

// Wallet summary + history for the customer (or admin).
async function wallet(customerId, { limit = 50 } = {}) {
  const now = new Date();
  const [bal, rows, soon] = await Promise.all([
    balance(customerId),
    prisma.creditTransaction.findMany({ where: { customerId: Number(customerId) }, orderBy: { id: 'desc' }, take: limit }),
    prisma.creditTransaction.findFirst({ where: { ...liveWhere(customerId, now), expiresAt: { gt: now, lte: new Date(now.getTime() + 30 * DAY) } }, orderBy: { expiresAt: 'asc' } }),
  ]);
  return {
    balance: bal,
    expiringSoon: soon ? { amount: soon.remaining, date: soon.expiresAt } : null,
    history: rows.map((r) => ({
      id: r.id,
      amount: r.amount,
      type: r.type,
      label: r.type === 'SPENT' && r.orderId ? `Used on order #${r.orderId}` : r.type === 'RETURNED' && r.orderId ? `Returned from order #${r.orderId}` : (r.note && ['ADJUSTMENT', 'REVERSED'].includes(r.type) ? `${LABELS[r.type]} — ${r.note}` : LABELS[r.type] || r.type),
      orderId: r.orderId,
      createdAt: r.createdAt,
      expiresAt: r.amount > 0 ? r.expiresAt : null,
    })),
  };
}

// Admin: add (+) or remove (−) credit with a reason.
async function adjust(customerId, amount, note, adminId) {
  const amt = Math.round(Number(amount));
  if (!Number.isInteger(amt) || amt === 0) throw new CreditsError('Enter a whole rupee amount (use − to remove credit).');
  if (Math.abs(amt) > 100000) throw new CreditsError('That amount is too large.');
  const why = String(note || '').trim().slice(0, 200);
  if (!why) throw new CreditsError('Add a short reason for the adjustment.');
  return prisma.$transaction(async (tx) => {
    await lockCustomer(tx, customerId);
    if (amt > 0) return grant(tx, { customerId, amount: amt, type: 'ADJUSTMENT', note: why, adminId });
    return take(tx, { customerId, amount: -amt, type: 'ADJUSTMENT', note: why, adminId });
  });
}

class CreditsError extends Error {
  constructor(message) { super(message); this.name = 'CreditsError'; this.status = 400; }
}

module.exports = { balance, grant, take, returnForOrder, outstandingForOrder, expireCredits, wallet, adjust, lockCustomer, CreditsError, LABELS };
