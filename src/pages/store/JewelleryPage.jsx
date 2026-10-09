import { memo, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog, productsIn, isOwnPageOnly } from '../../store/catalog';
import { JEWELLERY_CATEGORY_SLUGS, categoryPath, productPath, formatPrice } from '../../store/catalogConfig';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import useSmoothScroll from '../../hooks/useSmoothScroll';
import { LandingHeader } from '../../components/landing/LandingIntro';
import useHeroIntro from '../../components/landing/useHeroIntro';
import scrollRise from '../../components/landing/scrollRise';
import PriceEdit from '../../components/landing/PriceEdit';
import SiteFooter from '../../components/landing/SiteFooter';
import { getContent } from '../../store/content';

gsap.registerPlugin(ScrollTrigger);

// "The jewellery edit." — the jewellery category landing page (/jewellery).
// Same shell and hero treatment as /test3: its own smooth-scrolling
// container (the app shell keeps #root from scrolling), the branded loading
// screen, the transparent site header, and the shared hero intro
// (loader → photo dissolve → headline/sub-line reveal) — see
// components/landing. Bypasses MainLayout (see App.jsx).
const FONT_CLASS = "font-['Bricolage_Grotesque','Inter',sans-serif]";
// Editable copy (admin → Homepage & Banners) — plain reads from the content
// store, loaded before the app renders (no subscriptions).

// Shared animated background behind every section after the hero (same
// effect as /test3): one `base` wash + three soft glows that float on their
// own, drift with the page scroll, and cross-fade to each section's palette
// as it scrolls in — so sections blend with no seams. One entry per section,
// in page order.
const SECTION_THEMES = [
  { base: '#FDEBEF', glows: ['#F9C6D3', '#FFE3B8', '#E4D4FF'] }, // Shop by category — blush
  { base: '#FFEFE6', glows: ['#FFC9B0', '#FFE8A3', '#FFD1E3'] }, // Trending now — warm coral-peach
  { base: '#FFFBED', glows: ['#FFF1CC', '#FFE4EC', '#E9F6F2'] }, // Jewellery, by budget — light cream (yellow shapes stay visible)
  { base: '#F1ECFF', glows: ['#D9CCFF', '#CDEBFF', '#FFD1EA'] }, // Necklaces — lavender
  { base: '#EAF7F3', glows: ['#C8EEDF', '#FFF0B8', '#D6EAFF'] }, // Earrings — mint
  { base: '#FFF1E6', glows: ['#FFD6BF', '#FFE3EF', '#F4F0B8'] }, // Bracelets — peach
];



// "Jewellery, by budget." cards (same as /test3). Each photo already has its own coloured
// backdrop, so the card is just the photo with the copy laid on top —
// `textClass` is picked per photo for contrast (dark on the pale yellow one).
// Photo + copy come from content 'shared.budget' (card1…3); prices fixed.
const BUDGET_CARDS = [
  { price: 199, textClass: 'text-white' },
  { price: 499, textClass: 'text-[#111110]' },
  { price: 999, textClass: 'text-white' },
];

// "Trending now" section on/off (hidden for now — set true to bring it back).
const SHOW_TRENDING = false;

