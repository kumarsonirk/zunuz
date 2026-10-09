const router = require('express').Router();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/customerAuth');
const razorpay = require('../lib/razorpay');
const { validateItemsAndTotal, decrementStockAtomic, pincodeServiceability, confirmOnlinePayment, REFUND_OUTCOMES, BLOCK_REASONS } = require('../lib/stock');
const coupons = require('../lib/coupons');
const holds = require('../lib/holds');
const credits = require('../lib/credits');
const settings = require('../lib/settings');
const { notifyNewOrder } = require('../lib/alerts');

const prisma = require('../lib/prisma');

const { sendOrderConfirmationEmail, sendOrderCancellationEmail } = require('../lib/email');

const ORDER_INCLUDE = { items: { include: { product: true } }, address: true, customer: { select: { name: true, email: true, phone: true } }, review: true };
const MAX_QUANTITY_PER_ITEM = 10;
// What My orders shows for each order.
const CUSTOMER_ORDER_INCLUDE = { items: { include: { product: { select: { name: true, image: true, slug: true } } } }, address: true, review: true };

class OrderError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

// Admin alert for an order that just became real — fire-and-forget.
function alertNewOrder(order) {
  try { Promise.resolve(notifyNewOrder(order)).catch((e) => console.error('New-order alert failed:', e)); } catch (e) { console.error('New-order alert failed:', e); }
}

function sendConfirmation(order) {
  const emailToUse = order.customer?.email || order.address?.email;
  if (emailToUse) sendOrderConfirmationEmail(emailToUse, order).catch((err) => console.error('Error sending order confirmation email:', err));
}

// Server-authoritative totals: live prices + stock, coupon, delivery fee.
// Server-authoritative totals: live prices + stock, bundle discount, coupon, delivery fee.
// total = itemsTotal − bundleDiscount − couponDiscount + deliveryFee.
async function priceOrder(client, items, couponCode, customerId) {
  const { itemsTotal, deliveryFee, orderItemsData, bundleDiscount = 0, discountedItemsTotal } = await validateItemsAndTotal(client, items);
  let discount = bundleDiscount;
  let code = null;
  if (couponCode && bundleDiscount > 0) throw new OrderError(COMBO_ONLY_MSG);
  if (couponCode) {
    const result = await coupons.evaluate(couponCode, discountedItemsTotal ?? itemsTotal, customerId, client);
    if (!result.ok) throw new OrderError(result.message);
    discount += result.discount;
    code = result.coupon.code;
  }
  return { itemsTotal, deliveryFee, discount, couponCode: code, total: itemsTotal - discount + deliveryFee, orderItemsData, bundleDiscount };
}

// One offer per order — the Navratri combo, a coupon or ZUNUZ Credits.
const COMBO_ONLY_MSG = 'The Navratri combo offer is already applied — only one offer can be used per order, so coupons and ZUNUZ Credits can’t be added on top.';

// Credits to put toward a partly-paid order (caller holds the customer lock).
// If credits now cover the whole order (balance grew since the pre-check),
// ask the shopper to place it again so it goes through as fully paid.
async function creditsFor(tx, priced, customerId, useCredits) {
  if (!useCredits) return 0;
  if (priced.bundleDiscount > 0) throw new OrderError(COMBO_ONLY_MSG);
  const total = priced.total;
  const bal = await credits.balance(customerId, tx);
  if (bal >= total) throw new OrderError('Your credits now cover the whole order — please place it again.');
  return Math.max(0, bal);
}

// Abuse limits for placing orders: per customer (not per IP), at most
// MAX_LINES different products, and at most MAX_OPEN_COD unshipped COD
// orders at once (COD costs us shipping both ways if it's refused).
const MAX_LINES = 20;
const MAX_OPEN_COD = 3;
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `customer-${req.customer.id}`,
  message: { error: "You've placed a lot of orders in the last hour — please wait a while and try again, or contact customer care." },
});
// …and per network address, so a handful of accounts can't be used to keep
// stock held (each online checkout holds its items for 15 minutes).
const ipOrderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many checkouts from your network — please try again in a while.' },
});

