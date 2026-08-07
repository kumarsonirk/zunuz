// One-off fix for product image URLs saved as http:// instead of https://.
// Cause: server/src/routes/admin/upload.js builds each URL from req.protocol,
// which reported 'http' for uploads made before `app.set('trust proxy', 1)`
// was added to src/index.js (Railway terminates TLS at its edge and forwards
// plain HTTP internally). Those stale http:// URLs are mixed content on the
// https:// site — Chrome silently auto-upgrades same-host http:// image
// requests to https://, which is why they still loaded there, but Instagram's
// in-app browser doesn't and just blocks them outright.
//
// Run against whichever DATABASE_URL is active in the environment, e.g.:
//   DATABASE_URL="<production url>" node scripts/fix-insecure-image-urls.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany();
  let updated = 0;

  for (const p of products) {
    const fixedImage = p.image?.startsWith('http://') ? p.image.replace('http://', 'https://') : p.image;
    let imagesChanged = false;
    let fixedImages = p.images;
    try {
      const arr = JSON.parse(p.images || '[]');
      const newArr = arr.map(u => (typeof u === 'string' && u.startsWith('http://')) ? u.replace('http://', 'https://') : u);
      if (JSON.stringify(newArr) !== JSON.stringify(arr)) {
        fixedImages = JSON.stringify(newArr);
        imagesChanged = true;
      }
    } catch { /* leave images untouched if it doesn't parse */ }

    if (fixedImage !== p.image || imagesChanged) {
      await prisma.product.update({
        where: { id: p.id },
        data: { image: fixedImage, images: fixedImages }
      });
      updated++;
      console.log(`Fixed #${p.id} ${p.name}`);
    }
  }

  console.log(`\nDone — updated ${updated} of ${products.length} products.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
