import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Grid2x2, SlidersHorizontal, Square } from 'lucide-react';
import useSmoothScroll from '../../hooks/useSmoothScroll';
import { LandingHeader } from '../../components/landing/LandingIntro';
import SiteFooter from '../../components/landing/SiteFooter';
import CategoryAbout from '../../components/store/CategoryAbout';
import ProductCard from '../../components/store/ProductCard';
import FilterSheet from '../../components/store/FilterSheet';
import SortMenu from '../../components/store/SortMenu';
import Seo from '../../components/Seo';
import { SEO_PAGES } from '../../seo/pages';
import { useCatalog, productsIn } from '../../store/catalog';
import { TIERS, CATEGORY_SLUGS, categoryPath, OWN_PAGE_ONLY_CATEGORY_SLUGS } from '../../store/catalogConfig';

gsap.registerPlugin(ScrollTrigger);

// Product listing: one category (/necklaces, /bracelets, /earrings) or every
// category (/shop). `tier` comes from ?tier= (199-plus / 499-plus /
// 999-plus) — the chips are links, so filters are shareable and the back
// button works. Sorting is local. Cards scale/rise in as they scroll into
// view (and again whenever the filter or sort changes the list).
const FONT_CLASS = "font-['Bricolage_Grotesque','Inter',sans-serif]";

// Per-category accent: glow colours + the title colour.
const LOOKS = {
  necklaces: { title: 'text-[#FF3D8B]', glow: 'bg-[radial-gradient(55%_50%_at_8%_0%,#FFD6E5_0%,transparent_70%),radial-gradient(45%_45%_at_100%_20%,#FFF0B8_0%,transparent_70%)]' },
  bracelets: { title: 'text-[#1A6FE8]', glow: 'bg-[radial-gradient(55%_50%_at_8%_0%,#FFF0B8_0%,transparent_70%),radial-gradient(45%_45%_at_100%_20%,#D6E6FF_0%,transparent_70%)]' },
  earrings: { title: 'text-[#7A4BD6]', glow: 'bg-[radial-gradient(55%_50%_at_8%_0%,#E6DCFA_0%,transparent_70%),radial-gradient(45%_45%_at_100%_20%,#FFD6E5_0%,transparent_70%)]' },
  all: { title: 'text-[#111110]', glow: 'bg-[radial-gradient(55%_50%_at_8%_0%,#FFD6E5_0%,transparent_70%),radial-gradient(45%_45%_at_100%_20%,#FFF0B8_0%,transparent_70%),radial-gradient(40%_40%_at_60%_60%,#E6DCFA_0%,transparent_70%)]' },
};

const COLS_KEY = 'zunuz_mobile_cols';

const SORTS = [
  { key: 'low', label: 'Price: low to high' },
  { key: 'featured', label: 'Featured' },
  { key: 'new', label: 'Newest' },
  { key: 'high', label: 'Price: high to low' },
];

function sortProducts(list, key) {
  const out = [...list];
  if (key === 'low') out.sort((a, b) => a.price - b.price);
  else if (key === 'high') out.sort((a, b) => b.price - a.price);
  else if (key === 'new') out.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  // Featured: in stock first, keep catalogue order otherwise.
  else out.sort((a, b) => (b.stock > 0) - (a.stock > 0));
  return out;
}

// "All jewellery" category buttons — brand pink / yellow / teal.
const CATEGORY_CHIP_COLORS = ['bg-[#FF3D8B] text-white', 'bg-[#F6C915] text-[#111110]', 'bg-[#4EB8C9] text-white'];

export default memo(CategoryPage);