// Trending now — card fan (scrubbed to scroll, so it plays as smoothly as
// you scroll and rewinds on the way back):
// 1) the heading's words fade from faint grey to ink one by one;
// 2) the middle card flies up from below the stage, spinning and growing
//    into place;
// 3) the other cards burst out from behind it to the left and right
//    (nearest first) into an overlapping, gently tilted arc;
// 4) caption + button fade up.
// Cards are absolutely stacked in the middle of the stage (centred with a
// negative margin, not a CSS translate — GSAP folds `translate` into its own
// xPercent and would drop it on every card it moves); GSAP only moves
// xPercent/yPercent/rotation/scale/opacity. Hovering a fanned card lifts it
// to the front (CSS). Reduced motion: the fan is shown laid out.
// `items`: real products (newest first), 3–7 of them; the middle one is #1.
function TrendingNow({ scrollRef, sectionRef, items }) {
  const FAN_MID = Math.floor(items.length / 2);
  useEffect(() => {
    const section = sectionRef.current;
    const scroller = scrollRef.current;
    if (!section || !scroller) return;
    const cards = Array.from(section.querySelectorAll('.jw-fan-card'));
    const words = section.querySelectorAll('.jw-fan-word');
    const after = section.querySelectorAll('.jw-fan-after');
    // Fan geometry: overlap tighter on phones so all seven fit.
    const spread = window.innerWidth < 640 ? 36 : window.innerWidth < 1000 ? 50 : 62; // % of a card width
    const place = (i) => {
      const d = i - FAN_MID;
      return { xPercent: d * spread, yPercent: Math.abs(d) * 5, rotation: d * 5, scale: 1 - Math.abs(d) * 0.03, opacity: 1 };
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cards.forEach((c, i) => gsap.set(c, place(i)));
      return undefined;
    }

    gsap.set(words, { opacity: 0.15 });
    gsap.set(after, { opacity: 0, y: 18 });
    cards.forEach((c, i) => {
      if (i === FAN_MID) gsap.set(c, { yPercent: 170, rotation: -28, scale: 0.55, opacity: 0 });
      else gsap.set(c, { xPercent: 0, yPercent: 0, rotation: 0, scale: 0.9, opacity: 0 });
    });
    gsap.set(cards, { willChange: 'transform, opacity' });

    const tl = gsap.timeline({
      scrollTrigger: { trigger: section, scroller, start: 'top 85%', end: 'clamp(center 55%)', scrub: 1 },
    });
    tl.to(words, { opacity: 1, duration: 0.5, stagger: 0.25, ease: 'none' }, 0)
      // 2) the hero card flies in from below
      .to(cards[FAN_MID], { yPercent: 0, rotation: 0, scale: 1, opacity: 1, duration: 1.2, ease: 'power3.out' }, 0.2);
    // 3) the rest split out from behind it, nearest first
    cards.forEach((c, i) => {
      if (i === FAN_MID) return;
      const ring = Math.abs(i - FAN_MID);
      tl.to(c, { ...place(i), duration: 1, ease: 'power3.out' }, 1.2 + (ring - 1) * 0.18);
    });
    tl.to(after, { opacity: 1, y: 0, duration: 0.5, stagger: 0.12, ease: 'power2.out' }, '-=0.4');

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
      gsap.set(cards, { clearProps: 'willChange' });
    };
  }, [scrollRef, sectionRef, FAN_MID]);

  const trend = getContent('jewellery.trending');
  return (
    <section ref={sectionRef} className="relative overflow-x-clip px-5 py-[clamp(56px,8vw,110px)] text-center text-[#111110]">
      <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 font-['Inter',sans-serif] text-[12px] font-bold tracking-[0.06em] text-[#E8304F] uppercase shadow-[0_6px_16px_-12px_rgba(232,48,79,0.7)]">
        <span className="relative flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-[#E8304F] opacity-70 motion-reduce:animate-none" />
          <span className="relative size-2 rounded-full bg-[#E8304F]" />
        </span>
        Live
      </span>
      <h2 className="m-0 mt-3 text-[length:clamp(36px,5.6vw,80px)] font-bold leading-[1.02] tracking-[-0.02em]" aria-label={trend.heading}>
        {trend.heading.split(' ').filter(Boolean).map((w, wi) => (
          <span key={wi} aria-hidden="true" className="jw-fan-word mr-[0.25em] inline-block last:mr-0">{w}</span>
        ))}
      </h2>

      {/* Stage: cards stacked at the centre; GSAP fans them out. */}
      <div className="relative mx-auto mt-[clamp(32px,5vw,64px)] h-[calc(clamp(118px,16vw,230px)*1.32)] max-w-[1200px]">
        {items.map((item, i) => {
          const d = Math.abs(i - FAN_MID);
          return (
            <Link
              key={item.id}
              to={productPath(item)}
              aria-label={`${item.name}, ${formatPrice(item.price)}`}
              className="jw-fan-card group/fc absolute top-0 left-1/2 -ml-[calc(clamp(118px,16vw,230px)/2)] block w-[clamp(118px,16vw,230px)] no-underline hover:!z-30 focus-visible:!z-30 focus-visible:outline-none"
              style={{ zIndex: 20 - d }}
            >
              <span className="relative block aspect-square overflow-hidden rounded-[clamp(14px,1.6vw,22px)] border-[3px] border-white bg-[#F3E9D2] shadow-[0_22px_40px_-24px_rgba(17,17,16,0.55)] transition-[translate,box-shadow,scale] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/fc:-translate-y-4 group-hover/fc:scale-[1.06] group-hover/fc:shadow-[0_34px_50px_-26px_rgba(17,17,16,0.6)] group-focus-visible/fc:outline-3 group-focus-visible/fc:outline-offset-4 group-focus-visible/fc:outline-[#FF3D8B]">
                {/* Some photos have baked-in rounded corners — 110% hides them. */}
                <img src={item.image} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full scale-110 object-cover" />
                {i === FAN_MID && (
                  <span className="absolute top-2 left-2 rounded-full bg-[#FF3D8B] px-2.5 py-1 font-['Inter',sans-serif] text-[11px] font-bold text-white">#1</span>
                )}
                {/* Name + price slide up on hover */}
                <span className="absolute inset-x-0 bottom-0 translate-y-full bg-[linear-gradient(to_top,rgba(17,17,16,0.7),transparent)] px-3 pt-6 pb-2.5 text-left text-white transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/fc:translate-y-0">
                  <span className="block truncate font-['Inter',sans-serif] text-[13px] font-semibold">{item.name}</span>
                  <span className="block font-['Inter',sans-serif] text-[13px] font-bold">{formatPrice(item.price)}</span>
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      <p className="jw-fan-after mx-auto mt-[clamp(28px,4vw,52px)] max-w-[460px] font-['Inter',sans-serif] text-[length:clamp(14px,1.3vw,17px)] text-[#111110]/70">
        {trend.caption}
      </p>
      <Link to={trend.buttonLink} className="jw-fan-after group/b mt-5 inline-flex items-center gap-2 rounded-full bg-[#111110] px-6 py-3 text-[15px] font-bold text-white no-underline transition-[background-color,color,translate] duration-300 hover:-translate-y-0.5 hover:bg-[#FF3D8B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3D8B]">
        {trend.buttonLabel} <span aria-hidden="true" className="inline-block transition-transform duration-300 group-hover/b:translate-x-1">→</span>
      </Link>
    </section>
  );
}

// memo: App re-renders on its periodic data refreshes; this page takes no
// props, so memo keeps those from re-rendering it (see Test3Page.jsx).
// Hero photos (WebP copies of /public/jewellery_desk.jpeg / jewellery_mobile.jpeg).
const JEWEL_HERO_IMG = '/jewellery_desk.webp';
const JEWEL_HERO_IMG_M = '/jewellery_mobile.webp';

// "Shop by category" tile photos chosen for this page (WebP copies of
// /public/chain_jewel.png, bracelet_jewel.png, earring_jewel.png).
const CATEGORY_TILE_IMAGES = {
  necklaces: '/chain_jewel.webp',
  bracelets: '/bracelet_jewel.webp',
  earrings: '/earring_jewel.webp',
};

export default memo(JewelleryPage);

function JewelleryPage() {
  const budget = getContent('shared.budget');
  const scrollRef = useRef(null);
  // Single child of scrollRef that Lenis measures (see useSmoothScroll).
  const scrollContentRef = useRef(null);
  const heroRef = useRef(null);
  const loaderRef = useRef(null);

  // lenisRef: the footer's "Back to top" glides via Lenis.
  const lenisRef = useSmoothScroll(scrollRef, scrollContentRef);
  // No loading screen here — the hero just fades in.
  useHeroIntro({ heroRef, loaderRef, scrollRef, posterSrc: window.matchMedia('(orientation: portrait)').matches ? JEWEL_HERO_IMG_M : JEWEL_HERO_IMG, withLoader: false });

  const catalog = useCatalog();
  const categories = useMemo(
    () => catalog.categories
      .filter((c) => JEWELLERY_CATEGORY_SLUGS.includes(c.slug))
      .map((c) => (CATEGORY_TILE_IMAGES[c.slug] ? { ...c, image: CATEGORY_TILE_IMAGES[c.slug] } : c)),
    [catalog.categories],
  );
  const trending = useMemo(
    () => [...catalog.products].filter((p) => p.stock > 0 && !isOwnPageOnly(p)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 7),
    [catalog],
  );
  const rows = useMemo(
    () => categories.map((c) => ({ ...c, items: productsIn(catalog, c.slug).slice(0, 4) })).filter((r) => r.items.length),
    [catalog, categories],
  );
  // Sections appear once the catalogue loads — the page grows, so every
  // scroll animation re-measures (and the background re-binds, see deps).
  const layoutKey = `${catalog.status}:${catalog.products.length}`;
  useEffect(() => {
    if (catalog.status !== 'ready') return undefined;
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [layoutKey, catalog.status]);

  // Pre-decode every photo in the background once the hero has played
  // (same as /test3): otherwise each photo decodes the first time it scrolls
  // into view, which showed as short 50–100ms hitches as sections arrived.
  // Lazy images are switched to eager so they're fetched up front too. One
  // at a time, in idle callbacks, so it never competes with interaction.
  useEffect(() => {
    const root = scrollContentRef.current;
    if (!root) return;
    let cancelled = false;
    const idle = window.requestIdleCallback
      ? (cb) => window.requestIdleCallback(cb, { timeout: 2000 })
      : (cb) => setTimeout(cb, 300);
    const jobs = Array.from(root.querySelectorAll('img')).map((img) => () => {
      if (img.loading === 'lazy') img.loading = 'eager';
      return img.decode();
    });
    const next = () => {
      if (cancelled || !jobs.length) return;
      const job = jobs.shift();
      idle(() => {
        if (cancelled) return;
        Promise.resolve().then(job).catch(() => {}).finally(next);
      });
    };
    const startTimer = setTimeout(next, 4500);
    return () => { cancelled = true; clearTimeout(startTimer); };
  }, []);

  const catsRef = useRef(null);
  const budgetRef = useRef(null);
  const trendRef = useRef(null);
  const bgRef = useRef(null);
  // One ref per product row — each row animates in on its own and is its
  // own colour stop in the shared background.
  const necklacesRef = useRef(null);
  const earringsRef = useRef(null);
  const braceletsRef = useRef(null);
  const rowRefs = [necklacesRef, earringsRef, braceletsRef];

  // Categories:
  // - entrance: tiles pop up in a stagger (rise + scale, slight overshoot)
  //   and their labels follow, once, as the row scrolls into view;
  // - pointer (mouse only): the hovered tile tilts a few degrees toward the
  //   cursor and eases back flat on leave. Hover lift / photo zoom / arrow /
  //   dimming the other tiles are plain CSS.
  // Transforms/opacity only; nothing runs off screen or on touch.
  useEffect(() => {
    const section = catsRef.current;
    const scroller = scrollRef.current;
    if (!section || !scroller) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tiles = section.querySelectorAll('.jw-cat-tile');
    const labels = section.querySelectorAll('.jw-cat-label');
    gsap.set(tiles, { opacity: 0, y: 50, scale: 0.85 });
    gsap.set(labels, { opacity: 0, y: 12 });
    let tl;
    const trigger = ScrollTrigger.create({
      trigger: section,
      scroller,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        tl = gsap.timeline();
        tl.to(tiles, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'back.out(1.6)', stagger: 0.12 })
          .to(labels, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.12 }, 0.3);
      },
    });

    const cleanups = [];
    if (!window.matchMedia('(pointer: coarse)').matches) {
      section.querySelectorAll('.jw-cat-tilt').forEach((el) => {
        gsap.set(el, { transformPerspective: 700 });
        const rx = gsap.quickTo(el, 'rotationX', { duration: 0.5, ease: 'power3.out' });
        const ry = gsap.quickTo(el, 'rotationY', { duration: 0.5, ease: 'power3.out' });
        let rect = null;
        const enter = () => { rect = el.getBoundingClientRect(); };
        const move = (e) => {
          if (!rect) rect = el.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width - 0.5;
          const py = (e.clientY - rect.top) / rect.height - 0.5;
          ry(px * 12);
          rx(-py * 12);
        };
        const leave = () => { rect = null; rx(0); ry(0); };
        el.addEventListener('pointerenter', enter);
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);
        cleanups.push(() => {
          el.removeEventListener('pointerenter', enter);
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerleave', leave);
        });
      });
    }

    return () => {
      trigger.kill();
      tl?.kill();
      cleanups.forEach((fn) => fn());
    };
  }, []);

  // Budget section (same as /test3):
  // - heading/subtitle fade up, then the eyes icon pops in and keeps
  //   glancing side to side;
  // - cards scale in from 0.7 to 1 in a stagger (prices stay static);
  // - the flower and asterisk shapes spin slowly forever and drift at a
  //   different speed from the page as it scrolls (parallax).
  useEffect(() => {
    const section = budgetRef.current;
    const scroller = scrollRef.current;
    if (!section || !scroller) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const heading = section.querySelectorAll('.t3b-fade');
    const eyes = section.querySelector('.t3b-eyes');
    const cards = section.querySelectorAll('.t3b-card');
    const link = section.querySelector('.t3b-link');
    const flower = section.querySelector('.t3b-flower');
    const asterisk = section.querySelector('.t3b-asterisk');

    const unrise = scrollRise(section, scroller, heading);
    gsap.set(eyes, { scale: 0, rotate: -30 });
    gsap.set(cards, { opacity: 0, scale: 0.7, transformOrigin: 'center center' });
    gsap.set(link, { opacity: 0, x: -12 });

    let tl;
    const trigger = ScrollTrigger.create({
      trigger: section,
      scroller,
      start: 'top 75%',
      once: true,
      onEnter: () => {
        tl = gsap.timeline();
        tl.to(eyes, { scale: 1, rotate: 0, duration: 0.7, ease: 'back.out(2.2)' }, 0.3)
          .to(cards, { opacity: 1, scale: 1, duration: 1.2, ease: 'power3.out', stagger: 0.12 }, 0.2)
          .to(link, { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' }, '-=0.4');
        // Eyes keep glancing left/right after they land.
        tl.to(eyes, { rotate: 10, duration: 0.9, ease: 'sine.inOut', repeat: -1, yoyo: true, repeatDelay: 0.8 });
      },
    });

    const spinFlower = gsap.to(flower, { rotate: 360, duration: 40, ease: 'none', repeat: -1 });
    const spinAsterisk = gsap.to(asterisk, { rotate: -360, duration: 30, ease: 'none', repeat: -1 });
    const scrollOpts = { trigger: section, scroller, start: 'top bottom', end: 'bottom top', scrub: true };
    const driftFlower = gsap.fromTo(flower, { y: 60 }, { y: -60, ease: 'none', scrollTrigger: scrollOpts });
    const driftAsterisk = gsap.fromTo(asterisk, { y: -40 }, { y: 40, ease: 'none', scrollTrigger: { ...scrollOpts } });

    return () => {
      unrise();
      trigger.kill();
      tl?.kill();
      [spinFlower, spinAsterisk, driftFlower, driftAsterisk].forEach((t) => { t.scrollTrigger?.kill(); t.kill(); });
    };
  }, []);

  // Shared background: palette cross-fade per section (scrubbed, both
  // directions) + glow drift over the page scroll (idle float is CSS).
  useEffect(() => {
    const scroller = scrollRef.current;
    const bg = bgRef.current;
    const content = scrollContentRef.current;
    const entries = [catsRef, trendRef, budgetRef, necklacesRef, earringsRef, braceletsRef]
      .map((ref, i) => ({ el: ref.current, theme: SECTION_THEMES[i] }))
      .filter((e) => e.el);
    if (!scroller || !bg || !content || !entries.length) return;
    const glows = bg.querySelectorAll('.jw-glow');
    const drifts = bg.querySelectorAll('.jw-glow-drift');

    gsap.set(bg, { backgroundColor: entries[0].theme.base });
    glows.forEach((g, j) => gsap.set(g, { '--c': entries[0].theme.glows[j] }));

    const timelines = entries.slice(1).map(({ el: section, theme: to }, k) => {
      const from = entries[k].theme;
      // The last section's top may never reach 30% (page ends first), so
      // its blend finishes at the bottom of the page instead.
      const isLast = k === entries.length - 2;
      const tl = gsap.timeline({
        scrollTrigger: { trigger: section, scroller, start: 'top 90%', end: isLast ? 'clamp(top 30%)' : 'top 30%', scrub: true },
      });
      // immediateRender:false so each fromTo doesn't stamp its "from" at load.
      tl.fromTo(bg, { backgroundColor: from.base }, { backgroundColor: to.base, ease: 'none', immediateRender: false }, 0);
      glows.forEach((g, j) => {
        tl.fromTo(g, { '--c': from.glows[j] }, { '--c': to.glows[j], ease: 'none', immediateRender: false }, 0);
      });
      return tl;
    });

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const drift = gsap.timeline({
        scrollTrigger: { trigger: content, scroller, start: 'top top', end: 'bottom bottom', scrub: 1.2 },
      });
      drift.fromTo(drifts[0], { xPercent: 0, yPercent: 0 }, { xPercent: 35, yPercent: 55, ease: 'none' }, 0)
        .fromTo(drifts[1], { xPercent: 0, yPercent: 0 }, { xPercent: -40, yPercent: -30, ease: 'none' }, 0)
        .fromTo(drifts[2], { xPercent: 0, yPercent: 0 }, { xPercent: 25, yPercent: -50, ease: 'none' }, 0);
      timelines.push(drift);
    }
    return () => timelines.forEach((tl) => { tl.scrollTrigger?.kill(); tl.kill(); });
  }, [layoutKey]);

  return (
    <div className={`relative h-dvh w-full overflow-hidden bg-[#E8304F] text-white ${FONT_CLASS}`}>
      {/* React 19 hoists this into <head>; the font is only needed here. */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Momo+Signature&display=swap" />

      {/* Shared, viewport-sized background behind every section after the
          hero (the hero's red covers it at the top). Radial-gradient glows,
          not blur() — cheap to animate. Outer div = scroll drift (GSAP),
          inner = idle float (CSS animate-t3-float-*). */}
      <div ref={bgRef} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-[#FDEBEF]">
        <div className="jw-glow-drift absolute -top-[20vmax] -left-[15vmax] size-[70vmax]">
          <div className="jw-glow size-full animate-t3-float-a rounded-full bg-[radial-gradient(circle,var(--c)_0%,transparent_65%)] opacity-90 motion-reduce:animate-none" />
        </div>
        <div className="jw-glow-drift absolute top-[15vh] -right-[25vmax] size-[65vmax]">
          <div className="jw-glow size-full animate-t3-float-b rounded-full bg-[radial-gradient(circle,var(--c)_0%,transparent_65%)] opacity-85 motion-reduce:animate-none" />
        </div>
        <div className="jw-glow-drift absolute -bottom-[30vmax] left-[10vw] size-[75vmax]">
          <div className="jw-glow size-full animate-t3-float-c rounded-full bg-[radial-gradient(circle,var(--c)_0%,transparent_65%)] opacity-80 motion-reduce:animate-none" />
        </div>
      </div>

      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden">
        <div ref={scrollContentRef}>

          {/* ── Hero ── full screen, header floating over the photo. */}
          <section ref={heroRef} className="relative h-dvh overflow-hidden bg-[#F4E7DE] portrait:bg-[#EFE3D7]">
            <div className="t3h-head absolute inset-x-0 top-0 z-10">
              <LandingHeader darkInk /* dark logo/text on the cream photo */ />
            </div>

            {/* "Own it" photo (cream wall). Desktop: wide photo, woman on the
                right, copy on the left. Phones: tall photo, bottom-anchored, copy
                in the clear cream wall above her. */}
            <div
              role="img"
              aria-label="Smiling woman in a black top wearing a gold necklace, bracelet and earrings"
              className="t3h-photo absolute inset-0 bg-[#F4E7DE] portrait:bg-[#EFE3D7] bg-[image:var(--jw-img)] bg-no-repeat bg-cover bg-[position:70%_center] portrait:bg-[image:var(--jw-img-m)] portrait:bg-[length:auto_90%] portrait:bg-[position:center_bottom]"
              style={{ '--jw-img': `url("${JEWEL_HERO_IMG}")`, '--jw-img-m': `url("${JEWEL_HERO_IMG_M}")` }}
            />
            {/* Desktop: soft cream fade at the top (the wall colour) so the dark
                header reads where it crosses her hair. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[clamp(120px,17vh,170px)] bg-[linear-gradient(to_bottom,rgba(244,231,222,0.92)_0%,rgba(244,231,222,0.6)_50%,rgba(244,231,222,0)_100%)] portrait:hidden" />
            {/* Phones: the photo fills the bottom 90%; the strip above is the
                photo's own top colour (#EFE3D7) and this fade hides the join. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[10%] hidden h-[10%] bg-[linear-gradient(to_bottom,#EFE3D7,rgba(239,227,215,0))] portrait:block" />

            {/* Copy — left side, as in the design: script line, huge "OWN IT", sub-line. */}
            <div className="t3h-copy absolute inset-y-0 left-[4%] right-[42%] z-[1] flex flex-col justify-center pt-[clamp(60px,8vh,90px)] portrait:inset-y-auto portrait:top-[calc(clamp(80px,12vh,120px)+var(--announce-h,0px))] portrait:right-5 portrait:left-5 portrait:pt-0">
              <h1 aria-label="Don't just wear it, live it. Own it." className="m-0">
                <span className="-mx-[0.1em] -my-[0.08em] block overflow-hidden px-[0.1em] py-[0.08em]">
                  <span className="t3-line block font-['Momo_Signature',cursive] text-[length:clamp(22px,3vw,52px)] font-normal leading-[1.3] text-[#CB4E4E] portrait:text-[length:clamp(20px,6vw,30px)]">
                    Don&apos;t just wear it live it
                  </span>
                </span>
                <span className="-mx-[0.1em] -my-[0.08em] block overflow-hidden px-[0.1em] py-[0.08em]">
                  <span className="t3-line block whitespace-nowrap text-[length:clamp(72px,11.5vw,210px)] font-black uppercase leading-[0.92] tracking-[-0.02em] text-[#DE8E5D] portrait:text-[length:clamp(72px,24vw,120px)]">
                    Own it
                  </span>
                </span>
              </h1>
              <p className="t3h-sub m-0 mt-[clamp(10px,1.2vw,18px)] text-[length:clamp(15px,1.55vw,28px)] font-semibold text-[#7A6150] portrait:text-[length:clamp(14px,4vw,18px)]">
                Jewellery that makes a statement without saying a word.
              </p>

            </div>
          </section>

          {/* ── Shop by category ── cream band with three category tiles.
              Hovering a tile lifts it, zooms the photo, shows an arrow and
              fades the other tiles back a little — only while a tile itself
              is hovered (via :has), never when the cursor is just over the
              gaps between them. */}
          <section ref={catsRef} className="relative px-5 py-[clamp(48px,7vw,96px)] text-[#111110]">
            <div className="group/row mx-auto flex max-w-[1140px] justify-center gap-[clamp(10px,1.6vw,22px)]">
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  to={categoryPath(cat.slug)}
                  className="group/cat flex w-[clamp(96px,27vw,340px)] flex-col items-center text-[#111110] no-underline jw-cat-link transition-opacity duration-300 group-has-[.jw-cat-link:hover]/row:opacity-55 hover:!opacity-100 focus-visible:!opacity-100 focus-visible:outline-none"
                >
                  <span className="jw-cat-tile block w-full">
                    {/* tilt layer (pointer) — separate from the entrance tween */}
                    <span className="jw-cat-tilt block w-full">
                      <span className="relative isolate block aspect-[466/600] w-full overflow-hidden rounded-[clamp(16px,2vw,28px)] bg-[#F3E9D2] shadow-[0_10px_24px_-18px_rgba(17,17,16,0.4)] transition-[translate,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/cat:-translate-y-2 group-hover/cat:shadow-[0_26px_40px_-22px_rgba(17,17,16,0.5)] group-focus-visible/cat:outline-3 group-focus-visible/cat:outline-offset-4 group-focus-visible/cat:outline-[#FF3D8B]">
                        <img
                          src={cat.image}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 h-full w-full scale-110 object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/cat:scale-[1.18]"
                        />
                        {/* Arrow badge pops in on hover */}
                        <span aria-hidden="true" className="absolute right-[8%] bottom-[8%] flex size-[clamp(28px,2.6vw,40px)] scale-50 items-center justify-center rounded-full bg-[#FF3D8B] text-[clamp(13px,1.1vw,17px)] text-white opacity-0 transition-[opacity,scale] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/cat:scale-100 group-hover/cat:opacity-100">→</span>
                      </span>
                    </span>
                  </span>
                  <span className="jw-cat-label mt-[clamp(10px,1.4vw,18px)] block text-center text-[length:clamp(14px,1.4vw,20px)] font-bold">
                    <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_2px] bg-[position:0_100%] bg-no-repeat pb-0.5 transition-[background-size,color] duration-300 group-hover/cat:bg-[length:100%_2px] group-hover/cat:text-[#FF3D8B]">
                      {cat.name}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* ── Trending now ── */}
          {SHOW_TRENDING && trending.length >= 3 && (
            <TrendingNow key={trending.map((p) => p.id).join()} scrollRef={scrollRef} sectionRef={trendRef} items={trending} />
          )}

          {/* ── Jewellery, by budget ── */}
          <section ref={budgetRef} className="relative overflow-hidden px-5 pt-[clamp(56px,7vw,96px)] pb-[clamp(64px,8vw,110px)] text-[#111110]">
            {/* Decorative shapes sit behind the content (z-0 vs the z-[1] inner
                wrapper). The filter deepens their pale butter-yellow so they
                still read clearly on the light cream background. */}
            <img
              className="t3b-flower pointer-events-none [filter:saturate(3.5)_brightness(0.97)] absolute top-[clamp(80px,11vw,150px)] right-[max(-40px,calc((100%_-_1100px)/2_-_150px))] z-0 w-[clamp(150px,19vw,300px)] select-none will-change-transform"
              src="/pattern1.png" alt="" aria-hidden="true"
            />
            <img
              className="t3b-asterisk pointer-events-none [filter:saturate(3.5)_brightness(0.97)] absolute bottom-5 left-[max(20px,calc((100%_-_1100px)/2_-_90px))] z-0 w-[clamp(90px,12vw,180px)] select-none will-change-transform"
              src="/pattern2.png" alt="" aria-hidden="true"
            />

            <div className="relative z-[1] mx-auto max-w-[1100px]">
              <h2 className="t3b-fade m-0 text-[length:clamp(28px,4.2vw,60px)] font-bold leading-[1.1] tracking-[-0.01em]">
                {budget.heading}
                <img className="t3b-eyes -ml-[0.08em] inline-block h-[1.25em] w-auto align-[-0.28em]" src="/icon1.png" alt="" aria-hidden="true" />
              </h2>
              <p className="t3b-fade mt-[0.5em] text-[length:clamp(16px,1.6vw,24px)] font-medium text-[#4EB8C9]">{budget.subheading}</p>

              {/* Phones: cards become a swipeable strip instead of three tiny columns. */}
              <div className="mt-[clamp(24px,3vw,40px)] grid grid-cols-3 gap-[clamp(12px,1.6vw,22px)] max-[760px]:-mx-5 max-[760px]:flex max-[760px]:snap-x max-[760px]:snap-mandatory max-[760px]:scroll-pl-5 max-[760px]:overflow-x-auto max-[760px]:px-5 max-[760px]:pt-2 max-[760px]:pb-3">
                {BUDGET_CARDS.map((card, ci) => (
                  <Link key={card.price} to={`/shop?tier=${card.price}-plus`} className={`t3b-card group relative isolate block aspect-[466/600] overflow-hidden rounded-[clamp(18px,2vw,28px)] no-underline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#1A6FE8] max-[760px]:shrink-0 max-[760px]:basis-[72%] max-[760px]:snap-start ${card.textClass}`}>
                    {/* The photos have their own rounded corners baked in
                        (transparent PNG corners). Sitting at 110% at rest
                        pushes those outside the card's clip, so the card's own
                        radius is always the visible edge and the card never
                        looks like it grows on hover. */}
                    <img className="absolute inset-0 h-full w-full scale-100 object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]" src={budget[`card${ci + 1}Image`]} alt={`Jewellery from ₹${card.price}`} />
                    <div className="absolute inset-x-0 bottom-0 px-[clamp(16px,1.8vw,26px)] pb-[clamp(18px,2vw,28px)]">
                      <p className="mb-[0.3em] text-[length:clamp(24px,2.6vw,38px)] font-bold leading-none">
                        ₹{card.price}+
                      </p>
                      <p className="m-0 max-w-[32ch] text-[length:clamp(12px,1vw,14px)] font-medium leading-[1.35] opacity-95 max-[760px]:text-[13px]">{budget[`card${ci + 1}Copy`]}</p>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="flex justify-end">
                <Link to="/shop" className="t3b-link group/link mt-[clamp(20px,2.6vw,34px)] inline-flex items-center gap-1.5 text-[length:clamp(16px,1.6vw,22px)] font-bold text-[#1A6FE8] no-underline underline-offset-4 hover:underline">
                  {budget.linkLabel} <span className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/link:translate-x-1.5" aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </section>

          {/* ── Product rows ── Necklaces / Earrings / Bracelets, each a
              shared PriceEdit row (same cards + Quick add as /test3's
              under-₹499 edit), black titles, tighter spacing between rows. */}
          <div className="pb-[clamp(40px,6vw,80px)]">
            {rows.map((row) => (
              <PriceEdit
                key={row.slug}
                scrollRef={scrollRef}
                sectionRef={rowRefs[JEWELLERY_CATEGORY_SLUGS.indexOf(row.slug)]}
                title={row.name}
                linkText={`View all ${row.name.toLowerCase()}`}
                linkHref={categoryPath(row.slug)}
                items={row.items}
                imageAspect="aspect-[4/5]"
                titleClassName="text-[length:clamp(28px,3.6vw,48px)] text-[#111110]"
                sectionClassName="pt-[clamp(28px,4vw,56px)] pb-[clamp(12px,2vw,24px)]"
              />
            ))}
          </div>

          {/* ── Footer ── same as /test3 (shared component). */}
          <SiteFooter scrollRef={scrollRef} lenisRef={lenisRef} />

        </div>
      </div>
    </div>
  );
}
