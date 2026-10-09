import { useSyncExternalStore } from 'react';
import { SETTINGS } from './settings';
import { addToCart, removeFromCart, getCartItems, subscribeCart } from './cart';
import { getCatalogSnapshot, subscribeCatalog } from './catalog';
import { COMBO_EXCLUDED_CATEGORY_SLUGS } from './catalogConfig';

// Festive Glow (and any other excluded category) never joins the combo.
const excludedCategory = (slug) => !!slug && COMBO_EXCLUDED_CATEGORY_SLUGS.includes(slug);
const categoryOfId = (id) => getCatalogSnapshot().products.find((p) => String(p.id) === String(id))?.categorySlug;

// Shared store for the Navratri / Festive Combo Tray ("Pick Any 3 @ ₹999").
// Synchronizes selections between /navratri-offers, individual product pages,
// and the cart drawer so users never lose their picked combo pieces.
// The tray always reflects the bag: eligible pieces already in the bag that
// aren't yet part of a full combo fill the first slots (marked `inBag`), so
// the tray and the bag show the same progress (e.g. 2/3).
const KEY = 'zunuz_combo_tray';

const read = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

let items = typeof window !== 'undefined' ? read() : [];
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export function setCombo(next) {
  items = typeof next === 'function' ? next(items) : next;
  const max = SETTINGS.navratriBundleCount ?? 3;
  if (Array.isArray(items) && items.length > max) {
    items = items.slice(0, max);
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage full / blocked */
  }
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      items = read();
      emit();
    }
  });
}

/**
 * Checks whether a given product qualifies for the Navratri combo offer.
 */
export function isEligibleForCombo(product) {
  if (!SETTINGS.navratriOfferEnabled || !product) return false;
  const min = SETTINGS.navratriMinPrice ?? 499;
  const max = SETTINGS.navratriMaxPrice ?? 699;
  const price = typeof product.price === 'number'
    ? product.price
    : (parseInt(String(product.price).replace(/[^\d]/g, ''), 10) || 0);
  if (excludedCategory(product.categorySlug ?? categoryOfId(product.id))) return false;
  return price >= min && price <= max && (product.stock == null || product.stock > 0);
}

const sizeOf = () => SETTINGS.navratriBundleCount ?? 3;
const inRange = (price) => price >= (SETTINGS.navratriMinPrice ?? 499) && price <= (SETTINGS.navratriMaxPrice ?? 699);

// Eligible bag pieces (each product once — combo pieces must differ).
function bagEligible(cart) {
  if (!SETTINGS.navratriOfferEnabled) return [];
  return cart.filter((i) => (i.quantity || 0) > 0 && inRange(i.priceNumeric || 0) && !excludedCategory(categoryOfId(i.id)));
}

// Eligible bag pieces fill the tray first (priciest first, as the bag total
// counts them). One combo at a time: once the bag holds a full set, the tray
// stays full until those pieces leave the bag (checkout or removal).
function bagSlots(cart) {
  const usedCats = new Set();
  return [...bagEligible(cart)]
    .sort((a, b) => (b.priceNumeric || 0) - (a.priceNumeric || 0))
    .filter((i) => { const c = categoryOfId(i.id) || `p${i.id}`; if (usedCats.has(c)) return false; usedCats.add(c); return true; }) // one per category
    .slice(0, sizeOf())
    .map((i) => ({ id: String(i.id), slug: i.slug, name: i.name, price: i.priceNumeric || 0, image: i.image, inBag: true }));
}

// What the tray shows: bag pieces, then picks that aren't in the bag yet.
let viewCache = { cart: null, tray: null, catalog: null, view: [] };
function trayView() {
  const cart = getCartItems();
  const catalog = getCatalogSnapshot();
  if (viewCache.cart === cart && viewCache.tray === items && viewCache.catalog === catalog) return viewCache.view;
  const inCart = new Set(cart.map((i) => String(i.id)));
  const fromBag = bagSlots(cart);
  const bagCats = new Set(fromBag.map((i) => categoryOfId(i.id)));
  const picks = items.filter((i) => !inCart.has(String(i.id)) && !excludedCategory(categoryOfId(i.id)) && !bagCats.has(categoryOfId(i.id))).slice(0, Math.max(0, sizeOf() - fromBag.length));
  viewCache = { cart, tray: items, catalog, view: [...fromBag, ...picks] };
  return viewCache.view;
}

/**
 * Returns the effective per-unit price in the combo (e.g. 999 / 3 = 333).
 */
export function getComboPerUnitPrice() {
  const price = SETTINGS.navratriBundlePrice ?? 999;
  const count = SETTINGS.navratriBundleCount ?? 3;
  return Math.round(price / count);
}

