const crypto = require('crypto');
const settings = require('./settings');
const credits = require('./credits');
const { sendCreditEmail } = require('./mail/credits');

const prisma = require('./prisma');

// Refer & Earn ("Give ₹50, get ₹50" — amounts and rules in settings).
//   1. Every customer has a referral code (made on first use).
//   2. A NEW account created through a code is linked to its referrer
//      (Referral row, status JOINED). The friend gets their bonus credit once
//      their email is verified (Google sign-ups are verified already).
//   3. The referrer is rewarded once the friend's first order with an items
//      total of at least referralMinOrder is DELIVERED and its 24-hour return
//      window has passed with no refund / return — checked hourly (sweep).
//      Same phone or delivery address as the referrer → rejected (self-
//      referral). Over the referrer's monthly cap → waits for next month.
//   4. Admins can approve early or reject (admin/referrals.js).

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const CODE_RE = /^[A-Z0-9]{4,16}$/;
// 24-hour return window in production so refunded/returned orders aren't rewarded.
// In development, 0 ms so delivered orders can be tested immediately.
const RETURN_WINDOW_MS = process.env.NODE_ENV === 'production' ? 24 * 60 * 60 * 1000 : 0;
const REAL = { OR: [{ paymentMethod: 'COD' }, { paymentStatus: 'PAID' }] };

