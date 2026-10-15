// Orders below the free-delivery threshold get a flat delivery fee. Both
// come from the admin Settings page (lib/settings.js); this is what actually
// determines the charged amount — the storefront copy is display-only.
const settings = require('./settings');
const { redeem, stillRedeemable } = require('./coupons');
const { releaseHold } = require('./holds');
const credits = require('./credits');

const prisma = require('./prisma');

function computeDeliveryFee(itemsTotal) {
  const s = settings.get();
  if (!s.deliveryFeeEnabled) return 0;
  return itemsTotal >= s.freeDeliveryThreshold ? 0 : s.deliveryFee;
}

// Categories left out of the Navratri combo (storefront: catalogConfig.js).
const COMBO_EXCLUDED = ['festive-glow'];

// One piece per category in every combo (e.g. a necklace + a bracelet + an
// earring pair). Greedy: each set takes the priciest remaining piece from the
// categories with the most pieces left, which gives the most complete sets.
function pickComboSets(pieces, size) {
  const byCat = new Map();
  for (const p of pieces) {
    if (!byCat.has(p.cat)) byCat.set(p.cat, []);
    byCat.get(p.cat).push(p.price);
  }
  for (const list of byCat.values()) list.sort((a, b) => b - a);
  let bundles = 0;
  let regularSum = 0;
  for (;;) {
    const cats = [...byCat.values()].filter((l) => l.length)
      .sort((a, b) => b.length - a.length || b[0] - a[0]);
    if (cats.length < size) break;
    for (const list of cats.slice(0, size)) regularSum += list.shift();
    bundles += 1;
  }
  return { bundles, regularSum };
}

// items: [{ productId, quantity, price, categorySlug? }]
function computeBundleDiscount(items) {
  const s = settings.get();
  if (!s.navratriOfferEnabled) return 0;
  const minPrice = s.navratriMinPrice ?? 499;
  const maxPrice = s.navratriMaxPrice ?? 699;
  const bundleCount = s.navratriBundleCount ?? 3;
  const bundlePrice = s.navratriBundlePrice ?? 999;

  // Combo pieces must be different products (extra units of the same piece
  // are charged at full price) and from different categories.
  const qualifying = [];
  const seen = new Set();
  for (const item of items) {
    if (item.quantity < 1 || seen.has(item.productId)) continue;
    if (COMBO_EXCLUDED.includes(item.categorySlug)) continue;
    if (item.price >= minPrice && item.price <= maxPrice) {
      seen.add(item.productId);
      qualifying.push({ price: item.price, cat: item.categorySlug || `p${item.productId}` });
    }
  }

  const { bundles, regularSum } = pickComboSets(qualifying, bundleCount);
  if (bundles <= 0) return 0;
  return Math.max(0, regularSum - bundles * bundlePrice);
}

// Upfront check for a fast, friendly rejection — NOT the authoritative stock gate.
// Two requests can both pass this at once; decrementStockAtomic() below is what
// actually prevents overselling.
async function validateItemsAndTotal(client, items) {
  let itemsTotal = 0;
  const orderItemsData = [];
  const comboItems = []; // same, plus category (for the combo rule only)
  for (const item of items) {
    const product = await client.product.findUnique({ where: { id: Number(item.productId) }, include: { category: { select: { slug: true } } } });
    if (!product || !product.isActive) throw new Error(`Product ${item.productId} not available`);
    if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);
    itemsTotal += product.price * item.quantity;
    orderItemsData.push({ productId: product.id, quantity: item.quantity, price: product.price });
    comboItems.push({ productId: product.id, quantity: item.quantity, price: product.price, categorySlug: product.category?.slug });
  }
  const bundleDiscount = computeBundleDiscount(comboItems);
  const discountedItemsTotal = Math.max(0, itemsTotal - bundleDiscount);
  const deliveryFee = computeDeliveryFee(discountedItemsTotal);
  // `total` (grand total, items - discounts + delivery) is what every existing caller
  // already treats as the order's total — Order.create's `total` field and
  // Razorpay's charged `amount` both come from this value.
  return { total: discountedItemsTotal + deliveryFee, itemsTotal, discountedItemsTotal, bundleDiscount, deliveryFee, orderItemsData };
}

