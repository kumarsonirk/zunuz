const router = require('express').Router();

const prisma = require('../lib/prisma');

// Google Merchant Center product feed — free listings in Google Shopping.
//   GET /feeds/google.xml   (also at https://www.zunuz.in/feeds/google.xml
//                            via the rewrite in vercel.json)
// Merchant Center fetches this on a schedule (set it to daily), so new
// products, price and stock changes from the admin flow in automatically.
// Every active storefront product, at its regular price: Google requires
// the feed price to match what one piece costs at checkout, so the Navratri
// combo's per-piece price (₹999 / 3) is deliberately NOT used here.
// Shipping and returns are configured in Merchant Center itself.

const SITE_URL = 'https://www.zunuz.in';
const STORE_CATEGORIES = ['necklaces', 'bracelets', 'earrings', 'festive-glow']; // src/store/catalogConfig.js
// Google product taxonomy, by piece type (festive pieces use their sub-type).
const GOOGLE_CATEGORY = {
  earrings: 'Apparel & Accessories > Jewelry > Earrings',
  necklaces: 'Apparel & Accessories > Jewelry > Necklaces',
  bracelets: 'Apparel & Accessories > Jewelry > Bracelets',
  set: 'Apparel & Accessories > Jewelry > Jewelry Sets', // e.g. necklace + jhumka sets
};
const TYPE_NAME = { earrings: 'Earrings', necklaces: 'Necklaces', bracelets: 'Bracelets', set: 'Sets' };

const escapeXml = (str) => String(str ?? '')
  // Characters XML 1.0 doesn't allow at all.
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const parseImages = (raw) => {
  try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};

// Uploads have a JPEG twin next to the WebP (routes/admin/upload.js) — the
// most widely accepted format for Merchant Center.
const jpeg = (url) => String(url || '').replace(/(\/uploads\/[\w-]+)\.webp$/i, '$1.jpg');
const absolute = (url) => (/^https?:\/\//.test(url) ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`);

// Product copy is written with light markdown (headings, bullets, **bold**);
// Merchant Center wants plain text, ≤ 5000 characters.
function plainText(text, max) {
  const t = String(text || '')
    .replace(/^#+\s*/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '• ')
    .replace(/[*_`>]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

const tag = (name, value) => (value === undefined || value === null || value === '' ? '' : `      <g:${name}>${escapeXml(value)}</g:${name}>\n`);

router.get('/google.xml', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true, category: { slug: { in: STORE_CATEGORIES } } },
      include: { category: true, subcategory: true },
      orderBy: { id: 'asc' },
    });

    const items = products.map((p) => {
      const type = GOOGLE_CATEGORY[p.category.slug] ? p.category.slug : (GOOGLE_CATEGORY[p.subcategory?.slug] ? p.subcategory.slug : null);
      const images = [p.image, ...parseImages(p.images)].filter((u, i, all) => u && all.indexOf(u) === i).map((u) => absolute(jpeg(u)));
      const description = plainText(p.description || p.tagline || p.name, 5000) || p.name;
      const productType = ['Jewellery', p.category.slug === 'festive-glow' ? 'Festive Glow' : null, type ? TYPE_NAME[type] : p.category.name].filter(Boolean).join(' > ');
      return '    <item>\n'
        + tag('id', p.id)
        + tag('title', String(p.name).slice(0, 150))
        + tag('description', description)
        + tag('link', `${SITE_URL}/products/${p.slug || p.id}`)
        + tag('image_link', images[0])
        + images.slice(1, 11).map((u) => tag('additional_image_link', u)).join('')
        + tag('availability', p.stock > 0 ? 'in_stock' : 'out_of_stock')
        + tag('price', `${Number(p.price).toFixed(2)} INR`)
        + tag('brand', 'ZUNUZ')
        + tag('condition', 'new')
        + tag('identifier_exists', 'no')
        + tag('google_product_category', type ? GOOGLE_CATEGORY[type] : 'Apparel & Accessories > Jewelry')
        + tag('product_type', productType)
        + tag('gender', 'female')
        + tag('age_group', 'adult')
        + '    </item>';
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>ZUNUZ</title>
    <link>${SITE_URL}</link>
    <description>ZUNUZ — everyday fashion jewellery: earrings, necklaces and bracelets.</description>
${items.join('\n')}
  </channel>
</rss>
`;
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=1800');
    res.send(xml);
  } catch (e) {
    console.error('Google feed failed:', e);
    res.status(500).send('Server error');
  }
});

module.exports = router;
