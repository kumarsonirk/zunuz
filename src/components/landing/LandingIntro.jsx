import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Menu, ShoppingBag, X } from 'lucide-react';
import DesktopNav, { GlassLayer } from '../DesktopNav';
import useIsDesktop from '../../hooks/useIsDesktop';
import { useCart, cartCount } from '../../store/cart';
import { useAuth } from '../../contexts/AuthContext';
import AnnouncementBar from '../store/AnnouncementBar';

const MOBILE_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Festive Glow', path: '/festive-glow' },
  { label: 'Navratri Offers (3 @ ₹999)', path: '/navratri-offers' },
  { label: 'Shop jewellery', path: '/jewellery' },
  { label: 'Necklaces', path: '/necklaces' },
  { label: 'Bracelets', path: '/bracelets' },
  { label: 'Earrings', path: '/earrings' },
  { label: 'Contact us', path: '/customer-care' },
];

// Compact header for < 1024px (the desktop nav's links don't fit there):
// logo · bag (with count) · menu button that drops down the links.
function MobileLandingHeader({ transparent, glass = 1, ink: inkOpacity = 1, cartCount, navigate, customer, darkInk = false }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  const go = (path) => { setOpen(false); navigate(path); };
  // Over a photo the bar turns light while the menu is open so the panel reads.
  const solid = !transparent || open;
  const dark = solid || darkInk; // darkInk: dark logo/icons over a light hero photo
  const ink = dark ? 'text-[#111110]' : 'text-[#F5F2EB]';

  return (
    <div ref={wrapRef} className="relative">
      <header
        style={{ '--ink-o': open ? 1 : inkOpacity }}
        className="relative isolate flex items-center justify-between border-b border-transparent px-5 py-3.5 [&>:not([data-glass])]:opacity-(--ink-o)"
      >
        {/* menu open: always full glass so the panel reads */}
        {solid && <GlassLayer opacity={open ? 1 : glass} />}
        <img
          src={dark ? '/logo_dark.png' : '/logo_white.png'}
          alt="Zunuz"
          onClick={() => go('/')}
          className="h-5 w-auto cursor-pointer object-contain"
        />
        <div className={`flex items-center gap-1 transition-colors duration-300 ${ink}`}>
          <button
            type="button"
            onClick={() => go('/cart')}
            aria-label={`Shopping bag${cartCount ? `, ${cartCount} items` : ''}`}
            className="relative flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-inherit"
          >
            <ShoppingBag size={20} strokeWidth={1.6} />
            {cartCount > 0 && (
              <span className="absolute top-1 right-0.5 flex size-4 items-center justify-center rounded-full bg-[#FC4B4E] text-[9px] font-bold text-white">{cartCount}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-inherit"
          >
            {open ? <X size={22} strokeWidth={1.8} /> : <Menu size={22} strokeWidth={1.8} />}
          </button>
        </div>
      </header>

      {/* Drop-down panel */}
      <div className={`absolute inset-x-0 top-full grid border-b border-white/70 bg-[#FFF8EE]/90 shadow-[0_24px_40px_-24px_rgba(17,17,16,0.4)] backdrop-blur-xl transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0'}`}>
        <nav className="overflow-hidden" aria-label="Main">
          <ul className="m-0 flex list-none flex-col p-0 px-5 pb-5">
            {MOBILE_LINKS.map((l) => (
              <li key={l.path} className="border-b border-[#111110]/8">
                <button
                  type="button"
                  onClick={() => go(l.path)}
                  tabIndex={open ? 0 : -1}
                  className="w-full cursor-pointer border-0 bg-transparent py-3.5 text-left font-['Grift',sans-serif] text-[16px] text-[#111110]"
                >
                  {l.label}
                </button>
              </li>
            ))}
            <li className="flex gap-3 pt-4">
              {customer ? (
                <button
                  type="button"
                  onClick={() => go('/account')}
                  tabIndex={open ? 0 : -1}
                  className="w-full cursor-pointer rounded-full border-0 bg-[#111110] py-3 font-['Grift',sans-serif] text-[15px] font-semibold text-white"
                >
                  My account
                </button>
              ) : (<>
                <button
                  type="button"
                  onClick={() => go('/login')}
                  tabIndex={open ? 0 : -1}
                  className="w-full cursor-pointer rounded-full border-2 border-[#111110]/15 bg-transparent py-3 font-['Grift',sans-serif] text-[15px] font-semibold text-[#111110]"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => go('/signup')}
                  tabIndex={open ? 0 : -1}
                  className="w-full cursor-pointer rounded-full border-0 bg-[#111110] py-3 font-['Grift',sans-serif] text-[15px] font-semibold text-white"
                >
                  Sign up
                </button>
              </>)}
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}

// Shared pieces for the full-screen landing pages (/test3, /jewel):
// the branded loading screen, the transparent site header, and the hero
// intro (loader → photo dissolve → text reveal) + hero scroll parallax —
// the hook lives in ./useHeroIntro.js.
//
// The hero markup is the page's own; this hook finds its parts by class:
//   .t3h-head  header wrapper        .t3h-photo  hero photo layer
//   .t3-line   headline line (inside an overflow-hidden mask)
//   .t3h-sub   sub-lines              .t3h-btn    buttons (optional)
//   .t3h-strip bottom strip (optional) .t3h-copy  copy block (parallax)
// Requires the Qrokinex @font-face (index.css), its preload + the cream
// boot background (index.html), and the `animate-t3-ld-bob` keyframe.

// Same header as the main site (DesktopNav), transparent. This page sits
// outside MainLayout, so it has no app state — the bag badge reads the cart
// straight from the same localStorage key useAppState persists it to.
//
// useNavigate lives HERE, not in the page component, on purpose: it reads the
// router's context, and the router hands out a fresh context value every
// time App re-renders. Context bypasses memo, so a useNavigate call in
// the page made the whole page re-render on every App update (measured:
// 130+ full re-renders in the first seconds, ~80ms each). Here only this
// small header re-renders.
// `transparent` (default) floats over a hero photo; pass false on pages
// with a light background (e.g. the product page) for the dark-ink bar.
// darkInk: the top (clear) header uses dark logo/text — for light hero photos.
// true = everywhere, "mobile" = only the phone header.
export function LandingHeader({ transparent = true, darkInk = false }) {
  const navigate = useNavigate();
  // Live bag (shared cart store) + signed-in customer.
  const cartItems = useCart();
  const { customer } = useAuth();
  const isDesktop = useIsDesktop();
  // Scroll position → --hdr-p (0 at the top … 1 after HEADER_RANGE px),
  // written straight to CSS so the glass follows the scroll with no timed
  // animation and no re-renders. `past` (half-way) only flips which header
  // takes clicks on the hero pages.
  const markRef = useRef(null);
  const past = useHeaderProgress(markRef);
  const bar = (clear, glass, ink) => (isDesktop ? (
    <DesktopNav
      transparent={clear}
      darkInk={clear && darkInk === true}
      glass={glass}
      ink={ink}
      customer={customer}
      cartItems={cartItems}
      onLogoClick={() => navigate('/')}
      onCartClick={() => navigate('/cart')}
    />
  ) : (
    <MobileLandingHeader transparent={clear} darkInk={clear && !!darkInk} glass={glass} ink={ink} cartCount={cartCount(cartItems)} navigate={navigate} customer={customer} />
  ));
  // Announcement strip (admin → Settings) sits above the header; it renders
  // nothing when switched off or dismissed. On the light pages the caller
  // wraps this in a `sticky top-0` div, so strip + bar stay pinned.
  return (
    <>
      <span ref={markRef} hidden />
      <AnnouncementBar />
      {transparent ? (
        <>
          {/* Hero pages: the white header fades out (gone by half-way) while the
              pinned glass header fades in — both by scroll position. */}
          <div inert={past} style={{ opacity: 'calc(1 - var(--hdr-p, 0) * 2)' }}>{bar(true)}</div>
          <FloatingHeader active={past}>{bar(false, 'var(--hdr-p, 0)', 'var(--hdr-p, 0)')}</FloatingHeader>
        </>
      ) : bar(false, 'var(--hdr-p, 0)')}
    </>
  );
}

const HEADER_RANGE = 72; // px of scroll over which the header turns to glass

// Writes the scroll progress of the container holding `markRef` to --hdr-p
// on <html> (once per frame at most) and returns whether it's past half-way.
// Listens in the capture phase (scroll doesn't bubble) and ignores every
// other scroller on the page.
function useHeaderProgress(markRef) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--hdr-p', '0');
    let frame = 0;
    let target = null;
    const apply = () => {
      frame = 0;
      const p = Math.min(1, Math.max(0, target.scrollTop / HEADER_RANGE));
      root.style.setProperty('--hdr-p', p.toFixed(3));
      setPast(p >= 0.5);
    };
    const onScroll = (e) => {
      const el = e.target;
      if (!(el instanceof Element) || !el.contains(markRef.current)) return;
      target = el;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true });
      cancelAnimationFrame(frame);
      root.style.removeProperty('--hdr-p');
    };
  }, [markRef]);
  return past;
}

