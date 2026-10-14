import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Grid2x2, SlidersHorizontal, Square } from 'lucide-react';
import useSmoothScroll from '../../hooks/useSmoothScroll';
import { LandingHeader } from '../../components/landing/LandingIntro';
import SiteFooter from '../../components/landing/SiteFooter';
import ProductCard from '../../components/store/ProductCard';
import FilterSheet from '../../components/store/FilterSheet';
import SortMenu from '../../components/store/SortMenu';
import Seo from '../../components/Seo';
import { SEO_PAGES } from '../../seo/pages';
import { useCatalog, productsIn } from '../../store/catalog';

gsap.registerPlugin(ScrollTrigger);

const FONT_CLASS = "font-['Bricolage_Grotesque','Inter',sans-serif]";
const COLS_KEY = 'zunuz_mobile_cols';

const FESTIVE_TYPES = [
  { key: 'all', label: 'All Pieces' },
  { key: 'necklaces', label: 'Necklaces' },
  { key: 'bracelets', label: 'Bracelets' },
  { key: 'earrings', label: 'Earrings' },
];

const SORTS = [
  { key: 'low', label: 'Price: low to high' },
  { key: 'featured', label: 'Featured' },
  { key: 'new', label: 'Newest' },
  { key: 'high', label: 'Price: high to low' },
];

// Robust detector: accurately identifies jewellery type whether assigned via
// subcategory (necklaces/bracelets/earrings) or inferred from product title/tagline.
function detectJewelleryType(product) {
  const subSlug = (product.subcategorySlug || product.tierSlug || '').toLowerCase();
  const subName = (product.subcategoryName || '').toLowerCase();
  if (subSlug === 'necklaces' || subName.includes('necklace')) return 'necklaces';
  if (subSlug === 'bracelets' || subName.includes('bracelet')) return 'bracelets';
  if (subSlug === 'earrings' || subName.includes('earring')) return 'earrings';

  const text = `${product.name} ${product.tagline || ''}`.toLowerCase();
  if (/necklace|chain|pendant|choker|collar|locket/.test(text)) return 'necklaces';
  if (/bracelet|bangle|cuff|wrist/.test(text)) return 'bracelets';
  if (/earring|hoop|stud|drop|jhumka|dangler/.test(text)) return 'earrings';

  return 'other';
}

function sortProducts(list, key) {
  const out = [...list];
  if (key === 'low') out.sort((a, b) => a.price - b.price);
  else if (key === 'high') out.sort((a, b) => b.price - a.price);
  else if (key === 'new') out.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  else out.sort((a, b) => (b.stock > 0) - (a.stock > 0));
  return out;
}

export default memo(FestiveGlowPage);

