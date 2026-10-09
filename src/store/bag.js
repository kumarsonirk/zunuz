import { useMemo } from 'react';
import { useCatalog } from './catalog';
import { useCart, MAX_QTY } from './cart';
import { computeDeliveryFee } from '../utils/delivery';
import { SETTINGS } from './settings';
import { COMBO_EXCLUDED_CATEGORY_SLUGS } from './catalogConfig';

// One piece per category in every combo (e.g. a necklace + a bracelet + an
// earring pair). Greedy: each set takes the priciest remaining piece from the
// categories with the most pieces left, which gives the most complete sets. Mirrors server lib/stock.js.
function pickComboSets(pieces, size) {
  const byCat = new Map();
  for (const p of pieces) {
    if (!byCat.has(p.cat)) byCat.set(p.cat, []);
    byCat.get(p.cat).push(p.price);
  }
  for (const list of byCat.values()) list.sort((a, b) => b - a);
  let bundles = 0;
  let regularSum = 0;
  for (;;) {
    const cats = [...byCat.values()].filter((l) => l.length)
      .sort((a, b) => b.length - a.length || b[0] - a[0]);
    if (cats.length < size) break;
    for (const list of cats.slice(0, size)) regularSum += list.shift();
    bundles += 1;
  }
  return { bundles, regularSum, categories: byCat.size };
}

export function computeBundleDiscount(buyable) {
  if (!SETTINGS.navratriOfferEnabled) return { discount: 0, count: 0, bundles: 0 };
  const minPrice = SETTINGS.navratriMinPrice ?? 499;
  const maxPrice = SETTINGS.navratriMaxPrice ?? 699;
  const bundleCount = SETTINGS.navratriBundleCount ?? 3;
  const bundlePrice = SETTINGS.navratriBundlePrice ?? 999;

  // Combo pieces must be different products and from different categories
  // (mirrors the server): extra units are charged at full price.
  const qualifying = [];
  const seen = new Set();
  for (const line of buyable) {
    const id = String(line.item.id);
    if (line.qty < 1 || seen.has(id)) continue;
    if (COMBO_EXCLUDED_CATEGORY_SLUGS.includes(line.product?.categorySlug)) continue; // e.g. Festive Glow
    if (line.unit >= minPrice && line.unit <= maxPrice) {
      seen.add(id);
      qualifying.push({ price: line.unit, cat: line.product?.categorySlug || `p${id}` });
    }
  }

  const { bundles, regularSum, categories } = pickComboSets(qualifying, bundleCount);
  // `count` drives the "x of 3" bag banner: distinct categories, not pieces.
  if (bundles <= 0) return { discount: 0, count: Math.min(categories, bundleCount), bundles: 0 };
  return { discount: Math.max(0, regularSum - bundles * bundlePrice), count: categories, bundles };
}

// Bag lines joined with the live catalogue → { item, product, unit, max, ok, note }.
// Prices/stock always come from the live catalogue (a bag item only
// snapshots them at add time); sold-out / discontinued lines stay visible
// but are left out of `buyable` and the totals.
export function useBagLines() {
  const cart = useCart();
  const catalog = useCatalog();
  return useMemo(() => {
    const byId = new Map(catalog.products.map((p) => [p.id, p]));
    const ready = catalog.status === 'ready';
    const lines = cart.map((item) => {
      const product = byId.get(String(item.id)) || null;
      const unit = product ? product.price : item.priceNumeric;
      const stock = product ? product.stock : 0;
      let note = null;
      if (ready && !product) note = 'No longer available';
      else if (product && stock <= 0) note = 'Sold out';
      else if (product && item.quantity > stock) note = `Only ${stock} left — we'll send ${stock}`;
      const ok = !ready || (product && stock > 0);
      const qty = product ? Math.min(item.quantity, Math.max(stock, 0)) : item.quantity;
      return { item, product, unit, qty, max: Math.max(1, Math.min(MAX_QTY, stock || MAX_QTY)), ok, note };
    });
    const buyable = lines.filter((l) => l.ok && l.qty > 0);
    const itemsTotal = buyable.reduce((s, l) => s + l.unit * l.qty, 0);
    const { discount: bundleDiscount, bundles: bundleCount, count: bundleQualifyingCount } = computeBundleDiscount(buyable);
    const discountedItemsTotal = Math.max(0, itemsTotal - bundleDiscount);
    const deliveryFee = buyable.length ? computeDeliveryFee(discountedItemsTotal) : 0;
    return {
      lines,
      buyable,
      itemsTotal,
      discountedItemsTotal,
      bundleDiscount,
      bundleCount,
      bundleQualifyingCount,
      bundleLabel: SETTINGS.navratriOfferTitle || `Navratri Combo (${SETTINGS.navratriBundleCount ?? 3} for ₹${SETTINGS.navratriBundlePrice ?? 999})`,
      deliveryFee,
      total: discountedItemsTotal + deliveryFee,
      ready,
      catalog,
    };
  }, [cart, catalog]);
}

