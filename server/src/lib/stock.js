// Orders below this items-subtotal get a flat delivery fee; at or above it,
// delivery is free. Keep this in sync with the identical constants in
// src/utils/delivery.js on the frontend — that copy is display-only (this
// file is what actually determines the charged amount).
const DELIVERY_FEE = 70;
const FREE_DELIVERY_THRESHOLD = 700; // itemsTotal >= this ⇒ free delivery

const DELIVERY_FEE_ENABLED = true;

function computeDeliveryFee(itemsTotal) {
  if (!DELIVERY_FEE_ENABLED) return 0;
  return itemsTotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

// Upfront check for a fast, friendly rejection — NOT the authoritative stock gate.
// Two requests can both pass this at once; decrementStockAtomic() below is what
// actually prevents overselling.
async function validateItemsAndTotal(client, items) {
  let itemsTotal = 0;
  const orderItemsData = [];
  for (const item of items) {
    const product = await client.product.findUnique({ where: { id: Number(item.productId) } });
    if (!product || !product.isActive) throw new Error(`Product ${item.productId} not available`);
    if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);
    itemsTotal += product.price * item.quantity;
    orderItemsData.push({ productId: product.id, quantity: item.quantity, price: product.price });
  }
  const deliveryFee = computeDeliveryFee(itemsTotal);
  // `total` (grand total, items + delivery) is what every existing caller
  // already treats as the order's total — Order.create's `total` field and
  // Razorpay's charged `amount` both come from this value.
  return { total: itemsTotal + deliveryFee, itemsTotal, deliveryFee, orderItemsData };
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

module.exports = { validateItemsAndTotal, decrementStockAtomic, computeDeliveryFee, DELIVERY_FEE, FREE_DELIVERY_THRESHOLD };
