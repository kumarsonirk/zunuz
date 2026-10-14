const router = require('express').Router();

const prisma = require('../lib/prisma');

const SITE_URL = 'https://www.zunuz.in';

// Every indexable storefront page (keep in step with src/seo/pages.js, which
// holds their titles/descriptions). Category pages have real URLs
// (/earrings, /necklaces…). Account, cart, checkout and login pages are left
// out on purpose — they're noindex / blocked in robots.txt.
const STATIC_PATHS = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/jewellery', priority: '0.9', changefreq: 'daily' },
  { path: '/shop', priority: '0.9', changefreq: 'daily' },
  { path: '/earrings', priority: '0.9', changefreq: 'daily' },
  { path: '/necklaces', priority: '0.9', changefreq: 'daily' },
  { path: '/bracelets', priority: '0.9', changefreq: 'daily' },
  { path: '/festive-glow', priority: '0.8', changefreq: 'weekly' },
  { path: '/navratri-offers', priority: '0.8', changefreq: 'weekly' },
  { path: '/customer-care', priority: '0.5', changefreq: 'monthly' },
  { path: '/customer-care/faq', priority: '0.4', changefreq: 'monthly' },
  { path: '/customer-care/shipping-policy', priority: '0.3', changefreq: 'monthly' },
  { path: '/customer-care/returns-replacements', priority: '0.3', changefreq: 'monthly' },
  { path: '/customer-care/cancellation-policy', priority: '0.3', changefreq: 'monthly' },
  { path: '/customer-care/product-care', priority: '0.3', changefreq: 'monthly' },
  { path: '/terms', priority: '0.2', changefreq: 'yearly' },
  { path: '/privacy', priority: '0.2', changefreq: 'yearly' },
];

const escapeXml = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const parseImages = (raw) => {
  try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};

// Product photos go in as <image:image> so they can show up in Google Images.
const urlEntry = ({ loc, lastmod, changefreq, priority, images = [], title }) => `  <url>
    <loc>${escapeXml(loc)}</loc>
${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${images.map((src) => `    <image:image>
      <image:loc>${escapeXml(src)}</image:loc>${title ? `\n      <image:title>${escapeXml(title)}</image:title>` : ''}
    </image:image>\n`).join('')}  </url>`;

router.get('/sitemap.xml', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true, image: true, images: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const entries = [
      ...STATIC_PATHS.map(({ path, priority, changefreq }) =>
        urlEntry({ loc: `${SITE_URL}${path}`, changefreq, priority })),
      ...products.map((p) =>
        urlEntry({
          loc: `${SITE_URL}/products/${p.slug || p.id}`,
          lastmod: p.createdAt ? p.createdAt.toISOString().slice(0, 10) : undefined,
          changefreq: 'weekly',
          priority: '0.8',
          images: [p.image, ...parseImages(p.images)].filter((u, i, all) => u && /^https?:\/\//.test(u) && all.indexOf(u) === i).slice(0, 5),
          title: p.name,
        })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.join('\n')}
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch {
    res.status(500).send('Server error');
  }
});

module.exports = router;
