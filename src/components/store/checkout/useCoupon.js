import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../utils/api';

// Checkout coupon state. Validation is a preview (POST /coupons/validate);
// the server re-checks the code when the order is placed. The applied code
// is remembered for this tab (sessionStorage) and re-validated whenever the
// bag total changes — if it no longer applies it's removed with the reason.
const KEY = 'zunuz_coupon';
const save = (code) => { try { if (code) sessionStorage.setItem(KEY, code); else sessionStorage.removeItem(KEY); } catch { /* ignore */ } };
const saved = () => { try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; } };

export default function useCoupon(itemsTotal, ready) {
  const [applied, setApplied] = useState(null); // { code, discount, rule, message }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Coupons need a verified email — CouponBox then links to My account.
  const [needsVerification, setNeedsVerification] = useState(false);
  const seq = useRef(0);
  const codeRef = useRef(saved());

  const check = useCallback(async (code, { silent = false } = {}) => {
    const id = ++seq.current;
    if (!silent) { setBusy(true); setError(''); }
    try {
      const r = await api.post('/coupons/validate', { code, itemsTotal });
      if (id !== seq.current) return;
      setNeedsVerification(!r.ok && !!r.needsVerification);
      if (r.ok) {
        codeRef.current = r.code;
        save(r.code);
        setApplied({ code: r.code, discount: r.discount, rule: r.rule, message: r.message });
        setError('');
      } else {
        const wasApplied = !!codeRef.current && silent;
        codeRef.current = '';
        save('');
        setApplied(null);
        setError(wasApplied ? `${r.code} was removed — ${r.message}` : r.message);
      }
    } catch (e) {
      if (id !== seq.current) return;
      if (!silent) setError(e.message || 'Could not check the coupon. Try again.');
    } finally {
      if (id === seq.current) setBusy(false);
    }
  }, [itemsTotal]);

  // Re-validate the applied / remembered code when the total changes.
  useEffect(() => {
    if (!ready || !codeRef.current) return;
    check(codeRef.current, { silent: true });
  }, [ready, itemsTotal, check]);

  const apply = (code) => {
    const c = String(code || '').trim().toUpperCase();
    if (!c) { setError('Enter a coupon code.'); return; }
    check(c);
  };
  const remove = () => {
    seq.current += 1;
    codeRef.current = '';
    save('');
    setApplied(null);
    setError('');
    setNeedsVerification(false);
    setBusy(false);
  };
  const clearError = () => { setError(''); setNeedsVerification(false); };

  return { applied, discount: applied?.discount || 0, error, needsVerification, busy, apply, remove, clearError, recheck: () => codeRef.current && check(codeRef.current, { silent: true }) };
}

export const forgetCoupon = () => save('');
// Product page "Deals": pick a code before there's a bag total — the bag
// applies (and checks) it when it opens. rememberedCoupon() = the saved code.
export const rememberCoupon = (code) => save(String(code || '').trim().toUpperCase());
export const rememberedCoupon = saved;
