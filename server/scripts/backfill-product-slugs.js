// One-off: generates a slug for every existing product that doesn't have one
// yet (safe to re-run — already-slugged products are skipped). Needed since
// the admin create route only generates a slug for *new* products going
// forward; anything created before this feature has slug = null.
//
// Run against production: set DATABASE_URL to Railway's connection string
// first, then:
//   node scripts/backfill-product-slugs.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { generateUniqueSlug } = require('../src/lib/slug');
const prisma = new PrismaClient();

(async () => {
  const products = await prisma.product.findMany({ where: { slug: null } });
  console.log(`Found ${products.length} product(s) without a slug.`);

  for (const product of products) {
    const slug = await generateUniqueSlug(prisma, product.name);
    await prisma.product.update({ where: { id: product.id }, data: { slug } });
    console.log(`#${product.id} "${product.name}" -> ${slug}`);
  }

  console.log('Done.');
  await prisma.$disconnect();
})();
