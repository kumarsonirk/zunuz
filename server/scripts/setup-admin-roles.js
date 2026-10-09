// Creates the starter admin roles and gives every admin that has no role
// the Super Admin role. Idempotent — safe to run again (existing roles keep
// whatever permissions were edited in the admin panel).
//
//   cd server && node scripts/setup-admin-roles.js
//
// Run once on the live database after deploying the roles feature.
const { PrismaClient } = require('@prisma/client');
const { ALL } = require('../src/lib/adminPermissions');

const prisma = new PrismaClient();

const ROLES = [
  { name: 'Super Admin', description: 'Full access to everything, including admin users and roles.', permissions: ALL, isSystem: true },
  { name: 'Store Manager', description: 'Runs the shop day to day — catalogue, orders, customers and campaign.', permissions: ['stats', 'products', 'categories', 'reviews', 'orders', 'customers', 'campaign'] },
  { name: 'Order Manager', description: 'Processes orders and helps customers.', permissions: ['stats', 'orders', 'customers'] },
  { name: 'Catalogue Editor', description: 'Keeps products, categories and reviews up to date.', permissions: ['products', 'categories', 'reviews'] },
];

async function main() {
  for (const r of ROLES) {
    const existing = await prisma.adminRole.findUnique({ where: { name: r.name } });
    if (existing) { console.log(`role      ${r.name.padEnd(17)} exists (id=${existing.id})`); continue; }
    const row = await prisma.adminRole.create({ data: { name: r.name, description: r.description, permissions: JSON.stringify(r.permissions), isSystem: !!r.isSystem } });
    console.log(`role      ${r.name.padEnd(17)} created (id=${row.id})`);
  }
  const superAdmin = await prisma.adminRole.findUnique({ where: { name: 'Super Admin' } });
  const { count } = await prisma.admin.updateMany({ where: { roleId: null }, data: { roleId: superAdmin.id } });
  console.log(`admins    ${count} without a role → Super Admin`);
}

main()
  .catch((e) => { console.error(e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
