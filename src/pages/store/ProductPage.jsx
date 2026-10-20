import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Heart, Plus, Star, Truck, RotateCcw, Banknote, ShieldCheck, Check, ShoppingBag, ZoomIn, X, Sparkles, Camera, ArrowRight } from 'lucide-react';
import useSmoothScroll from '../../hooks/useSmoothScroll';
import { LandingHeader } from '../../components/landing/LandingIntro';
import PriceEdit from '../../components/landing/PriceEdit';
import SiteFooter from '../../components/landing/SiteFooter';
import PincodeCheck from '../../components/store/PincodeCheck';
import scrollRise from '../../components/landing/scrollRise';
import Seo from '../../components/Seo';
import { productJsonLd, productDescription, previewImage } from '../../seo/product';
import { parseRichContent } from '../../components/RichContent';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { FREE_DELIVERY_THRESHOLD } from '../../utils/delivery';
import { COD_ENABLED } from '../../utils/payments';
import { SETTINGS } from '../../store/settings';
import { useCatalog, productsIn, isOwnPageOnly } from '../../store/catalog';
import { addToCart, useCart } from '../../store/cart';
import { useCombo, addToCombo, removeFromCombo, swapIntoCombo, isInCombo, isEligibleForCombo, comboUnitPrice, addComboToBag, comboPieceInCategory } from '../../store/combo';
import { toggleWishlist, useWishlist } from '../../store/wishlist';
import { categoryPath, productPath, formatPrice, JEWELLERY_CATEGORY_SLUGS } from '../../store/catalogConfig';
import { thumbUrl } from '../../utils/productImage';

gsap.registerPlugin(ScrollTrigger);

// Product detail page (/products/:slug) in the storefront look: cream base,
// the Bricolage display font, pink / yellow / blue accents, the shared site
// header + footer, smooth scrolling. Layout follows common e-commerce PDPs:
// breadcrumb · gallery (thumbnails, opt-in zoom, swipe) · buy box (rating,
// price, qty, add to bag / buy now, wishlist, pincode, trust badges, info
// accordions) · reviews · "you may also like" · sticky mobile buy bar.
// Product data comes from the shared catalogue store; reviews from the API.
const FONT_CLASS = "font-['Bricolage_Grotesque','Inter',sans-serif]";
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const MAX_REVIEW_IMAGE = 2 * 1024 * 1024; // matches the server's multer limit

// Shown under "Materials & care" when a product has no care text of its own
// (same advice as the Product Care page, /customer-care/product-care).
const DEFAULT_CARE_TEXT = [
  'Put it on after perfume, lotion and makeup.',
  'Take it off before bathing, swimming, workouts or sleeping.',
  'Keep it away from water, sanitiser and other chemicals.',
  'Wipe it with a soft, dry cloth and store it in its ZUNUZ pouch, away from other pieces.',
  '> More tips in our Product Care guide (Customer Care → Product care).',
].join('\n');

const SHIPPING_TEXT = `${SETTINGS.deliveryFeeEnabled ? `Free delivery on orders of ${formatPrice(FREE_DELIVERY_THRESHOLD)} and above — below that a small flat fee shows at checkout.` : 'Free delivery on every order.'} Dispatched within 12 hours; most orders arrive in 2–7 business days.${COD_ENABLED ? ' Cash on delivery available.' : ''} Received it damaged or wrong? Tell us within 24 hours of delivery and we'll replace it.`;

function Stars({ value, size = 16 }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="relative inline-block" style={{ width: size, height: size }}>
          <Star size={size} className="absolute inset-0 text-[#111110]/15" fill="currentColor" strokeWidth={0} />
          <span className="absolute inset-0 overflow-hidden" style={{ width: `${Math.max(0, Math.min(1, value - n + 1)) * 100}%` }}>
            <Star size={size} className="text-[#F2A900]" fill="currentColor" strokeWidth={0} />
          </span>
        </span>
      ))}
    </span>
  );
}

// Admin-authored text ("## heading", "> paragraph", else bullet) in this theme.
function RichBody({ text }) {
  const lines = parseRichContent(text);
  const em = (t) => t.split(/\*(.+?)\*/g).map((part, i) => (i % 2 ? <em key={i}>{part}</em> : part));
  return (
    <div className="flex flex-col gap-2 pb-4 font-['Inter',sans-serif] text-[14px] leading-relaxed text-[#111110]/75">
      {lines.map((l, i) => {
        if (l.type === 'heading') return <p key={i} className="m-0 mt-2 text-[15px] font-bold text-[#111110]">{em(l.text)}</p>;
        if (l.type === 'paragraph') return <p key={i} className="m-0">{em(l.text)}</p>;
        return (
          <p key={i} className="m-0 flex items-start gap-2.5">
            <Sparkles size={14} className="mt-[3px] shrink-0 text-[#FF3D8B]" aria-hidden="true" />
            <span>{em(l.text)}</span>
          </p>
        );
      })}
    </div>
  );
}

// Buy now: put it in the bag (unless it's already there) and go to the bag.
// Its own component so only this button subscribes to navigation/cart.
function BuyNowButton({ product, qty, disabled, className, onClick }) {
  const navigate = useNavigate();
  const cart = useCart();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (onClick) {
          onClick();
          return;
        }
        if (!cart.some((i) => i.id === product.id)) addToCart(product, qty);
        navigate('/cart');
      }}
      className={className}
    >
      Buy now
    </button>
  );
}

// Plain page shell (header + footer) for the loading / not-found states.
function ProductShell({ children }) {
  const scrollRef = useRef(null);
  const scrollContentRef = useRef(null);
  const lenisRef = useSmoothScroll(scrollRef, scrollContentRef);
  return (
    <div className={`relative h-dvh w-full overflow-hidden bg-[#FFF8EE] text-[#111110] ${FONT_CLASS}`}>
      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden">
        <div ref={scrollContentRef}>
          <div className="sticky top-0 z-40"><LandingHeader transparent={false} /></div>
          <main className="mx-auto flex min-h-[60vh] max-w-[1180px] flex-col items-center justify-center px-5 py-16 text-center">{children}</main>
          <SiteFooter scrollRef={scrollRef} lenisRef={lenisRef} />
        </div>
      </div>
    </div>
  );
}

// Low-stock ("Only N left") badge on the product photo — off for now.
const SHOW_LOW_STOCK_TAG = false;

export default memo(ProductPage);

// "a matching necklace or bracelet" — the other two types, for "Complete the look".
const TYPE_NOUN = { earrings: 'pair of earrings', necklaces: 'necklace', bracelets: 'bracelet' };
function pairLabel(product) {
  const type = JEWELLERY_CATEGORY_SLUGS.includes(product.categorySlug) ? product.categorySlug : product.subcategorySlug;
  const others = JEWELLERY_CATEGORY_SLUGS.filter((s) => s !== type).map((s) => TYPE_NOUN[s]);
  return `a matching ${others.join(' or ')}`;
}

