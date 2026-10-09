import { useSyncExternalStore } from 'react';

// The bag, persisted to localStorage `zunuz_cart_items` (same key + item
// shape the rest of the app already used, so existing carts carry over and
// checkout keeps working). One shared store: the header badge, product page,
// quick-add buttons and cart page all stay in sync, even across pages.
// Item: { id, slug, name, price ("₹1,299"), priceNumeric, image, quantity }
const KEY = 'zunuz_cart_items';
export const MAX_QTY = 1;

const read = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.map((item) => ({ ...item, quantity: 1 })) : [];
  } catch {
    return [];
  }
};

let items = typeof window !== 'undefined' ? read() : [];
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export function setCart(next) {
  items = typeof next === 'function' ? next(items) : next;
  // Ensure every item is clamped to max 1
  if (Array.isArray(items)) {
    items = items.map((i) => ({ ...i, quantity: 1 }));
  }
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage full / blocked */ }
  emit();
}

// Other tabs.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === KEY) { items = read(); emit(); } });
}

export function addToCart(product, qty = 1) {
  const id = String(product.id);
  const priceNumeric = typeof product.price === 'number' ? product.price : (parseInt(String(product.price).replace(/[^\d]/g, ''), 10) || 0);
  setCart((prev) => {
    const existing = prev.find((i) => i.id === id);
    if (existing) {
      return prev.map((i) => (i.id === id ? { ...i, quantity: 1 } : i));
    }
    return [...prev, {
      id,
      slug: product.slug,
      name: product.name,
      price: `₹${priceNumeric.toLocaleString('en-IN')}`,
      priceNumeric,
      image: product.image,
      quantity: 1,
    }];
  });
}
export const updateQty = (id, delta) => setCart((prev) => prev.map((i) => (
  i.id === id ? { ...i, quantity: 1 } : i
)));
export const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.id !== id));
export const clearCart = () => setCart([]);

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => items;
export const useCart = () => useSyncExternalStore(subscribe, getSnapshot);
export const getCartItems = () => items;
export const subscribeCart = subscribe;
export const cartCount = (list) => list.reduce((n, i) => n + (i.quantity || 0), 0);
