// Product page SEO, shared by the product page (<Seo> in ProductPage.jsx)
// and the server-side function that writes the same tags into the HTML
// before any JavaScript runs (api/product-page.js). Plain JS, no imports.

const SITE_URL = 'https://www.zunuz.in';

// Link previews (WhatsApp, Instagram, Facebook): every upload is saved as
// WebP plus a JPEG twin (server/src/routes/admin/upload.js); JPEG is the
// safest format for preview crawlers.
export function previewImage(url) {
  return typeof url === 'string' ? url.replace(/(\/uploads\/[\w-]+)\.webp$/i, '$1.jpg') : url;
}

const absolute = (url) => (!url ? url : /^https?:\/\//.test(url) ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`);

// Plain text for meta descriptions: no markdown-ish markers, single spaces,
// cut at a word boundary.
export function plainText(text, max = 155) {
  const t = String(text || '').replace(/[#*_>`[\]]/g, '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

export function productDescription(p) {
  const base = plainText(p.tagline || p.description, 120);
  const price = `₹${Number(p.price || 0).toLocaleString('en-IN')}`;
  return plainText(`${p.name} — ${price} at ZUNUZ. ${base}`, 155);
}

// schema.org Product + BreadcrumbList. Google uses these for price /
// availability / star ratings under the search result.
// `rating` / `reviewCount`: approved reviews only; omitted when there are none.
export function productJsonLd(p, { rating = 0, reviewCount = 0 } = {}) {
  const url = `${SITE_URL}/products/${p.slug || p.id}`;
  const images = (p.images && p.images.length ? p.images : [p.image]).filter(Boolean).map(absolute);
  const product = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    image: images,
    description: plainText(p.description || p.tagline || p.name, 500),
    sku: String(p.id),
    brand: { '@type': 'Brand', name: 'ZUNUZ' },
    ...(p.categoryName ? { category: p.categoryName } : {}),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'INR',
      price: String(Number(p.price || 0)),
      availability: Number(p.stock) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'ZUNUZ' },
    },
  };
  if (reviewCount > 0 && rating > 0) {
    product.aggregateRating = { '@type': 'AggregateRating', ratingValue: String(rating), reviewCount: String(reviewCount), bestRating: '5', worstRating: '1' };
  }
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Jewellery', path: '/jewellery' }];
  if (p.categorySlug && p.categoryName) crumbs.push({ name: p.categoryName, path: `/${p.categorySlug}` });
  crumbs.push({ name: p.name, path: `/products/${p.slug || p.id}` });
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `${SITE_URL}${c.path}` })),
  };
  return [product, breadcrumbs];
}
