// One-off migration: repoints the DB's stored image paths for the known
// seed/placeholder photos (category backgrounds + the 3 stock jewelry photos)
// from .png to .webp — WITHOUT touching any other image, in particular real
// admin-uploaded product photos under /uploads/... . Safe to re-run; rows that
// are already .webp (or don't match) are simply skipped.
//
// Run against production: set DATABASE_URL to Railway's connection string
// first (see instructions given alongside this file), then:
//   node scripts/migrate-seed-images-to-webp.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const KNOWN_FILES = [
  '/core_bg.png', '/trending_bg.png', '/vibe_bg.png',
  '/gold_knot_necklace.png', '/gold_knot_necklace_alt1.png', '/gold_knot_necklace_alt2.png',
  '/gold_hoop_earrings.png', '/gold_hoop_earrings_alt1.png', '/gold_hoop_earrings_alt2.png',
  '/gold_link_bracelet.png', '/gold_link_bracelet_alt1.png', '/gold_link_bracelet_alt2.png',
];

const toWebp = (str) => (KNOWN_FILES.includes(str) ? str.replace('.png', '.webp') : str);

(async () => {
  const categories = await prisma.category.findMany();
  for (const c of categories) {
    if (!KNOWN_FILES.includes(c.image)) continue;
    const newImage = toWebp(c.image);
    await prisma.category.update({ where: { id: c.id }, data: { image: newImage } });
    console.log(`Category "${c.name}": ${c.image} -> ${newImage}`);
  }

  const products = await prisma.product.findMany();
  for (const p of products) {
    const newImage = toWebp(p.image);

    let imagesArr;
    try { imagesArr = JSON.parse(p.images || '[]'); } catch { imagesArr = []; }
    const newImagesArr = imagesArr.map(toWebp);

    const imageChanged = newImage !== p.image;
    const imagesChanged = JSON.stringify(newImagesArr) !== JSON.stringify(imagesArr);
    if (!imageChanged && !imagesChanged) continue;

    await prisma.product.update({
      where: { id: p.id },
      data: { image: newImage, images: JSON.stringify(newImagesArr) }
    });
    console.log(`Product "${p.name}" (#${p.id}): updated`);
  }

  console.log('Done.');
  await prisma.$disconnect();
})();
