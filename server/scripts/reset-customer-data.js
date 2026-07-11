// One-off: wipes Customer, Address, Order, OrderItem (and resets their
// auto-increment counters back to 1). Category, Subcategory, Product, and
// Admin are untouched.
//
// Run from the server/ directory:
//   node scripts/reset-customer-data.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const counts = {
    orderItems: await prisma.orderItem.count(),
    orders: await prisma.order.count(),
    addresses: await prisma.address.count(),
    customers: await prisma.customer.count(),
  };
  console.log('Deleting:', counts);

  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.customer.deleteMany({});

  await prisma.$executeRawUnsafe('ALTER TABLE `OrderItem` AUTO_INCREMENT = 1');
  await prisma.$executeRawUnsafe('ALTER TABLE `Order` AUTO_INCREMENT = 1');
  await prisma.$executeRawUnsafe('ALTER TABLE `Address` AUTO_INCREMENT = 1');
  await prisma.$executeRawUnsafe('ALTER TABLE `Customer` AUTO_INCREMENT = 1');

  console.log('Done. Customer, Address, Order, OrderItem are now empty. Category/Subcategory/Product left untouched.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
