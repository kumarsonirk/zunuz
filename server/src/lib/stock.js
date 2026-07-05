// Upfront check for a fast, friendly rejection — NOT the authoritative stock gate.
// Two requests can both pass this at once; decrementStockAtomic() below is what
// actually prevents overselling.
async function validateItemsAndTotal(client, items) {
  let total = 0;
  const orderItemsData = [];
  for (const item of items) {
    const product = await client.product.findUnique({ where: { id: Number(item.productId) } });
    if (!product || !product.isActive) throw new Error(`Product ${item.productId} not available`);
    if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);
    total += product.price * item.quantity;
    orderItemsData.push({ productId: product.id, quantity: item.quantity, price: product.price });
  }
  return { total, orderItemsData };
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

module.exports = { validateItemsAndTotal, decrementStockAtomic };