const normalize = (code) => String(code ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || null;

function randomCode(name) {
  const prefix = normalize(name).replace(/[^A-Z]/g, '').slice(0, 4) || 'ZUNU';
  const bytes = crypto.randomBytes(4);
  let tail = '';
  for (const b of bytes) tail += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `${prefix}${tail}`;
}

// The customer's own code (created the first time it's needed).
async function ensureCode(customerId) {
  const c = await prisma.customer.findUnique({ where: { id: Number(customerId) }, select: { id: true, name: true, referralCode: true } });
  if (!c) return null;
  if (c.referralCode) return c.referralCode;
  for (let i = 0; i < 6; i++) {
    const code = randomCode(c.name);
    const n = await prisma.customer.updateMany({ where: { id: c.id, referralCode: null }, data: { referralCode: code } }).catch((e) => (e.code === 'P2002' ? { count: -1 } : Promise.reject(e)));
    if (n.count === 1) return code;
    if (n.count === 0) return (await prisma.customer.findUnique({ where: { id: c.id }, select: { referralCode: true } })).referralCode;
  }
  throw new Error('Could not create a referral code');
}

async function findReferrer(code) {
  const clean = normalize(code);
  if (!CODE_RE.test(clean)) return null;
  return prisma.customer.findUnique({ where: { referralCode: clean }, select: { id: true, name: true, email: true, phone: true } });
}

// Called right after a NEW customer account is created. Never throws — a bad
// code just means no referral.
async function attachReferral(newCustomer, code) {
  try {
    if (!code || !settings.get().referralEnabled) return null;
    const referrer = await findReferrer(code);
    if (!referrer || referrer.id === newCustomer.id) return null;
    if (newCustomer.phone && referrer.phone && newCustomer.phone === referrer.phone) return null;
    const ref = await prisma.referral.create({ data: { referrerId: referrer.id, refereeId: newCustomer.id } });
    await prisma.customer.update({ where: { id: newCustomer.id }, data: { referredById: referrer.id } });
    return ref;
  } catch (e) {
    if (e.code !== 'P2002') console.error('Attaching referral failed:', e);
    return null;
  }
}

// The friend's welcome credit — once, after their email is verified.
async function grantFriendBonus(refereeId) {
  try {
    const s = settings.get();
    if (!s.referralEnabled || !s.referralFriendBonus) return 0;
    const ref = await prisma.referral.findUnique({ where: { refereeId: Number(refereeId) } });
    if (!ref || ref.friendBonus > 0 || ref.status === 'REJECTED') return 0;
    const amount = s.referralFriendBonus;
    const done = await prisma.$transaction(async (tx) => {
      await credits.lockCustomer(tx, ref.refereeId);
      const n = await tx.referral.updateMany({ where: { id: ref.id, friendBonus: 0 }, data: { friendBonus: amount } });
      if (!n.count) return false;
      await credits.grant(tx, { customerId: ref.refereeId, amount, type: 'FRIEND_BONUS', referralId: ref.id });
      return true;
    });
    if (!done) return 0;
    const friend = await prisma.customer.findUnique({ where: { id: ref.refereeId }, select: { name: true, email: true } });
    sendCreditEmail(friend, {
      amount, type: 'CREDIT_FRIEND_BONUS', expiryDays: s.creditExpiryDays,
      headline: `₹${amount} credit is yours`,
      body: 'a friend invited you to ZUNUZ, so here is a little welcome gift. It comes off your order automatically when you choose “Use ZUNUZ Credits” at checkout.',
    }).catch((e) => console.error('Friend bonus email failed:', e));
    return amount;
  } catch (e) {
    console.error('Friend bonus failed:', e);
    return 0;
  }
}

const normAddr = (a) => (a ? `${a.houseNo || ''} ${a.street || ''} ${a.pincode || ''}`.toLowerCase().replace(/[^a-z0-9]/g, '') : '');
const digits = (p) => String(p || '').replace(/\D/g, '').slice(-10);

// Credit the referrer for this referral (used by the sweep and by admin
// "approve"). Conditional on the referral still being JOINED, so it pays once.
async function reward(ref, orderId, { by = 'sweep' } = {}) {
  const s = settings.get();
  const amount = s.referralReward;
  const done = await prisma.$transaction(async (tx) => {
    await credits.lockCustomer(tx, ref.referrerId);
    const n = await tx.referral.updateMany({ where: { id: ref.id, status: 'JOINED' }, data: { status: 'REWARDED', orderId: orderId || null, reward: amount, rewardedAt: new Date(), rejectReason: null } });
    if (!n.count) return false;
    if (amount > 0) await credits.grant(tx, { customerId: ref.referrerId, amount, type: 'REFERRAL_REWARD', referralId: ref.id, orderId: orderId || null, note: by === 'admin' ? 'Approved by ZUNUZ' : null });
    return true;
  });
  if (done && amount > 0) {
    const [referrer, friend] = await Promise.all([
      prisma.customer.findUnique({ where: { id: ref.referrerId }, select: { name: true, email: true } }),
      prisma.customer.findUnique({ where: { id: ref.refereeId }, select: { name: true } }),
    ]);
    sendCreditEmail(referrer, {
      amount, type: 'CREDIT_REFERRAL_REWARD', expiryDays: s.creditExpiryDays,
      headline: `You earned ₹${amount}!`,
      body: `${firstName(friend?.name) || 'Your friend'} just received their first ZUNUZ order — thanks for spreading the word. Your reward is ready to use on your next order.`,
    }).catch((e) => console.error('Referral reward email failed:', e));
  }
  return done;
}

async function reject(ref, reason) {
  const n = await prisma.referral.updateMany({ where: { id: ref.id, status: 'JOINED' }, data: { status: 'REJECTED', rejectReason: String(reason || '').slice(0, 255) || 'Not eligible' } });
  return n.count === 1;
}

const itemsTotalOf = (o) => o.items.reduce((s, i) => s + i.price * i.quantity, 0);

// Hourly: reward referrals whose friend's qualifying order has cleared its
// return window.
async function sweepReferrals(now = new Date()) {
  const s = settings.get();
  if (!s.referralEnabled) return { rewarded: 0, rejected: 0 };
  const open = await prisma.referral.findMany({ where: { status: 'JOINED' }, orderBy: { createdAt: 'asc' }, take: 200 });
  let rewarded = 0;
  let rejected = 0;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  for (const ref of open) {
    try {
      const orders = await prisma.order.findMany({
        where: { AND: [REAL, { customerId: ref.refereeId, status: 'DELIVERED', deliveredAt: { not: null, lte: new Date(now.getTime() - RETURN_WINDOW_MS) } }] },
        include: { items: true, address: true, returnRequests: { select: { status: true } } },
        orderBy: { deliveredAt: 'asc' },
      });
      const qualifying = orders.find((o) => itemsTotalOf(o) - (o.discount || 0) >= s.referralMinOrder && !(o.refundAmount > 0)
        && !o.returnRequests.some((r) => ['PENDING', 'APPROVED', 'COMPLETED'].includes(r.status)));
      if (!qualifying) continue;

      // Self-referral checks: the friend's order mustn't be going to the
      // referrer (same phone or same delivery address).
      const referrer = await prisma.customer.findUnique({ where: { id: ref.referrerId }, include: { addresses: true } });
      if (!referrer) { if (await reject(ref, 'Referrer account no longer exists')) rejected += 1; continue; }
      const friend = await prisma.customer.findUnique({ where: { id: ref.refereeId }, select: { phone: true } });
      const theirPhones = new Set([digits(referrer.phone), ...referrer.addresses.map((a) => digits(a.phone))].filter((p) => p.length === 10));
      const friendPhones = [digits(friend?.phone), digits(qualifying.address?.phone)].filter((p) => p.length === 10);
      if (friendPhones.some((p) => theirPhones.has(p))) { if (await reject(ref, 'Same phone number as the referrer')) rejected += 1; continue; }
      const addr = normAddr(qualifying.address);
      if (addr && referrer.addresses.some((a) => normAddr(a) === addr)) { if (await reject(ref, 'Same delivery address as the referrer')) rejected += 1; continue; }

      // Monthly cap: over it → wait for next month.
      if (s.referralMonthlyCap > 0) {
        const thisMonth = await prisma.referral.count({ where: { referrerId: ref.referrerId, status: 'REWARDED', rewardedAt: { gte: monthStart } } });
        if (thisMonth >= s.referralMonthlyCap) continue;
      }
      if (await reward(ref, qualifying.id)) rewarded += 1;
    } catch (e) {
      console.error(`Referral #${ref.id} check failed:`, e);
    }
  }
  if (rewarded || rejected) console.log(`Referrals: ${rewarded} rewarded, ${rejected} rejected.`);
  return { rewarded, rejected };
}

// Customer's Refer & Earn summary.
async function summaryFor(customerId) {
  const s = settings.get();
  const code = await ensureCode(customerId);
  const refs = await prisma.referral.findMany({ where: { referrerId: Number(customerId) }, orderBy: { createdAt: 'desc' }, take: 100 });
  const friends = await prisma.customer.findMany({ where: { id: { in: refs.map((r) => r.refereeId) } }, select: { id: true, name: true } });
  const nameOf = new Map(friends.map((f) => [f.id, f.name]));
  const ordered = new Set((await prisma.order.findMany({
    where: { AND: [REAL, { customerId: { in: refs.filter((r) => r.status === 'JOINED').map((r) => r.refereeId) } }, { status: { not: 'CANCELLED' } }] },
    select: { customerId: true },
  })).map((o) => o.customerId));
  const list = refs.map((r) => {
    const full = String(nameOf.get(r.refereeId) || '').trim().split(/\s+/);
    const shown = full[0] ? `${full[0]}${full[1] ? ` ${full[1][0]}.` : ''}` : 'A friend';
    const status = r.status === 'REWARDED' ? 'REWARDED' : r.status === 'REJECTED' ? 'NOT_ELIGIBLE' : ordered.has(r.refereeId) ? 'ORDERED' : 'JOINED';
    return { name: shown, joinedAt: r.createdAt, status, reward: r.reward };
  });
  return {
    enabled: !!s.referralEnabled,
    code,
    link: `/?ref=${code}`,
    reward: s.referralReward,
    friendBonus: s.referralFriendBonus,
    minOrder: s.referralMinOrder,
    stats: {
      joined: refs.length,
      pending: list.filter((f) => f.status === 'ORDERED').length,
      rewarded: list.filter((f) => f.status === 'REWARDED').length,
      earned: refs.reduce((sum, r) => sum + (r.status === 'REWARDED' ? r.reward : 0), 0),
    },
    friends: list,
  };
}

// Referral rewards still to come for this customer (shown as "pending").
async function pendingFor(customerId) {
  const s = settings.get();
  const refs = await prisma.referral.findMany({ where: { referrerId: Number(customerId), status: 'JOINED' }, select: { refereeId: true } });
  if (!refs.length || !s.referralReward) return 0;
  const n = await prisma.order.groupBy({ by: ['customerId'], where: { AND: [REAL, { customerId: { in: refs.map((r) => r.refereeId) } }, { status: { not: 'CANCELLED' } }] } });
  return n.length * s.referralReward;
}

function startReferralScheduler() {
  const hourly = () => sweepReferrals().catch((e) => console.error('Referral sweep failed:', e));
  const daily = () => credits.expireCredits().catch((e) => console.error('Credit expiry failed:', e));
  setTimeout(() => { hourly(); daily(); }, 30 * 1000).unref();
  setInterval(hourly, 60 * 60 * 1000).unref();
  setInterval(daily, 24 * 60 * 60 * 1000).unref();
}

module.exports = { ensureCode, findReferrer, attachReferral, grantFriendBonus, sweepReferrals, reward, reject, summaryFor, pendingFor, startReferralScheduler, normalize, firstName };
