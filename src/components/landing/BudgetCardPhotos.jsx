import { useEffect, useMemo, useState } from 'react';
import { useCatalog, productsIn } from '../../store/catalog';
import { thumbUrl, thumbSrcSet } from '../../utils/productImage';

// Photos for a "Jewellery, by budget" card (₹199+ / ₹499+ / ₹999+): up to
// three in-stock products from that price tier — one per category first, for
// variety — cross-fading every few seconds. Falls back to the card's admin
// photo (content 'shared.budget') when the tier has no products yet.
const SLIDES = 3;
const INTERVAL = 3600; // ms per photo

function pickPhotos(products) {
  const withImage = products.filter((p) => p.image && p.stock > 0);
  const firstPerCategory = [];
  const seen = new Set();
  for (const p of withImage) {
    if (!seen.has(p.categorySlug)) { seen.add(p.categorySlug); firstPerCategory.push(p); }
  }
  const rest = withImage.filter((p) => !firstPerCategory.includes(p));
  return [...firstPerCategory, ...rest].slice(0, SLIDES);
}

export default function BudgetCardPhotos({ tier, fallback, alt, delay = 0 }) {
  const catalog = useCatalog();
  const photos = useMemo(() => pickPhotos(productsIn(catalog, null, tier)), [catalog, tier]);
  const srcs = photos.length ? photos.map((p) => p.image) : [fallback].filter(Boolean);
  const [active, setActive] = useState(0);

  // Advance on a timer; each card starts a little later so they don't all
  // change at once. Reduced motion: stay on the first photo.
  useEffect(() => {
    if (srcs.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let timer;
    const start = setTimeout(() => {
      timer = setInterval(() => setActive((i) => (i + 1) % srcs.length), INTERVAL);
    }, delay);
    return () => { clearTimeout(start); clearInterval(timer); };
  }, [srcs.length, delay]);

  const current = active % Math.max(srcs.length, 1);

  return (
    <>
      {srcs.map((src, i) => (
        <img
          key={src}
          src={thumbUrl(src, 800)}
          srcSet={thumbSrcSet(src)}
          sizes="(max-width: 760px) 72vw, 360px"
          data-original={src}
          alt={i === current ? alt : ''}
          aria-hidden={i === current ? undefined : true}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover transition-[opacity,scale] duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06] ${i === current ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      {/* Soft shade at the bottom so the price + copy read on any photo. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-[linear-gradient(to_top,rgba(17,17,16,0.62)_0%,rgba(17,17,16,0.25)_50%,transparent_100%)]" />
      {srcs.length > 1 && (
        <span aria-hidden="true" className="absolute top-[clamp(12px,1.4vw,18px)] left-1/2 z-[1] flex -translate-x-1/2 gap-1.5">
          {srcs.map((src, i) => (
            <span key={src} className={`h-1.5 rounded-full bg-white shadow-[0_0_0_1px_rgba(17,17,16,0.22),0_1px_3px_rgba(17,17,16,0.3)] transition-all duration-500 ${i === current ? 'w-5 opacity-100' : 'w-1.5 opacity-60'}`} />
          ))}
        </span>
      )}
    </>
  );
}
