
const prisma = require('./prisma');

// Discount coupons (admin Coupons page → checkout).
//   PERCENT: floor(itemsTotal × value / 100), capped by maxDiscount
//   FLAT:    min(value, itemsTotal)
// Rules (minOrder, dates, usage limits) are checked against the items total
// *before* the discount. Delivery fee is never discounted.
//
// A coupon counts as "used" only when its order becomes real (COD placed, or
// online payment confirmed) — that's when redeem() writes the
// CouponRedemption row and bumps usedCount. While an online checkout waits
// for payment its coupon is "reserved" (see reservedWhere) and counts toward
// both limits, so several unpaid checkouts can't all take the last use.
// Only customers with a verified email can use coupons (one code per inbox).

const CODE_RE = /^[A-Z0-9_-]{3,20}$/;
const normalizeCode = (code) => String(code ?? '').trim().toUpperCase();

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

function computeDiscount(coupon, itemsTotal) {
  const total = Math.max(0, Math.floor(Number(itemsTotal) || 0));
  if (coupon.type === 'PERCENT') {
    let d = Math.floor((total * coupon.value) / 100);
    if (coupon.maxDiscount != null) d = Math.min(d, coupon.maxDiscount);
    return Math.max(0, Math.min(d, total));
  }
  return Math.max(0, Math.min(coupon.value, total));
}

// Lifecycle state shown on the admin page.
function couponStatus(c, now = new Date()) {
  if (!c.isActive) return 'OFF';
  if (c.expiresAt && new Date(c.expiresAt) < now) return 'EXPIRED';
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return 'USED_UP';
  if (c.startsAt && new Date(c.startsAt) > now) return 'SCHEDULED';
  return 'ACTIVE';
}

// Human summary of the rule, e.g. "10% off · max ₹200 · min ₹499".
function describeRule(c) {
  const parts = [c.type === 'PERCENT' ? `${c.value}% off` : `${inr(c.value)} off`];
  if (c.type === 'PERCENT' && c.maxDiscount != null) parts.push(`max ${inr(c.maxDiscount)}`);
  if (c.minOrder > 0) parts.push(`min ${inr(c.minOrder)}`);
  if (c.firstOrderOnly) parts.push('first order only');
  return parts.join(' · ');
}

// Has this customer placed a real order (COD, or paid online) that wasn't
// cancelled? `excludeOrderId`: the order being checked itself.
async function hasPlacedOrder(client, customerId, excludeOrderId) {
  const n = await client.order.count({
    where: {
      customerId: Number(customerId),
      status: { not: 'CANCELLED' },
      OR: [{ paymentMethod: 'COD' }, { paymentStatus: 'PAID' }],
      ...(excludeOrderId ? { id: { not: Number(excludeOrderId) } } : {}),
    },
  });
  return n > 0;
}

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

// Unpaid online checkouts holding a coupon: Razorpay order still PENDING, not
// cancelled, placed in the last RESERVE_MS. Paying turns it into a
// redemption; closing the payment (cancel-payment → FAILED) or waiting it
// out frees it.
const RESERVE_MS = 15 * 60 * 1000; // = the stock hold (lib/holds.js HOLD_MS)
const reservedWhere = (code, excludeOrderId) => ({
  couponCode: code,
  paymentMethod: 'RAZORPAY',
  paymentStatus: 'PENDING',
  status: { not: 'CANCELLED' },
  createdAt: { gte: new Date(Date.now() - RESERVE_MS) },
  ...(excludeOrderId ? { id: { not: Number(excludeOrderId) } } : {}),
});

const UNVERIFIED_MSG = 'Verify your email address to use coupon codes — check your inbox or resend it from My account.';
const NO_EMAIL_MSG = 'Add an email address to your account (My account → Profile) and verify it to use coupon codes.';

// Lock the coupon row for the rest of the transaction so concurrent orders
// using the same code are checked one after another. Call it FIRST in the
// transaction (before any plain read), so evaluate() then sees every use
// committed by whoever held the lock before us.
async function lockCoupon(tx, code) {
  const clean = normalizeCode(code);
  if (!clean) return;
  await tx.$queryRaw`SELECT \`id\` FROM \`Coupon\` WHERE \`code\` = ${clean} FOR UPDATE`;
}