// Atomic conditional decrement — the WHERE clause is re-evaluated against the
// current row by the database as part of the single UPDATE, so two concurrent
// requests can never both succeed in taking the last unit (unlike a separate
// "check stock, then decrement" pair of queries, which is a classic race condition).
async function decrementStockAtomic(client, items) {
  for (const item of items) {
    const result = await client.product.updateMany({
      where: { id: Number(item.productId), stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } }
    });
    if (result.count === 0) {
      const product = await client.product.findUnique({ where: { id: Number(item.productId) } });
      throw new Error(`Insufficient stock for ${product?.name || 'a product'}`);
    }
  }
}

// Can we deliver to this pincode, and is COD available there?
// pincodeRestriction off → every valid pincode is serviceable (listed info,
// e.g. the delivery time, is used when present). On → only pincodes on the
// admin Pincodes list that are active. COD needs the store-wide switch AND
// (pincode not listed, or listed with COD available). Inactive rows count
// as "not listed".
const PIN_RE = /^[1-9]\d{5}$/;
async function pincodeServiceability(pincode, client = prisma) {
  const pin = String(pincode ?? '').trim();
  const s = settings.get();
  const restricted = !!s.pincodeRestriction;
  if (!PIN_RE.test(pin)) {
    return { pincode: pin, valid: false, serviceable: false, codAvailable: false, etaDays: null, city: null, state: null, restricted, listed: false };
  }
  const row = await client.pincode.findUnique({ where: { pincode: pin } });
  const listed = !!(row && row.isActive);
  const serviceable = restricted ? listed : true;
  return {
    pincode: pin,
    valid: true,
    serviceable,
    codAvailable: serviceable && !!s.codEnabled && (!listed || row.codAvailable),
    // Listed (e.g. Bengaluru): its own delivery time, else the Settings
    // default; anywhere else we deliver: the "other pincodes" time.
    etaDays: listed ? row.etaDays || s.listedPincodeEta || null : serviceable ? s.otherPincodeEta || null : null,
    city: listed ? row.city || null : null,
    state: listed ? row.state || null : null,
    restricted,
    listed,
  };
}

// Online payment confirmed (verify-payment or the Razorpay webhook) →
// PAID + CONFIRMED, take the stock and record the coupon, all at once.
// Checkouts normally hold their stock already (lib/holds.js): then the held
// stock is used as-is; only if the hold was released (expired / window
// closed) is stock taken again here, which can fail → SOLD_OUT.
// The first step is a conditional "claim" (only if not already PAID), so if
// verify-payment and the webhook race, exactly one of them does the work —
// stock is never taken twice. Returns { outcome, order }:
//   CONFIRMED    — this call confirmed it
//   ALREADY_PAID — someone else already did (no side effects here)
//   SOLD_OUT     — paid, but stock ran out while paying → PAID + CANCELLED
//                  (callers refund it — lib/holds.js refundSoldOut; no
//                  coupon use recorded)
// Why a paid checkout can't be fulfilled (→ PAID + CANCELLED, refunded).
const BLOCK_REASONS = {
  SOLD_OUT: 'Sold out while the payment was in progress',
  COUPON_USED: 'Coupon already used up when the payment arrived',
  CANCELLED: 'Checkout was closed or cancelled before the payment arrived',
  CREDITS_GONE: 'ZUNUZ Credits for this order were no longer available when the payment arrived',
};
class CouponUsedUp extends Error {}
class CreditsGone extends Error {}

