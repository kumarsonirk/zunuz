// Which DB categories / subcategories the storefront shows. Must match the
// slugs created by server/scripts/setup-jewellery-catalogue.js. Anything not
// listed here (e.g. the old Core / Trending categories) is ignored by the
// storefront even if it has products.
export const JEWELLERY_CATEGORY_SLUGS = ['necklaces', 'bracelets', 'earrings'];
export const FESTIVE_CATEGORY_SLUG = 'festive-glow';
export const CATEGORY_SLUGS = ['necklaces', 'bracelets', 'earrings', 'festive-glow'];
// Categories left out of the Navratri "Pick 3" combo (server: lib/stock.js COMBO_EXCLUDED).
export const COMBO_EXCLUDED_CATEGORY_SLUGS = ['festive-glow'];
// Shown only on their own page (/festive-glow): kept out of the Shop list and
// chips, homepage edits and "you may like" suggestions.
export const OWN_PAGE_ONLY_CATEGORY_SLUGS = ['festive-glow'];

// Price tiers (stored as subcategories). `label` is what shoppers see.
export const TIERS = [
  { slug: '199-plus', label: '₹199+', short: '199+' },
  { slug: '499-plus', label: '₹499+', short: '499+' },
  { slug: '999-plus', label: '₹999+', short: '999+' },
];

export const categoryPath = (slug) => `/${slug}`;
export const productPath = (p) => `/products/${p.slug || p.id}`;
export const formatPrice = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
