import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tag, Check, X, Loader2 } from 'lucide-react';
import { api } from '../../../utils/api';
import { formatPrice } from '../../../store/catalogConfig';

// "Offers for you" on the bag page: the coupons the admin marked "Show on
// the bag page" (GET /api/coupons/available). Tapping Apply checks the code
// against this bag via the shared useCoupon hook (`coupon`); an applied code
// is remembered for the tab, so checkout picks it up already applied (and
// re-checks it there — the server checks again when the order is placed).
// One offer per order: `lockedNote` (e.g. the Navratri combo is applied)
// shows the offers greyed out with that note instead of Apply buttons.
// Any other code is typed in the CouponBox right below it (bag page only);
// `showError={false}` leaves error messages to that box.
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export default function BagOffers({ coupon, itemsTotal, lockedNote = '', showError = true }) {
  const [offers, setOffers] = useState(null); // null = loading
  const [trying, setTrying] = useState(''); // card showing the spinner while busy

  useEffect(() => {
    let alive = true;
    api.get('/coupons/available').then((list) => { if (alive) setOffers(Array.isArray(list) ? list : []); }).catch(() => { if (alive) setOffers([]); });
    return () => { alive = false; };
  }, []);

  // While locked, a previously applied coupon is set aside (not used).
  const applied = lockedNote ? null : coupon.applied;

  // No public offers (and nothing applied / no combo note): nothing to show —
  // the "Have a coupon code?" box below still takes any code.
  if (offers && offers.length === 0 && !applied && !lockedNote) return null;

  return (
    <section className="mt-4 font-['Inter',sans-serif]" aria-labelledby="bag-offers">
      <h3 id="bag-offers" className="m-0 mb-2 flex items-center gap-2 font-['Bricolage_Grotesque','Inter',sans-serif] text-[16px] font-bold">
        <Tag size={16} className="text-[#FF3D8B]" /> Offers for you
      </h3>

      {lockedNote && (
        <p role="status" className="m-0 mb-2 flex items-start gap-2 rounded-[14px] border-2 border-[#F6C915]/60 bg-[#FFF8DB] px-3.5 py-2.5 text-[13px] font-semibold text-[#7A5A00]">
          <Check size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" />
          <span className="min-w-0">{lockedNote}</span>
        </p>
      )}

      {applied && (
        <div role="status" className="mb-2 flex items-center gap-2 rounded-[14px] border-2 border-[#1E8A4C]/30 bg-[#E8F7EE] px-3.5 py-2.5 text-[13px] text-[#1E6B3E]">
          <Check size={16} strokeWidth={2.5} className="shrink-0" />
          <span className="min-w-0 flex-1"><b>{applied.code}</b> applied — you save <b>{formatPrice(applied.discount)}</b></span>
          <button type="button" onClick={coupon.remove} aria-label={`Remove ${applied.code}`} className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[#1E6B3E] hover:bg-[#1E8A4C]/10"><X size={15} /></button>
        </div>
      )}

      {showError && coupon.error && !lockedNote && (
        <p role="alert" className="m-0 mb-2 rounded-[12px] bg-[#FFE0EA] px-3 py-2 text-[13px] text-[#B4123E]">
          {coupon.error}
          {coupon.needsVerification && <> <Link to="/account" className="font-semibold text-[#B4123E] underline">Go to My account</Link></>}
        </p>
      )}

      {offers === null ? (
        <div className="h-16 animate-pulse rounded-[14px] bg-[#111110]/5" />
      ) : (
        <ul className="m-0 flex max-h-[280px] list-none flex-col gap-2 overflow-y-auto p-0 [scrollbar-width:thin]" data-lenis-prevent>
          {offers.map((o) => {
            const isApplied = applied?.code === o.code;
            const short = Math.max(0, (o.minOrder || 0) - itemsTotal);
            const checking = coupon.busy && trying === o.code;
            return (
              <li key={o.code} aria-disabled={lockedNote ? 'true' : undefined} className={`rounded-[14px] border-2 border-dashed px-3.5 py-3 ${isApplied ? 'border-[#1E8A4C]/45 bg-[#F3FBF6]' : 'border-[#FF3D8B]/30 bg-[#FFF8FA]'} ${lockedNote ? 'opacity-55' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-[8px] bg-[#111110] px-2 py-0.5 text-[12px] font-bold tracking-[0.06em] text-white">{o.code}</span>
                    <p className="m-0 mt-1.5 text-[14px] font-semibold text-[#111110]">{o.rule}</p>
                    {o.description && <p className="m-0 mt-0.5 text-[12px] leading-snug text-[#111110]/60">{o.description}</p>}
                    <p className="m-0 mt-1 text-[12px] text-[#111110]/50">
                      {short > 0 ? <span className="font-semibold text-[#B86E00]">Add {formatPrice(short)} more to use this</span> : null}
                      {short > 0 && o.expiresAt ? ' · ' : ''}
                      {o.expiresAt ? `Valid till ${fmtDate(o.expiresAt)}` : ''}
                    </p>
                  </div>
                  {isApplied ? (
                    <span className="flex shrink-0 items-center gap-1 pt-0.5 text-[13px] font-bold text-[#1E8A4C]"><Check size={15} strokeWidth={3} /> Applied</span>
                  ) : (
                    <button
                      type="button"
                      disabled={!!lockedNote || short > 0 || coupon.busy}
                      onClick={() => { setTrying(o.code); coupon.apply(o.code); }}
                      className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-2 border-[#111110] bg-transparent px-3.5 py-1.5 text-[13px] font-bold text-[#111110] transition-colors duration-200 enabled:hover:bg-[#111110] enabled:hover:text-white disabled:cursor-not-allowed disabled:border-[#111110]/15 disabled:text-[#111110]/35"
                    >
                      {checking && <Loader2 size={14} className="animate-spin" />}
                      {checking ? 'Checking' : applied ? 'Use this' : 'Apply'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