// Body items → [{ productId, quantity }] with duplicate lines of the same
// product added together (the per-product cap applies to the sum), or { error }.
function parseItems(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return { error: 'Address and items required' };
  const qty = new Map();
  for (const i of raw) {
    const ok = i && typeof i === 'object' && Number.isInteger(i.productId) && i.productId > 0 && Number.isInteger(i.quantity) && i.quantity > 0;
    if (!ok) return { error: 'Each item needs a valid product and a whole-number quantity.' };
    qty.set(i.productId, (qty.get(i.productId) || 0) + i.quantity);
  }
  if (qty.size > MAX_LINES) return { error: `An order can have at most ${MAX_LINES} different products.` };
  if ([...qty.values()].some((q) => q > MAX_QUANTITY_PER_ITEM)) return { error: `Quantity must be between 1 and ${MAX_QUANTITY_PER_ITEM} per item.` };
  return { items: [...qty].map(([productId, quantity]) => ({ productId, quantity })) };
}

// POST /api/orders  (place an order — COD confirms immediately, RAZORPAY needs verify-payment)
// Body: { addressId, items: [{ productId, quantity }], paymentMethod, couponCode? }
router.post('/', ipOrderLimiter, auth, orderLimiter, async (req, res) => {
  // Admin → Settings → Pause checkout: no new orders (payments already in
  // progress still complete through verify-payment / the webhook).
  const st = settings.get();
  if (st.checkoutPaused) return res.status(503).json({ error: st.checkoutPausedMessage, checkoutPaused: true });
  const { paymentMethod = 'COD' } = req.body || {};
  const addressId = Number(req.body?.addressId);
  const couponCode = coupons.normalizeCode(req.body?.couponCode) || null;
  const parsed = parseItems(req.body?.items);
  if (!Number.isInteger(addressId) || addressId < 1) return res.status(400).json({ error: 'Address and items required' });
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const { items } = parsed;
  if (!['COD', 'RAZORPAY'].includes(paymentMethod)) return res.status(400).json({ error: 'Invalid payment method' });
  // ZUNUZ Credits: a coupon OR credits on an order, never both.
  const useCredits = req.body?.useCredits === true;
  if (useCredits && couponCode) return res.status(400).json({ error: 'Use either a coupon or your ZUNUZ Credits on an order — not both.' });
  // Credits that cover the whole order (items + delivery) → nothing to pay:
  // the order is placed as paid with credits, whatever method was picked.
  let fullyCredited = false;
  if (useCredits) {
    const [pre, bal] = await Promise.all([priceOrder(prisma, items, null, req.customer.id).catch(() => null), credits.balance(req.customer.id)]);
    if (pre && pre.bundleDiscount > 0) return res.status(400).json({ error: COMBO_ONLY_MSG });
    fullyCredited = !!pre && bal >= pre.total;
  }
  const store = settings.get();
  if (!fullyCredited && paymentMethod === 'COD' && !store.codEnabled) return res.status(400).json({ error: 'Cash on delivery is not available right now — please pay online.' });
  if (!fullyCredited && paymentMethod === 'RAZORPAY' && !store.onlinePaymentsEnabled) return res.status(400).json({ error: 'Online payment is not available right now — please choose cash on delivery.' });

  try {
    const address = await prisma.address.findFirst({ where: { id: addressId, customerId: req.customer.id } });
    if (!address) return res.status(404).json({ error: 'Address not found' });

    // Delivery area: the address pincode must be serviceable, and COD allowed there.
    const pin = await pincodeServiceability(address.pincode);
    if (!pin.serviceable) {
      return res.status(400).json({
        error: pin.valid ? `Sorry, we don't deliver to pincode ${pin.pincode} yet. Please use a different address.` : 'The delivery address has an invalid pincode — please edit it.',
        code: 'PINCODE_NOT_SERVICEABLE',
      });
    }
    if (!fullyCredited && paymentMethod === 'COD' && !pin.codAvailable) {
      return res.status(400).json({ error: `Cash on delivery isn't available for pincode ${pin.pincode} — please pay online.`, code: 'COD_NOT_AVAILABLE' });
    }

    if (fullyCredited) {
      // Paid in full with ZUNUZ Credits: create it PAID + CONFIRMED, take the
      // stock and the credits atomically (customer row locked first, so two
      // checkouts can't spend the same credit).
      const order = await prisma.$transaction(async (tx) => {
        await credits.lockCustomer(tx, req.customer.id);
        const priced = await priceOrder(tx, items, null, req.customer.id);
        if (priced.bundleDiscount > 0) throw new OrderError(COMBO_ONLY_MSG);
        if ((await credits.balance(req.customer.id, tx)) < priced.total) throw new OrderError('Your credits no longer cover this order — please review your order and choose a payment method.');
        const created = await tx.order.create({
          data: {
            customerId: req.customer.id, addressId, total: 0, creditsUsed: priced.total,
            paymentMethod: 'CREDITS', paymentStatus: 'PAID', status: 'CONFIRMED',
            items: { create: priced.orderItemsData },
          },
          include: ORDER_INCLUDE,
        });
        await decrementStockAtomic(tx, items);
        await credits.take(tx, { customerId: req.customer.id, amount: priced.total, orderId: created.id });
        return created;
      });
      sendConfirmation(order);
      alertNewOrder(order);
      return res.status(201).json(order);
    }

    if (paymentMethod === 'COD') {
      // Validate, create the order, reserve stock and use the coupon
      // atomically — if stock or the coupon runs out in the meantime,
      // everything rolls back and the order is never created.
      const order = await prisma.$transaction(async (tx) => {
        // Row locks first (before any plain read): the customer row
        // serialises this customer's COD orders for the open-order cap, the
        // coupon row serialises every order using that code.
        await tx.$queryRaw`SELECT \`id\` FROM \`Customer\` WHERE \`id\` = ${req.customer.id} FOR UPDATE`;
        if (couponCode) await coupons.lockCoupon(tx, couponCode);
        const openCod = await tx.order.count({ where: { customerId: req.customer.id, paymentMethod: 'COD', status: { in: ['PENDING', 'CONFIRMED'] } } });
        if (openCod >= MAX_OPEN_COD) {
          throw new OrderError(`You already have ${MAX_OPEN_COD} cash-on-delivery orders waiting to ship. Please pay online, or wait until one of them is on its way.`);
        }
        const priced = await priceOrder(tx, items, couponCode, req.customer.id);
        const creditsUsed = await creditsFor(tx, priced, req.customer.id, useCredits);
        const created = await tx.order.create({
          data: {
            customerId: req.customer.id,
            addressId,
            total: priced.total - creditsUsed,
            creditsUsed,
            discount: priced.discount,
            couponCode: priced.couponCode,
            paymentMethod,
            items: { create: priced.orderItemsData },
            status: 'PENDING'
          },
          include: ORDER_INCLUDE
        });
        await decrementStockAtomic(tx, items);
        await coupons.redeem(tx, created, { strict: true });
        if (creditsUsed) await credits.take(tx, { customerId: req.customer.id, amount: creditsUsed, orderId: created.id });
        return created;
      });

      sendConfirmation(order);
      alertNewOrder(order);
      return res.status(201).json(order);
    }

    // One open online checkout per customer: starting a new one closes the
    // previous unpaid one and gives its held stock back (so one shopper can
    // never sit on more than a single checkout's worth of stock). If that old
    // checkout still gets paid later, it's refunded (lib/stock.js).
    const previous = await prisma.order.findMany({
      where: { customerId: req.customer.id, paymentMethod: 'RAZORPAY', stockHeld: true, paymentStatus: { not: 'PAID' } },
      select: { id: true },
    });
    for (const { id } of previous) {
      await prisma.order.updateMany({ where: { id, paymentStatus: 'PENDING' }, data: { paymentStatus: 'FAILED' } });
      await holds.releaseHold(id);
    }

    // RAZORPAY: the coupon is only recorded as used once payment is
    // confirmed, but the unpaid order "reserves" it meanwhile (see
    // lib/coupons.js) — so it's checked and created under the coupon lock.
    // The stock is held right away (lib/holds.js), so two shoppers can't
    // both pay for the last piece: the second is told to try again shortly.
    // Credits used on an online checkout are taken now and come back with
    // the stock if the checkout is closed / expires (lib/holds.js).
    const order = await prisma.$transaction(async (tx) => {
      if (useCredits) await credits.lockCustomer(tx, req.customer.id);
      if (couponCode) await coupons.lockCoupon(tx, couponCode);
      const priced = await priceOrder(tx, items, couponCode, req.customer.id);
      const creditsUsed = await creditsFor(tx, priced, req.customer.id, useCredits);
      if (priced.total - creditsUsed < 1) throw new OrderError('The order total must be at least ₹1 to pay online.');
      await decrementStockAtomic(tx, priced.orderItemsData.map((i) => ({ productId: i.productId, quantity: i.quantity })));
      const created = await tx.order.create({
        data: {
          customerId: req.customer.id,
          addressId,
          total: priced.total - creditsUsed,
          creditsUsed,
          discount: priced.discount,
          couponCode: priced.couponCode,
          paymentMethod,
          stockHeld: true,
          items: { create: priced.orderItemsData }
        },
        include: ORDER_INCLUDE
      });
      if (creditsUsed) await credits.take(tx, { customerId: req.customer.id, amount: creditsUsed, orderId: created.id });
      return created;
    });

    // RAZORPAY: create a gateway order for the discounted total (after the
    // transaction — never hold DB locks across a network call).
    try {
      const rpOrder = await razorpay.orders.create({
        amount: order.total * 100,
        currency: 'INR',
        receipt: `order_${order.id}`,
      });
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: { razorpayOrderId: rpOrder.id },
        include: ORDER_INCLUDE
      });
      // holdSeconds: the payment window closes when the stock hold ends.
      return res.status(201).json({ order: updated, razorpayOrderId: rpOrder.id, keyId: process.env.RAZORPAY_KEY_ID, amount: rpOrder.amount, holdSeconds: holds.holdSecondsLeft(updated) });
    } catch (rpError) {
      // FAILED (not PENDING) so the coupon reservation frees straight away;
      // the held stock goes back too.
      await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'FAILED' } }).catch((e) => console.error(e));
      await holds.releaseHold(order.id).catch((e) => console.error(e));
      console.error(rpError);
      return res.status(502).json({ error: 'Could not initiate payment. Try again.' });
    }
  } catch (e) {
    if (e instanceof OrderError || e instanceof coupons.CouponError || e instanceof credits.CreditsError) return res.status(e.status || 400).json({ error: e.message });
    // Friendly stock messages thrown by lib/stock.js. If the last pieces are
    // only held by someone else's open checkout, say so — they may free up.
    if (/^(Product \d+ not available|Insufficient stock)/.test(String(e.message))) {
      if (String(e.message).startsWith('Insufficient stock')) {
        const ids = Array.isArray(items) ? items.map((i) => i.productId) : [];
        if (await holds.heldByOthers(ids).catch(() => false)) {
          return res.status(409).json({ error: `${e.message.replace('Insufficient stock for ', '')}: someone is checking out the last one right now. Please try again in a few minutes.`, code: 'STOCK_HELD' });
        }
      }
      return res.status(400).json({ error: e.message });
    }
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/orders/:id/verify-payment
router.post('/:id/verify-payment', auth, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment details' });
  }
  try {
    const order = await prisma.order.findFirst({
      where: { id: Number(req.params.id), customerId: req.customer.id },
      include: { items: true }
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.paymentMethod !== 'RAZORPAY' || order.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ error: 'Order/payment mismatch' });
    }
    if (order.paymentStatus === 'PAID') {
      const full = await prisma.order.findUnique({ where: { id: order.id }, include: ORDER_INCLUDE });
      return res.json(full);
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    const providedSignature = Buffer.from(String(razorpay_signature));
    const expectedBuf = Buffer.from(expectedSignature);
    const valid = providedSignature.length === expectedBuf.length && crypto.timingSafeEqual(expectedBuf, providedSignature);

    if (!valid) {
      await prisma.order.updateMany({ where: { id: order.id, paymentStatus: { not: 'PAID' } }, data: { paymentStatus: 'FAILED' } });
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    // PAID + stock + coupon use in one step (race-safe against the webhook).
    const { outcome, order: updated } = await confirmOnlinePayment(
      order.id,
      { razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature },
      ORDER_INCLUDE,
    );

    if (REFUND_OUTCOMES.includes(outcome)) {
      // Money taken for an order that can't ship (sold out after its hold
      // ended / coupon already used up / checkout already closed) — it's
      // PAID + CANCELLED; refund it automatically (refund email included).
      const refund = await holds.refundSoldOut(order.id, BLOCK_REASONS[outcome]);
      const full = await prisma.order.findUnique({ where: { id: order.id }, include: ORDER_INCLUDE });
      const why = {
        SOLD_OUT: 'this item sold out while you were paying',
        COUPON_USED: `coupon ${full.couponCode || ''} had already been used on another order`.replace('  ', ' '),
        CANCELLED: 'this checkout had already been closed',
        CREDITS_GONE: 'the ZUNUZ Credits for this order had already been used on another order',
      }[outcome];
      return res.status(409).json({
        error: refund === 'MANUAL'
          ? `Payment received, but ${why}. Your order has been cancelled and we'll refund you in full — contact support if you don't see it within a few days.`
          : `Payment received, but ${why}. We've cancelled the order and refunded ₹${full.total} to your original payment method (5–7 business days).`,
        code: outcome,
        refund,
        order: full,
      });
    }
    if (outcome === 'CONFIRMED') {
      sendConfirmation(updated);
      alertNewOrder(updated);
    }
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /api/orders/:id/cancel-payment  (user closed the Razorpay checkout without paying)
router.post('/:id/cancel-payment', auth, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: Number(req.params.id), customerId: req.customer.id } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.paymentMethod === 'RAZORPAY' && order.paymentStatus !== 'PAID') {
      await prisma.order.updateMany({ where: { id: order.id, paymentStatus: 'PENDING' }, data: { paymentStatus: 'FAILED' } });
      // Window closed: give the held stock back at once.
      await holds.releaseHold(order.id);
    }
    res.json({ message: 'ok' });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── Customer cancellation ──
// Allowed while the order hasn't shipped (PENDING / CONFIRMED) and within
// settings.cancelWindowHours of being placed (Cancellation Policy: 6 hours).
// Stock and any coupon use go back; a prepaid order is refunded in full via
// Razorpay straight away (if that fails, the admin sees the error on the
// order and can retry — the customer is told the refund is on its way).
const CANCEL_REASONS = ['Ordered by mistake', 'Want to change items or size', 'Want to change the address', 'Found a better price', 'Delivery is taking too long', 'Other'];
const CANCELLABLE = ['PENDING', 'CONFIRMED'];
const cancelDeadline = (order) => new Date(new Date(order.createdAt).getTime() + (Number(settings.get().cancelWindowHours) || 0) * 3600e3);

// POST /api/orders/:id/cancel — { reason, note? }
router.post('/:id/cancel', auth, async (req, res) => {
  const reason = CANCEL_REASONS.includes(req.body?.reason) ? req.body.reason : null;
  if (!reason) return res.status(400).json({ error: 'Choose a reason for cancelling.' });
  const note = typeof req.body?.note === 'string' ? req.body.note.replace(/\s+/g, ' ').trim().slice(0, 200) : '';
  try {
    const order = await prisma.order.findFirst({ where: { id: Number(req.params.id), customerId: req.customer.id }, include: { items: true } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const paidOnline = order.paymentMethod === 'RAZORPAY' && order.paymentStatus === 'PAID';
    if (order.paymentMethod !== 'COD' && order.paymentStatus !== 'PAID') return res.status(400).json({ error: 'This order was never paid, so there is nothing to cancel.' });
    if (order.status === 'CANCELLED') return res.status(400).json({ error: 'This order is already cancelled.' });
    if (!CANCELLABLE.includes(order.status)) return res.status(400).json({ error: 'This order has already shipped, so it can no longer be cancelled. Once it arrives you can report a problem within 24 hours.' });
    if (Date.now() > cancelDeadline(order).getTime()) return res.status(400).json({ error: 'The cancellation window for this order has closed. Contact customer care and we’ll do our best to help.' });

    const done = await prisma.$transaction(async (tx) => {
      // Customer row first when credits are involved (same lock order as
      // placing an order: customer → coupon → products).
      if (order.creditsUsed) await credits.lockCustomer(tx, order.customerId);
      // Conditional: if the admin ships it at the same moment, nothing happens.
      const n = await tx.order.updateMany({
        where: { id: order.id, status: { in: CANCELLABLE } },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: 'CUSTOMER', cancelReason: (note ? `${reason} — ${note}` : reason).slice(0, 300) },
      });
      if (!n.count) return false;
      // Coupon before products (same lock order as placing an order).
      await coupons.release(tx, order.id);
      for (const item of order.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }
      // ZUNUZ Credits used on it go back to the wallet (cash is refunded below).
      await credits.returnForOrder(order.id, tx);
      return true;
    });
    if (!done) return res.status(409).json({ error: 'This order is already on its way, so it can no longer be cancelled.' });

    let refund = null;
    if (paidOnline) {
      const { issueRefund } = require('./admin/orders');
      const r = await issueRefund(order.id, { reason: `Cancelled by customer: ${reason}` });
      refund = r.status === 200 ? (r.body.refundStatus === 'PROCESSED' ? 'PROCESSED' : 'PENDING') : 'MANUAL';
      if (r.status !== 200) console.error(`Auto-refund for cancelled order #${order.id} failed:`, r.body?.error);
    }

    const updated = await prisma.order.findUnique({ where: { id: order.id }, include: CUSTOMER_ORDER_INCLUDE });
    const customer = await prisma.customer.findUnique({ where: { id: req.customer.id }, select: { name: true, email: true } });
    const to = customer?.email || updated.address?.email;
    if (to) sendOrderCancellationEmail(to, { ...updated, customer }).catch((err) => console.error('Error sending cancellation email:', err));
    res.json({ order: forCustomer(updated), refund });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin-only / internal fields never sent to customers.
const PRIVATE_ORDER_FIELDS = ['adminNote', 'refundError', 'refundId', 'reminderSentAt', 'razorpaySignature'];
const forCustomer = (order) => {
  if (!order) return order;
  const copy = { ...order };
  PRIVATE_ORDER_FIELDS.forEach((k) => { delete copy[k]; });
  return copy;
};

// GET /api/orders  (my orders)
router.get('/', auth, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        customerId: req.customer.id,
        OR: [{ paymentMethod: 'COD' }, { paymentStatus: 'PAID' }]
      },
      include: CUSTOMER_ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders.map(forCustomer));
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/orders/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: Number(req.params.id), customerId: req.customer.id },
      include: ORDER_INCLUDE
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(forCustomer(order));
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/orders/:id/review  (customer leaves a rating + feedback, delivered orders only)
router.post('/:id/review', auth, async (req, res) => {
  const { rating, comment } = req.body;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be a whole number between 1 and 5.' });
  }
  try {
    const order = await prisma.order.findFirst({
      where: { id: Number(req.params.id), customerId: req.customer.id },
      include: { review: true }
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'DELIVERED') return res.status(400).json({ error: 'You can only review orders once they are delivered.' });
    if (order.review) return res.status(400).json({ error: 'You have already reviewed this order.' });

    const review = await prisma.review.create({
      data: {
        orderId: order.id,
        customerId: req.customer.id,
        rating,
        comment: typeof comment === 'string' ? comment.trim().slice(0, 1000) || null : null,
      }
    });
    res.status(201).json(review);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
