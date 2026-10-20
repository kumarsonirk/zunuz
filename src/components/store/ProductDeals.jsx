import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgePercent, Check, Copy } from 'lucide-react';
import { api } from '../../utils/api';
import { SETTINGS } from '../../store/settings';
import { formatPrice } from '../../store/catalogConfig';
import { FREE_DELIVERY_THRESHOLD } from '../../utils/delivery';
import { rememberCoupon, rememberedCoupon } from './checkout/useCoupon';

// "Deals" on the product page, just above Add to bag / Buy now: every offer
// a shopper can use right now, as a swipeable row of ticket cards —
// - coupons the admin marked "Show on bag page" (GET /api/coupons/available,
//   the same list as the bag's "Offers for you"), with a copy button;
// - free delivery above the threshold (Settings → Delivery charge);
// - Refer & Earn, when the programme is on.
// Coupons ending within 3 days get an "Ending soon" ribbon. Codes are applied
// in the bag: tapping a coupon card (or Apply) saves the code and the bag
// applies it automatically. The Navratri combo has its own box on eligible products.

const ENDING_SOON_MS = 3 * 864e5;

function CopyCode({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e) => {
    e.stopPropagation(); // copying shouldn't also apply the card
    try { await navigator.clipboard.writeText(code); } catch { /* still show it */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${code} copied` : `Copy code ${code}`}
      className="inline-flex w-fit cursor-pointer items-center gap-1 rounded-[8px] border-[1.5px] border-dashed border-[#FF3D8B]/60 bg-[#FFF3F7] px-2 py-0.5 font-['Inter',sans-serif] text-[11px] font-extrabold tracking-[0.08em] text-[#E8246F] transition-colors hover:bg-[#FFE0EA]"
    >
      {code}
      {copied ? <Check size={12} strokeWidth={3} /> : <Copy size={11} strokeWidth={2.4} />}
      <span aria-live="polite" className="sr-only">{copied ? 'Copied' : ''}</span>
    </button>
  );
}

// "₹50 off · min ₹799 · first order only" → title + conditions.
function fromCoupon(c) {
  const [title, ...rest] = String(c.rule || '').split(' · ');
  const conditions = rest.map((r) => r.replace(/^min /, 'Min order ')).map((r) => r[0].toUpperCase() + r.slice(1));
  const ending = c.expiresAt && new Date(c.expiresAt).getTime() - Date.now() < ENDING_SOON_MS;
  return {
    key: `c-${c.code}`,
    ribbon: ending ? 'Ending soon' : 'Coupon',
    hot: !!ending,
    title: `Get ${title}`,
    text: c.description || '',
    conditions,
    code: c.code,
  };
}

export default function ProductDeals({ className = '' }) {
  const [coupons, setCoupons] = useState(null); // null = loading
  const [chosen, setChosen] = useState(rememberedCoupon); // code saved for the bag
  const choose = (code) => { rememberCoupon(code); setChosen(code); };

  useEffect(() => {
    let alive = true;
    api.get('/coupons/available').then((list) => { if (alive) setCoupons(Array.isArray(list) ? list : []); }).catch(() => { if (alive) setCoupons([]); });
    return () => { alive = false; };
  }, []);

  if (coupons === null) return null;

  const deals = coupons.map(fromCoupon);
  if (SETTINGS.deliveryFeeEnabled && FREE_DELIVERY_THRESHOLD > 0) {
    deals.push({ key: 'delivery', ribbon: 'Free delivery', title: 'Free delivery', text: `On orders of ${formatPrice(FREE_DELIVERY_THRESHOLD)} and above — applied automatically.`, conditions: [] });
  }
  const reward = Number(SETTINGS.referralReward) || 0;
  const bonus = Number(SETTINGS.referralFriendBonus) || 0;
  if (SETTINGS.referralEnabled && (reward || bonus)) {
    // Same wording as the home page's Refer & Earn card (OffersRow); the whole card opens Refer & Earn.
    deals.push({
      key: 'refer',
      ribbon: 'Refer & earn',
      title: reward ? `Refer a Friend. Get ${formatPrice(reward)}!` : 'Refer a Friend.',
      text: [bonus && `Your friend gets ${formatPrice(bonus)}.`, reward && `You earn ${formatPrice(reward)}.`].filter(Boolean).join(' '),
      conditions: [],
      to: '/account/refer',
      cta: 'Invite friends',
    });
  }
  if (!deals.length) return null;

  // One panel: header row (Deals pill + hint), then a swipeable row of
  // compact ticket cards.
  return (
    <section aria-labelledby="pd-deals" className={`rounded-[22px] border border-[#FF3D8B]/20 bg-[linear-gradient(135deg,#FFF3F7_0%,#FFF9EF_100%)] p-3.5 shadow-[0_12px_30px_-24px_rgba(232,36,111,0.45)] ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="pd-deals" className="m-0 inline-flex items-center gap-1.5 rounded-full border border-[#FF3D8B]/30 bg-white px-3 py-1 font-['Bricolage_Grotesque','Inter',sans-serif] text-[14px] font-bold text-[#E8246F]">
          <BadgePercent size={15} strokeWidth={2.2} /> Deals
          <span className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#111110]/45">{deals.length} {deals.length === 1 ? 'offer' : 'offers'}</span>
        </h2>
        {deals.some((d) => d.code) && <p className="m-0 text-right font-['Inter',sans-serif] text-[11px] text-[#111110]/50">Tap a coupon to apply it</p>}
      </div>
      <ul className="m-0 -mx-1.5 mt-2 flex list-none snap-x snap-mandatory scroll-pl-1.5 gap-2.5 overflow-x-auto px-1.5 pt-2.5 pb-1 [scrollbar-width:thin]" data-lenis-prevent>
        {deals.map((d) => (
          <li
            key={d.key}
            onClick={d.code ? () => choose(d.code) : undefined}
            className={`group/deal relative flex w-[clamp(190px,56vw,220px)] shrink-0 snap-start flex-col rounded-[14px] border bg-white px-3 pt-4 pb-3 shadow-[0_8px_18px_-16px_rgba(17,17,16,0.5)] transition-[border-color,box-shadow] duration-300 ${d.code ? 'cursor-pointer hover:border-[#FF3D8B]/50' : ''} ${d.code && chosen === d.code ? 'border-[#1E8A4C]/45 shadow-[0_0_0_3px_rgba(30,138,76,0.12)]' : 'border-[#111110]/8'}`}
          >
            {/* Ribbon, folded over the card's top-left corner. */}
            <span className={`absolute -top-2 -left-1 rounded-[5px] rounded-bl-none px-2 py-0.5 font-['Inter',sans-serif] text-[9px] font-extrabold tracking-[0.1em] text-white uppercase shadow-[0_3px_8px_-3px_rgba(232,36,111,0.6)] ${d.hot ? 'bg-[#E8304F]' : 'bg-[#FF3D8B]'}`}>
              {d.ribbon}
              <span aria-hidden="true" className={`absolute top-full left-0 border-t-[4px] border-l-[4px] border-l-transparent ${d.hot ? 'border-t-[#A3122E]' : 'border-t-[#B8155C]'}`} />
            </span>
            <p className="m-0 font-['Bricolage_Grotesque','Inter',sans-serif] text-[16px] leading-tight font-extrabold text-[#111110]">
              {d.to ? (
                <Link to={d.to} className="text-inherit no-underline after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-[#FF3D8B]">{d.title}</Link>
              ) : d.title}
            </p>
            {d.text && <p className="m-0 mt-1 line-clamp-2 font-['Inter',sans-serif] text-[12px] leading-snug text-[#111110]/65">{d.text}</p>}
            {d.conditions.length > 0 && <p className="m-0 mt-0.5 font-['Inter',sans-serif] text-[11px] font-semibold text-[#111110]/50">{d.conditions.join(' · ')}</p>}
            {d.code && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <CopyCode code={d.code} />
                {chosen === d.code ? (
                  <span role="status" className="inline-flex items-center gap-1 font-['Inter',sans-serif] text-[12px] font-bold text-[#1E8A4C]"><Check size={13} strokeWidth={3} /> Applied</span>
                ) : (
                  <button type="button" onClick={(e) => { e.stopPropagation(); choose(d.code); }} className="cursor-pointer rounded-full border-[1.5px] border-[#111110] bg-transparent px-3 py-0.5 font-['Inter',sans-serif] text-[12px] font-bold text-[#111110] transition-colors hover:bg-[#111110] hover:text-white">
                    Apply
                  </button>
                )}
              </div>
            )}
            {d.code && chosen === d.code && <p className="m-0 mt-1.5 font-['Inter',sans-serif] text-[11px] font-semibold text-[#1E6B3E]">We'll apply it in your bag.</p>}
            {d.cta && (
              <span aria-hidden="true" className="mt-2 inline-flex w-fit items-center gap-1 font-['Inter',sans-serif] text-[11px] font-extrabold tracking-[0.06em] text-[#E8246F] uppercase transition-transform duration-300 group-hover/deal:translate-x-0.5">
                {d.cta} <ArrowRight size={12} strokeWidth={2.6} />
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
