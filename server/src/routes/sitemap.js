const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SITE_URL = 'https://www.zunuz.in';

// Static, always-crawlable pages. Category/subcategory pages aren't included —
// the store picks the active category via client-side state, not the URL, so
// there's no distinct crawlable path per category.
const STATIC_PATHS = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/products', priority: '0.9', changefreq: 'daily' },
  { path: '/customer-care', priority: '0.5', changefreq: 'monthly' },
  { path: '/customer-care/shipping-policy', priority: '0.3', changefreq: 'monthly' },
  { path: '/customer-care/returns-replacements', priority: '0.3', changefreq: 'monthly' },
  { path: '/customer-care/cancellation-policy', priority: '0.3', changefreq: 'monthly' },
  { path: '/customer-care/product-care', priority: '0.3', changefreq: 'monthly' },
  { path: '/customer-care/faq', priority: '0.3', changefreq: 'monthly' },
  { path: '/terms', priority: '0.2', changefreq: 'yearly' },
  { path: '/privacy', priority: '0.2', changefreq: 'yearly' },
];

const escapeXml = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const urlEntry = ({ loc, lastmod, changefreq, priority }) => `  <url>
    <loc>${escapeXml(loc)}</loc>
${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

router.get('/sitemap.xml', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, createdAt: true },
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
        })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch {
    res.status(500).send('Server error');
  }
});

module.exports = router;