function CategoryPage({ categorySlug = null, tier = null }) {
  const scrollRef = useRef(null);
  const scrollContentRef = useRef(null);
  const lenisRef = useSmoothScroll(scrollRef, scrollContentRef);
  const heroRef = useRef(null);
  const gridRef = useRef(null);
  const [sort, setSort] = useState('low'); // default: price low → high
  // Phones only: 1 or 2 product cards per row (remembered on this device).
  const [mobileCols, setMobileCols] = useState(() => {
    try { return localStorage.getItem(COLS_KEY) === '1' ? 1 : 2; } catch { return 2; }
  });
  const pickCols = (n) => {
    setMobileCols(n);
    try { localStorage.setItem(COLS_KEY, String(n)); } catch { /* private mode */ }
  };

  const catalog = useCatalog();
  const category = categorySlug ? catalog.categories.find((c) => c.slug === categorySlug) : null;
  const look = LOOKS[categorySlug] || LOOKS.all;
  const name = categorySlug ? (category?.name || categorySlug[0].toUpperCase() + categorySlug.slice(1)) : 'All jewellery';
  const subtitle = categorySlug ? (category?.subtitle || '') : 'Necklaces, bracelets and earrings — everyday pieces from ₹199.';
  const basePath = categorySlug ? categoryPath(categorySlug) : '/shop';
  const heroImage = category?.image || (!categorySlug ? (catalog.categories[0]?.image || '/jewel1.webp') : null);

  const all = useMemo(() => productsIn(catalog, categorySlug), [catalog, categorySlug]);
  // Filter chips: the price tiers, then any other subcategory the admin adds
  // (e.g. "Set") — picked up automatically from the products on this page.
  const filters = useMemo(() => {
    const extra = new Map();
    for (const p of all) {
      // Skip subcategories named like a category ("necklaces") — not a filter.
      if (!p.tierSlug && p.subcategorySlug && !CATEGORY_SLUGS.includes(p.subcategorySlug) && !extra.has(p.subcategorySlug)) {
        const label = p.subcategoryName || p.subcategorySlug;
        extra.set(p.subcategorySlug, label.charAt(0).toUpperCase() + label.slice(1));
      }
    }
    return [
      ...TIERS.map((t) => ({ slug: t.slug, label: t.label, match: (p) => p.tierSlug === t.slug })),
      ...[...extra].map(([slug, label]) => ({ slug, label, match: (p) => !p.tierSlug && p.subcategorySlug === slug })),
    ].map((f) => ({ ...f, count: all.filter(f.match).length }));
  }, [all]);
  const activeFilter = filters.find((f) => f.slug === tier) || null;
  const activeTier = activeFilter?.slug || null;
  const products = useMemo(
    () => sortProducts(activeFilter ? all.filter(activeFilter.match) : all, sort),
    [all, activeFilter, sort],
  );
  const listKey = `${catalog.status}|${activeTier}|${sort}|${products.map((p) => p.id).join()}`;

  // Hero entrance: title lines rise out of their masks, then the rest.
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(hero.querySelectorAll('.cp-line'), { yPercent: 110, rotate: 3 }, { yPercent: 0, rotate: 0, duration: 0.9, stagger: 0.08 })
      .fromTo(hero.querySelectorAll('.cp-in'), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.07 }, 0.25)
      .fromTo(hero.querySelectorAll('.cp-img'), { opacity: 0, scale: 0.9, rotate: -6 }, { opacity: 1, scale: 1, rotate: 0, duration: 1.1, ease: 'expo.out' }, 0.1);
    return () => tl.kill();
  }, [categorySlug]);

  // Switching 1 / 2 cards per row moves cards that haven't revealed yet into
  // view — recompute trigger positions so they reveal instead of staying hidden.
  useEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [mobileCols]);

  // Grid: cards scale in from 0.85 in a stagger as they enter the viewport.
  useEffect(() => {
    const grid = gridRef.current;
    const scroller = scrollRef.current;
    if (!grid || !scroller) return undefined;
    const cards = grid.querySelectorAll('.cp-card');
    if (!cards.length) return undefined;
    ScrollTrigger.refresh();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    gsap.set(cards, { opacity: 0, y: 40, scale: 0.88, transformOrigin: '50% 100%' });
    const triggers = ScrollTrigger.batch(cards, {
      scroller,
      start: 'top bottom+=60', // any part on screen → reveal (+60 offsets the hidden state's y/scale)
      once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out', stagger: 0.08, overwrite: true }),
    });
    return () => {
      triggers.forEach((t) => t.kill());
      gsap.killTweensOf(cards);
    };
  }, [listKey]);

  // Phones: budget options live in a bottom sheet (FilterSheet), not chips.
  const [filterOpen, setFilterOpen] = useState(false);
  const budgetOptions = [
    { key: 'all', label: 'All prices', count: all.length, to: basePath, on: !activeTier },
    ...filters.map((f) => ({ key: f.slug, label: f.label, count: f.count, to: `${basePath}?tier=${f.slug}`, on: activeTier === f.slug })),
  ];

  const chip = (slug, label, count) => {
    const on = activeTier === slug;
    return (
      <Link
        key={slug || 'all'}
        to={slug ? `${basePath}?tier=${slug}` : basePath}
        replace
        preventScrollReset
        aria-current={on || undefined}
        className={`group/chip relative isolate inline-flex shrink-0 items-center gap-1.5 overflow-hidden rounded-full border-2 px-4 py-2 font-['Inter',sans-serif] text-[14px] font-semibold no-underline transition-[color,border-color,translate] duration-300 hover:-translate-y-0.5 ${on ? 'border-[#111110] text-white' : 'border-[#111110]/15 bg-white/70 text-[#111110] hover:border-[#111110]'}`}
      >
        <span aria-hidden="true" className={`absolute inset-0 -z-10 rounded-full bg-[#111110] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${on ? 'scale-100' : 'scale-0'}`} />
        {label}
        {catalog.status === 'ready' && <span className={`text-[12px] ${on ? 'text-white/70' : 'text-[#111110]/45'}`}>{count}</span>}
      </Link>
    );
  };

  return (
    <div className={`relative h-dvh w-full overflow-hidden bg-[#FFF8EE] text-[#111110] ${FONT_CLASS}`}>
      <Seo
        title={activeFilter ? `${name} ${activeFilter.label}` : (SEO_PAGES[basePath]?.title || name)}
        description={SEO_PAGES[basePath]?.description || subtitle || `Shop ${name.toLowerCase()} at ZUNUZ.`}
        path={basePath}
      />
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${look.glow}`} />

      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden">
        <div ref={scrollContentRef}>
          <div className="sticky top-0 z-40"><LandingHeader transparent={false} /></div>

          {/* ── Hero ── */}
          <header
            ref={heroRef}
            className="relative mx-auto grid max-w-[1240px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 pt-[clamp(20px,3vw,40px)] pb-[clamp(20px,3vw,36px)] sm:gap-8"
          >
            <div>
              <nav aria-label="Breadcrumb" className="cp-in font-['Inter',sans-serif] text-[13px] text-[#111110]/55">
                <Link to="/" className="text-inherit no-underline hover:text-[#FF3D8B]">Home</Link>
                <span className="mx-2">/</span>
                {categorySlug ? (
                  <>
                    <Link to="/jewellery" className="text-inherit no-underline hover:text-[#FF3D8B]">Jewellery</Link>
                    <span className="mx-2">/</span>
                    <span className="text-[#111110]/85">{name}</span>
                  </>
                ) : <span className="text-[#111110]/85">Shop</span>}
              </nav>
              <h1 className={`m-0 mt-3 text-[length:clamp(36px,7.5vw,112px)] leading-[0.92] font-extrabold tracking-[-0.03em] ${look.title}`}>
                <span className="block overflow-hidden pb-[0.06em]"><span className="cp-line block">{name}</span></span>
              </h1>
              {subtitle && <p className="cp-in m-0 mt-3 max-w-[520px] font-['Inter',sans-serif] text-[length:clamp(13px,1.3vw,18px)] text-[#111110]/70">{subtitle}</p>}
              {!categorySlug && (
                <div className="cp-in mt-5 flex flex-nowrap gap-2 max-[480px]:gap-1.5">
                  {catalog.categories.filter((c) => !OWN_PAGE_ONLY_CATEGORY_SLUGS.includes(c.slug)).map((c, i) => (
                    <Link
                      key={c.slug}
                      to={categoryPath(c.slug)}
                      className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 font-['Inter',sans-serif] text-[14px] font-semibold no-underline shadow-[0_6px_16px_-10px_rgba(17,17,16,0.5)] transition-[translate,filter] duration-300 hover:-translate-y-0.5 hover:brightness-105 max-[480px]:px-3 max-[480px]:py-1.5 max-[480px]:text-[13px] ${CATEGORY_CHIP_COLORS[i % CATEGORY_CHIP_COLORS.length]}`}
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {heroImage && (
              <div className="cp-img relative shrink-0 size-[clamp(100px,26vw,140px)] sm:size-[clamp(150px,18vw,230px)] sm:mr-[clamp(0px,3vw,40px)]">
                {/* Tilted white card behind, photo floating on top with gentle idle bob. */}
                <span aria-hidden="true" className="absolute inset-0 rotate-6 rounded-[20px] bg-white shadow-[0_16px_36px_-16px_rgba(17,17,16,0.35)] sm:rounded-[32px] sm:shadow-[0_30px_60px_-30px_rgba(17,17,16,0.45)]" />
                <span className="absolute inset-0 animate-cp-bob overflow-hidden rounded-[20px] border-[4px] border-white shadow-[0_16px_36px_-18px_rgba(17,17,16,0.5)] sm:rounded-[32px] sm:border-[6px] sm:shadow-[0_24px_50px_-28px_rgba(17,17,16,0.6)]">
                  <img src={heroImage} alt="" className="h-full w-full scale-110 object-cover" />
                </span>
              </div>
            )}
          </header>

          {/* ── Filters ── */}
          <div className="sticky top-[calc(var(--store-header-h)+var(--announce-h,0px))] z-10 border-y border-[#111110]/8 bg-[#FFF8EE]/85 backdrop-blur-md">
            {/* Phones: one row — a Filter button (budget options open in a
                bottom sheet), the 1 / 2 per row layout switch, and sort as
                an icon button. */}
            <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-5 py-3 max-[700px]:gap-2 max-[700px]:py-2.5 max-[700px]:pr-4">
              <span className="flex items-center gap-1.5 font-['Inter',sans-serif] text-[13px] font-semibold text-[#111110]/60 max-[700px]:hidden"><SlidersHorizontal size={15} /> Budget</span>
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                aria-haspopup="dialog"
                className="flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-full border-2 border-[#111110]/15 bg-white pr-1.5 pl-3.5 font-['Inter',sans-serif] text-[14px] font-semibold text-[#111110] min-[701px]:hidden"
              >
                <SlidersHorizontal size={16} className="shrink-0" /> Filter
                <span className={`ml-auto truncate rounded-full px-2.5 py-1 text-[13px] ${activeTier ? 'bg-[#111110] text-white' : 'bg-[#111110]/6 text-[#111110]/70'}`}>
                  {activeFilter ? activeFilter.label : 'All prices'}{catalog.status === 'ready' && ` · ${products.length}`}
                </span>
              </button>
              <div className="-my-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-0.5 py-1 [scrollbar-width:none] max-[700px]:hidden">
                {chip(null, 'All', all.length)}
                {filters.map((f) => chip(f.slug, f.label, f.count))}
              </div>
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

          <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} options={budgetOptions} showCounts={catalog.status === 'ready'} />

          {/* ── Grid ── */}
          <main className="mx-auto min-h-[50vh] max-w-[1240px] px-5 pt-6 pb-[clamp(64px,8vw,110px)]">
            {catalog.status === 'ready' && products.length > 0 && (
              <p className="m-0 mb-4 font-['Inter',sans-serif] text-[13px] text-[#111110]/55">{products.length} piece{products.length === 1 ? '' : 's'}</p>
            )}
            {(catalog.status === 'idle' || catalog.status === 'loading') ? (
              <div className={`grid grid-cols-4 gap-[clamp(10px,1.6vw,22px)] max-[1000px]:grid-cols-3 ${mobileCols === 1 ? 'max-[700px]:grid-cols-1 max-[700px]:gap-4' : 'max-[700px]:grid-cols-2'}`} aria-busy="true">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="flex flex-col gap-3 rounded-[18px] bg-white/70 p-2">
                    <span className="aspect-square animate-pulse rounded-[14px] bg-[#EFE8DA]" />
                    <span className="h-3 w-2/3 animate-pulse rounded-full bg-[#EFE8DA]" />
                    <span className="mb-1 h-8 animate-pulse rounded-full bg-[#EFE8DA]" />
                  </div>
                ))}
              </div>
            ) : products.length ? (
              <div ref={gridRef} key={listKey} className={`grid grid-cols-4 gap-[clamp(10px,1.6vw,22px)] max-[1000px]:grid-cols-3 ${mobileCols === 1 ? 'max-[700px]:grid-cols-1 max-[700px]:gap-4' : 'max-[700px]:grid-cols-2'}`}>
                {products.map((p) => <ProductCard key={p.id} product={p} className="cp-card" />)}
              </div>
            ) : (
              <EmptyState
                error={catalog.status === 'error'}
                filtered={!!activeTier && all.length > 0}
                clearTo={basePath}
                name={name}
              />
            )}
          </main>

          {/* ── About this page + links to every other shop page (SEO + browsing). */}
          <CategoryAbout path={basePath} />

          <SiteFooter scrollRef={scrollRef} lenisRef={lenisRef} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ error, filtered, clearTo, name }) {
  return (
    <div className="mx-auto flex max-w-[520px] flex-col items-center py-[clamp(40px,8vw,90px)] text-center animate-[jw-rise_0.7s_cubic-bezier(0.16,1,0.3,1)_both]">
      <span aria-hidden="true" className="flex size-20 animate-[t3-ld-bob_2.4s_ease-in-out_infinite] items-center justify-center rounded-full bg-white text-[36px] shadow-[0_18px_40px_-24px_rgba(17,17,16,0.5)]">✨</span>
      <h2 className="m-0 mt-5 text-[length:clamp(26px,3vw,38px)] font-bold leading-tight">
        {error ? "We couldn't load the shop." : filtered ? 'Nothing in this budget yet.' : `New ${name.toLowerCase()} are on the way.`}
      </h2>
      <p className="m-0 mt-2 font-['Inter',sans-serif] text-[15px] text-[#111110]/65">
        {error ? 'Check your connection and refresh the page.' : filtered ? 'Try another price range — or see everything we have.' : "We're adding fresh pieces soon. Check back in a bit!"}
      </p>
      <Link
        to={filtered ? clearTo : '/jewellery'}
        replace={filtered}
        className="mt-6 rounded-full bg-[#111110] px-7 py-3.5 text-[16px] font-bold text-white no-underline transition-[background-color,translate] duration-300 hover:-translate-y-0.5 hover:bg-[#FF3D8B]"
      >
        {filtered ? 'Show all prices' : 'Explore jewellery'}
      </Link>
    </div>
  );
}
