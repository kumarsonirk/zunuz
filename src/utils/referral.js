// Refer & Earn: the friend's referral code from a `/?ref=CODE` link is kept
// in localStorage for 30 days so it survives browsing around before signing
// up. Signup / Google sign-up send it (AuthContext); it's cleared afterwards.
const KEY = 'zunuz_ref';
const VALID_MS = 30 * 864e5;

export const normalizeRefCode = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);

export function saveReferralCode(code) {
  const c = normalizeRefCode(code);
  if (!c) return;
  try { localStorage.setItem(KEY, JSON.stringify({ code: c, at: Date.now() })); } catch { /* ignore */ }
}

// The stored code if it's still within its 30 days, else ''.
export function getReferralCode() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!v?.code) return '';
    if (!v.at || Date.now() - v.at > VALID_MS) { localStorage.removeItem(KEY); return ''; }
    return normalizeRefCode(v.code);
  } catch { return ''; }
}

export function clearReferralCode() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

// Full share link for a code / the path the API returns ("/?ref=AB12CD").
export const referralUrl = (pathOrCode) => {
  const p = String(pathOrCode || '');
  return `${window.location.origin}${p.startsWith('/') ? p : `/?ref=${encodeURIComponent(p)}`}`;
};
