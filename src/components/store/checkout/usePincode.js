import { useEffect, useState } from 'react';
import { api } from '../../../utils/api';

// Delivery serviceability for a pincode (GET /api/pincodes/:pin), shared by
// the product page "Check delivery" box, the address form hint and checkout.
// Results are cached for a couple of minutes per pincode.
export const PIN_RE = /^[1-9]\d{5}$/;
const TTL = 2 * 60 * 1000;
const cache = new Map(); // pin → { at, promise }

export function fetchPincode(pin) {
  const p = String(pin || '').trim();
  const hit = cache.get(p);
  if (hit && Date.now() - hit.at < TTL) return hit.promise;
  const promise = api.get(`/pincodes/${encodeURIComponent(p)}`);
  cache.set(p, { at: Date.now(), promise });
  promise.catch(() => cache.delete(p));
  return promise;
}

// → { status: 'idle' | 'loading' | 'ready' | 'error', info }
export default function usePincode(pincode) {
  const pin = String(pincode || '').trim();
  const valid = PIN_RE.test(pin);
  const [state, setState] = useState({ pin: null, status: 'idle', info: null });

  useEffect(() => {
    if (!valid) return undefined;
    let alive = true;
    fetchPincode(pin)
      .then((info) => { if (alive) setState({ pin, status: 'ready', info }); })
      .catch(() => { if (alive) setState({ pin, status: 'error', info: null }); });
    return () => { alive = false; };
  }, [pin, valid]);

  if (!valid) return { status: 'idle', info: null };
  if (state.pin !== pin) return { status: 'loading', info: null };
  return { status: state.status, info: state.info };
}

// "2–4 days" → latest expected date ("Fri, 10 Oct"), or null.
export function etaDate(etaDays) {
  const nums = String(etaDays || '').match(/\d+/g);
  if (!nums) return null;
  const max = Math.max(...nums.map(Number));
  if (!max || max > 60) return null;
  return new Date(Date.now() + max * 864e5).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