async function confirmOnlinePayment(orderId, paymentData, include) {
  let reason = null;
  try {
    const confirmed = await prisma.$transaction(async (tx) => {
      // Claim it: only an unpaid checkout that hasn't been cancelled.
      const claimed = await tx.order.updateMany({
        where: { id: orderId, paymentStatus: { not: 'PAID' }, status: { not: 'CANCELLED' } },
        data: { paymentStatus: 'PAID', status: 'CONFIRMED', ...paymentData },
      });
      if (!claimed.count) return null;
      // Still holding its stock? Then that stock is now simply sold.
      const held = await tx.order.updateMany({ where: { id: orderId, stockHeld: true }, data: { stockHeld: false } });
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      // ZUNUZ Credits on this order: if they were given back when the
      // checkout was closed / expired, take them again now — or, if they've
      // been spent since, the order can't go ahead at this price (refunded).
      if (order.creditsUsed > 0) {
        await credits.lockCustomer(tx, order.customerId);
        const owed = order.creditsUsed - (await credits.outstandingForOrder(tx, order.id));
        if (owed > 0) {
          try { await credits.take(tx, { customerId: order.customerId, amount: owed, orderId: order.id }); } catch (err) {
            if (err instanceof credits.CreditsError) throw new CreditsGone();
            throw err;
          }
        }
      }
      // Coupon row before product rows — the same lock order as placing an
      // order (routes/orders.js), so the two can't deadlock each other.
      if (!(await stillRedeemable(tx, order))) throw new CouponUsedUp();
      await redeem(tx, order, { strict: false });
      if (!held.count) await decrementStockAtomic(tx, order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })));
      return order;
    });
    if (confirmed) return { outcome: 'CONFIRMED', order: await prisma.order.findUnique({ where: { id: orderId }, include }) };
    // Not claimed: already paid by the other path (verify-payment vs
    // webhook) — or an admin cancelled this unpaid checkout and the money
    // arrived anyway, which has to be refunded.
    const cur = await prisma.order.findUnique({ where: { id: orderId }, select: { paymentStatus: true, status: true } });
    if (cur && cur.paymentStatus !== 'PAID' && cur.status === 'CANCELLED') reason = 'CANCELLED';
    else return { outcome: 'ALREADY_PAID', order: await prisma.order.findUnique({ where: { id: orderId }, include }) };
  } catch (e) {
    if (e instanceof CouponUsedUp) reason = 'COUPON_USED';
    else if (e instanceof CreditsGone) reason = 'CREDITS_GONE';
    else if (String(e.message).startsWith('Insufficient stock')) reason = 'SOLD_OUT';
    else throw e;
  }

  // Paid, but it can't go ahead: give back any stock it still holds, mark it
  // PAID + CANCELLED. Only the call that makes this change reports it (so
  // verify-payment and the webhook racing refund once, not twice).
  await releaseHold(orderId).catch((err) => console.error(`Releasing hold for order #${orderId} failed:`, err));
  const n = await prisma.order.updateMany({
    where: { id: orderId, paymentStatus: { not: 'PAID' } },
    data: {
      paymentStatus: 'PAID', status: 'CANCELLED', stockHeld: false, ...paymentData,
      ...(reason === 'CANCELLED' ? {} : { cancelledAt: new Date(), cancelledBy: 'SYSTEM', cancelReason: BLOCK_REASONS[reason] }),
    },
  });
  const order = await prisma.order.findUnique({ where: { id: orderId }, include });
  return { outcome: n.count === 1 ? reason : 'ALREADY_PAID', order };
}

// Outcomes of confirmOnlinePayment that took money for an order that won't
// ship — callers refund these (lib/holds.js refundSoldOut).
const REFUND_OUTCOMES = Object.keys(BLOCK_REASONS);

module.exports = { validateItemsAndTotal, decrementStockAtomic, computeDeliveryFee, pincodeServiceability, confirmOnlinePayment, REFUND_OUTCOMES, BLOCK_REASONS };
