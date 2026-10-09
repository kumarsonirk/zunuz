// Editable storefront copy/images (admin → Homepage & Banners, GET /api/content).
// Loaded once before the app module graph is evaluated (see main.jsx, next to
// loadSettings), so pages read the right text on first paint with no layout
// shift. DEFAULTS are the built-in copy, shared with the server (one JSON
// file, also used by BLOCKS in server/src/routes/content.js); the API only
// returns overrides, which are merged over these.
//
// Like settings, a cached copy (localStorage) is used straight away and
// refreshed in the background — so an admin's edit shows up on a shopper's
// next page load (no forced reload mid-visit).
import DEFAULTS from '../../server/src/lib/contentDefaults.json';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const CACHE = 'zunuz_content';


// Live content: defaults with the overrides merged in (mutated in place by
// loadContent, before any page module reads it).
export const CONTENT = Object.fromEntries(Object.entries(DEFAULTS).map(([k, v]) => [k, { ...v }]));
export const CONTENT_DEFAULTS = DEFAULTS;

// One block, e.g. getContent('home.hero').headline.
export const getContent = (key) => CONTENT[key] || {};

// Override values must have the same type as the default (string / string[]).
function apply(data) {
  if (!data || typeof data !== 'object') return;
  for (const [key, defs] of Object.entries(DEFAULTS)) {
    const over = data[key] && typeof data[key] === 'object' ? data[key] : {};
    const next = { ...defs };
    for (const [field, def] of Object.entries(defs)) {
      const v = over[field];
      if (Array.isArray(def) ? (Array.isArray(v) && v.length && v.every((s) => typeof s === 'string')) : (typeof v === 'string' && v)) next[field] = v;
    }
    CONTENT[key] = next;
  }
}

function fetchContent(timeoutMs) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const t = ctrl && setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(`${BASE}/content`, { cache: 'no-store', signal: ctrl?.signal })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data && typeof data === 'object') { try { localStorage.setItem(CACHE, JSON.stringify(data)); } catch { /* ignore */ } }
      return data;
    })
    .catch(() => null)
    .finally(() => clearTimeout(t));
}

// Resolves when content is ready. With a cached copy it resolves at once
// (refreshing the cache in the background for the next load); otherwise it
// waits for the API, at most `timeoutMs`, then falls back to the defaults.
export function loadContent(timeoutMs = 1500) {
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch { /* ignore */ }
  if (cached) {
    apply(cached);
    fetchContent(5000);
    return Promise.resolve(CONTENT);
  }
  return fetchContent(timeoutMs).then((data) => { apply(data); return CONTENT; });
}

// Admin: after saving, refresh this browser's cached copy so the storefront
// shows the change on the next page load here too.
export function refreshContentCache() {
  return fetchContent(5000);
}
