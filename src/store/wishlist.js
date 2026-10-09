import { useSyncExternalStore } from 'react';

// Wishlist (product ids), persisted to localStorage on this device.
const KEY = 'zunuz_wishlist';
const read = () => {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};
let ids = typeof window !== 'undefined' ? read() : [];
const listeners = new Set();
export function toggleWishlist(id) {
  const k = String(id);
  ids = ids.includes(k) ? ids.filter((x) => x !== k) : [...ids, k];
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
export const useWishlist = () => useSyncExternalStore(subscribe, () => ids);