function FestiveGlowPage() {
  const [params, setSearchParams] = useSearchParams();
  const currentType = params.get('type') || 'all';

  const scrollRef = useRef(null);
  const scrollContentRef = useRef(null);
  const lenisRef = useSmoothScroll(scrollRef, scrollContentRef);
  const heroRef = useRef(null);
  const gridRef = useRef(null);
  const [sort, setSort] = useState('low'); // default: price low → high
  const [filterOpen, setFilterOpen] = useState(false);

  // Phones: 1 or 2 cards per row
  const [mobileCols, setMobileCols] = useState(() => {
    try { return localStorage.getItem(COLS_KEY) === '1' ? 1 : 2; } catch { return 2; }
  });
  const pickCols = (n) => {
    setMobileCols(n);
    try { localStorage.setItem(COLS_KEY, String(n)); } catch { /* private mode */ }
  };

  const catalog = useCatalog();


  // ONLY products assigned to category 'festive-glow'
  const festiveProducts = useMemo(
    () => productsIn(catalog, 'festive-glow'),
    [catalog]
  );

  // Type counts computed from festive products
  const typeCounts = useMemo(() => {
    const counts = { all: festiveProducts.length, necklaces: 0, bracelets: 0, earrings: 0, other: 0 };
    festiveProducts.forEach((p) => {
      const type = detectJewelleryType(p);
      if (counts[type] !== undefined) counts[type]++;
    });
    return counts;
  }, [festiveProducts]);

  // Filtered and sorted products
  const products = useMemo(() => {
    const filtered = currentType === 'all'
      ? festiveProducts
      : festiveProducts.filter((p) => detectJewelleryType(p) === currentType);
    return sortProducts(filtered, sort);
  }, [festiveProducts, currentType, sort]);

  const listKey = `${catalog.status}|${currentType}|${sort}|${products.map((p) => p.id).join()}`;

  // Hero entrance animation
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(hero.querySelectorAll('.fg-line'), { yPercent: 110, rotate: 3 }, { yPercent: 0, rotate: 0, duration: 0.9, stagger: 0.08 })
      .fromTo(hero.querySelectorAll('.fg-in'), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.07 }, 0.25)
      .fromTo(hero.querySelectorAll('.fg-img'), { opacity: 0 }, { opacity: 1, duration: 1.1, ease: 'power2.out' }, 0.1);
    return () => tl.kill();
  }, []);

  // Recalculate ScrollTrigger when toggling columns
  useEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [mobileCols]);

  // Grid cards reveal animation
  useEffect(() => {
    const grid = gridRef.current;
    const scroller = scrollRef.current;
    if (!grid || !scroller) return undefined;
    const cards = grid.querySelectorAll('.fg-card');
    if (!cards.length) return undefined;
    ScrollTrigger.refresh();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    gsap.set(cards, { opacity: 0, y: 40, scale: 0.88, transformOrigin: '50% 100%' });
    const triggers = ScrollTrigger.batch(cards, {
      scroller,
      start: 'top bottom+=60', // any part on screen → reveal (+60 offsets the hidden state's y:40 + scale)
      once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out', stagger: 0.08, overwrite: true }),
    });
    return () => {
      triggers.forEach((t) => t.kill());
      gsap.killTweensOf(cards);
    };
  }, [listKey]);

  const selectType = (key) => {
    const next = new URLSearchParams(params);
    if (key === 'all') next.delete('type');
    else next.set('type', key);
    setSearchParams(next, { replace: true, preventScrollReset: true });
  };

  const filterSheetOptions = FESTIVE_TYPES.map((t) => ({
    key: t.key,
    label: t.label,
    count: typeCounts[t.key] || 0,
    to: t.key === 'all' ? '/festive-glow' : `/festive-glow?type=${t.key}`,
    on: currentType === t.key,
  }));

  return (
    <div className={`relative h-dvh w-full overflow-hidden bg-[#FFF8EE] text-[#111110] ${FONT_CLASS}`}>
      <Seo {...SEO_PAGES['/festive-glow']} path="/festive-glow" />

      {/* Radiant celebratory warm glow behind the page */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_45%_at_8%_0%,#FFE194_0%,transparent_70%),radial-gradient(50%_45%_at_92%_15%,#FFB3C6_0%,transparent_70%),radial-gradient(45%_45%_at_50%_80%,#FFF0D4_0%,transparent_70%)] opacity-85"
      />

      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden">
        <div ref={scrollContentRef}>
          <div className="sticky top-0 z-40"><LandingHeader transparent={false} /></div>

          {/* ── Hero — Navaratri poster style: maroon-black glow, glowing red title,
              the poster's face art fading in from the right ── */}
          <div ref={heroRef} className="mx-auto max-w-[1240px] px-4 pt-4 pb-[clamp(16px,2vw,24px)] sm:px-6">
            <nav aria-label="Breadcrumb" className="fg-in mb-4 font-['Inter',sans-serif] text-[13px] text-[#111110]/55">
              <Link to="/" className="text-[#111110] no-underline hover:text-[#E8304F]">Home</Link>
              <span className="mx-2">/</span>
              <span className="font-semibold text-[#111110]">Festive Glow</span>
            </nav>
          {/* Card — same shape as the Navratri offers hero */}
          <header
            className="relative isolate overflow-hidden rounded-[28px] sm:rounded-[34px] bg-[#0B0201] text-white shadow-[0_22px_50px_-26px_rgba(90,13,5,0.6)]"
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_90%_at_72%_40%,#5A0D05_0%,#2A0603_45%,transparent_80%),radial-gradient(50%_70%_at_0%_100%,#2A0603_0%,transparent_70%)]" />
            {/* Poster art (face + jewellery), faded into the background */}
            {/* Only the left ~52% of the art (face + jewellery) — the box is that
                part's shape, so the poster's own headline never shows here. */}
            <div className="fg-img pointer-events-none absolute inset-y-0 right-[clamp(0px,3vw,60px)] aspect-[1.1/1] overflow-hidden [mask-image:linear-gradient(to_right,transparent_0%,#000_24%,#000_76%,transparent_100%)] max-[700px]:-right-[3%] max-[700px]:opacity-45">
              <img
                src="/navaratri.webp"
                alt=""
                aria-hidden="true"
                decoding="async"
                className="h-full w-auto max-w-none"
              />
            </div>

            {/* Phones: dark wash on the left so the copy reads over the artwork */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(to_right,rgba(11,2,1,0.92)_0%,rgba(11,2,1,0.7)_55%,rgba(11,2,1,0.15)_100%)] max-[700px]:block" />
            <div className="relative flex min-h-[clamp(360px,33vw,440px)] max-w-[680px] flex-col justify-center p-6 sm:p-10 lg:p-12 max-[700px]:min-h-[300px] max-[700px]:py-8">
              <p className="fg-in m-0 font-['Inter',sans-serif] text-[length:clamp(11px,1vw,13px)] font-semibold tracking-[0.22em] text-[#E0B48A] uppercase">
                Navaratri Collection
              </p>
              <h1 className="m-0 mt-2 text-[length:clamp(40px,5.6vw,84px)] max-[700px]:text-[length:clamp(30px,9vw,38px)] leading-[0.92] font-extrabold tracking-[-0.03em] text-[#F0391C] [text-shadow:0_0_28px_rgba(255,64,24,0.55),0_0_70px_rgba(255,40,10,0.3)]">
                {/* Extra padding (cancelled by negative margin) so the clip used by the
                    reveal animation doesn't cut the glow into a box. */}
                <span className="-m-[0.35em] block overflow-hidden p-[0.35em] pb-[0.43em]"><span className="fg-line block">Festive Glow</span></span>
              </h1>

              <p className="fg-in m-0 mt-3 max-w-[620px] font-['Inter',sans-serif] text-[length:clamp(13px,1.3vw,18px)] leading-relaxed text-[#C9B4A4]">
                Celebration-ready jewellery —<br className="min-[701px]:hidden" /> waterproof & anti-tarnish.
              </p>
              <p className="fg-in m-0 mt-5 inline-flex items-center gap-2 font-['Inter',sans-serif] text-[length:clamp(12px,1vw,14px)] font-semibold tracking-[0.08em] text-[#E0B48A]/90 uppercase">
                <span aria-hidden="true" className="h-px w-8 bg-[#E0B48A]/60" /> Endless ways to shine
              </p>
            </div>
          </header>
          </div>

          {/* ── Sticky Filter Bar ── */}
          {/* Lines span the content width (same as the Navratri offers bar), not the full screen */}
          <div className="sticky top-[calc(var(--store-header-h)+var(--announce-h,0px))] z-10 mx-auto max-w-[1240px] px-4 sm:px-6">
            <div className="-mx-4 flex items-center gap-3 border-y border-[#111110]/8 bg-[#FFF8EE]/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:px-0 max-[700px]:gap-2 max-[700px]:py-2.5">
              <span className="flex items-center gap-1.5 font-['Inter',sans-serif] text-[13px] font-semibold text-[#111110]/60 max-[700px]:hidden">
                <SlidersHorizontal size={15} /> Category
              </span>

              {/* Mobile Filter Button */}
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                aria-haspopup="dialog"
                className="flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-full border-2 border-[#111110]/15 bg-white pr-1.5 pl-3.5 font-['Inter',sans-serif] text-[14px] font-semibold text-[#111110] min-[701px]:hidden"
              >
                <SlidersHorizontal size={16} className="shrink-0" /> Filter
                <span className={`ml-auto truncate rounded-full px-2.5 py-1 text-[13px] ${currentType !== 'all' ? 'bg-[#111110] text-white' : 'bg-[#111110]/6 text-[#111110]/70'}`}>
                  {FESTIVE_TYPES.find((t) => t.key === currentType)?.label || 'All Pieces'}
                  {catalog.status === 'ready' && ` · ${products.length}`}
                </span>
              </button>

              {/* Desktop Type Chips */}
              <div className="-my-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-0.5 py-1 [scrollbar-width:none] max-[700px]:hidden">
                {FESTIVE_TYPES.map((t) => {
                  const on = currentType === t.key;
                  const count = typeCounts[t.key] || 0;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => selectType(t.key)}
                      aria-current={on || undefined}
                      className={`group/chip relative isolate inline-flex shrink-0 cursor-pointer items-center gap-1.5 overflow-hidden rounded-full border-2 px-4 py-2 font-['Inter',sans-serif] text-[14px] font-semibold transition-[color,border-color,translate] duration-300 hover:-translate-y-0.5 ${on ? 'border-[#111110] text-white' : 'border-[#111110]/15 bg-white/70 text-[#111110] hover:border-[#111110]'}`}
                    >
                      <span aria-hidden="true" className={`absolute inset-0 -z-10 rounded-full bg-[#111110] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${on ? 'scale-100' : 'scale-0'}`} />
                      {t.label}
                      {catalog.status === 'ready' && <span className={`text-[12px] ${on ? 'text-white/70' : 'text-[#111110]/45'}`}>{count}</span>}
                    </button>
                  );
                })}
              </div>

              {/* Mobile Columns Toggle */}
              <div role="group" aria-label="Products per row" className="flex h-10 shrink-0 items-center gap-0.5 rounded-full border-2 border-[#111110]/15 bg-white p-0.5 min-[701px]:hidden">
                {[[1, Square, 'One per row'], [2, Grid2x2, 'Two per row']].map(([n, Icon, label]) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => pickCols(n)}
                    aria-label={label}
                    aria-pressed={mobileCols === n}
                    className={`flex size-8 cursor-pointer items-center justify-center rounded-full border-0 transition-colors duration-200 ${mobileCols === n ? 'bg-[#111110] text-white' : 'bg-transparent text-[#111110]/55'}`}
                  >
                    <Icon size={15} strokeWidth={2} />
                  </button>
                ))}
              </div>

              <SortMenu value={sort} options={SORTS} onChange={setSort} />
            </div>
          </div>

          <FilterSheet
            open={filterOpen}
            onClose={() => setFilterOpen(false)}
            options={filterSheetOptions}
            showCounts={catalog.status === 'ready'}
          />

          {/* ── Product Grid ── */}
          <main className="mx-auto min-h-[50vh] max-w-[1240px] px-5 pt-6 pb-[clamp(64px,8vw,110px)]">
            {catalog.status === 'ready' && products.length > 0 && (
              <div className="mb-4 flex items-center justify-between">
                <p className="m-0 font-['Inter',sans-serif] text-[13px] text-[#111110]/55">
                  Showing {products.length} festive piece{products.length === 1 ? '' : 's'}
                </p>
                {currentType !== 'all' && (
                  <button
                    type="button"
                    onClick={() => selectType('all')}
                    className="cursor-pointer font-['Inter',sans-serif] text-[13px] font-semibold text-[#D92B54] underline-offset-4 hover:underline"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}

            {(catalog.status === 'idle' || catalog.status === 'loading') ? (
              <div className={`grid grid-cols-4 gap-[clamp(10px,1.6vw,22px)] max-[1000px]:grid-cols-3 ${mobileCols === 1 ? 'max-[700px]:grid-cols-1 max-[700px]:gap-4' : 'max-[700px]:grid-cols-2'}`} aria-busy="true">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="flex flex-col gap-3 rounded-[18px] bg-white/70 p-2">
                    <span className="aspect-square animate-pulse rounded-[14px] bg-[#EFE8DA]" />
                    <span className="h-3 w-2/3 animate-pulse rounded-full bg-[#EFE8DA]" />
                    <span className="mb-1 h-8 animate-pulse rounded-full bg-[#EFE8DA]" />
                  </div>
                ))}
              </div>
            ) : products.length ? (
              <div ref={gridRef} key={listKey} className={`grid grid-cols-4 gap-[clamp(10px,1.6vw,22px)] max-[1000px]:grid-cols-3 ${mobileCols === 1 ? 'max-[700px]:grid-cols-1 max-[700px]:gap-4' : 'max-[700px]:grid-cols-2'}`}>
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} className="fg-card" />
                ))}
              </div>
            ) : (
              <FestiveEmptyState
                filtered={currentType !== 'all' && festiveProducts.length > 0}
                onReset={() => selectType('all')}
              />
            )}
          </main>

          <SiteFooter scrollRef={scrollRef} lenisRef={lenisRef} />
        </div>
      </div>
    </div>
  );
}

