import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ShoppingBag } from 'lucide-react';
import { addToCart, useCart } from '../../store/cart';
import { formatPrice, productPath } from '../../store/catalogConfig';
import { thumbUrl } from '../../utils/productImage';

// "Best paired with" in the product page's buy box (before the Description
// section): this piece's best matches (src/store/pairing.js — the admin's
// picks first, then automatic), each with a tick box. The piece being viewed
// isn't listed (it has its own Add to bag). The footer adds every ticked
// piece to the bag in one go; pieces already in the bag say so and aren't
// added twice.

function Tick({ on, disabled }) {
  return (
    <span aria-hidden="true" className={`flex size-[22px] shrink-0 items-center justify-center rounded-[7px] border-2 transition-colors ${disabled ? 'border-[#111110]/15 bg-[#111110]/5' : on ? 'border-[#FF3D8B] bg-[#FF3D8B] text-white' : 'border-[#111110]/30 bg-white'}`}>
      {on && <Check size={14} strokeWidth={3.2} />}
    </span>
  );
}

export default function BestPairedWith({ pairs, className = '' }) {
  const bag = useCart();
  const inBag = (p) => bag.some((i) => i.id === String(p.id));
  const rows = pairs.map((p) => ({ p }));
  const [ticked, setTicked] = useState(() => new Set(pairs.map((p) => p.id)));
  const [added, setAdded] = useState(false);

  if (!pairs.length) return null;

  const selectable = (r) => !inBag(r.p);
  const chosen = rows.filter((r) => selectable(r) && ticked.has(r.p.id));
  const total = chosen.reduce((s, r) => s + r.p.price, 0);
  const toggle = (id) => { setAdded(false); setTicked((t) => { const n = new Set(t); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const addAll = () => {
    chosen.forEach((r) => addToCart(r.p));
    setAdded(true);
  };

  return (
    <section aria-labelledby="pd-pairs" className={`rounded-[22px] border border-[#111110]/8 bg-white/75 p-4 shadow-[0_12px_30px_-24px_rgba(17,17,16,0.4)] ${className}`}>
      <h2 id="pd-pairs" className="m-0 font-['Bricolage_Grotesque','Inter',sans-serif] text-[19px] leading-tight font-extrabold text-[#111110]">Best paired with</h2>
      <p className="m-0 mt-0.5 font-['Inter',sans-serif] text-[12px] text-[#111110]/55">Complete the look in one tap.</p>

      <ul className="m-0 mt-3 flex list-none flex-col divide-y divide-[#111110]/8 rounded-[16px] border border-[#111110]/8 bg-white p-0">
        {rows.map((r) => {
          const can = selectable(r);
          const on = can && ticked.has(r.p.id);
          return (
            <li key={r.p.id} className="flex items-center gap-3 px-3 py-2.5">
              <Link to={productPath(r.p)} className="block size-14 shrink-0 overflow-hidden rounded-[12px] bg-[#EFE8DA]" tabIndex={-1} aria-hidden="true">
                {r.p.image && <img src={thumbUrl(r.p.image, 400)} data-original={r.p.image} alt="" loading="lazy" className="h-full w-full scale-110 object-cover" />}
              </Link>
              <span className="min-w-0 flex-1 font-['Inter',sans-serif]">
                <Link to={productPath(r.p)} className="line-clamp-2 block text-[13px] leading-snug font-semibold text-[#111110] no-underline hover:text-[#FF3D8B]">{r.p.name}</Link>
                <span className="mt-0.5 flex items-center gap-2 text-[14px] font-bold text-[#111110]">
                  {formatPrice(r.p.price)}
                  {inBag(r.p) && <span className="text-[11px] font-semibold text-[#1E8A4C]">In your bag</span>}
                </span>
              </span>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-label={`${on ? 'Remove' : 'Add'} ${r.p.name}`}
                disabled={!can}
                onClick={() => toggle(r.p.id)}
                className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent disabled:cursor-not-allowed"
              >
                <Tick on={on} disabled={!can} />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-center justify-between gap-3 font-['Inter',sans-serif]">
        <p className="m-0 text-[12px] text-[#111110]/60">
          <span className="font-semibold text-[#111110]">Total</span> ({chosen.length} {chosen.length === 1 ? 'item' : 'items'})
          <span className="mt-0.5 block font-['Bricolage_Grotesque','Inter',sans-serif] text-[20px] font-extrabold text-[#111110]">{formatPrice(total)}</span>
        </p>
        {added && !chosen.length ? (
          <Link to="/cart" className="inline-flex items-center gap-1.5 rounded-full bg-[#1E8A4C] px-5 py-3 text-[14px] font-bold text-white no-underline">
            <Check size={16} strokeWidth={3} /> Added · View bag
          </Link>
        ) : (
          <button
            type="button"
            onClick={addAll}
            disabled={!chosen.length}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border-0 bg-[#111110] px-5 py-3 text-[14px] font-bold text-white transition-colors duration-300 hover:bg-[#FF3D8B] disabled:cursor-not-allowed disabled:bg-[#111110]/25"
          >
            <ShoppingBag size={16} /> {chosen.length ? `Add ${chosen.length} to bag` : 'Pick items to add'}
          </button>
        )}
      </div>
    </section>
  );
}