// The pinned glass header for the hero pages (portalled to <body> so the
// hero's GSAP transforms can't break position: fixed). It's never faded as a
// whole — its glass layer and ink fade via --hdr-p — so the backdrop blur
// keeps working throughout.
function FloatingHeader({ active, children }) {
  return createPortal(
    <div inert={!active} className={`fixed inset-x-0 top-0 z-[60] ${active ? '' : 'pointer-events-none'}`}>
      {children}
    </div>,
    document.body,
  );
}

// The loading screen. Render it as a sibling of the page's scroll container
// (on top of everything) and pass the same ref to useHeroIntro.
export function LandingLoader({ loaderRef }) {
  return (
      <div
      ref={loaderRef}
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="group/ld absolute inset-0 z-[60] flex flex-col items-center justify-center bg-[#FFF8E7] text-[#111110]"
    >
      {/* Everything here is CSS-animated (compositor), so it stays smooth
          while the main thread is busy mounting the page:
          - content fades in once Qrokinex has loaded (data-ready on the
            loader), so the fallback font never shows;
          - letters bob via a CSS keyframe (each letter: mask > bob > inner;
            GSAP only touches the inner span, for the exit lift). */}
      <div aria-hidden="true" className="t3-ld-content flex translate-y-3 font-['Qrokinex','Syncopate',sans-serif] text-[length:clamp(36px,6vw,88px)] leading-[1.05] opacity-0 transition-[opacity,translate] duration-700 ease-out group-data-[ready=true]/ld:translate-y-0 group-data-[ready=true]/ld:opacity-100">
        {'ZUNUZ'.split('').map((ch, i) => (
          <span key={i} className="inline-block overflow-hidden px-[0.02em] py-[0.1em]">
            <span className="inline-block animate-t3-ld-bob motion-reduce:animate-none" style={{ animationDelay: `${i * 0.09}s` }}>
              <span className="t3-ld-inner inline-block">{ch}</span>
            </span>
          </span>
        ))}
      </div>
      <div className="t3-ld-content t3-ld-meta mt-[clamp(20px,3vw,36px)] h-[3px] w-[min(280px,60vw)] overflow-hidden rounded-full bg-[#111110]/10 opacity-0 transition-opacity delay-150 duration-700 group-data-[ready=true]/ld:opacity-100">
        {/* Progress glides between updates via a CSS transition. */}
        <div className="t3-ld-bar h-full w-full origin-left rounded-full bg-[#FF3D8B] transition-transform duration-500 ease-out [transform:scaleX(0)]" />
      </div>
      <p className="t3-ld-content t3-ld-meta t3-ld-pct m-0 mt-3 opacity-0 transition-opacity delay-150 duration-700 group-data-[ready=true]/ld:opacity-100 font-['Inter',sans-serif] text-[12px] font-semibold tracking-[0.2em] text-[#111110]/60">0%</p>
    </div>
  );
}
