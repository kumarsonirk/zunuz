// Anonymous page-load tracking for the admin Statistics page: sends the
// path + a random visitor id (kept in localStorage, no personal data).
// Fire-and-forget; text/plain so no CORS preflight. Never on /admin.
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const KEY = 'zunuz_vid';

function visitorId() {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = (crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`).replace(/[^\w-]/g, '');
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'no-storage';
  }
}

let last = { path: '', at: 0 };
export function trackPageView(path) {
  if (!path || path.startsWith('/admin') || navigator.webdriver) return;
  const now = Date.now();
  if (path === last.path && now - last.at < 2000) return; // StrictMode / double effects
  last = { path, at: now };
  try {
    fetch(`${BASE}/track`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ path, visitorId: visitorId() }),
    }).catch(() => { /* offline / blocked — ignore */ });
  } catch { /* ignore */ }
}
