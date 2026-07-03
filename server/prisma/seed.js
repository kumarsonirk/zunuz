const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed Admin
  const adminHash = await bcrypt.hash('admin123', 10);
  await prisma.admin.upsert({
    where: { email: 'admin@zunuz.com' },
    update: {},
    create: { email: 'admin@zunuz.com', passwordHash: adminHash, name: 'Zunuz Admin' }
  });

  // Seed Categories (sequential, with explicit `order` so display order is stable
  // regardless of insertion order or auto-increment id assignment)
  const core = await prisma.category.upsert({
    where: { slug: 'core' },
    update: { name: 'Core', subtitle: 'Best For College, Office & Everyday Wear', image: '/core_bg.png', order: 1 },
    create: { name: 'Core', slug: 'core', subtitle: 'Best For College, Office & Everyday Wear', image: '/core_bg.png', order: 1 }
  });
  const trending = await prisma.category.upsert({
    where: { slug: 'trending' },
    update: { name: 'Trending', subtitle: "Latest Styles Everyone's Loving", image: '/trending_bg.png', order: 2 },
    create: { name: 'Trending', slug: 'trending', subtitle: "Latest Styles Everyone's Loving", image: '/trending_bg.png', order: 2 }
  });
  const vibe = await prisma.category.upsert({
    where: { slug: 'complete-vibe' },
    update: { name: 'Complete Vibe', subtitle: 'Curated Looks That Complete Your Style', image: '/vibe_bg.png', order: 3 },
    create: { name: 'Complete Vibe', slug: 'complete-vibe', subtitle: 'Curated Looks That Complete Your Style', image: '/vibe_bg.png', order: 3 }
  });

  // Seed Subcategories (sequential, with explicit `order`)
  const necklaces = await prisma.subcategory.upsert({ where: { slug: 'necklaces' }, update: { name: 'Necklaces', order: 1 }, create: { name: 'Necklaces', slug: 'necklaces', order: 1 } });
  const earrings  = await prisma.subcategory.upsert({ where: { slug: 'earrings' },  update: { name: 'Earrings',  order: 2 }, create: { name: 'Earrings',  slug: 'earrings',  order: 2 } });
  const bracelets = await prisma.subcategory.upsert({ where: { slug: 'bracelets' }, update: { name: 'Bracelets', order: 3 }, create: { name: 'Bracelets', slug: 'bracelets', order: 3 } });

  const imagesNecklace = JSON.stringify(['/gold_knot_necklace.png', '/gold_knot_necklace_alt1.png', '/gold_knot_necklace_alt2.png']);
  const imagesEarring  = JSON.stringify(['/gold_hoop_earrings.png', '/gold_hoop_earrings_alt1.png', '/gold_hoop_earrings_alt2.png']);
  const imagesBracelet = JSON.stringify(['/gold_link_bracelet.png', '/gold_link_bracelet_alt1.png', '/gold_link_bracelet_alt2.png']);

  const products = [
    // Core - Necklaces
    { name: 'Core Chain I',          price: 699,  stock: 50, likes: 20000, image: '/gold_knot_necklace.png', images: imagesNecklace, categoryId: core.id, subcategoryId: necklaces.id },
    { name: 'Classic Knot Chain',    price: 899,  stock: 30, likes: 15000, image: '/gold_knot_necklace.png', images: imagesNecklace, categoryId: core.id, subcategoryId: necklaces.id },
    { name: 'Minimalist Pearl Bar',  price: 1299, stock: 20, likes: 12000, image: '/gold_knot_necklace.png', images: imagesNecklace, categoryId: core.id, subcategoryId: necklaces.id },
    // Core - Earrings
    { name: 'Core Hoops I',          price: 499,  stock: 40, likes: 18000, image: '/gold_hoop_earrings.png', images: imagesEarring, categoryId: core.id, subcategoryId: earrings.id },
    { name: 'Silver Diamond Studs',  price: 799,  stock: 35, likes: 14000, image: '/gold_hoop_earrings.png', images: imagesEarring, categoryId: core.id, subcategoryId: earrings.id },
    // Core - Bracelets
    { name: 'Classic Link Bangle',   price: 599,  stock: 45, likes: 25000, image: '/gold_link_bracelet.png', images: imagesBracelet, categoryId: core.id, subcategoryId: bracelets.id },
    { name: 'Silver Bead Wristlet',  price: 449,  stock: 28, likes: 9000,  image: '/gold_link_bracelet.png', images: imagesBracelet, categoryId: core.id, subcategoryId: bracelets.id },
    // Trending - Necklaces
    { name: 'Trend-Setting Lock',    price: 1499, stock: 25, likes: 32000, image: '/gold_knot_necklace.png', images: imagesNecklace, categoryId: trending.id, subcategoryId: necklaces.id },
    { name: 'Interlocking Circles',  price: 1199, stock: 18, likes: 28000, image: '/gold_knot_necklace.png', images: imagesNecklace, categoryId: trending.id, subcategoryId: necklaces.id },
    // Trending - Earrings
    { name: 'Drop Chain Earrings',   price: 699,  stock: 32, likes: 22000, image: '/gold_hoop_earrings.png', images: imagesEarring, categoryId: trending.id, subcategoryId: earrings.id },
    { name: 'Golden Star Studs',     price: 549,  stock: 40, likes: 19000, image: '/gold_hoop_earrings.png', images: imagesEarring, categoryId: trending.id, subcategoryId: earrings.id },
    // Trending - Bracelets
    { name: 'Celestial Chain Band',  price: 899,  stock: 22, likes: 30000, image: '/gold_link_bracelet.png', images: imagesBracelet, categoryId: trending.id, subcategoryId: bracelets.id },
    // Vibe - Necklaces
    { name: 'Vibe Statement Pearl',  price: 2499, stock: 15, likes: 45000, image: '/gold_knot_necklace.png', images: imagesNecklace, categoryId: vibe.id, subcategoryId: necklaces.id },
    // Vibe - Earrings
    { name: 'Modern Bar Danglers',   price: 999,  stock: 20, likes: 27000, image: '/gold_hoop_earrings.png', images: imagesEarring, categoryId: vibe.id, subcategoryId: earrings.id },
    // Vibe - Bracelets
    { name: 'Luxury Gold Cuff',      price: 1899, stock: 12, likes: 55000, image: '/gold_link_bracelet.png', images: imagesBracelet, categoryId: vibe.id, subcategoryId: bracelets.id },
  ];

  for (const p of products) {
    await prisma.product.create({ data: p });
  }

  console.log('Seed complete!');
  console.log('Admin login: admin@zunuz.com / admin123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