function ProductPage({ slug }) {
  const catalog = useCatalog();
  const product = catalog.products.find((p) => p.slug === slug || p.id === slug) || null;
  const related = useMemo(() => {
    if (!product) return [];
    const same = productsIn(catalog, product.categorySlug).filter((p) => p.id !== product.id);
    // Festive Glow pieces are only suggested alongside other Festive Glow pieces.
    const others = catalog.products.filter((p) => p.id !== product.id && p.categorySlug !== product.categorySlug && !isOwnPageOnly(p));
    return [...same, ...others].slice(0, 4);
  }, [catalog, product]);
  // "Complete the look": pieces of the other types —
  // earrings → necklaces + bracelets, necklaces → earrings + bracelets…
  // Festive Glow pieces use their sub-type (e.g. "earrings"). In stock only,
  // closest in price first, alternating between the two types, and never a
  // piece that's already under "You may also like".
  const pairs = useMemo(() => {
    if (!product) return [];
    const type = JEWELLERY_CATEGORY_SLUGS.includes(product.categorySlug) ? product.categorySlug : product.subcategorySlug;
    const shown = new Set(related.map((p) => p.id));
    const byCloseness = (a, b) => Math.abs(a.price - product.price) - Math.abs(b.price - product.price);
    const lists = JEWELLERY_CATEGORY_SLUGS.filter((slug) => slug !== type).map((slug) => (
      productsIn(catalog, slug).filter((p) => p.stock > 0 && p.id !== product.id && !shown.has(p.id)).sort(byCloseness)
    ));
    const picked = [];
    for (let i = 0; picked.length < 4 && lists.some((l) => l[i]); i += 1) {
      lists.forEach((l) => { if (l[i] && picked.length < 4) picked.push(l[i]); });
    }
    return picked;
  }, [catalog, product, related]);

  if (!product) {
    if (catalog.status === 'ready' || catalog.status === 'error') {
      return (
        <ProductShell>
          <Seo title="Product not found" noindex />
          <p className="m-0 font-['Inter',sans-serif] text-[13px] font-bold tracking-[0.18em] text-[#FF3D8B] uppercase">Oops</p>
          <h1 className="m-0 mt-3 text-[length:clamp(30px,4vw,52px)] font-bold leading-[1.05]">
            {catalog.status === 'error' ? "We couldn't load this piece." : "This piece isn't here anymore."}
          </h1>
          <p className="m-0 mt-3 max-w-[440px] font-['Inter',sans-serif] text-[15px] text-[#111110]/65">
            {catalog.status === 'error' ? 'Check your connection and try again.' : 'It may have sold out or moved. Plenty more to love in the shop.'}
          </p>
          <Link to="/jewellery" className="mt-7 rounded-full bg-[#111110] px-7 py-3.5 text-[16px] font-bold text-white no-underline transition-colors duration-300 hover:bg-[#FF3D8B]">
            Shop jewellery
          </Link>
        </ProductShell>
      );
    }
    return (
      <ProductShell>
        <span aria-label="Loading" className="size-10 animate-spin rounded-full border-[3px] border-[#111110]/10 border-t-[#FF3D8B]" />
      </ProductShell>
    );
  }
  return <ProductView key={product.id} product={product} related={related} pairs={pairs} />;
}

