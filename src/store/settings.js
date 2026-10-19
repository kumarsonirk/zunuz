// Store settings from the admin Settings page (GET /api/settings).
// Loaded once before the app module graph is evaluated (see main.jsx), so
// modules that build text/options at import time (delivery.js, payments.js,
// contact.js, faqs.js) see the real values. Defaults mirror
// server/src/lib/settings.js and are used if the API can't be reached.
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const CACHE = 'zunuz_settings';

export const SETTINGS = {
  maintenanceMode: false,
  maintenanceMessage: "ZUNUZ is getting a little sparkle-up. We'll be back online shortly!",
  checkoutPaused: false,
  checkoutPausedMessage: "We're adding new pieces right now — checkout opens again very soon. Your bag is saved.",
  onlinePaymentsEnabled: true,
  codEnabled: false,
  deliveryFeeEnabled: true,
  deliveryFee: 70,
  freeDeliveryThreshold: 700,
  supportEmail: 'zunuzofficial@gmail.com',
  supportPhone: '+91 8310057566',
  supportWhatsapp: '918310057566',
  supportHours: 'Mon–Sat, 10 AM – 6 PM IST',
  pincodeRestriction: false,
  listedPincodeEta: '48 hours',
  otherPincodeEta: '5–7 working days',
  cancelWindowHours: 6,
  reviewModeration: false,
  announcementEnabled: false,
  announcementText: 'Free delivery on orders above ₹700 🎉',
  announcementLink: '',
  referralBarEnabled: true,
  referralBarText: 'Give {bonus}, get {reward} — refer a friend',
  // Refer & Earn + ZUNUZ Credits (amounts in ₹).
  referralEnabled: true,
  referralReward: 50,
  referralFriendBonus: 50,
  referralMinOrder: 299,
  creditExpiryDays: 180,
  // Navratri / Festive Bundle Offer ("Pick Any 3 @ ₹999")
  navratriOfferEnabled: true,
  navratriOfferTitle: 'Pick Any 3 @ ₹999',
  navratriBundlePrice: 999,
  navratriBundleCount: 3,
  navratriMinPrice: 499,
  navratriMaxPrice: 699,
};

const pick = (data) => Object.fromEntries(Object.keys(SETTINGS).map((k) => [k, data?.[k]]));

const apply = (data) => {
  if (!data || typeof data !== 'object') return;
  Object.keys(SETTINGS).forEach((k) => { if (k in data) SETTINGS[k] = data[k]; });
};

function fetchSettings(timeoutMs) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const t = ctrl && setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(`${BASE}/settings`, { cache: 'no-store', signal: ctrl?.signal })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data) { try { localStorage.setItem(CACHE, JSON.stringify(data)); } catch { /* ignore */ } }
      return data;
    })
    .catch(() => null)
    .finally(() => clearTimeout(t));
}

// Resolves when settings are ready to use. With a cached copy it resolves
// immediately (and refreshes the cache in the background for next visit);
// otherwise it waits for the API, at most `timeoutMs`.
export function loadSettings(timeoutMs = 1500) {
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch { /* ignore */ }
  if (cached) {
    apply(cached);
    // Refresh in the background; if an admin changed something since this
    // copy was saved, reload once so prices / payment options / maintenance
    // are current (values are read when the app's modules load).
    fetchSettings(5000).then((fresh) => {
      if (!fresh || JSON.stringify(pick(fresh)) === JSON.stringify(pick(cached))) return;
      try {
        if (sessionStorage.getItem('zunuz_settings_reloaded')) return;
        sessionStorage.setItem('zunuz_settings_reloaded', '1');
      } catch { return; }
      window.location.reload();
    });
    return Promise.resolve(SETTINGS);
  }
  return fetchSettings(timeoutMs).then((data) => { apply(data); return SETTINGS; });
}
