import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Check, ArrowRight } from 'lucide-react';
import { addToCart, useCart } from '../../store/cart';
import { formatPrice, productPath } from '../../store/catalogConfig';

// Storefront product card: photo + name + price link to the product page;
// "Quick add" puts it in the real bag (shows "Added" for a moment), then —
// while it's in the bag — the button becomes a "Go to bag" link.
// Out-of-stock products show a disabled "Sold out". `className` lets
// sections add their own hook classes (e.g. entrance animations) and
// layout (e.g. phone-strip sizing).
// Product photos are 4:5 (portrait) — the card matches so nothing is cropped.
export default function ProductCard({ product, className = '', imageAspect = 'aspect-[4/5]' }) {
  const [added, setAdded] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const soldOut = product.stock <= 0;
  const inBag = useCart().some((i) => i.id === product.id);

  const quickAdd = () => {
    if (soldOut) return;
    addToCart(product);
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className={`flex flex-col rounded-[clamp(14px,1.4vw,18px)] bg-white p-[clamp(6px,0.7vw,9px)] shadow-[0_8px_24px_-16px_rgba(17,17,16,0.25)] ${className}`}>
      <Link to={productPath(product)} className="group block text-[#111110] no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3D8B]">
        {/* Photos may have baked-in rounded PNG corners — 110% hides them. */}
        <span className={`relative isolate block ${imageAspect} overflow-hidden rounded-[clamp(10px,1.1vw,14px)] bg-[#EFE8DA]`}>
          {product.image && (
            <img
              className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05] ${soldOut ? 'opacity-60 grayscale-[40%]' : ''}`}
              src={product.image}
              alt={product.name}
              loading="lazy"
              decoding="async"
            />
          )}
          {soldOut && (
            <span className="absolute top-2 left-2 rounded-full bg-[#111110] px-2.5 py-1 font-['Inter',sans-serif] text-[11px] font-bold text-white">Sold out</span>
          )}
        </span>
        <span className="flex items-center justify-between gap-2 px-[2px] pt-[clamp(8px,0.9vw,12px)]">
          <span className="truncate font-['Inter',sans-serif] text-[length:clamp(13px,1.1vw,15px)] font-semibold">{product.name}</span>
          <span className="shrink-0 font-['Inter',sans-serif] text-[length:clamp(13px,1.1vw,15px)] font-semibold">{formatPrice(product.price)}</span>
        </span>
      </Link>
      {/* In the bag: solid blue "Go to bag" link (after the brief "Added"). */}
      {inBag && !added && !soldOut ? (
        <Link
          to="/cart"
          aria-label={`${product.name} is in your bag — go to bag`}
          className="group/qa mt-[clamp(12px,1.4vw,18px)] flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#1A6FE8] bg-[#1A6FE8] py-[clamp(7px,0.8vw,10px)] font-['Inter',sans-serif] text-[length:clamp(13px,1.1vw,15px)] font-semibold text-white no-underline transition-colors duration-300 hover:border-[#111110] hover:bg-[#111110] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3D8B]"
        >
          <ShoppingBag size={16} strokeWidth={2} aria-hidden="true" />
          Go to bag
          <ArrowRight size={15} strokeWidth={2.2} aria-hidden="true" className="transition-transform duration-300 group-hover/qa:translate-x-0.5" />
        </Link>
      ) : (
      /* Outlined blue pill; blue fill sweeps in on hover; pink check once added. */
      <button
        type="button"
        onClick={quickAdd}
        disabled={soldOut}
        aria-label={soldOut ? `${product.name} is sold out` : `Add ${product.name} to bag`}
        className={`group/qa relative isolate mt-[clamp(12px,1.4vw,18px)] flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full border-2 py-[clamp(7px,0.8vw,10px)] font-['Inter',sans-serif] text-[length:clamp(13px,1.1vw,15px)] font-semibold transition-[color,border-color,background-color] duration-300 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3D8B] disabled:cursor-not-allowed disabled:border-[#111110]/15 disabled:text-[#111110]/40 ${added ? 'border-[#FF3D8B] bg-[#FF3D8B] text-white' : 'border-[#1A6FE8] bg-transparent text-[#1A6FE8] enabled:hover:text-white'}`}
      >
        {!added && !soldOut && (
          <span aria-hidden="true" className="absolute inset-0 -z-10 origin-left scale-x-0 rounded-full bg-[#1A6FE8] transition-transform duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/qa:scale-x-100" />
        )}
        {added
          ? <Check size={16} strokeWidth={2.5} aria-hidden="true" />
          : <ShoppingBag size={16} strokeWidth={2} aria-hidden="true" className="transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/qa:-translate-y-0.5 group-hover/qa:-rotate-12" />}
        {soldOut ? 'Sold out' : added ? 'Added' : 'Quick add'}
      </button>
      )}
    </div>
  );
}