function ProductView({ product, related, pairs }) {
  const navigateTo = useNavigate();
  const scrollRef = useRef(null);
  const scrollContentRef = useRef(null);
  const lenisRef = useSmoothScroll(scrollRef, scrollContentRef);
  const pageRef = useRef(null);
  const reviewsRef = useRef(null);
  const relatedRef = useRef(null);
  const pairRef = useRef(null);
  const buyBtnRef = useRef(null);
  const addedTimer = useRef(null);

  const images = product.images.length ? product.images : [product.image];
  const soldOut = product.stock <= 0;
  const wish = useWishlist().includes(product.id);

  const [imgIdx, setImgIdx] = useState(0);
  const qty = 1;
  const [added, setAdded] = useState(false);
  const [openAcc, setOpenAcc] = useState(0);
  const [showBar, setShowBar] = useState(false);
  const [reviews, setReviews] = useState(null); // null = loading
  // Zoom is opt-in: the magnifier button turns it on (photo eases to 2.1x
  // and pans with the cursor / a finger drag); the close button, Esc, or
  // changing photo turns it off. Zoom + pan are GSAP transforms on one
  // wrapper layer (compositor-only), and pan uses quickTo so each pointer
  // move just retargets one running tween — it glides after the cursor
  // instead of restarting a CSS transition on every move (which stuttered).
  const ZOOM = 2.1;
  const [zoomOn, setZoomOn] = useState(false);
  const frameRef = useRef(null);
  const zoomLayerRef = useRef(null);
  const panRef = useRef(null); // { x, y } quickTo setters while zoomed

  // "Only N left" badge hidden for now (SHOW_LOW_STOCK_TAG); "Sold out" still shows.
  const tag = soldOut ? 'Sold out' : SHOW_LOW_STOCK_TAG && product.stock <= 5 ? `Only ${product.stock} left` : null;
  const short = product.tagline || parseRichContent(product.description).find((l) => l.type !== 'heading')?.text || '';
  const accordion = [
    { title: 'Description', body: product.description },
    { title: 'Product details', body: product.productDetails },
    { title: "Why it's worth it", body: product.whyWorthIt },
    { title: 'Materials & care', body: [product.materials, product.careInstructions || DEFAULT_CARE_TEXT].filter(Boolean).join('\n') },
    { title: 'Shipping & replacements', body: `> ${SHIPPING_TEXT}` },
  ].filter((a) => a.body && a.body.trim());

  // Reviews (public).
  useEffect(() => {
    let alive = true;
    api.get(`/products/${product.id}/reviews`)
      .then((list) => { if (alive) setReviews(Array.isArray(list) ? list : []); })
      .catch(() => { if (alive) setReviews([]); });
    return () => { alive = false; };
  }, [product.id]);
  // The API also returns the signed-in customer's own review while it's
  // awaiting approval (flagged `pending`) — it never counts toward the rating
  // and isn't listed publicly; the review form shows its status instead.
  const approved = useMemo(() => (reviews ? reviews.filter((r) => !r.pending) : null), [reviews]);
  const reviewCount = approved?.length || 0;
  const rating = reviewCount ? Math.round((approved.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10 : 0;
  const split = [5, 4, 3, 2, 1].map((n) => (reviewCount ? Math.round((approved.filter((r) => r.rating === n).length / reviewCount) * 100) : 0));

  const selectImg = (i) => { setImgIdx(i); setZoomOn(false); };
  // Keep the image point under the pointer under the pointer: with the layer
  // scaled by ZOOM around its centre, a translate of (f - 0.5)·size·(1-ZOOM)
  // lines fraction f of the image up with fraction f of the frame.
  const frameRect = useRef(null);
  const setPan = (e) => {
    const pan = panRef.current;
    const r = frameRect.current;
    if (!pan || !r) return;
    const fx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const fy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    pan.x((fx - 0.5) * r.width * (1 - ZOOM));
    pan.y((fy - 0.5) * r.height * (1 - ZOOM));
  };
  const openZoom = () => setZoomOn(true);

  // Photo carousel: the photos sit side by side on a track; GSAP slides it
  // (xPercent = -index·100). Dragging (finger or mouse, when not zoomed)
  // moves the track 1:1 with a rubber-band at the first/last photo; on
  // release it glides to the next/previous photo if the drag passed
  // SWIPE_MIN or was a quick flick, else back. Thumbnails / dots slide the
  // track too. Vertical drags are left to the page (touch-action: pan-y).
  const trackRef = useRef(null);
  const swipe = useRef(null);
  const SWIPE_MIN = 60; // px
  const FLICK = 0.45; // px/ms
  const firstSlide = useRef(true);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const instant = firstSlide.current || reduced;
    firstSlide.current = false;
    const t = gsap.to(track, { xPercent: -imgIdx * 100, x: 0, duration: instant ? 0 : 0.65, ease: 'power3.out' });
    return () => t.kill();
  }, [imgIdx]);

  const onSwipeDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    swipe.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, horizontal: null, w: e.currentTarget.getBoundingClientRect().width };
  };
  const onSwipeMove = (e) => {
    const sw = swipe.current;
    if (!sw || sw.id !== e.pointerId) return;
    let dx = e.clientX - sw.x;
    const dy = e.clientY - sw.y;
    if (sw.horizontal === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      sw.horizontal = Math.abs(dx) > Math.abs(dy);
      if (sw.horizontal) {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        gsap.killTweensOf(trackRef.current);
        // Snap any in-flight slide to its target so the drag starts clean.
        gsap.set(trackRef.current, { xPercent: -imgIdx * 100 });
      }
    }
    if (!sw.horizontal) return;
    const last = images.length - 1;
    if ((imgIdx === 0 && dx > 0) || (imgIdx === last && dx < 0)) dx *= 0.3; // rubber-band
    gsap.set(trackRef.current, { x: dx });
  };
  const onSwipeEnd = (e) => {
    const sw = swipe.current;
    swipe.current = null;
    if (!sw || sw.id !== e.pointerId || !sw.horizontal) return;
    const dx = e.clientX - sw.x;
    const speed = Math.abs(dx) / Math.max(1, performance.now() - sw.t);
    const last = images.length - 1;
    let next = imgIdx;
    if (Math.abs(dx) > SWIPE_MIN || speed > FLICK) next = Math.max(0, Math.min(last, imgIdx + (dx < 0 ? 1 : -1)));
    if (next !== imgIdx) {
      // Fold the drag offset into xPercent so the glide continues from where
      // the finger let go (no jump), then let the imgIdx effect animate it.
      const cur = gsap.getProperty(trackRef.current, 'xPercent') + (dx / sw.w) * 100;
      gsap.set(trackRef.current, { xPercent: cur, x: 0 });
      selectImg(next);
    } else {
      gsap.to(trackRef.current, { x: 0, duration: 0.45, ease: 'power3.out' });
    }
  };

  useEffect(() => {
    const layer = zoomLayerRef.current;
    const frame = frameRef.current;
    if (!layer || !frame) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (zoomOn) {
      frameRect.current = frame.getBoundingClientRect();
      gsap.set(layer, { willChange: 'transform' });
      // Scale only — position belongs to the pan tweens from the first frame,
      // so moving right after clicking never fights a second x/y tween.
      const t = gsap.to(layer, { scale: ZOOM, duration: reduced ? 0 : 0.6, ease: 'power3.out' });
      panRef.current = {
        x: gsap.quickTo(layer, 'x', { duration: reduced ? 0 : 0.55, ease: 'power3.out' }),
        y: gsap.quickTo(layer, 'y', { duration: reduced ? 0 : 0.55, ease: 'power3.out' }),
      };
      // Page scroll / resize moves the frame — re-measure.
      const remeasure = () => { frameRect.current = frame.getBoundingClientRect(); };
      const scroller = scrollRef.current;
      window.addEventListener('resize', remeasure);
      scroller?.addEventListener('scroll', remeasure, { passive: true });
      return () => {
        t.kill();
        window.removeEventListener('resize', remeasure);
        scroller?.removeEventListener('scroll', remeasure);
      };
    }
    panRef.current = null;
    gsap.killTweensOf(layer);
    const t = gsap.to(layer, {
      scale: 1, x: 0, y: 0, duration: reduced ? 0 : 0.5, ease: 'power3.out',
      onComplete: () => gsap.set(layer, { clearProps: 'willChange' }),
    });
    return () => t.kill();
  }, [zoomOn]);
  useEffect(() => {
    if (!zoomOn) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setZoomOn(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomOn]);

  // Entrance: gallery + buy-box pieces rise in on load (before first paint
  // they're hidden by the effect, not CSS, so no-JS still shows them).
  useEffect(() => {
    const root = pageRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const gal = root.querySelectorAll('.pd-gal');
    const info = root.querySelectorAll('.pd-in');
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(gal, { opacity: 0, y: 30, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.9 })
      .fromTo(info, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06 }, 0.15);
    return () => tl.kill();
  }, []);

  // Reviews heading + summary rise like the rest of the site.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return undefined;
    const r = reviewsRef.current;
    return scrollRise(r, scroller, r?.querySelectorAll('.pd-fade'));
  }, []);
  // Anything changing the page height (reviews / related products arriving,
  // photos, opening a details panel, switching product) moves the scroll
  // animations' trigger points — re-measure them (debounced) whenever the
  // content resizes, so sections never reveal late.
  useEffect(() => {
    const content = scrollContentRef.current;
    if (!content || typeof ResizeObserver === 'undefined') return undefined;
    let t;
    let lastH = content.offsetHeight;
    const ro = new ResizeObserver(() => {
      const h = content.offsetHeight;
      if (Math.abs(h - lastH) < 2) return;
      lastH = h;
      clearTimeout(t);
      t = setTimeout(() => ScrollTrigger.refresh(), 150);
    });
    ro.observe(content);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, []);

  // Sticky mobile buy bar: shown once the main Add to bag is out of view.
  useEffect(() => {
    const btn = buyBtnRef.current;
    const scroller = scrollRef.current;
    if (!btn || !scroller) return undefined;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top < 0), { root: scroller });
    io.observe(btn);
    return () => io.disconnect();
  }, []);

  useEffect(() => () => window.clearTimeout(addedTimer.current), []);

  // Already in the bag → the button becomes "Go to bag" (after the brief
  // "Added to bag" confirmation).
  const bag = useCart();
  const inBag = bag.some((i) => i.id === product.id);
  const goToBag = inBag && !added;

  // Add to bag + success pop (or open the bag if it's already there).
  const addToBag = () => {
    if (soldOut) return;
    if (goToBag) { navigateTo('/cart'); return; }
    addToCart(product, qty);
    setAdded(true);
    const b = buyBtnRef.current;
    if (b && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(b, { scale: 0.94 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
    }
    window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setAdded(false), 2400);
  };

  const isComboEligible = isEligibleForCombo(product);
  const combo = useCombo();
  const inCombo = isInCombo(product.id);
  // The bag already holds a full combo — one at a time, so no picking until it leaves.
  const inFullCombo = combo.inBagComplete;
  // Combo pieces: regular price struck through, the per-piece combo price as the special price.
  const specialPrice = isComboEligible ? comboUnitPrice(product) : null;
  const [comboPromptOpen, setComboPromptOpen] = useState(false);
  const [comboToast, setComboToast] = useState(null);
  const comboToastTimer = useRef(null);

  const showComboToast = (msg) => {
    setComboToast(msg);
    clearTimeout(comboToastTimer.current);
    comboToastTimer.current = setTimeout(() => setComboToast(null), 3500);
  };

  const handleAddProductToCombo = () => {
    // One piece per category: replace the same-category pick (or explain why not).
    const same = comboPieceInCategory(product);
    if (same) {
      if (same.inBag) { showComboToast(`Your 3-pack already has ${same.name} (in your bag) — one piece per category.`); return; }
      swapIntoCombo(product);
      showComboToast(`🔁 Swapped ${same.name} for this piece — one per category.`);
      return;
    }
    const ok = addToCombo(product);
    if (ok) {
      const nextCount = combo.slotsFilled + 1;
      if (nextCount >= combo.bundleCount) {
        showComboToast(`🎉 ${combo.bundleCount}-Pack complete! Ready for ${formatPrice(combo.bundlePrice)}.`);
      } else {
        showComboToast(`✨ Added to ${combo.bundleCount}-Pack (${nextCount}/${combo.bundleCount}). Pick ${combo.bundleCount - nextCount} more!`);
      }
    }
  };

  const handleBuyComboNow = () => {
    addComboToBag();
    navigateTo('/cart');
  };

  const handleBuyNow = () => {
    if (soldOut) return;
    // Case 1: If combo tray already has 2 items, and this piece completes it (makes 3 items):
    if (isComboEligible && combo.slotsFilled === 2 && !inCombo && !comboPieceInCategory(product)) {
      addToCombo(product);
      addComboToBag();
      navigateTo('/cart');
      return;
    }
    // Case 2: If this product is already in the completed 3-pack combo:
    if (isComboEligible && combo.isComplete && inCombo) {
      addComboToBag();
      navigateTo('/cart');
      return;
    }
    // Case 3: If this item is combo eligible, but user has 0 or 1 item in combo:
    // Prompt them so they have the option to get the 3 for ₹999 deal:
    if (isComboEligible && combo.slotsFilled < 2 && !inCombo) {
      setComboPromptOpen(true);
      return;
    }
    // Default buy now behavior:
    if (!bag.some((i) => i.id === product.id)) addToCart(product, qty);
    navigateTo('/cart');
  };

  const scrollToReviews = (e) => { e.preventDefault(); lenisRef.current?.scrollTo(reviewsRef.current, { offset: -20 }); };

  return (
    <div ref={pageRef} className={`relative h-dvh w-full overflow-hidden bg-[#FFF8EE] text-[#111110] ${FONT_CLASS}`}>
      <Seo
        title={product.name}
        description={productDescription(product)}
        path={productPath(product)}
        image={previewImage(product.image)}
        type="product"
        jsonLd={productJsonLd(product, { rating, reviewCount })}
      />

      {/* Soft static colour glows (same palette family as /jewellery). */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_45%_at_10%_10%,#FFE0EA_0%,transparent_70%),radial-gradient(45%_40%_at_95%_25%,#FFF0B8_0%,transparent_70%),radial-gradient(50%_45%_at_60%_100%,#E6DCFA_0%,transparent_70%)]" />

      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden">
        <div ref={scrollContentRef}>
          <div className="sticky top-0 z-40"><LandingHeader transparent={false} /></div>

          <main className="relative mx-auto max-w-[1180px] px-5 pt-[clamp(28px,4vw,56px)] pb-[clamp(48px,7vw,96px)]">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="pd-in truncate font-['Inter',sans-serif] text-[13px] text-[#111110]/55">
              <Link to="/" className="text-inherit no-underline hover:text-[#FF3D8B]">Home</Link>
              <span className="mx-2">/</span>
              <Link to="/jewellery" className="text-inherit no-underline hover:text-[#FF3D8B]">Jewellery</Link>
              {product.categorySlug && (
                <>
                  <span className="mx-2">/</span>
                  <Link to={categoryPath(product.categorySlug)} className="text-inherit no-underline hover:text-[#FF3D8B]">{product.categoryName}</Link>
                </>
              )}
              <span className="mx-2">/</span>
              <span className="text-[#111110]/85">{product.name}</span>
            </nav>

            <div className="mt-5 grid grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-[clamp(24px,4vw,64px)] max-[880px]:grid-cols-1">
              {/* ── Gallery ── */}
              <div className="pd-gal flex gap-3 min-[881px]:sticky min-[881px]:top-[calc(var(--store-header-h)+var(--announce-h,0px)+20px)] min-[881px]:self-start max-[880px]:flex-col-reverse">
                {/* One photo: keep the thumbnail column's width (desktop) so
                    the main image is the same size on every product. */}
                {images.length <= 1 && <div aria-hidden="true" className="w-[clamp(56px,6vw,76px)] shrink-0 max-[880px]:hidden" />}
                {images.length > 1 && (
                  <div className="flex shrink-0 flex-col gap-2.5 max-[880px]:-my-1.5 max-[880px]:flex-row max-[880px]:justify-center max-[880px]:overflow-x-auto max-[880px]:px-1 max-[880px]:py-1.5">
                    {images.map((src, i) => (
                      <button
                        key={src + i}
                        type="button"
                        onClick={() => selectImg(i)}
                        onMouseEnter={() => { if (i !== imgIdx) selectImg(i); }}
                        aria-label={`Show image ${i + 1}`}
                        aria-current={imgIdx === i || undefined}
                        className={`size-[clamp(56px,6vw,76px)] shrink-0 cursor-pointer overflow-hidden rounded-[14px] border-2 bg-white p-0 transition-[border-color,translate] duration-300 ${imgIdx === i ? 'border-[#FF3D8B]' : 'border-transparent hover:-translate-y-0.5 hover:border-[#111110]/20'}`}
                      >
                        <img src={thumbUrl(src, 400)} data-original={src} alt="" className="h-full w-full scale-110 object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Main image — slide track. Zoom only while zoomOn
                    (magnifier button); then the pointer pans it. While
                    zoomed, data-lenis-prevent + touch-action:none let a finger
                    drag pan the photo instead of scrolling the page. */}
                <div
                  ref={frameRef}
                  className={`relative isolate aspect-[4/5] min-w-0 flex-1 overflow-hidden rounded-[clamp(20px,2.4vw,32px)] bg-[#F3E9D2] shadow-[0_30px_60px_-38px_rgba(17,17,16,0.5)] ${zoomOn ? 'cursor-move touch-none' : images.length > 1 ? 'cursor-grab touch-pan-y active:cursor-grabbing' : 'touch-pan-y'}`}
                  data-lenis-prevent={zoomOn || undefined}
                  onPointerMove={zoomOn ? setPan : onSwipeMove}
                  onPointerDown={zoomOn ? setPan : onSwipeDown}
                  onPointerUp={zoomOn ? undefined : onSwipeEnd}
                  onPointerCancel={zoomOn ? undefined : onSwipeEnd}
                >
                  {/* Zoom layer — GSAP scales/pans this one element. */}
                  <div ref={zoomLayerRef} className="absolute inset-0">
                    {/* Slide track — one full-width slide per photo. */}
                    <div ref={trackRef} className="flex h-full w-full will-change-transform">
                      {images.map((src, i) => (
                        <div key={src + i} className="relative h-full w-full shrink-0 overflow-hidden" aria-hidden={i !== imgIdx || undefined}>
                          <img
                            src={src}
                            alt={i === imgIdx ? `${product.name} — image ${i + 1}` : ''}
                            draggable={false}
                            className={`absolute inset-0 h-full w-full scale-110 select-none object-cover ${soldOut ? 'grayscale-[35%]' : ''}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  {tag && (
                    <span className={`absolute top-4 left-4 rounded-full px-3 py-1.5 font-['Inter',sans-serif] text-[12px] font-bold text-white transition-opacity duration-300 ${soldOut ? 'bg-[#111110]' : 'bg-[#FF3D8B] shadow-[0_8px_18px_-8px_rgba(255,61,139,0.9)]'} ${zoomOn ? 'opacity-0' : 'opacity-100'}`}>{tag}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleWishlist(product.id)}
                    aria-pressed={wish}
                    aria-label={wish ? 'Remove from wishlist' : 'Add to wishlist'}
                    className={`absolute top-3 right-3 flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-white/90 shadow-[0_8px_18px_-10px_rgba(17,17,16,0.5)] backdrop-blur-sm transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-90 ${zoomOn ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
                  >
                    <Heart size={20} className={`transition-colors ${wish ? 'text-[#FF3D8B]' : 'text-[#111110]'}`} fill={wish ? 'currentColor' : 'none'} strokeWidth={2} />
                  </button>
                  {/* Zoom hint */}
                  <span aria-hidden="true" className={`pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#111110]/75 px-3.5 py-1.5 font-['Inter',sans-serif] text-[12px] font-semibold whitespace-nowrap text-white backdrop-blur-sm transition-[opacity,translate] duration-400 ${zoomOn ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}>
                    Move to explore
                  </span>
                  {/* Magnifier <-> close (same spot; colour swap + quarter spin). */}
                  <button
                    type="button"
                    onClick={() => (zoomOn ? setZoomOn(false) : openZoom())}
                    aria-pressed={zoomOn}
                    aria-label={zoomOn ? 'Close zoom' : 'Zoom image'}
                    className={`absolute right-3 bottom-3 z-10 flex size-12 cursor-pointer items-center justify-center rounded-full border-0 shadow-[0_10px_22px_-10px_rgba(17,17,16,0.55)] backdrop-blur-sm transition-[background-color,color,scale,rotate] duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3D8B] ${images.length > 1 ? 'max-[880px]:bottom-8' : ''} ${zoomOn ? 'rotate-90 bg-[#111110] text-white' : 'rotate-0 bg-white/90 text-[#111110]'}`}
                  >
                    {zoomOn ? <X size={20} strokeWidth={2.4} className="-rotate-90" /> : <ZoomIn size={20} strokeWidth={2.2} />}
                  </button>
                  {/* Dots (phones) */}
                  {images.length > 1 && (
                    <div className={`absolute inset-x-0 bottom-2 hidden justify-center gap-0.5 transition-opacity duration-300 max-[880px]:flex ${zoomOn ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
                      {images.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => selectImg(i)}
                          aria-label={`Show image ${i + 1}`}
                          className="flex h-5 cursor-pointer items-center border-0 bg-transparent p-0 px-0.5"
                        >
                          <span className={`block h-1.5 rounded-full transition-[width,background-color] duration-300 ${i === imgIdx ? 'w-5 bg-[#FF3D8B]' : 'w-1.5 bg-white/80'}`} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Buy box ── */}
              <div>
                {/* Tagline: Cormorant italic with a pink → plum → gold gradient, just
                    above the name. font-serif-custom beats the page's Grift override. */}
                {short && (
                  <p className="pd-in m-0 mb-2 max-w-[520px]">
                    <span className="font-serif-custom text-[length:clamp(19px,1.6vw,22px)] leading-snug font-semibold tracking-[0.01em] italic bg-[linear-gradient(90deg,#E0306E_0%,#A23E9B_50%,#B07A1E_100%)] bg-clip-text text-transparent [-webkit-text-fill-color:transparent] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">{short}</span>
                  </p>
                )}
                <h1 className="pd-in m-0 text-[length:clamp(28px,3.4vw,46px)] font-bold leading-[1.05] tracking-[-0.01em]">{product.name}</h1>

                <a href="#reviews" onClick={scrollToReviews} className="pd-in mt-3 inline-flex items-center gap-2 font-['Inter',sans-serif] text-[14px] text-[#111110]/75 no-underline hover:text-[#111110]">
                  {reviewCount > 0 ? (
                    <>
                      <Stars value={rating} />
                      <span className="font-semibold text-[#111110]">{rating}</span>
                      <span className="underline underline-offset-2">{reviewCount} review{reviewCount === 1 ? '' : 's'}</span>
                    </>
                  ) : (
                    <>
                      <Stars value={0} />
                      <span className="underline underline-offset-2">{reviews === null ? 'Reviews' : 'Be the first to review'}</span>
                    </>
                  )}
                </a>

                <div className="pd-in mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  {specialPrice ? (
                    <>
                      <span className="text-[length:clamp(26px,2.6vw,34px)] font-bold text-[#E8304F]">{formatPrice(specialPrice)}</span>
                      <s className="font-['Inter',sans-serif] text-[length:clamp(16px,1.5vw,19px)] font-semibold text-[#111110]/45">{formatPrice(product.price)}</s>
                      <span className="rounded-full bg-[#E8F7EE] px-2.5 py-0.5 font-['Inter',sans-serif] text-[12px] font-bold text-[#1E8A4C]">Combo price · any {combo.bundleCount} for {formatPrice(combo.bundlePrice)}</span>
                    </>
                  ) : (
                    <span className="text-[length:clamp(26px,2.6vw,34px)] font-bold">{formatPrice(product.price)}</span>
                  )}
                </div>
                <p className="pd-in m-0 mt-1 font-['Inter',sans-serif] text-[12px] text-[#111110]/55">Inclusive of all taxes</p>


                {/* ── Festive 3-for-₹999 Combo Tray Box ── */}
                {isComboEligible && (
                  <div className="pd-in mt-5 overflow-hidden rounded-[22px] border-2 border-[#E8304F]/25 bg-[linear-gradient(135deg,#FFF5F7_0%,#FFFBF4_100%)] p-4 sm:p-5 shadow-[0_12px_28px_-16px_rgba(232,48,79,0.18)]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E8304F]/25 bg-[#FFE0EA] px-2.5 py-0.5 font-['Inter',sans-serif] text-[11px] font-extrabold uppercase tracking-wider text-[#E8304F]">
                        <Sparkles size={12} className="text-[#E8304F]" /> Navratri Dhamaka
                      </span>
                      <span className="font-['Inter',sans-serif] text-[12px] font-extrabold text-[#1E8A4C]">
                        3 for {formatPrice(combo.bundlePrice)}
                      </span>
                    </div>

                    <div className="mt-2.5">
                      <h3 className="m-0 text-[16px] font-bold text-[#111110]">
                        Pick Any 3 Combo Offer
                      </h3>
                      <p className="m-0 mt-0.5 font-['Inter',sans-serif] text-[13px] leading-snug text-[#111110]/70">
                        Buy this piece alone for {formatPrice(product.price)}, or add it to a 3-pack combo and get all 3 for just <b className="text-[#111110]">{formatPrice(combo.bundlePrice)}</b>!
                      </p>
                    </div>

                    {inFullCombo ? (
                      <div className="mt-3.5 flex flex-wrap items-center gap-2">
                        <p className="m-0 flex w-full items-center gap-2 rounded-[12px] bg-[#F2FBF6] px-3 py-2 font-['Inter',sans-serif] text-[13px] font-semibold text-[#1E8A4C]">
                          <Check size={15} strokeWidth={2.5} className="shrink-0" />
                          {inCombo
                            ? `This piece is in your bag as part of a ${combo.bundleCount}-pack combo.`
                            : `Your ${combo.bundleCount}-pack is already in your bag — check out or remove a piece to start a new one.`}
                        </p>
                        <Link
                          to="/cart"
                          className="inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-[#1E8A4C] bg-[#1E8A4C] px-4 py-2 font-['Inter',sans-serif] text-[13px] font-bold text-white no-underline hover:bg-[#166E3C] transition-colors"
                        >
                          <ShoppingBag size={14} /> View bag
                        </Link>
                        <Link
                          to="/navratri-offers"
                          className="inline-flex items-center justify-center gap-1 rounded-full border border-[#111110]/20 bg-white/90 px-3.5 py-2 font-['Inter',sans-serif] text-[12px] font-bold text-[#111110] no-underline hover:border-[#111110] transition-colors"
                        >
                          See the offer →
                        </Link>
                      </div>
                    ) : (<>
                    {/* 3 Slot Preview */}
                    <div className="mt-3.5 flex items-center gap-2">
                      {Array.from({ length: combo.bundleCount }).map((_, idx) => {
                        const slotItem = combo.items[idx];
                        const isThisItem = slotItem && String(slotItem.id) === String(product.id);
                        return (
                          <div
                            key={idx}
                            className={`relative flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-[12px] transition-all ${
                              slotItem
                                ? isThisItem
                                  ? 'border-2 border-[#E8304F] ring-2 ring-[#E8304F]/25 bg-white shadow-xs'
                                  : 'border-2 border-[#1E8A4C] bg-white shadow-xs'
                                : 'border-2 border-dashed border-[#111110]/20 bg-white/60'
                            }`}
                          >
                            {slotItem ? (
                              <>
                                <img
                                  src={thumbUrl(slotItem.image, 400)} data-original={slotItem.image}
                                  alt={slotItem.name}
                                  className="size-full rounded-[10px] object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeFromCombo(slotItem.id)}
                                  title={`Remove ${slotItem.name}`}
                                  className="absolute -top-1.5 -right-1.5 flex size-4.5 cursor-pointer items-center justify-center rounded-full border-0 bg-[#E8304F] text-white shadow-sm hover:scale-115 transition-transform"
                                >
                                  <X size={10} strokeWidth={3} />
                                </button>
                              </>
                            ) : (
                              <span className="font-['Inter',sans-serif] text-[11px] font-bold text-[#111110]/35">
                                +{idx + 1}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      <div className="ml-1 min-w-0 flex-1">
                        <p className="m-0 font-['Inter',sans-serif] text-[12px] font-bold text-[#111110]">
                          {combo.isComplete
                            ? '🎉 3-Pack is full!'
                            : `${combo.slotsFilled} of ${combo.bundleCount} selected`}
                        </p>
                        <p className="m-0 font-['Inter',sans-serif] text-[11px] text-[#111110]/60">
                          {combo.isComplete
                            ? `Save ${formatPrice(combo.potentialSavings)} on this trio`
                            : `Pick ${combo.bundleCount - combo.slotsFilled} more to unlock ${formatPrice(combo.bundlePrice)}`}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons inside the Festive Combo Box */}
                    <div className="mt-3.5 flex flex-wrap items-center gap-2">
                      {inCombo ? (
                        <button
                          type="button"
                          onClick={() => removeFromCombo(product.id)}
                          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border-2 border-[#1E8A4C] bg-[#1E8A4C] px-4 py-2 font-['Inter',sans-serif] text-[13px] font-bold text-white shadow-xs hover:bg-[#166E3C] transition-colors"
                        >
                          <Check size={15} strokeWidth={2.5} /> In 3-Pack · Remove
                        </button>
                      ) : combo.isComplete ? (
                        <button
                          type="button"
                          onClick={() => swapIntoCombo(product)}
                          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border-2 border-[#111110] bg-transparent px-4 py-2 font-['Inter',sans-serif] text-[13px] font-bold text-[#111110] hover:bg-[#111110] hover:text-white transition-colors"
                        >
                          Swap into 3-Pack
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleAddProductToCombo}
                          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border-2 border-[#E8304F] bg-[#E8304F] px-4 py-2 font-['Inter',sans-serif] text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(232,48,79,0.3)] hover:bg-[#D02442] hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                          <Plus size={15} strokeWidth={2.5} /> Add to 3-Pack
                        </button>
                      )}

                      {combo.isComplete ? (
                        <button
                          type="button"
                          onClick={handleBuyComboNow}
                          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#111110] px-4 py-2 font-['Inter',sans-serif] text-[13px] font-bold text-white hover:bg-[#FF3D8B] transition-colors"
                        >
                          <ShoppingBag size={14} /> Buy 3-Pack ({formatPrice(combo.bundlePrice)}) <ArrowRight size={14} />
                        </button>
                      ) : (
                        <Link
                          to="/navratri-offers"
                          className="inline-flex items-center justify-center gap-1 rounded-full border border-[#111110]/20 bg-white/90 px-3.5 py-2 font-['Inter',sans-serif] text-[12px] font-bold text-[#111110] no-underline hover:border-[#111110] transition-colors"
                        >
                          {combo.slotsFilled > 0
                            ? `Pick ${combo.bundleCount - combo.slotsFilled} more →`
                            : `Browse all ${combo.bundleCount} for ${formatPrice(combo.bundlePrice)} pieces →`}
                        </Link>
                      )}
                    </div>
                    </>)}
                  </div>
                )}

                {/* CTAs */}
                <div className="pd-in mt-6 flex items-stretch gap-3">
                  <button
                    ref={buyBtnRef}
                    type="button"
                    onClick={addToBag}
                    disabled={soldOut}
                    className={`flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border-0 px-4 sm:px-6 py-3.5 text-[15px] sm:text-[16px] font-bold text-white transition-[background-color] duration-300 disabled:cursor-not-allowed disabled:bg-[#111110]/30 ${added ? 'bg-[#1E8A4C]' : 'bg-[#111110] enabled:hover:bg-[#FF3D8B]'}`}
                  >
                    {soldOut ? 'Sold out' : added ? <><Check size={18} strokeWidth={3} /> Added</> : goToBag ? <><ShoppingBag size={18} /> Bag <ArrowRight size={16} /></> : <><ShoppingBag size={18} /> Add to bag</>}
                  </button>
                  {!soldOut && (
                    <BuyNowButton
                      product={product}
                      qty={qty}
                      onClick={handleBuyNow}
                      className="flex min-w-0 flex-1 cursor-pointer items-center justify-center rounded-full border-0 bg-[#F6C915] px-4 sm:px-6 py-3.5 text-[15px] sm:text-[16px] font-bold text-[#111110] transition-[background-color,translate] duration-300 hover:-translate-y-0.5 hover:bg-[#FFD93D]"
                    />
                  )}
                </div>

                {/* Pincode */}
                <PincodeCheck className="pd-in mt-6" />

                {/* Trust badges */}
                <ul className="pd-in m-0 mt-4 grid list-none grid-cols-4 gap-2 p-0 max-[460px]:grid-cols-2">
                  {[
                    [Truck, 'Free delivery', SETTINGS.deliveryFeeEnabled ? `from ${formatPrice(FREE_DELIVERY_THRESHOLD)}` : 'on every order'],
                    [RotateCcw, 'Easy', 'replacements'],
                    COD_ENABLED ? [Banknote, 'Cash on', 'delivery'] : [Banknote, 'UPI, cards', '& wallets'],
                    [ShieldCheck, 'Secure', 'payments'],
                  ].map(([Icon, a, b]) => (
                    <li key={a} className="flex flex-col items-center gap-1 rounded-[14px] bg-white/60 px-2 py-3 text-center">
                      <Icon size={20} className="text-[#FF3D8B]" />
                      <span className="font-['Inter',sans-serif] text-[12px] leading-tight font-semibold">{a}<br /><span className="font-normal text-[#111110]/60">{b}</span></span>
                    </li>
                  ))}
                </ul>

                {/* Accordions */}
                <div className="pd-in mt-6 border-t border-[#111110]/10">
                  {accordion.map((a, i) => {
                    const open = openAcc === i;
                    return (
                      <div key={a.title} className="border-b border-[#111110]/10">
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => setOpenAcc(open ? -1 : i)}
                          className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent py-4 text-left text-[16px] font-bold text-[#111110]"
                        >
                          {a.title}
                          <span className={`relative flex size-7 items-center justify-center rounded-full transition-[background-color,rotate] duration-300 ${open ? 'rotate-180 bg-[#FF3D8B] text-white' : 'bg-[#111110]/5'}`}>
                            <span className="absolute h-[2px] w-3 rounded-full bg-current" />
                            <span className={`absolute h-3 w-[2px] rounded-full bg-current transition-transform duration-300 ${open ? 'rotate-90' : ''}`} />
                          </span>
                        </button>
                        <div className={`grid transition-[grid-template-rows] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                          <div className="overflow-hidden"><RichBody text={a.body} /></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </main>

          {/* ── Complete the look ── pieces of the other types (see `pairs`). */}
          {pairs.length > 0 && (
            <PriceEdit
              scrollRef={scrollRef}
              sectionRef={pairRef}
              title="Complete the look"
              subtitle={`Add ${pairLabel(product)} — made to be worn together.`}
              linkText="View all jewellery"
              linkHref="/jewellery"
              items={pairs}
              imageAspect="aspect-[4/5]"
              titleClassName="text-[length:clamp(28px,3.6vw,48px)] text-[#111110]"
              sectionClassName="pt-0 pb-[clamp(48px,7vw,96px)]"
            />
          )}

          {/* ── You may also like ── shared product row */}
          {related.length > 0 && (
            <PriceEdit
              scrollRef={scrollRef}
              sectionRef={relatedRef}
              title="You may also like"
              linkText={product.categoryName ? `View all ${product.categoryName.toLowerCase()}` : 'View all'}
              linkHref={product.categorySlug ? categoryPath(product.categorySlug) : '/jewellery'}
              items={related}
              imageAspect="aspect-[4/5]"
              titleClassName="text-[length:clamp(28px,3.6vw,48px)] text-[#111110]"
              sectionClassName="pt-0 pb-[clamp(48px,7vw,96px)]"
            />
          )}

          {/* ── Reviews ── last section, after "Complete the look" / "You may also like". */}
          <div className="relative mx-auto max-w-[1180px] px-5 pb-[clamp(56px,8vw,110px)]">
              <section id="reviews" ref={reviewsRef}>
                <h2 className="pd-fade m-0 text-[length:clamp(28px,3.6vw,48px)] font-bold tracking-[-0.01em]">What people say</h2>
                <div className="mt-6 grid grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-[clamp(20px,3vw,40px)] max-[760px]:grid-cols-1">
                  <div className="pd-fade flex flex-col gap-4 self-start">
                    <div className="rounded-[22px] bg-white/80 p-6 shadow-[0_14px_30px_-24px_rgba(17,17,16,0.5)]">
                      <div className="flex items-end gap-3">
                        <span className="text-[56px] leading-none font-bold">{reviewCount ? rating : '–'}</span>
                        <span className="pb-1.5">
                          <Stars value={rating} size={18} />
                          <span className="mt-1 block font-['Inter',sans-serif] text-[13px] text-[#111110]/60">{reviewCount} review{reviewCount === 1 ? '' : 's'}</span>
                        </span>
                      </div>
                      <ul className="m-0 mt-5 flex list-none flex-col gap-2 p-0">
                        {split.map((pct, i) => (
                          <li key={i} className="flex items-center gap-3 font-['Inter',sans-serif] text-[13px]">
                            <span className="w-6 text-[#111110]/70">{5 - i}★</span>
                            <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#111110]/8">
                              <span className="block h-full rounded-full bg-[#F2A900] transition-[width] duration-700" style={{ width: `${pct}%` }} />
                            </span>
                            <span className="w-8 text-right text-[#111110]/60">{pct}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <ReviewForm productId={product.id} reviews={reviews} onAdded={(r) => setReviews((list) => [r, ...(list || [])])} />
                  </div>
                  <ReviewList reviews={approved} />
                </div>
              </section>
          </div>

          <SiteFooter scrollRef={scrollRef} lenisRef={lenisRef} />
          {/* room so the sticky bar never covers the footer's bottom line */}
          <div className="h-20 min-[881px]:hidden" />
        </div>
      </div>

      {/* Sticky buy bar — phones/tablets, once the main button is scrolled past. */}
      <div className={`absolute inset-x-0 bottom-0 z-30 flex items-center gap-2.5 border-t border-[#111110]/10 bg-white/95 px-3.5 py-3 backdrop-blur-md transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] min-[881px]:hidden ${showBar ? 'translate-y-0' : 'translate-y-full'}`}>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-bold">{product.name}</span>
          <div className="flex items-baseline gap-1.5">
            {specialPrice ? (
              <>
                <span className="font-['Inter',sans-serif] text-[13px] font-bold text-[#E8304F]">{formatPrice(specialPrice)}</span>
                <s className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#111110]/45">{formatPrice(product.price)}</s>
                <span className="font-['Inter',sans-serif] text-[11px] font-bold text-[#1E8A4C]">in {combo.bundleCount}-Pack</span>
              </>
            ) : (
              <span className="font-['Inter',sans-serif] text-[13px] font-bold">{formatPrice(product.price)}</span>
            )}
          </div>
        </span>
        {isComboEligible && !inCombo && !combo.isComplete && !soldOut && (
          <button
            type="button"
            onClick={handleAddProductToCombo}
            className="flex cursor-pointer items-center gap-1 rounded-full border-2 border-[#E8304F] bg-[#E8304F] px-3.5 py-2.5 text-[13px] font-bold text-white shadow-xs"
          >
            <Plus size={14} /> 3-Pack
          </button>
        )}
        <button type="button" onClick={addToBag} disabled={soldOut} className={`flex cursor-pointer items-center gap-2 rounded-full border-0 px-4 py-2.5 text-[14px] font-bold text-white disabled:cursor-not-allowed disabled:bg-[#111110]/30 ${added ? 'bg-[#1E8A4C]' : 'bg-[#111110]'}`}>
          {soldOut ? 'Sold out' : added ? <><Check size={16} strokeWidth={3} /> Added</> : goToBag ? <><ShoppingBag size={16} /> Go to bag</> : <><ShoppingBag size={16} /> Add to bag</>}
        </button>
      </div>

      {/* Floating Combo Tray Dock */}
      {combo.slotsFilled > 0 && (
        <div className={`fixed ${showBar ? 'bottom-20' : 'bottom-3'} inset-x-3 sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto sm:max-w-xl z-30 transition-all duration-300 pointer-events-auto`}>
          <div className="flex items-center justify-between gap-3 rounded-full border border-[#E8304F]/30 bg-white/95 px-3.5 sm:px-4 py-2 shadow-[0_12px_36px_-8px_rgba(232,48,79,0.35)] backdrop-blur-md">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#E8304F] text-[11px] font-black text-white">
                {combo.slotsFilled}/{combo.bundleCount}
              </span>
              <span className="hidden xs:inline font-['Inter',sans-serif] text-[12px] font-bold text-[#111110] truncate">
                3-Pack Combo:
              </span>
              <div className="flex items-center gap-1">
                {combo.items.map((it) => (
                  <img key={it.id} src={thumbUrl(it.image, 400)} data-original={it.image} alt={it.name} className="size-6 sm:size-7 rounded-full object-cover border border-[#111110]/15" />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-['Inter',sans-serif] text-[12px] font-black text-[#1E8A4C]">
                {formatPrice(combo.bundlePrice)}
              </span>
              {combo.isComplete ? (
                <button
                  type="button"
                  onClick={handleBuyComboNow}
                  className="rounded-full bg-[#1E8A4C] px-3.5 py-1 text-[11px] sm:text-[12px] font-extrabold text-white cursor-pointer border-0 hover:bg-[#166E3C] shadow-xs"
                >
                  {combo.inBagComplete ? 'In bag · Checkout →' : 'Buy 3-Pack →'}
                </button>
              ) : (
                <Link
                  to="/navratri-offers"
                  className="rounded-full bg-[#E8304F] px-3 py-1 text-[11px] sm:text-[12px] font-extrabold text-white no-underline hover:bg-[#D02442] shadow-xs"
                >
                  Pick {combo.bundleCount - combo.slotsFilled} More →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Combo Toast Notification */}
      {comboToast && (
        <div
          role="status"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-[#E8304F]/30 bg-white/95 px-5 py-2.5 font-['Inter',sans-serif] text-[13px] font-bold text-[#111110] shadow-[0_12px_32px_-8px_rgba(232,48,79,0.35)] backdrop-blur-md animate-[jw-rise_0.3s_cubic-bezier(0.16,1,0.3,1)_both]"
        >
          <Sparkles size={16} className="text-[#E8304F]" />
          <span>{comboToast}</span>
        </div>
      )}

      {/* Navratri Combo Buy Option Modal */}
      {comboPromptOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="combo-offer-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[jw-fade_0.2s_ease-out_both]"
        >
          <div className="relative w-full max-w-[440px] rounded-[28px] border-2 border-[#E8304F]/30 bg-[#FFF8EE] p-6 shadow-[0_24px_50px_-12px_rgba(17,17,16,0.4)] animate-[jw-rise_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
            <button
              type="button"
              onClick={() => setComboPromptOpen(false)}
              aria-label="Close dialog"
              className="absolute top-4 right-4 flex size-8 cursor-pointer items-center justify-center rounded-full border-0 bg-[#111110]/5 text-[#111110]/60 hover:bg-[#FFE0EA] hover:text-[#E8304F] transition-colors"
            >
              <X size={16} />
            </button>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#E8304F]/25 bg-[#FFE0EA] px-3 py-1 font-['Inter',sans-serif] text-[11px] font-extrabold uppercase tracking-wider text-[#E8304F]">
              <Sparkles size={12} className="text-[#E8304F]" /> Festive Dhamaka
            </div>

            <h2 id="combo-offer-title" className="m-0 mt-3 text-[22px] font-extrabold leading-tight text-[#111110]">
              Get 3 Pieces for {formatPrice(combo.bundlePrice)}!
            </h2>

            <p className="m-0 mt-2 font-['Inter',sans-serif] text-[14px] leading-relaxed text-[#111110]/75">
              You are buying <b className="text-[#111110]">{product.name}</b> for {formatPrice(product.price)}. In our Navratri Offer, you can pick any 3 pieces for just <b className="text-[#E8304F]">{formatPrice(combo.bundlePrice)}</b>!
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  addToCombo(product);
                  setComboPromptOpen(false);
                  navigateTo('/navratri-offers');
                }}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-gradient-to-r from-[#E8304F] via-[#FF3D8B] to-[#E8304F] py-3.5 font-['Inter',sans-serif] text-[14px] font-bold text-white shadow-[0_8px_20px_rgba(232,48,79,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Sparkles size={16} /> Get 3 for {formatPrice(combo.bundlePrice)} (Pick 2 More)
              </button>

              <button
                type="button"
                onClick={() => {
                  setComboPromptOpen(false);
                  if (!bag.some((i) => i.id === product.id)) addToCart(product, qty);
                  navigateTo('/cart');
                }}
                className="flex w-full cursor-pointer items-center justify-center rounded-full border border-[#111110]/20 bg-white py-3 font-['Inter',sans-serif] text-[13px] font-bold text-[#111110]/80 hover:bg-[#111110]/5 transition-colors"
              >
                Continue with 1 item for {formatPrice(product.price)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewList({ reviews }) {
  if (reviews === null) {
    return (
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0" aria-busy="true">
        {[0, 1].map((i) => <li key={i} className="h-[120px] animate-pulse rounded-[18px] bg-white/60" />)}
      </ul>
    );
  }
  if (!reviews.length) {
    return (
      <div className="flex flex-col items-start justify-center rounded-[18px] bg-white/60 p-6">
        <p className="m-0 text-[20px] font-bold">No reviews yet.</p>
        <p className="m-0 mt-1 font-['Inter',sans-serif] text-[14px] text-[#111110]/65">Got this piece? Tell everyone how it looks on you.</p>
      </div>
    );
  }
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0">
      {reviews.map((r) => {
        const name = r.customer?.name || 'ZUNUZ customer';
        return (
          <li key={r.id} className="rounded-[18px] bg-white/70 p-5 animate-[jw-rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both]">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-full bg-[#FFE0EA] font-bold text-[#FF3D8B]">{name[0].toUpperCase()}</span>
                <span>
                  <span className="block font-['Inter',sans-serif] text-[14px] font-semibold">{name}</span>
                  <span className="block font-['Inter',sans-serif] text-[12px] text-[#111110]/50">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </span>
              </span>
              <Stars value={r.rating} size={14} />
            </div>
            {r.comment && <p className="m-0 mt-3 font-['Inter',sans-serif] text-[14px] leading-relaxed text-[#111110]/80">{r.comment}</p>}
            {r.image && (
              <a href={r.image} target="_blank" rel="noreferrer" className="mt-3 inline-block overflow-hidden rounded-[12px]">
                <img src={r.image} alt={`Photo from ${name}`} loading="lazy" className="block size-24 object-cover transition-transform duration-500 hover:scale-105" />
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Write a review — signed-in customers, one per product (server-enforced).
function ReviewForm({ productId, reviews, onAdded }) {
  const { customer } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  // Only customers who received this piece can review it — ask up front so
  // everyone else sees a note instead of a form that would be refused.
  const [eligibility, setEligibility] = useState(null);
  const [refused, setRefused] = useState(false);
  const customerId = customer?.id;
  useEffect(() => {
    if (!customerId || !productId) return undefined;
    let alive = true;
    api.get(`/products/${productId}/reviews/eligibility`)
      .then((d) => { if (alive) setEligibility({ id: productId, ...d }); })
      .catch(() => { /* fall back to the form; the server still checks */ });
    return () => { alive = false; };
  }, [customerId, productId]);

  if (!customer) {
    return (
      <Link
        to="/login"
        state={{ returnTo: `${window.location.pathname}#reviews` }}
        className="flex items-center justify-center rounded-full border-2 border-[#111110] px-5 py-3 text-[15px] font-bold text-[#111110] no-underline transition-colors duration-300 hover:bg-[#111110] hover:text-white"
      >
        Log in to write a review
      </Link>
    );
  }
  const mine = reviews?.find((r) => r.customerId === customer.id);
  if (mine?.pending || done === 'pending') {
    return (
      <div role="status" className="flex items-start gap-3 rounded-[18px] bg-[#FFF4CC] p-4 font-['Inter',sans-serif] animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F6C915] text-[15px]">⏳</span>
        <span>
          <span className="block text-[14px] font-semibold text-[#111110]">Your review is awaiting approval</span>
          <span className="mt-0.5 block text-[13px] text-[#111110]/65">Thanks for sharing! It'll appear here once our team has checked it.</span>
        </span>
      </div>
    );
  }
  if (mine || done) {
    return <p className="m-0 rounded-[18px] bg-[#E8F7EE] p-4 font-['Inter',sans-serif] text-[14px] font-semibold text-[#1E8A4C]">Thanks — you've reviewed this piece. 💖</p>;
  }
  const notBuyer = !done && (refused || (eligibility?.id === productId && !eligibility.canReview && !eligibility.reviewed));
  if (notBuyer) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-[18px] bg-white/70 p-4 font-['Inter',sans-serif]">
        <Star size={18} strokeWidth={0} fill="currentColor" className="mt-0.5 shrink-0 text-[#F2A900]" aria-hidden="true" />
        <span>
          <span className="block text-[14px] font-semibold text-[#111110]">Reviews are from verified buyers</span>
          <span className="mt-0.5 block text-[13px] text-[#111110]/65">Once this piece has been delivered to you, you can share your thoughts here.</span>
        </span>
      </div>
    );
  }

  const pick = (e) => {
    const f = e.target.files?.[0];
    setError('');
    if (!f) return;
    if (f.size > MAX_REVIEW_IMAGE) { setError('Photo must be 2 MB or smaller.'); return; }
    setFile(f);
  };
  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { setError('Pick a star rating.'); return; }
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('rating', rating);
      if (comment.trim()) fd.append('comment', comment.trim());
      if (file) fd.append('image', file);
      const res = await fetch(`${API_BASE}/products/${productId}/reviews`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('zunuz_customer_token')}` },
        body: fd,
      });
      const data = await res.json();
      if (res.status === 403) { setRefused(true); return; }
      if (!res.ok) throw new Error(data.error || 'Could not submit review.');
      onAdded(data);
      setDone(data.pending ? 'pending' : true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-[22px] bg-white/80 p-5 shadow-[0_14px_30px_-24px_rgba(17,17,16,0.5)]">
      <p className="m-0 text-[17px] font-bold">Write a review</p>
      <div className="mt-3 flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            aria-pressed={rating === n}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            className="cursor-pointer border-0 bg-transparent p-0.5 transition-transform duration-200 hover:scale-115 active:scale-90"
          >
            <Star size={26} strokeWidth={0} fill="currentColor" className={(hover || rating) >= n ? 'text-[#F2A900]' : 'text-[#111110]/15'} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="How does it look and feel?"
        className="mt-3 w-full resize-none rounded-[14px] border-2 border-[#111110]/12 bg-white px-3.5 py-2.5 font-['Inter',sans-serif] text-[14px] outline-none focus:border-[#111110]"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-1.5 font-['Inter',sans-serif] text-[13px] font-semibold text-[#111110]/70 hover:text-[#FF3D8B]">
          <Camera size={16} /> {file ? file.name.slice(0, 18) : 'Add photo'}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} className="hidden" />
        </label>
        <button type="submit" disabled={busy} className="cursor-pointer rounded-full border-0 bg-[#111110] px-5 py-2.5 font-['Inter',sans-serif] text-[14px] font-semibold text-white transition-colors hover:bg-[#FF3D8B] disabled:opacity-50">
          {busy ? 'Posting…' : 'Post review'}
        </button>
      </div>
      {error && <p role="alert" className="m-0 mt-2 font-['Inter',sans-serif] text-[13px] text-[#E8304F]">{error}</p>}
    </form>
  );
}
