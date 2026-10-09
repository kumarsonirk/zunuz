// Demo products for the storefront: 14 pieces across Necklaces / Bracelets /
// Earrings and the 199+ / 499+ / 999+ tiers, using photos already in
// /public. They're ordinary products — edit, hide or delete them from the
// admin dashboard like any other.
//
//   cd server && node scripts/seed-demo-products.js            add / refresh
//   cd server && node scripts/seed-demo-products.js --remove   take them out
//
// Idempotent (matched by slug). Needs the categories + tiers from
// scripts/setup-jewellery-catalogue.js. --remove deletes a demo product
// unless an order contains it — then it's only hidden (isActive: false) so
// the order history stays intact.
const { PrismaClient } = require('@prisma/client');
const { slugify } = require('../src/lib/slug');

const prisma = new PrismaClient();

const CARE = 'Keep it dry — take it off before showers, swimming and workouts\nPut it on after perfume, lotion and hairspray\nStore it in the ZUNUZ pouch, away from other pieces\nWipe with a soft dry cloth after wearing';
const BRASS = 'Brass base with 18k gold plating\nNickel-free and lead-free\nAnti-tarnish protective coating';

const PRODUCTS = [
  // ── Necklaces ──
  {
    category: 'necklaces', tier: '199-plus', name: 'Teardrop Halo Pendant', price: 249, stock: 25,
    image: '/jewel1.png', images: [],
    tagline: 'A sparkling solitaire in an open teardrop of tiny crystals.',
    description: '> Light enough for every day, pretty enough for every plan. The open teardrop catches the light from every angle.\nDainty 2 cm pendant\nAdjustable 16–18" chain\nGoes with everything from tees to festive fits',
    productDetails: '## Specs\nPendant: 2.1 × 1.4 cm\nChain: 16" + 2" extender\nClosure: lobster clasp\nStone: cubic zirconia',
  },
  {
    category: 'necklaces', tier: '199-plus', name: 'Little Cross Pendant', price: 299, stock: 18,
    image: '/jewel2.png', images: [],
    tagline: 'A tiny crystal-studded cross on a fine gold chain.',
    description: '> Small, meaningful and made for layering.\nMinimal crystal cross\nSits right at the collarbone\nLayers beautifully with longer chains',
    productDetails: '## Specs\nPendant: 1.6 × 1 cm\nChain: 16" + 2" extender\nClosure: lobster clasp',
  },
  {
    category: 'necklaces', tier: '499-plus', name: 'Whale Tail Charm Necklace', price: 549, stock: 12,
    image: '/jewel3.png', images: [],
    tagline: 'A pavé whale tail for the beach-at-heart.',
    description: '> A little reminder of the sea, covered in sparkle.\nPavé crystal whale tail\nPolished gold-tone finish\nEasy everyday length',
    productDetails: '## Specs\nPendant: 1.8 × 1.5 cm\nChain: 17" + 2" extender\nClosure: lobster clasp',
    whyWorthIt: 'Hand-set crystals\nThicker plating than our everyday line\nComes gift-ready in a ZUNUZ pouch',
  },
  {
    category: 'necklaces', tier: '499-plus', name: 'Butterfly Drop Chain', price: 649, stock: 4,
    image: '/jewel4.png', images: [],
    tagline: 'A crystal butterfly with a little star drop.',
    description: '> Playful, sparkly and a total compliment-magnet.\nCrystal butterfly with marquise wings\nDangling star charm\nFine cable chain',
    productDetails: '## Specs\nPendant: 3.2 × 1.8 cm\nChain: 18" + 2" extender\nClosure: lobster clasp',
  },
  {
    category: 'necklaces', tier: '999-plus', name: 'Love Knot Pendant', price: 1199, stock: 10,
    image: '/gold_knot_necklace.webp', images: ['/gold_knot_necklace_alt1.webp', '/gold_knot_necklace_alt2.webp'],
    tagline: 'A sculpted gold love knot — our forever piece.',
    description: '> Five polished strands twisted into a knot that means "always". Weighty, glossy and made to be worn every single day.\nSculpted love-knot pendant\nHigh-shine polish\nGift-worthy, made to last',
    productDetails: '## Specs\nPendant: 1.5 cm diameter\nChain: 18" rolo chain + 2" extender\nClosure: spring ring',
    whyWorthIt: 'Heavier, solid-feel pendant\nDouble-layer 18k gold plating\nLuxe gift box included',
  },
  {
    category: 'necklaces', tier: '999-plus', name: 'Emerald Frame Pendant', price: 1099, stock: 0,
    image: '/jewel5.png', images: [],
    tagline: 'An emerald-green stone in a halo of crystals.',
    description: '> Vintage-inspired and just a little bit royal.\nEmerald-cut green stone\nCrystal halo frame\nFine gold chain',
    productDetails: '## Specs\nPendant: 1.9 × 1.3 cm\nChain: 18" + 2" extender\nClosure: lobster clasp',
  },
  // ── Bracelets ──
  {
    category: 'bracelets', tier: '199-plus', name: 'Rose Charm Layer Bracelet', price: 299, stock: 22,
    image: '/lite_bracelet.jpeg', images: ['/wristwear.png'],
    tagline: 'A snake chain and a dangling rose-charm chain, joined in one.',
    description: '> Two layers, zero effort — it looks stacked but goes on in one go.\nSnake chain + charm chain\nTiny rose and crystal charms\nAdjustable fit',
    productDetails: '## Specs\nLength: 6.5" + 1.5" extender\nClosure: lobster clasp\nCharms: 0.5 cm',
  },
  {
    category: 'bracelets', tier: '199-plus', name: 'Pearl & Bead Bracelet', price: 349, stock: 16,
    image: '/classic_bracelet.jpeg', images: [],
    tagline: 'Freshwater-look pearls between little gold beads.',
    description: '> Soft, classic and so easy to stack.\nPearl and gold bead chain\nDelicate, lightweight feel\nPairs with a watch or a cuff',
    productDetails: '## Specs\nLength: 6.5" + 1" extender\nClosure: lobster clasp\nPearls: 4 mm faux pearl',
  },
  {
    category: 'bracelets', tier: '499-plus', name: 'Charm Duo Bracelet Set', price: 599, stock: 9,
    image: '/wristwear.png', images: ['/lite_bracelet.jpeg'],
    tagline: 'Two matching charm bracelets — one for you, one for your bestie.',
    description: '> Made for sharing. Two bracelets, one friendship.\nSet of 2 matching bracelets\nCrystal and rose charms\nGift-ready packaging',
    productDetails: '## Specs\nLength: 6.5" + 1.5" extender (each)\nClosure: lobster clasp',
    whyWorthIt: 'Two bracelets for one price\nComes in a gift pouch for each',
  },
  {
    category: 'bracelets', tier: '999-plus', name: 'Bold Curb Link Bracelet', price: 1299, stock: 7,
    image: '/gold_link_bracelet.webp', images: ['/gold_link_bracelet_alt1.webp', '/gold_link_bracelet_alt2.webp'],
    tagline: 'Chunky, high-shine curb links with a statement clasp.',
    description: '> The one bracelet that makes the whole outfit.\nChunky polished curb links\nOversized lobster clasp\nWear solo or with a watch',
    productDetails: '## Specs\nLength: 7"\nLink width: 9 mm\nClosure: lobster clasp',
    whyWorthIt: 'Solid-feel links with real weight\nDouble-layer 18k gold plating\nLuxe gift box included',
  },
  // ── Earrings ──
  {
    category: 'earrings', tier: '199-plus', name: 'Everyday Mini Hoops', price: 249, stock: 30,
    image: '/gold_hoop_earrings_alt2.webp', images: ['/earwear.png'],
    tagline: 'Small polished hoops you’ll never take off.',
    description: '> The easiest earrings you’ll ever own.\nLightweight mini hoops\nHinged snap closure\nComfortable for all-day wear',
    productDetails: '## Specs\nDiameter: 1.8 cm\nThickness: 3 mm\nClosure: hinged snap\nSold as a pair',
  },
  {
    category: 'earrings', tier: '199-plus', name: 'Knot Circle Studs', price: 299, stock: 14,
    image: '/earwear.png', images: ['/gold_hoop_earrings_alt1.webp'],
    tagline: 'An open gold circle hanging from a tiny knot stud.',
    description: '> Minimal with a twist.\nOpen circle drop\nPolished knot stud\nLight on the ear',
    productDetails: '## Specs\nDrop: 2 cm\nClosure: push back\nSold as a pair',
  },
  {
    category: 'earrings', tier: '499-plus', name: 'Hoop Duo Set', price: 699, stock: 11,
    image: '/gold_hoop_earrings_alt1.webp', images: ['/gold_hoop_earrings.webp'],
    tagline: 'One chunky pair + one classic pair — your hoop wardrobe, sorted.',
    description: '> Swap between bold and classic, or wear both if you have a second piercing.\nSet of 2 pairs\nChunky tube hoop + classic thin hoop\nHinged and click closures',
    productDetails: '## Specs\nChunky hoop: 2.5 cm, 5 mm thick\nClassic hoop: 2.2 cm, 2.5 mm thick\nSold as 2 pairs',
    whyWorthIt: 'Two pairs for one price\nHollow-tube design keeps them light',
  },
  {
    category: 'earrings', tier: '999-plus', name: 'Classic Gold Hoops', price: 1049, stock: 8,
    image: '/gold_hoop_earrings.webp', images: ['/gold_hoop_earrings_alt1.webp', '/gold_hoop_earrings_alt2.webp'],
    tagline: 'Thick, glossy hoops with a secure hinged clasp.',
    description: '> The hoops every jewellery box needs. Bold enough to stand out, light enough to forget you’re wearing them.\nWide high-polish tube\nSecure hinged clasp\nLightweight hollow build',
    productDetails: '## Specs\nDiameter: 2.5 cm\nThickness: 5 mm\nClosure: hinged lever-back\nSold as a pair',
    whyWorthIt: 'Double-layer 18k gold plating\nHypoallergenic posts\nLuxe gift box included',
  },
];