/**
 * Adds an item to the combo tray.
 * Returns true if added, false if already in combo or combo is full.
 */
// The tray's piece from this product's category, if any (one per category).
export function comboPieceInCategory(product) {
  const cat = product.categorySlug ?? categoryOfId(product.id);
  if (!cat) return null;
  return trayView().find((i) => String(i.id) !== String(product.id) && categoryOfId(i.id) === cat) || null;
}

export function addToCombo(product) {
  const id = String(product.id);
  if (isInCombo(id)) return false;
  const view = trayView();
  if (view.length >= sizeOf()) return false;
  if (comboPieceInCategory(product)) return false; // already has a piece from this category
  let wasAdded = false;
  setCombo((prev) => {
    if (prev.some((i) => String(i.id) === id)) return prev;
    wasAdded = true;
    const priceNumeric = typeof product.price === 'number'
      ? product.price
      : (parseInt(String(product.price).replace(/[^\d]/g, ''), 10) || 0);
    return [...prev, {
      id,
      slug: product.slug,
      name: product.name,
      price: priceNumeric,
      image: product.image,
    }];
  });
  return wasAdded;
}

/**
 * Removes an item from the combo tray by its product id.
 */
export function removeFromCombo(productId) {
  const id = String(productId);
  // A piece that's already in the bag is taken out of the bag.
  if (getCartItems().some((i) => String(i.id) === id)) removeFromCart(id);
  setCombo((prev) => prev.filter((i) => String(i.id) !== id));
}

/**
 * Swaps out the last item in the tray and replaces it with this product.
 */
export function swapIntoCombo(product) {
  const id = String(product.id);
  if (isInCombo(id)) return;
  // Only the picks (not bag pieces) can be swapped out.
  const max = sizeOf() - bagSlots(getCartItems()).length;
  if (max <= 0) return;
  const priceNumeric = typeof product.price === 'number'
    ? product.price
    : (parseInt(String(product.price).replace(/[^\d]/g, ''), 10) || 0);
  const inCart = new Set(getCartItems().map((i) => String(i.id)));
  // One per category: swap out the piece from the same category; if that
  // piece is already in the bag, there's nothing to swap.
  const same = comboPieceInCategory(product);
  if (same && same.inBag) return;
  setCombo((prev) => {
    const list = prev.filter((i) => String(i.id) !== id && !inCart.has(String(i.id)));
    const trimmed = same ? list.filter((i) => String(i.id) !== String(same.id)) : list.slice(0, max - 1);
    return [...trimmed, {
      id,
      slug: product.slug,
      name: product.name,
      price: priceNumeric,
      image: product.image,
    }];
  });
}

/**
 * Clears the combo tray.
 */
export function clearCombo() {
  setCombo([]);
}

/**
 * Adds all products currently in the combo tray to the persistent shopping cart.
 */
export function addComboToBag() {
  const picks = trayView().filter((i) => !i.inBag);
  if (picks.length === 0) return false;
  picks.forEach((item) => addToCart(item, 1));
  setCombo([]); // they're in the bag now — the tray follows the bag
  return true;
}

/**
 * Checks if a product id is currently in the combo tray.
 */
// True for tray pieces and for eligible pieces already in the bag (they
// can't be picked again — combo pieces must be different products).
export function isInCombo(productId) {
  const id = String(productId);
  return trayView().some((i) => i.id === id) || bagEligible(getCartItems()).some((i) => String(i.id) === id);
}

const subscribe = (l) => {
  listeners.add(l);
  const offCart = subscribeCart(l);
  const offCatalog = subscribeCatalog(l);
  return () => { listeners.delete(l); offCart(); offCatalog(); };
};
const getSnapshot = () => trayView();

/**
 * React hook to subscribe to the shared combo tray.
 */
export function useCombo() {
  const comboList = useSyncExternalStore(subscribe, getSnapshot);
  const bundleCount = sizeOf();
  const bundlePrice = SETTINGS.navratriBundlePrice ?? 999;
  const isComplete = comboList.length === bundleCount;
  const slotsFilled = comboList.length;
  const regularTotal = comboList.reduce((acc, i) => acc + (i.price || 0), 0);
  const potentialSavings = isComplete ? Math.max(0, regularTotal - bundlePrice) : 0;
  // The full set is already in the bag — nothing more to pick until it leaves.
  const inBagComplete = isComplete && comboList.every((i) => i.inBag);

  return {
    items: comboList,
    count: comboList.length,
    slotsFilled,
    bundleCount,
    bundlePrice,
    isComplete,
    regularTotal,
    potentialSavings,
    inBagComplete,
  };
}
