import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ShoppingBag,
  Check,
  Plus,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Flame,
  Info,
  ChevronRight,
  SlidersHorizontal,
  Square,
  Grid2x2,
} from 'lucide-react';
import StoreShell, { primaryBtnCls, ghostBtnCls, BtnSweep, cardCls } from '../../components/store/StoreShell';
import Seo from '../../components/Seo';
import FilterSheet from '../../components/store/FilterSheet';
import SortMenu from '../../components/store/SortMenu';
import { useCatalog } from '../../store/catalog';
import { useCart } from '../../store/cart';
import { useCombo, addToCombo, removeFromCombo, swapIntoCombo, clearCombo, addComboToBag, isInCombo, comboPieceInCategory } from '../../store/combo';
import { formatPrice, productPath, JEWELLERY_CATEGORY_SLUGS, COMBO_EXCLUDED_CATEGORY_SLUGS } from '../../store/catalogConfig';
import { SETTINGS } from '../../store/settings';
import { thumbUrl } from '../../utils/productImage';

const FESTIVE_GLOW =
  'bg-[radial-gradient(55%_45%_at_10%_0%,#FFE699_0%,transparent_70%),radial-gradient(50%_45%_at_90%_15%,#FFB3C6_0%,transparent_70%),radial-gradient(50%_50%_at_50%_90%,#FFF0D4_0%,transparent_70%)]';

const COLS_KEY = 'zunuz_mobile_cols';

const SORT_OPTIONS = [
  { key: 'price-low', label: 'Price: low to high' },
  { key: 'highest-savings', label: 'Highest savings' },
  { key: 'name', label: 'Name (A–Z)' },
];

const PRICE_RANGES = [
  { key: 'all', label: 'All prices (₹499–₹699)', short: 'All prices' },
  { key: 'under-600', label: 'Under ₹600 (₹499–₹599)', short: '< ₹600' },
  { key: '600-plus', label: '₹600 & above (₹600–₹699)', short: '₹600+' },
];

const getCategorySlug = (p) =>
  p.categorySlug || p.category?.slug || (typeof p.category === 'string' ? p.category.toLowerCase() : '') || '';

const getCategoryName = (p) =>
  p.categoryName || p.category?.name || (p.categorySlug ? p.categorySlug.charAt(0).toUpperCase() + p.categorySlug.slice(1) : '') || '';

export default memo(NavratriOffersPage);