async function main() {
  const remove = process.argv.includes('--remove');
  const slugs = PRODUCTS.map((p) => slugify(p.name));

  if (remove) {
    for (const slug of slugs) {
      const p = await prisma.product.findUnique({ where: { slug }, include: { _count: { select: { orderItems: true } } } });
      if (!p) continue;
      if (p._count.orderItems) {
        await prisma.product.update({ where: { id: p.id }, data: { isActive: false } });
        console.log(`hidden   ${slug} (in ${p._count.orderItems} order item(s))`);
      } else {
        await prisma.productReview.deleteMany({ where: { productId: p.id } });
        await prisma.product.delete({ where: { id: p.id } });
        console.log(`deleted  ${slug}`);
      }
    }
    return;
  }

  const cats = Object.fromEntries((await prisma.category.findMany({ where: { slug: { in: ['necklaces', 'bracelets', 'earrings'] } } })).map((c) => [c.slug, c.id]));
  const tiers = Object.fromEntries((await prisma.subcategory.findMany({ where: { slug: { in: ['199-plus', '499-plus', '999-plus'] } } })).map((t) => [t.slug, t.id]));
  if (Object.keys(cats).length < 3 || Object.keys(tiers).length < 3) {
    throw new Error('Categories/tiers missing — run scripts/setup-jewellery-catalogue.js first.');
  }

  for (const [i, p] of PRODUCTS.entries()) {
    const slug = slugs[i];
    const data = {
      name: p.name,
      price: p.price,
      stock: p.stock,
      image: p.image,
      images: JSON.stringify(p.images),
      categoryId: cats[p.category],
      subcategoryId: tiers[p.tier],
      isActive: true,
      tagline: p.tagline,
      description: p.description,
      materials: BRASS,
      productDetails: p.productDetails,
      whyWorthIt: p.whyWorthIt || null,
      careInstructions: CARE,
    };
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) await prisma.product.update({ where: { slug }, data });
    else await prisma.product.create({ data: { ...data, slug } });
    console.log(`${existing ? 'updated' : 'created'}  ${p.category.padEnd(9)} ${p.tier.padEnd(8)} ₹${String(p.price).padEnd(5)} ${p.name}`);
  }
}

main()
  .catch((e) => { console.error(e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