function FestiveEmptyState({ filtered, onReset }) {
  return (
    <div className="mx-auto flex max-w-[520px] flex-col items-center py-[clamp(40px,8vw,90px)] text-center animate-[jw-rise_0.7s_cubic-bezier(0.16,1,0.3,1)_both]">
      <span aria-hidden="true" className="flex size-20 animate-[t3-ld-bob_2.4s_ease-in-out_infinite] items-center justify-center rounded-full bg-white text-[36px] shadow-[0_18px_40px_-24px_rgba(217,43,84,0.4)]">
        ✨
      </span>
      <h2 className="m-0 mt-5 text-[length:clamp(24px,3vw,36px)] font-bold leading-tight text-[#111110]">
        {filtered ? 'No pieces found in this category' : 'Festive Glow Collection Arriving Soon'}
      </h2>
      <p className="m-0 mt-2 font-['Inter',sans-serif] text-[15px] text-[#111110]/65">
        {filtered
          ? 'Try switching to All Pieces or check back as we add more celebration styles.'
          : 'Products assigned to the Festive Glow category in your dashboard will appear here.'}
      </p>
      {filtered ? (
        <button
          type="button"
          onClick={onReset}
          className="mt-6 cursor-pointer rounded-full bg-[#111110] px-7 py-3 text-[15px] font-bold text-white transition-transform hover:-translate-y-0.5 hover:bg-[#E8304F]"
        >
          View all Festive pieces
        </button>
      ) : (
        <Link
          to="/jewellery"
          className="mt-6 inline-flex rounded-full bg-[#111110] px-7 py-3.5 text-[15px] font-bold text-white no-underline transition-[background-color,translate] hover:-translate-y-0.5 hover:bg-[#E8304F]"
        >
          Explore All Jewellery
        </Link>
      )}
    </div>
  );
}
