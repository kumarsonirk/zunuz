// Creates the jewellery catalogue structure the storefront expects:
//   categories    Necklaces / Bracelets / Earrings   (slugs necklaces, bracelets, earrings)
//   subcategories 199+ / 499+ / 999+ price tiers      (slugs 199-plus, 499-plus, 999-plus)
// Idempotent: safe to run again (existing rows are updated by slug, never
// duplicated). Does not touch products or any other categories.
//
//   cd server && node scripts/setup-jewellery-catalogue.js
//
// Run it once against the live database on deploy, the same way.
// The storefront filters to exactly these slugs (src/store/catalogConfig.js),
// so keep the two in sync if you add or rename one.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: 'necklaces', name: 'Necklaces', subtitle: 'The finishing touch for every look.', image: '/jewel1.png', order: 1 },
  { slug: 'bracelets', name: 'Bracelets', subtitle: 'Made to move with you.', image: '/lite_bracelet.jpeg', order: 2 },
  { slug: 'earrings', name: 'Earrings', subtitle: 'Small details. Big statement.', image: '/earwear.png', order: 3 },
];

const TIERS = [
  { slug: '199-plus', name: '199+', order: 1 },
  { slug: '499-plus', name: '499+', order: 2 },
  { slug: '999-plus', name: '999+', order: 3 },
];

async function main() {
  for (const c of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name },
      create: c,
    });
    console.log(`category  ${row.slug.padEnd(10)} id=${row.id}`);
  }
  for (const t of TIERS) {
    const row = await prisma.subcategory.upsert({
      where: { slug: t.slug },
      update: { name: t.name },
      create: t,
    });
    console.log(`tier      ${row.slug.padEnd(10)} id=${row.id}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
