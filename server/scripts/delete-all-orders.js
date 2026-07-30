// One-off: deletes every order from the database, restoring stock first for
// any order that had actually reserved it (COD orders, or Razorpay orders
// that were PAID) — pending/failed Razorpay orders never decremented stock,
// so those are skipped to avoid adding phantom stock.
//
// Run against production: set DATABASE_URL to Railway's connection string
// first, then:
//   node scripts/delete-all-orders.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const orders = await prisma.order.findMany({ include: { items: true } });
  console.log(`Found ${orders.length} order(s).`);

  let restoredCount = 0;
  for (const order of orders) {
    const stockWasReserved = order.paymentMethod === 'COD' || order.paymentStatus === 'PAID';
    if (!stockWasReserved) continue;
    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } }
      });
    }
    restoredCount++;
  }
  console.log(`Restored stock for ${restoredCount} order(s) that had reserved it.`);

  const { count } = await prisma.order.deleteMany();
  console.log(`Deleted ${count} order(s) (their items were cascade-deleted automatically).`);

  await prisma.$disconnect();
})();