function NavratriOffersPage() {
  const catalog = useCatalog();
  const {
    items: selectedItems,
    isComplete,
    slotsFilled,
    bundleCount,
    bundlePrice,
    regularTotal: selectedRegularTotal,
    potentialSavings,
    inBagComplete,
  } = useCombo();
  const cart = useCart();
  const heroRef = useRef(null);

  // Hero entrance — same as Festive Glow: headline lines rise out of their
  // masks, the small copy + pills fade up, the artwork fades in.
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(hero.querySelectorAll('.nv-line'), { yPercent: 110, rotate: 3 }, { yPercent: 0, rotate: 0, duration: 0.9, stagger: 0.08 })
      .fromTo(hero.querySelectorAll('.nv-in'), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.07 }, 0.25)
      .fromTo(hero.querySelectorAll('.nv-img'), { opacity: 0 }, { opacity: 1, duration: 1.1, ease: 'power2.out' }, 0.1);
    return () => tl.kill();
  }, []);
  const bagIds = useMemo(() => new Set(cart.map((i) => String(i.id))), [cart]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activePriceRange, setActivePriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('price-low'); // default: price low → high
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [mobileCols, setMobileCols] = useState(() => {
    try { return localStorage.getItem(COLS_KEY) === '1' ? 1 : 2; } catch { return 2; }
  });

  const pickCols = (n) => {
    setMobileCols(n);
    try { localStorage.setItem(COLS_KEY, String(n)); } catch { /* ignore */ }
  };

  // Settings configuration
  const offerEnabled = SETTINGS.navratriOfferEnabled ?? true;
  const minPrice = SETTINGS.navratriMinPrice ?? 499;
  const maxPrice = SETTINGS.navratriMaxPrice ?? 699;
  const offerTitle = SETTINGS.navratriOfferTitle || 'Pick Any 3 @ ₹999';

  // Filter strictly to qualifying products: price between minPrice & maxPrice and in stock
  const eligibleProducts = useMemo(() => {
    return (catalog.products || []).filter(
      (p) => p.price >= minPrice && p.price <= maxPrice && p.stock > 0
        && !COMBO_EXCLUDED_CATEGORY_SLUGS.includes(getCategorySlug(p)) // Festive Glow isn't part of the combo
    );
  }, [catalog.products, minPrice, maxPrice]);

  const matchesCategory = (p, catSlug) => catSlug === 'all' || getCategorySlug(p) === catSlug;
  const matchesPrice = (p, priceKey) => {
    if (priceKey === 'all') return true;
    if (priceKey === 'under-600') return p.price < 600;
    if (priceKey === '600-plus') return p.price >= 600;
    return true;
  };

  // Categories present in eligible list with canonical ordering
  const categories = useMemo(() => {
    const found = new Set(eligibleProducts.map(getCategorySlug).filter(Boolean));
    const ordered = (JEWELLERY_CATEGORY_SLUGS || []).filter((slug) => found.has(slug));
    found.forEach((slug) => {
      if (!ordered.includes(slug)) ordered.push(slug);
    });
    return [
      { slug: 'all', name: 'All Pieces' },
      ...ordered.map((slug) => {
        const sample = eligibleProducts.find((p) => getCategorySlug(p) === slug);
        return {
          slug,
          name: getCategoryName(sample) || (slug.charAt(0).toUpperCase() + slug.slice(1)),
        };
      }),
    ];
  }, [eligibleProducts]);

  const categoryFilterOptions = useMemo(() => {
    return categories.map((cat) => ({
      key: cat.slug,
      label: cat.name,
      count: eligibleProducts.filter((p) => matchesCategory(p, cat.slug) && matchesPrice(p, activePriceRange)).length,
      on: activeCategory === cat.slug,
      onClick: () => setActiveCategory(cat.slug),
    }));
  }, [categories, eligibleProducts, activeCategory, activePriceRange]);

  const priceFilterOptions = useMemo(() => {
    return PRICE_RANGES.map((pr) => ({
      key: pr.key,
      label: pr.label,
      count: eligibleProducts.filter((p) => matchesCategory(p, activeCategory) && matchesPrice(p, pr.key)).length,
      on: activePriceRange === pr.key,
      onClick: () => setActivePriceRange(pr.key),
    }));
  }, [eligibleProducts, activeCategory, activePriceRange]);

  const filterSections = useMemo(() => [
    {
      heading: 'Category',
      options: categoryFilterOptions,
    },
    {
      heading: 'Price Range',
      options: priceFilterOptions,
    },
  ], [categoryFilterOptions, priceFilterOptions]);

  const hasActiveFilters = activeCategory !== 'all' || activePriceRange !== 'all';
  const handleResetFilters = () => {
    setActiveCategory('all');
    setActivePriceRange('all');
  };

  const filterBadgeLabel = useMemo(() => {
    const isCatActive = activeCategory !== 'all';
    const isPriceActive = activePriceRange !== 'all';
    if (!isCatActive && !isPriceActive) return 'All pieces';
    const catObj = categories.find((c) => c.slug === activeCategory);
    const catName = catObj?.name || activeCategory;
    const priceObj = PRICE_RANGES.find((p) => p.key === activePriceRange);
    const priceShort = priceObj?.short || '';

    if (isCatActive && isPriceActive) return `${catName}, ${priceShort}`;
    if (isCatActive) return catName;
    return priceShort;
  }, [activeCategory, activePriceRange, categories]);

  // Filtered & sorted products
  const displayProducts = useMemo(() => {
    let list = eligibleProducts.filter(
      (p) => matchesCategory(p, activeCategory) && matchesPrice(p, activePriceRange)
    );
    const copy = [...list];
    if (sortBy === 'highest-savings') {
      copy.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'price-low') {
      copy.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'name') {
      copy.sort((a, b) => a.name.localeCompare(b.name));
    }
    return copy;
  }, [eligibleProducts, activeCategory, activePriceRange, sortBy]);

  // Selection actions wired to shared store
  const addItemToBundle = (product) => {
    addToCombo(product);
    setAddedSuccess(false);
  };

  const removeItemFromBundle = (indexToRemove) => {
    const item = selectedItems[indexToRemove];
    if (item) removeFromCombo(item.id);
    setAddedSuccess(false);
  };

  const handleAddBundleToBag = () => {
    if (!isComplete) return;
    addComboToBag();
    setAddedSuccess(true);
  };

  const handleResetBundle = () => {
    clearCombo();
    setAddedSuccess(false);
  };

  return (
    <StoreShell glow={FESTIVE_GLOW}>
      <Seo
        title={`${offerTitle} – Navratri Jewellery Offer`}
        description={`Pick any ${bundleCount} premium waterproof jewellery items worth up to ₹${maxPrice * bundleCount} for just ₹${bundlePrice} during the ZUNUZ Navratri Special.`}
        path="/navratri-offers"
      />

      <div className="mx-auto max-w-[1240px] px-4 pt-4 pb-28 sm:pb-32 sm:px-6">
        {/* ── Breadcrumb ── */}
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 font-['Inter',sans-serif] text-[13px] text-[#111110]/60">
          <Link to="/" className="text-[#111110] no-underline hover:text-[#FF3D8B]">Home</Link>
          <ChevronRight size={14} />
          <span className="font-semibold text-[#111110]">Navratri Offers</span>
        </nav>

        {/* ── Hero — "Your top 3" poster style: warm orange, the two-friends art on
            the right (its left half is plain orange, so it blends on its own),
            big white headline on the left ── */}
        <section ref={heroRef} className="relative isolate overflow-hidden rounded-[28px] sm:rounded-[34px] bg-[linear-gradient(to_bottom,#FF7A37_0%,#FF8035_33%,#FF8D3C_66%,#FF9849_100%)] shadow-[0_22px_50px_-26px_rgba(196,80,20,0.55)]">
          <img
            src="/top3-poster-desk.webp"
            alt=""
            aria-hidden="true"
            decoding="async"
            className="nv-img pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-auto max-w-none [mask-image:linear-gradient(to_right,transparent_0%,#000_10%)] max-[700px]:hidden"
          />

          {/* Phones: both friends on the right (tall poster art), copy on the left */}
          <img
            src="/top3-poster-mobile.webp"
            alt=""
            aria-hidden="true"
            decoding="async"
            className="nv-img pointer-events-none absolute inset-y-0 right-0 -z-10 hidden h-full w-[58%] object-cover object-[center_78%] [mask-image:linear-gradient(to_right,transparent_0%,#000_28%)] max-[700px]:block"
          />

          <div className="relative flex min-h-[clamp(360px,33vw,440px)] max-w-[620px] flex-col justify-center p-6 sm:p-10 lg:p-12 max-[700px]:min-h-[300px] max-[700px]:max-w-[60%] max-[700px]:py-7 max-[700px]:pr-0 max-[700px]:pl-5">
            <p className="nv-in m-0 font-['Inter',sans-serif] text-[11px] sm:text-[12px] max-[700px]:text-[9px] font-bold tracking-[0.2em] max-[700px]:tracking-[0.14em] text-white/85 uppercase">
              Navratri Special<span className="max-[700px]:hidden"> · Limited Edition</span>
            </p>
            <h1 className="m-0 mt-3 text-[length:clamp(40px,5.6vw,80px)] max-[700px]:text-[length:clamp(24px,7.2vw,30px)] font-black uppercase leading-[0.95] tracking-[-0.02em] text-white [text-shadow:0_4px_28px_rgba(120,40,0,0.35)]">
              <span className="-m-[0.1em] block overflow-hidden p-[0.1em]"><span className="nv-line block">Your top {bundleCount}.</span></span>
              <span className="-m-[0.1em] block overflow-hidden p-[0.1em]"><span className="nv-line block">Just <span className="price-symbol">₹</span>{bundlePrice.toLocaleString('en-IN')}.</span></span>
            </h1>
            <p className="nv-in m-0 mt-3 font-['Inter',sans-serif] text-[length:clamp(14px,1.4vw,20px)] max-[700px]:text-[12.5px] font-medium text-white/95 [text-shadow:0_2px_14px_rgba(120,40,0,0.3)]">
              Pick any {bundleCount} pieces<br className="min-[701px]:hidden" /> from <span className="whitespace-nowrap">₹{minPrice}–₹{maxPrice}</span>.<br /> Endless possibilities.
            </p>

            <div className="nv-in mt-5 sm:mt-6 flex flex-wrap items-center gap-2 font-['Inter',sans-serif] text-[12px] sm:text-[13px] max-[700px]:text-[11px] font-bold max-[700px]:flex-col max-[700px]:items-start">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#FFF8EE] px-3.5 py-1.5 max-[700px]:px-2.5 text-[#B4471A] shadow-[0_8px_20px_-10px_rgba(120,40,0,0.5)]">
                <Flame size={14} /> Save up to {formatPrice(maxPrice * bundleCount - bundlePrice)}
              </span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/40 bg-white/15 px-3.5 py-1.5 max-[700px]:px-2.5 text-white backdrop-blur-sm">
                <ShieldCheck size={14} /> Anti-tarnish<span className="max-[400px]:hidden"> & waterproof</span>
              </span>
            </div>
          </div>
        </section>

        {!offerEnabled ? (
          <div className="mt-12 rounded-[22px] bg-white p-8 text-center shadow-md">
            <h2 className="text-[22px] font-bold text-[#111110]">This offer has ended</h2>
            <p className="mt-2 text-[#111110]/60">Check out our complete jewellery catalog for other amazing festive deals.</p>
            <Link to="/jewellery" className={`${primaryBtnCls} mt-4`}>
              <BtnSweep /> Browse Jewellery Edit
            </Link>
          </div>
        ) : (
          <>
            {/* ── Fixed Bottom 3-Slot Bundle Builder Dock ── */}
            <div className="fixed bottom-3 inset-x-3 sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[94%] sm:max-w-4xl z-40 transition-all duration-500 ease-out">
              <div className={`rounded-2xl sm:rounded-full border bg-white/95 px-3 py-2 sm:px-5 sm:py-2.5 backdrop-blur-md transition-all duration-500 ${
                isComplete
                  ? 'border-[#E8304F] ring-4 ring-[#E8304F]/20 shadow-[0_16px_48px_-6px_rgba(232,48,79,0.4)]'
                  : 'border-[#111110]/15 shadow-[0_12px_36px_-8px_rgba(17,17,16,0.28)] animate-[festive-glow_4s_ease-in-out_infinite]'
              }`}>
                <div className="flex items-center justify-between gap-2 sm:gap-4">
                  {/* Left: Progress + Slots */}
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {/* Animated Progress Circle */}
                    <div className="relative flex items-center justify-center shrink-0">
                      <span className={`flex size-6 sm:size-7 items-center justify-center rounded-full text-[11px] sm:text-[12px] font-black text-white transition-all duration-300 ${
                        isComplete
                          ? 'bg-[#1E8A4C] shadow-[0_0_12px_rgba(30,138,76,0.6)] animate-[pop-in_0.35s_cubic-bezier(0.16,1,0.3,1)]'
                          : slotsFilled > 0
                            ? 'bg-gradient-to-tr from-[#E8304F] to-[#FF5277] scale-105 shadow-[0_2px_8px_rgba(232,48,79,0.4)]'
                            : 'bg-[#E8304F]'
                      }`}>
                        {isComplete ? <Check size={13} strokeWidth={3} /> : `${slotsFilled}/${bundleCount}`}
                      </span>
                      {slotsFilled > 0 && !isComplete && (
                        <span aria-hidden="true" className="absolute inset-0 rounded-full bg-[#E8304F]/30 animate-ping pointer-events-none" />
                      )}
                    </div>

                    <div className="hidden md:flex flex-col leading-tight">
                      <span className="truncate font-['Inter',sans-serif] text-[13px] font-bold text-[#111110]">
                        {inBagComplete
                          ? '✅ 3-Pack in your bag'
                          : isComplete
                          ? '🎉 3-Pack Ready!'
                          : `Pick ${bundleCount - slotsFilled} item${bundleCount - slotsFilled > 1 ? 's' : ''}`}
                      </span>
                      <span className="text-[10px] font-semibold text-[#E8304F] flex items-center gap-1">
                        {inBagComplete ? 'Check out to start a new one' : isComplete ? '✨ Best value trio' : `✨ Add ${bundleCount - slotsFilled} more to unlock ${formatPrice(bundlePrice)}`}
                      </span>
                    </div>

                    {/* 3 Interactive Slots with Micro-Animations */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {Array.from({ length: bundleCount }).map((_, idx) => {
                        const item = selectedItems[idx];
                        const isNextToFill = !item && idx === slotsFilled;
                        return (
                          <div
                            key={idx}
                            className={`relative flex size-8 sm:size-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl transition-all duration-300 ${
                              item
                                ? 'border-2 border-[#1E8A4C] bg-[#F2FBF6] shadow-xs animate-[pop-in_0.35s_cubic-bezier(0.16,1,0.3,1)] hover:scale-105'
                                : isNextToFill
                                  ? 'border-2 border-dashed border-[#E8304F] bg-[#FFF0F4]/70 shadow-xs animate-[slot-invite_2s_ease-in-out_infinite]'
                                  : 'border border-dashed border-[#111110]/20 bg-[#111110]/[0.02]'
                            }`}
                            title={item ? `${item.name} (${formatPrice(item.price)})${item.inBag ? ' · in your bag' : ''}` : `Slot ${idx + 1}`}
                          >
                            {item ? (
                              <div className="relative size-full">
                                <img
                                  src={thumbUrl(item.image, 400)} data-original={item.image}
                                  alt={item.name}
                                  className="size-full rounded-[6px] sm:rounded-[9px] object-cover"
                                />
                                {item.inBag && (
                                  <span aria-hidden="true" className="absolute -bottom-1.5 -left-1.5 flex size-4 sm:size-4.5 items-center justify-center rounded-full bg-[#1E8A4C] text-white shadow-sm">
                                    <ShoppingBag size={8} />
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeItemFromBundle(idx)}
                                  aria-label={item.inBag ? `Remove ${item.name} from your bag` : `Remove ${item.name}`}
                                  className="absolute -top-1.5 -right-1.5 flex size-4 sm:size-4.5 items-center justify-center rounded-full bg-[#E8304F] text-white shadow-sm hover:scale-125 transition-transform cursor-pointer border-0"
                                >
                                  <Trash2 size={8} />
                                </button>
                              </div>
                            ) : (
                              <span className={`font-['Inter',sans-serif] text-[10px] sm:text-[11px] font-bold ${
                                isNextToFill ? 'text-[#E8304F] font-black' : 'text-[#111110]/35'
                              }`}>
                                +{idx + 1}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {slotsFilled > 0 && !addedSuccess && !inBagComplete && (
                      <button
                        type="button"
                        onClick={handleResetBundle}
                        className="hidden sm:inline-block cursor-pointer border-0 bg-transparent font-['Inter',sans-serif] text-[11px] font-medium text-[#111110]/45 hover:text-[#E8304F] transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Right: Price + Action Button */}
                  <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
                    <div className="text-right leading-none">
                      <div className="flex items-baseline justify-end gap-1.5">
                        {isComplete && (
                          <span className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#111110]/40 line-through">
                            {formatPrice(selectedRegularTotal)}
                          </span>
                        )}
                        <span className="text-[14px] sm:text-[16px] font-black text-[#1E8A4C]">
                          {formatPrice(bundlePrice)}
                        </span>
                      </div>
                      <p className="m-0 mt-0.5 font-['Inter',sans-serif] text-[10px] text-[#111110]/55 hidden xs:block">
                        {isComplete ? `Save ${formatPrice(potentialSavings)}` : 'Combo'}
                      </p>
                    </div>

                    {addedSuccess || inBagComplete ? (
                      <div className="flex items-center gap-1.5 animate-[pop-in_0.3s_ease]">
                        <Link
                          to="/cart"
                          className="inline-flex items-center gap-1.5 rounded-xl sm:rounded-full bg-[#1E8A4C] px-3.5 py-1.5 sm:px-4.5 sm:py-2 text-[12px] sm:text-[13px] font-bold text-white no-underline shadow-[0_4px_16px_rgba(30,138,76,0.4)] hover:bg-[#156E3B] transition-transform hover:scale-105 active:scale-95"
                        >
                          <ShoppingBag size={14} /> Go to Bag <ArrowRight size={13} />
                        </Link>
                        {!inBagComplete && (
                        <button
                          type="button"
                          onClick={handleResetBundle}
                          className="hidden sm:inline-flex items-center rounded-full border border-[#111110]/20 bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#111110] hover:bg-[#111110]/5 cursor-pointer"
                        >
                          + Another
                        </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!isComplete}
                        onClick={handleAddBundleToBag}
                        className={`relative group overflow-hidden inline-flex items-center justify-center gap-1.5 rounded-xl sm:rounded-full px-3.5 py-1.5 sm:px-5 sm:py-2 text-[12px] sm:text-[13px] font-bold transition-all duration-300 ${
                          isComplete
                            ? 'cursor-pointer bg-gradient-to-r from-[#E8304F] via-[#FF3D8B] to-[#E8304F] bg-[length:200%_auto] text-white shadow-[0_6px_22px_-2px_rgba(232,48,79,0.55)] hover:scale-105 active:scale-95 hover:bg-right'
                            : 'cursor-not-allowed bg-[#111110]/10 text-[#111110]/45'
                        }`}
                      >
                        {/* Shimmer light sweep when complete */}
                        {isComplete && (
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer-sweep_2.5s_infinite] bg-gradient-to-r from-transparent via-white/35 to-transparent"
                          />
                        )}
                        {isComplete ? (
                          <>
                            <Sparkles size={14} className="text-white animate-bounce" />
                            <span>Add 3-Pack</span>
                          </>
                        ) : (
                          `Add ${bundleCount - slotsFilled} more`
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Category / Filter & Sort Bar (Matching CategoryPage & Screenshot) ── */}
            <div className="sticky top-[calc(var(--store-header-h,60px)+var(--announce-h,0px))] z-20 -mx-4 sm:mx-0 mt-6 sm:mt-8 border-y border-[#111110]/8 bg-[#FFF8EE]/85 backdrop-blur-md px-4 sm:px-0 py-2.5 sm:py-3">
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Desktop Label */}
                <span className="hidden min-[701px]:flex items-center gap-1.5 font-['Inter',sans-serif] text-[13px] font-semibold text-[#111110]/60 shrink-0">
                  <SlidersHorizontal size={15} /> Category
                </span>

                {/* Mobile Filter Button (From User Screenshot) */}
                <button
                  type="button"
                  onClick={() => setFilterOpen(true)}
                  aria-haspopup="dialog"
                  className="flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-full border-2 border-[#111110]/15 bg-white pr-1.5 pl-3.5 font-['Inter',sans-serif] text-[14px] font-semibold text-[#111110] min-[701px]:hidden shadow-2xs"
                >
                  <SlidersHorizontal size={16} className="shrink-0" /> Filter
                  <span className={`ml-auto truncate rounded-full px-2.5 py-1 text-[13px] font-medium ${
                    hasActiveFilters ? 'bg-[#111110] text-white' : 'bg-[#111110]/6 text-[#111110]/70'
                  }`}>
                    {filterBadgeLabel} · {displayProducts.length}
                  </span>
                </button>

                {/* Desktop Category Chips */}
                <div className="-my-1 hidden min-[701px]:flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-0.5 py-1 [scrollbar-width:none]">
                  {categories.map((cat) => {
                    const count = eligibleProducts.filter(
                      (p) => matchesCategory(p, cat.slug) && matchesPrice(p, activePriceRange)
                    ).length;
                    const isActive = activeCategory === cat.slug;
                    return (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => setActiveCategory(cat.slug)}
                        className={`cursor-pointer rounded-full border-2 px-3.5 py-1.5 font-['Inter',sans-serif] text-[13px] font-bold capitalize transition-colors duration-200 shrink-0 ${
                          isActive
                            ? 'border-[#111110] bg-[#111110] text-white'
                            : 'border-[#111110]/15 bg-white text-[#111110] hover:border-[#111110]'
                        }`}
                      >
                        {cat.name}
                        <span className={`ml-1.5 text-[12px] font-medium ${isActive ? 'text-white/70' : 'text-[#111110]/50'}`}>
                          · {count}
                        </span>
                      </button>
                    );
                  })}

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="cursor-pointer ml-1 text-[12px] font-bold text-[#E8304F] hover:underline shrink-0"
                    >
                      Clear filters
                    </button>
                  )}
                </div>

                {/* 1 / 2 Column Toggle on Mobile (From User Screenshot) */}
                <div
                  role="group"
                  aria-label="Products per row"
                  className="flex h-10 shrink-0 items-center gap-0.5 rounded-full border-2 border-[#111110]/15 bg-white p-0.5 min-[701px]:hidden shadow-2xs"
                >
                  {[
                    [1, Square, 'One per row'],
                    [2, Grid2x2, 'Two per row'],
                  ].map(([n, Icon, label]) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => pickCols(n)}
                      aria-label={label}
                      aria-pressed={mobileCols === n}
                      className={`flex size-8 cursor-pointer items-center justify-center rounded-full border-0 transition-colors duration-200 ${
                        mobileCols === n ? 'bg-[#111110] text-white' : 'bg-transparent text-[#111110]/55'
                      }`}
                    >
                      <Icon size={15} strokeWidth={2} />
                    </button>
                  ))}
                </div>

                {/* Sort Icon Button on Mobile & Dropdown on Desktop (From User Screenshot) */}
                <SortMenu value={sortBy} options={SORT_OPTIONS} onChange={setSortBy} />
              </div>
            </div>

            <FilterSheet
              open={filterOpen}
              onClose={() => setFilterOpen(false)}
              title="Filter Pieces"
              sections={filterSections}
              onReset={hasActiveFilters ? handleResetFilters : null}
              applyLabel={`Show ${displayProducts.length} Piece${displayProducts.length === 1 ? '' : 's'}`}
              autoClose={false}
              showCounts={true}
            />

            {/* ── Eligible Products Count & Range Badge ── */}
            <div className="mt-5 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <p className="m-0 font-['Inter',sans-serif] text-[13px] sm:text-[14px] text-[#111110]/70 leading-snug">
                Showing <b className="text-[#111110]">{displayProducts.length}</b> eligible items for {offerTitle}
              </p>
              <span className="w-fit self-start sm:self-auto rounded-full bg-[#FFF0B8] border border-[#F6C915]/40 px-3 py-1 font-['Inter',sans-serif] text-[11px] sm:text-[12px] font-bold text-[#8A6A00] whitespace-nowrap shadow-2xs">
                ₹{minPrice} – ₹{maxPrice} Range Only
              </span>
            </div>

            {/* ── Eligible Products Grid ── */}
            <div className="mt-2">
              {displayProducts.length === 0 ? (
                <div className="rounded-[22px] bg-white p-12 text-center shadow-sm">
                  <p className="text-[17px] font-semibold text-[#111110]">
                    No items found for the selected filter between ₹{minPrice} and ₹{maxPrice}.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className={`${ghostBtnCls} mt-4 text-[14px]`}
                  >
                    View all eligible pieces
                  </button>
                </div>
              ) : (
                <div className={`grid gap-[clamp(12px,1.8vw,24px)] md:grid-cols-3 lg:grid-cols-4 ${
                  mobileCols === 1 ? 'grid-cols-1 max-[700px]:gap-4' : 'grid-cols-2'
                }`}>
                  {displayProducts.map((product) => {
                    const timesSelected = isInCombo(product.id) ? 1 : 0;
                    const inBag = bagIds.has(String(product.id));
                    // One piece per category: a same-category pick can be swapped for this one.
                    const sameCat = timesSelected === 0 ? comboPieceInCategory(product) : null;
                    const catLabel = (getCategoryName(product) || 'piece').replace(/s$/i, '').toLowerCase();
                    const canSelectMore = timesSelected === 0 && !sameCat && selectedItems.length < bundleCount;

                    return (
                      <div
                        key={product.id}
                        className={`flex flex-col justify-between rounded-[20px] bg-white p-2.5 shadow-[0_8px_24px_-16px_rgba(17,17,16,0.25)] transition-all hover:shadow-[0_14px_30px_-16px_rgba(17,17,16,0.35)] ${
                          timesSelected > 0 ? 'ring-2 ring-[#1E8A4C]' : ''
                        }`}
                      >
                        <Link to={productPath(product)} className="group block no-underline">
                          <div className="relative aspect-[4/5] overflow-hidden rounded-[16px] bg-[#EFE8DA]">
                            <img
                              src={thumbUrl(product.image, 800)} data-original={product.image}
                              alt={product.name}
                              loading="lazy"
                              decoding="async"
                              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            {timesSelected > 0 && (
                              <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-[#1E8A4C] font-['Inter',sans-serif] text-[12px] font-bold text-white shadow-sm">
                                <Check size={14} strokeWidth={3} />
                              </span>
                            )}
                          </div>

                          <div className="mt-3 px-1">
                            <h3 className="truncate font-['Inter',sans-serif] text-[14px] font-bold text-[#111110] sm:text-[15px]">
                              {product.name}
                            </h3>
                            <div className="mt-1 flex items-baseline gap-2">
                              <span className="font-['Inter',sans-serif] text-[16px] font-bold text-[#111110]">
                                {formatPrice(product.price)}
                              </span>
                              <span className="font-['Inter',sans-serif] text-[12px] font-semibold text-[#1E8A4C]">
                                Combo: ~{formatPrice(Math.round(bundlePrice / bundleCount))}
                              </span>
                            </div>
                          </div>
                        </Link>

                        <div className="mt-3 px-1 pb-1">
                          {inBag ? (
                            <Link
                              to="/cart"
                              className="flex w-full items-center justify-center gap-1.5 rounded-full border-2 border-[#1E8A4C] bg-[#1E8A4C] py-2 font-['Inter',sans-serif] text-[13px] font-bold text-white no-underline hover:bg-[#166E3C]"
                            >
                              <ShoppingBag size={15} /> In your bag
                            </Link>
                          ) : inBagComplete ? (
                            <button
                              type="button"
                              disabled
                              title="Your 3-pack is already in the bag — check out or remove a piece to start a new one."
                              className="w-full cursor-not-allowed rounded-full border-2 border-[#111110]/12 bg-transparent py-2 font-['Inter',sans-serif] text-[12px] font-semibold text-[#111110]/40"
                            >
                              3-Pack already in bag
                            </button>
                          ) : sameCat ? (
                            <button
                              type="button"
                              disabled={sameCat.inBag}
                              onClick={() => { swapIntoCombo(product); setAddedSuccess(false); }}
                              title={sameCat.inBag ? `Your 3-pack already has a ${catLabel} (in your bag) — one per category.` : `Replaces ${sameCat.name} — one ${catLabel} per 3-pack.`}
                              className="w-full cursor-pointer rounded-full border border-[#111110]/20 bg-transparent py-2 font-['Inter',sans-serif] text-[13px] font-semibold text-[#111110] hover:bg-[#111110]/5 disabled:cursor-not-allowed disabled:text-[#111110]/40 disabled:hover:bg-transparent"
                            >
                              {sameCat.inBag ? `${catLabel.charAt(0).toUpperCase()}${catLabel.slice(1)} already picked` : `Swap for this ${catLabel}`}
                            </button>
                          ) : isComplete && timesSelected === 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                swapIntoCombo(product);
                                setAddedSuccess(false);
                              }}
                              className="w-full cursor-pointer rounded-full border border-[#111110]/20 bg-transparent py-2 font-['Inter',sans-serif] text-[13px] font-semibold text-[#111110] hover:bg-[#111110]/5"
                            >
                              Swap into combo
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addItemToBundle(product)}
                              disabled={!canSelectMore}
                              className={`flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full py-2.5 font-['Inter',sans-serif] text-[13px] font-bold transition-all ${
                                timesSelected > 0
                                  ? 'border-2 border-[#1E8A4C] bg-[#1E8A4C] text-white hover:bg-[#166E3C]'
                                  : 'border-2 border-[#111110] bg-transparent text-[#111110] hover:bg-[#111110] hover:text-white'
                              } disabled:cursor-not-allowed disabled:border-[#111110]/15 disabled:bg-transparent disabled:text-[#111110]/35`}
                            >
                              {timesSelected > 0 ? (
                                <>
                                  <Check size={15} strokeWidth={2.5} /> In 3-Pack
                                </>
                              ) : (
                                <>
                                  <Plus size={15} /> Add to 3-Pack
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── FAQ & Terms Section ── */}
            <section className={`mt-16 p-6 sm:p-8 ${cardCls}`}>
              <div className="flex items-center gap-2">
                <Info size={20} className="text-[#FF3D8B]" />
                <h2 className="m-0 text-[20px] font-bold text-[#111110]">
                  About the Navratri Pick 3 @ ₹999 Offer
                </h2>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="rounded-[16px] bg-[#FFFBED] p-4">
                  <h3 className="m-0 text-[16px] font-bold text-[#111110]">1. Which items qualify?</h3>
                  <p className="m-0 mt-1.5 font-['Inter',sans-serif] text-[13px] leading-relaxed text-[#111110]/70">
                    Products on this page priced ₹{minPrice}–₹{maxPrice} qualify. Each 3-pack takes one piece from each category — a necklace, a bracelet and a pair of earrings.
                  </p>
                </div>

                <div className="rounded-[16px] bg-[#FFF0F4] p-4">
                  <h3 className="m-0 text-[16px] font-bold text-[#111110]">2. Can I buy multiple bundles?</h3>
                  <p className="m-0 mt-1.5 font-['Inter',sans-serif] text-[13px] leading-relaxed text-[#111110]/70">
                    Yes — every complete set of one necklace, one bracelet and one pair of earrings in your bag is {formatPrice(bundlePrice)}. Extra pieces from the same category are charged at their normal price.
                  </p>
                </div>

                <div className="rounded-[16px] bg-[#E8F7EE] p-4">
                  <h3 className="m-0 text-[16px] font-bold text-[#111110]">3. Free delivery & returns?</h3>
                  <p className="m-0 mt-1.5 font-['Inter',sans-serif] text-[13px] leading-relaxed text-[#111110]/70">
                    Free shipping automatically unlocks once your order items reach ₹{SETTINGS.freeDeliveryThreshold}. Plus, enjoy 100% anti-tarnish waterproof quality assurance.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </StoreShell>
  );
}
