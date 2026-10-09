import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Gift, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { getReferralCode, saveReferralCode, clearReferralCode } from '../../utils/referral';
import { formatPrice } from '../../store/catalogConfig';
import { SETTINGS } from '../../store/settings';

// Mounted once in App. A `?ref=CODE` in the address bar (a friend's Refer &
// Earn link) is saved for 30 days (utils/referral.js) and removed from the
// URL. Signed-out visitors then get a small dismissible "your friend sent
// you ₹X" toast pointing at Sign up — only when the code checks out.
const DISMISS_KEY = 'zunuz_ref_toast_dismissed';
const TOAST_ACTIVE_KEY = 'zunuz_ref_toast_active';
const isToastActive = () => {
  try {
    return sessionStorage.getItem(TOAST_ACTIVE_KEY) === '1' && sessionStorage.getItem(DISMISS_KEY) !== '1';
  } catch {
    return false;
  }
};

export default function ReferralCapture() {
  const { pathname, search } = useLocation();
  const { customer, loading } = useAuth();
  const [invite, setInvite] = useState(null); // { code, name }
  const [toastActive, setToastActive] = useState(isToastActive);

  // If an existing customer is logged in, they cannot be referred — clear any stale code
  useEffect(() => {
    if (customer) {
      clearReferralCode();
      try { sessionStorage.removeItem(TOAST_ACTIVE_KEY); } catch { /* ignore */ }
      setToastActive(false);
    }
  }, [customer]);

  // Capture + strip ?ref= (any page, any navigation).
  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    const params = new URLSearchParams(search);
    const ref = params.get('ref');
    if (ref === null) return;
    if (ref) {
      saveReferralCode(ref);
      try { sessionStorage.setItem(TOAST_ACTIVE_KEY, '1'); } catch { /* ignore */ }
      setToastActive(true);
    }
    params.delete('ref');
    const qs = params.toString();
    try {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
    } catch { /* ignore */ }
  }, [pathname, search]);

  // Only show the welcome toast if this session actually arrived through a referral link
  const signedOut = !loading && !customer;
  const show = SETTINGS.referralEnabled && !SETTINGS.maintenanceMode && signedOut && toastActive;
  useEffect(() => {
    if (!show || invite) return undefined;
    const code = getReferralCode();
    if (!code) return undefined;
    let alive = true;
    api.get(`/referrals/check?code=${encodeURIComponent(code)}`)
      .then((r) => {
        if (!alive) return;
        if (r?.valid) setInvite({ code, name: r.name || null });
        else if (r && r.valid === false) {
          clearReferralCode();
          try { sessionStorage.removeItem(TOAST_ACTIVE_KEY); } catch { /* ignore */ }
          setToastActive(false);
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [show, invite]);

  if (!show || !invite || pathname.startsWith('/admin') || ['/signup', '/login', '/checkout'].includes(pathname)) return null;

  const dismiss = () => {
    setToastActive(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
      sessionStorage.removeItem(TOAST_ACTIVE_KEY);
    } catch { /* ignore */ }
  };

  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 font-['Inter',sans-serif]">
      <div className="pointer-events-auto flex w-full max-w-[460px] items-center gap-3 rounded-[20px] bg-[#111110] py-3 pr-2 pl-4 text-white shadow-[0_24px_50px_-20px_rgba(17,17,16,0.7)] animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FF3D8B]"><Gift size={19} /></span>
        <p className="m-0 min-w-0 flex-1 text-[14px] leading-snug">
          <span aria-hidden="true">🎁 </span>
          {invite.name ? <b>{invite.name}</b> : 'Your friend'} sent you <b className="text-[#F6C915]">{formatPrice(SETTINGS.referralFriendBonus)}</b> —{' '}
          <Link to="/signup" onClick={dismiss} className="font-bold text-white underline underline-offset-2">sign up to claim it</Link>
        </p>
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-white/70 transition-colors hover:bg-white/10 hover:text-white">
          <X size={17} />
        </button>
      </div>
    </div>
  );
}
