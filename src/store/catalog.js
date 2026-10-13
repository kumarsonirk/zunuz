import { useSyncExternalStore } from 'react';
import { CATEGORY_SLUGS, TIERS, OWN_PAGE_ONLY_CATEGORY_SLUGS } from './catalogConfig';

// Storefront catalogue: categories + active products from the API, filtered
// to the storefront's categories (catalogConfig). A tiny module-level store
// (useSyncExternalStore) so every page/section reads the same data without
// prop-drilling through App — pages stay prop-less and memo'd.
// Loaded once on first use, refreshed when the tab regains focus (at most
// once a minute) so admin edits show up without a reload.
// The last catalogue is also kept in localStorage (CACHE_KEY, up to
// CACHE_MAX_AGE old): a returning visitor's pages render straight from it
// while a fresh copy loads in the background and replaces it. Prices and
// stock are re-checked by the server at checkout, so a briefly stale copy
// can't charge the wrong amount.
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const CACHE_KEY = 'zunuz_catalog_v1';
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

function readCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (c && Date.now() - c.at < CACHE_MAX_AGE && Array.isArray(c.products) && Array.isArray(c.categories)) return c;
  } catch { /* storage blocked / bad JSON */ }
  return null;
}
function writeCache(categories, products) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), categories, products })); } catch { /* full / blocked */ }
}

const cached = typeof window !== 'undefined' ? readCache() : null;
let state = cached
  ? { status: 'ready', categories: cached.categories, products: cached.products, error: null }
  : { status: 'idle', categories: [], products: [], error: null };
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const setState = (patch) => { state = { ...state, ...patch }; emit(); };

const parseImages = (raw) => {
  if (Array.isArray(raw)) return raw;
  try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};

// Price tier from the product's subcategory. Accepts any naming the admin
// used — "199-plus", "199", "199+", "₹199+" — and maps it to the storefront's
// tier slugs (catalogConfig TIERS). Non-tier subcategories (e.g. Festive Glow's
// "earrings") give null.
function tierSlugOf(sub) {
  const raw = `${sub?.slug || ''} ${sub?.name || ''}`;
  const m = raw.match(/(?:^|[^\d])(199|499|999)(?!\d)/);
  const slug = m ? `${m[1]}-plus` : null;
  return slug && TIERS.some((t) => t.slug === slug) ? slug : null;
}

export function normalizeProduct(p) {
  const extra = parseImages(p.images).filter((u) => u && u !== p.image);
  return {
    id: String(p.id),
    slug: p.slug || String(p.id),
    name: p.name,
    price: Number(p.price) || 0,
    stock: Number(p.stock) || 0,
    image: p.image,
    images: [p.image, ...extra].filter(Boolean),
    tagline: p.tagline || '',
    description: p.description || '',
    materials: p.materials || '',
    productDetails: p.productDetails || '',
    whyWorthIt: p.whyWorthIt || '',
    careInstructions: p.careInstructions || '',
    categorySlug: p.category?.slug || null,
    categoryName: p.category?.name || '',
    subcategorySlug: p.subcategory?.slug || null,
    subcategoryName: p.subcategory?.name || '',
    tierSlug: tierSlugOf(p.subcategory),
    isActive: p.isActive !== false,
    createdAt: p.createdAt,
  };
}

let inflight = null;
let lastLoad = 0;
export function loadCatalog(force = false) {
  if (inflight) return inflight;
  if (!force && state.status === 'ready' && Date.now() - lastLoad < 60_000) return Promise.resolve();
  if (state.status === 'idle') setState({ status: 'loading' });
  inflight = Promise.all([
    fetch(`${BASE}/categories`, { cache: 'no-store' }).then((r) => r.json()),
    fetch(`${BASE}/products`, { cache: 'no-store' }).then((r) => r.json()),
  ])
    .then(([cats, prods]) => {
      const categories = CATEGORY_SLUGS
        .map((slug) => (cats.categories || []).find((c) => c.slug === slug))
        .filter(Boolean)
        .map((c) => ({ id: c.id, slug: c.slug, name: c.name, subtitle: c.subtitle, image: c.image }));
      const products = (Array.isArray(prods) ? prods : [])
        .filter((p) => CATEGORY_SLUGS.includes(p.category?.slug))
        .map(normalizeProduct)
        // Every section lists products cheapest first by default.
        .sort((a, b) => a.price - b.price);
      lastLoad = Date.now();
      writeCache(categories, products);
      setState({ status: 'ready', categories, products, error: null });
    })
    .catch((e) => setState({ status: state.status === 'ready' ? 'ready' : 'error', error: String(e) }))
    .finally(() => { inflight = null; });
  return inflight;
}

if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => { if (state.status !== 'idle') loadCatalog(); });
  // Started from the cached copy: fetch the fresh one straight away.
  if (cached) loadCatalog(true);
}

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => state;
// Non-React access (store modules like combo.js).
export const getCatalogSnapshot = getSnapshot;
export const subscribeCatalog = subscribe;

export function useCatalog() {
  const snap = useSyncExternalStore(subscribe, getSnapshot);
  if (snap.status === 'idle') queueMicrotask(() => loadCatalog());
  return snap;
}

// Helpers over a snapshot.
// Without a category, "own page only" categories (Festive Glow) are left out.
export const isOwnPageOnly = (p) => OWN_PAGE_ONLY_CATEGORY_SLUGS.includes(p.categorySlug);
export const productsIn = (snap, categorySlug, tierSlug) => snap.products.filter(
  (p) => (categorySlug ? p.categorySlug === categorySlug : !isOwnPageOnly(p)) && (!tierSlug || p.tierSlug === tierSlug),
);
export const tierOf = (slug) => TIERS.find((t) => t.slug === slug) || null;

// Product rows (home + jewellery pages): cheapest first, one product per
// price (so a row reads ₹199 · ₹249 · ₹299 · ₹349, not four ₹199s). Only if
// there aren't enough different prices is the row topped up with the next
// cheapest.
export function cheapestDistinct(products, count = 4) {
  const sorted = [...products].sort((a, b) => a.price - b.price);
  const seen = new Set();
  const picked = sorted.filter((p) => !seen.has(p.price) && seen.add(p.price)).slice(0, count);
  if (picked.length < count) {
    picked.push(...sorted.filter((p) => !picked.includes(p)).slice(0, count - picked.length));
    picked.sort((a, b) => a.price - b.price);
  }
  return picked;
}
