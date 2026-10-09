
const prisma = require('./prisma');

// Stock holds for online checkouts.
//
// When a shopper opens the Razorpay window, the stock is taken right away
// (Order.stockHeld = true) so nobody else can pay for the same last piece.
// The hold ends when:
//   - the payment is confirmed (lib/stock.js confirmOnlinePayment uses the
//     held stock instead of taking it again),
//   - the shopper closes the window (POST /api/orders/:id/cancel-payment),
//   - an admin cancels the checkout, or
//   - HOLD_MS passes without payment (sweeper below, every minute).
// Every release is conditional on stockHeld = true and not PAID, so a hold
// is given back at most once and never after the payment claimed it.
// If a payment still lands after its hold ran out and the stock is gone,
// confirmOnlinePayment reports SOLD_OUT and refundSoldOut() refunds it.

const HOLD_MS = 15 * 60 * 1000;
const SWEEP_MS = 60 * 1000;

// Give a checkout's held stock back. Returns true if this call released it.
async function releaseHold(orderId, client = null) {
  const run = async (tx) => {
    const n = await tx.order.updateMany({
      where: { id: Number(orderId), stockHeld: true, paymentStatus: { not: 'PAID' } },
      data: { stockHeld: false },
    });
    if (!n.count) return false;
    // Customer row before product rows when credits are involved — the same
    // lock order as placing an order.
    const o = await tx.order.findUnique({ where: { id: Number(orderId) }, select: { customerId: true, creditsUsed: true } });
    if (o?.creditsUsed) await require('./credits').lockCustomer(tx, o.customerId);
    const items = await tx.orderItem.findMany({ where: { orderId: Number(orderId) }, select: { productId: true, quantity: true } });
    for (const item of items) {
      await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    }
    // …and any ZUNUZ Credits the checkout had taken.
    await require('./credits').returnForOrder(orderId, tx);
    return true;
  };
  return client ? run(client) : prisma.$transaction(run);
}

// Seconds left on a checkout's hold (for the Razorpay window timeout).
const holdSecondsLeft = (order) => Math.max(60, Math.floor((new Date(order.createdAt).getTime() + HOLD_MS - Date.now()) / 1000));

// Is someone else's unpaid checkout holding one of these products? Used to
// tell a shopper "someone is checking out the last one" instead of "sold out".
async function heldByOthers(productIds, client = prisma) {
  if (!productIds.length) return false;
  const n = await client.order.count({
    where: { stockHeld: true, paymentStatus: { not: 'PAID' }, items: { some: { productId: { in: productIds.map(Number) } } } },
  });
  return n > 0;
}

async function sweepExpiredHolds() {
  const expired = await prisma.order.findMany({
    where: { stockHeld: true, paymentStatus: { not: 'PAID' }, createdAt: { lt: new Date(Date.now() - HOLD_MS) } },
    select: { id: true },
    take: 200,
  });
  let released = 0;
  for (const { id } of expired) {
    try { if (await releaseHold(id)) released += 1; } catch (e) { console.error(`Releasing stock hold for order #${id} failed:`, e); }
  }
  if (released) console.log(`Stock holds: released ${released} expired checkout(s).`);
  return released;
}

function startHoldSweeper() {
  const run = () => sweepExpiredHolds().catch((e) => console.error('Stock hold sweep failed:', e));
  setTimeout(run, 5 * 1000).unref();
  setInterval(run, SWEEP_MS).unref();
}

// A payment landed but the stock was gone (its hold had expired and someone
// else bought it): refund it in full through Razorpay straight away instead
// of waiting for an admin. Returns 'REFUNDED' | 'PENDING' | 'MANUAL'.
async function refundSoldOut(orderId, why = 'Sold out while paying') {
  // Lazy require: routes/admin/orders.js itself requires lib/stock.js.
  const { issueRefund } = require('../routes/admin/orders');
  try {
    const r = await issueRefund(orderId, { reason: `${why} — automatic refund` });
    if (r.status === 200) return r.body.refundStatus === 'PROCESSED' ? 'REFUNDED' : 'PENDING';
    console.error(`Automatic sold-out refund for order #${orderId} failed:`, r.body?.error);
  } catch (e) {
    console.error(`Automatic sold-out refund for order #${orderId} failed:`, e);
  }
  return 'MANUAL';
}

module.exports = { HOLD_MS, releaseHold, holdSecondsLeft, heldByOthers, sweepExpiredHolds, startHoldSweeper, refundSoldOut };
