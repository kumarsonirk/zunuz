// Vercel function for /products/:slug (see the rewrite in vercel.json).
//
// The store is a single-page app: without this, every product URL returns the
// same HTML ("ZUNUZ", no description), so crawlers that don't run JavaScript
// — and link previews on WhatsApp / Instagram / Facebook — never see the
// product. This serves the normal app shell (/app.html, written by the build)
// with the product's own title, description, canonical, Open Graph image and
// schema.org Product + Breadcrumb data (price, stock, star rating) added to
// <head>. The app then starts exactly as before: main.jsx removes these
// tags (data-seo) and the product page's own <Seo> sets the same values.
//
// Never makes a page worse: if the API is slow or down, the plain shell is
// served unchanged. Unknown / hidden products get a 404 status + noindex.
// Responses are cached at Vercel's edge for 10 minutes (stale up to a day
// while it refreshes), so the API is hit at most a few times an hour per
// product.

import { productJsonLd, productDescription, previewImage } from '../src/seo/product.js';
import { withSeo } from '../src/seo/html.js';

const API = (process.env.SEO_API_URL || 'https://zunuz-production.up.railway.app/api').replace(/\/+$/, '');
const TIMEOUT_MS = 2500;

async function getJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } });
    if (r.status === 404) return { notFound: true };
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return { data: await r.json() };
  } finally {
    clearTimeout(timer);
  }
}

async function getShell(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const r = await fetch(`${proto}://${req.headers.host}/app.html`);
  if (!r.ok) throw new Error(`shell HTTP ${r.status}`);
  return r.text();
}

const parseImages = (raw) => {
  if (Array.isArray(raw)) return raw;
  try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};

export default async function handler(req, res) {
  const slug = String(req.query.slug || '').slice(0, 200);
  const path = `/products/${encodeURIComponent(slug)}`;
  let shell;
  try {
    shell = await getShell(req);
  } catch (e) {
    console.error('product-page: shell fetch failed', e.message);
    res.status(502).send('Temporarily unavailable — please refresh.');
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  try {
    const { data: raw, notFound } = await getJson(`${API}/products/${encodeURIComponent(slug)}`);
    if (notFound || !raw || raw.isActive === false) {
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
      res.status(404).send(withSeo(shell, { title: 'Product not found', description: 'This product is no longer available at ZUNUZ.', path, noindex: true }));
      return;
    }
    const extra = parseImages(raw.images).filter((u) => u && u !== raw.image);
    const product = {
      id: raw.id,
      slug: raw.slug || String(raw.id),
      name: raw.name,
      price: Number(raw.price) || 0,
      stock: Number(raw.stock) || 0,
      image: raw.image,
      images: [raw.image, ...extra].filter(Boolean),
      tagline: raw.tagline || '',
      description: raw.description || '',
      categorySlug: raw.category?.slug || null,
      categoryName: raw.category?.name || '',
    };
    // Star rating from approved reviews (optional — skipped if this fails).
    let rating = 0;
    let reviewCount = 0;
    try {
      const { data: reviews } = await getJson(`${API}/products/${raw.id}/reviews`);
      const approved = Array.isArray(reviews) ? reviews.filter((r) => !r.pending && r.rating) : [];
      reviewCount = approved.length;
      rating = reviewCount ? Math.round((approved.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10 : 0;
    } catch { /* no rating */ }

    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400');
    res.status(200).send(withSeo(shell, {
      title: product.name,
      description: productDescription(product),
      path: `/products/${product.slug}`,
      image: previewImage(product.image),
      type: 'product',
      jsonLd: productJsonLd(product, { rating, reviewCount }),
    }));
  } catch (e) {
    // API slow / down: the plain app shell still works exactly as before.
    console.error('product-page: API failed', e.message);
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
    res.status(200).send(shell);
  }
}