// evaluate(code, itemsTotal, customerId?) → { ok, coupon, discount, message }
// `client` lets the order route run this inside its transaction;
// `excludeOrderId` leaves that order out of the reserved count.
async function evaluate(code, itemsTotal, customerId = null, client = prisma, { excludeOrderId = null } = {}) {
  const clean = normalizeCode(code);
  const fail = (message, coupon = null) => ({ ok: false, coupon, discount: 0, message });
  if (!clean) return fail('Enter a coupon code.');
  if (!CODE_RE.test(clean)) return fail(`"${clean}" isn't a valid coupon code.`);

  const coupon = await client.coupon.findUnique({ where: { code: clean } });
  if (!coupon || !coupon.isActive) return fail(`"${clean}" isn't a valid coupon code.`);

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return fail(`${clean} starts on ${fmtDate(coupon.startsAt)}.`, coupon);
  if (coupon.expiresAt && coupon.expiresAt < now) return fail(`${clean} has expired.`, coupon);
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return fail(`${clean} has been fully redeemed.`, coupon);

  const total = Math.max(0, Math.floor(Number(itemsTotal) || 0));
  if (total < coupon.minOrder) {
    return fail(`Add ${inr(coupon.minOrder - total)} more to use ${clean} (min order ${inr(coupon.minOrder)}).`, coupon);
  }

  if (customerId) {
    const customer = await client.customer.findUnique({ where: { id: Number(customerId) }, select: { email: true, emailVerified: true } });
    // A verified email is required — accounts without one (or that cleared it)
    // can't use coupons, so throwaway accounts can't farm once-per-customer codes.
    if (!customer?.email) return fail(NO_EMAIL_MSG, coupon);
    if (!customer.emailVerified) return fail(UNVERIFIED_MSG, coupon);
    if (coupon.firstOrderOnly && await hasPlacedOrder(client, customerId, excludeOrderId)) {
      return fail(`${clean} is for your first order only.`, coupon);
    }
  }

  if (coupon.usageLimit != null) {
    const reserved = await client.order.count({ where: reservedWhere(coupon.code, excludeOrderId) });
    if (coupon.usedCount + reserved >= coupon.usageLimit) {
      return fail(`The last uses of ${clean} are held by checkouts in progress — try again in a little while.`, coupon);
    }
  }

  if (customerId && coupon.perCustomerLimit != null) {
    const [used, reserved] = await Promise.all([
      client.couponRedemption.count({ where: { couponId: coupon.id, customerId: Number(customerId) } }),
      client.order.count({ where: { ...reservedWhere(coupon.code, excludeOrderId), customerId: Number(customerId) } }),
    ]);
    if (used >= coupon.perCustomerLimit) {
      return fail(coupon.perCustomerLimit === 1 ? `You've already used ${clean}.` : `You've already used ${clean} ${used} times (the limit).`, coupon);
    }
    if (used + reserved >= coupon.perCustomerLimit) {
      return fail(`${clean} is already on one of your unpaid checkouts — finish or close that payment first, or try again in 30 minutes.`, coupon);
    }
  }

  const discount = computeDiscount(coupon, total);
  if (discount <= 0) return fail(`${clean} doesn't apply to this order.`, coupon);
  return { ok: true, coupon, discount, message: `${clean} applied — you save ${inr(discount)}.` };
}

// Record the redemption for an order that just became real. Idempotent
// (CouponRedemption.orderId is unique and checked first).
//   strict = true  (COD, inside the order transaction): if the coupon was
//     used up / removed in the meantime, throw — the order rolls back.
//   strict = false (online payment already taken): never throws for coupon
//     reasons; the customer paid the discounted price, so honour it.
async function redeem(tx, order, { strict = false } = {}) {
  if (!order?.couponCode || !order.discount) return null;
  const existing = await tx.couponRedemption.findUnique({ where: { orderId: order.id } });
  if (existing) return existing;
  const coupon = await tx.coupon.findUnique({ where: { code: order.couponCode } });
  if (!coupon) {
    if (strict) throw new CouponError(`${order.couponCode} is no longer available.`);
    return null;
  }
  if (strict) {
    // Conditional increment — the DB re-checks the limit, so two orders
    // can't both take the last use.
    const n = await tx.$executeRaw`UPDATE \`Coupon\` SET \`usedCount\` = \`usedCount\` + 1 WHERE \`id\` = ${coupon.id} AND (\`usageLimit\` IS NULL OR \`usedCount\` < \`usageLimit\`)`;
    if (!n) throw new CouponError(`${coupon.code} has just been fully redeemed.`);
  } else {
    await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
  }
  return tx.couponRedemption.create({
    data: { couponId: coupon.id, orderId: order.id, customerId: order.customerId, discount: order.discount },
  });
}

// Give a coupon use back when its order is cancelled (admin → Cancelled).
// Deletes the redemption and decrements usedCount, so the customer can use
// the code again and the usage limit frees up. No-op if nothing was recorded.
// If the order is later reinstated, redeem(tx, order) records it again.
async function release(tx, orderId) {
  const r = await tx.couponRedemption.findUnique({ where: { orderId: Number(orderId) } });
  if (!r) return null;
  await tx.couponRedemption.delete({ where: { id: r.id } });
  await tx.$executeRaw`UPDATE \`Coupon\` SET \`usedCount\` = \`usedCount\` - 1 WHERE \`id\` = ${r.couponId} AND \`usedCount\` > 0`;
  return r;
}

// At online-payment time: is the order's coupon still within its limits once
// every earlier use is counted? (A checkout can be paid late — after its
// reservation ran out or the window was closed — while the same code was
// used on another order meanwhile.) Locks the coupon row first. A coupon that
// was deleted / switched off since is honoured: the customer was shown and
// charged that price.
async function stillRedeemable(tx, order) {
  if (!order?.couponCode || !order.discount) return true;
  await lockCoupon(tx, order.couponCode);
  const coupon = await tx.coupon.findUnique({ where: { code: normalizeCode(order.couponCode) } });
  if (!coupon) return true;
  if (await tx.couponRedemption.findUnique({ where: { orderId: order.id } })) return true;
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return false;
  // First-order coupon, but another order became real while this one was paying.
  if (coupon.firstOrderOnly && await hasPlacedOrder(tx, order.customerId, order.id)) return false;
  if (coupon.perCustomerLimit != null) {
    const used = await tx.couponRedemption.count({ where: { couponId: coupon.id, customerId: order.customerId } });
    if (used >= coupon.perCustomerLimit) return false;
  }
  return true;
}

class CouponError extends Error {
  constructor(message) { super(message); this.name = 'CouponError'; this.status = 400; }
}

module.exports = { CODE_RE, normalizeCode, computeDiscount, couponStatus, describeRule, evaluate, lockCoupon, redeem, release, CouponError, RESERVE_MS, UNVERIFIED_MSG, NO_EMAIL_MSG, reservedWhere, stillRedeemable };
