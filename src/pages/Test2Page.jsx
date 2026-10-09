import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import useSmoothScroll from '../hooks/useSmoothScroll';
import { Volume2, VolumeX, Plus, Search, ShoppingBag, User, Tag, Gem, ShieldCheck, Heart } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// TEMPORARY: hides the scrolling ticker band right after the hero video.
// Flip back to false (or delete) to bring it back.
const HIDE_MARQUEE = true;

// Scratch page #2 for trying things out — not linked from anywhere, reachable
// only by visiting /test2 directly. Bypasses MainLayout (see App.jsx), same
// as TestPage.jsx, but this one is NOT forced into a mobile phone-frame —
// it's a full-width, desktop-first "agency showcase" layout in the vein of
// award-site templates: big split-text hero, marquee, scroll-triggered image
// reveals, a horizontal snap gallery, a custom cursor and magnetic buttons.
// Original design/content/code throughout — no assets, text, or markup
// copied from any reference site, just the general effect vocabulary
// (mask reveals, stagger text, magnetic hover, marquee) common to the genre.
const GOLD = '#D8B26B';
const INK = '#111110';
const PAPER = '#F5F2EB';
// The overall page background — most sections just sit directly on this.
// The hero, closing CTA, category cards, gallery slides and video reels all
// keep their OWN explicit (usually dark) colors regardless, since each of
// those has its own image/video backing it and needs light text on top of
// that image no matter what the surrounding page background is doing.
const CREAM = '#FDFCF8';

const HERO_BANNER_IMAGES = ['/main_banner1.jpg', '/main_banner2.jpg'];

const SHOWCASE_ITEMS = [
  {
    image: '/neckwear.png',
    index: '01',
    title: 'Neckwear',
    copy: 'One continuous line, tied by hand into a single knot — no clasp, no seam, nothing to catch on a scarf.',
  },
  {
    image: '/earwear.png',
    index: '02',
    title: 'The Hoop Earrings',
    copy: 'Light enough to forget you have them on by lunch, sturdy enough to survive every bag you own.',
  },
  {
    image: '/wristwear.png',
    index: '03',
    title: 'The Link Bracelet',
    copy: 'Each link is set by a person, not a machine — which is exactly why no two chains ever catch the light the same way.',
  },
];

const ZUNUZ_CARE_CARDS = [
  {
    bg: '#FDF0F2', border: '#F6C6D0', shadow: 'rgba(255, 127, 136, 0.4)', title: 'Care',
    body: 'Simple instructions to keep your jewellery looking its best.',
    linkText: 'know more',
  },
  {
    bg: '#FDF6E3', border: '#F0DFA0', shadow: 'rgba(255, 217, 134, 0.4)', title: 'Cover',
    body: 'Your exact 6-month ZUNUZ CARE protection.',
    linkText: 'know more',
  },
  {
    bg: '#EAF4FC', border: '#BFE0F5', shadow: 'rgba(51, 182, 255, 0.4)', title: 'Know your jewellery',
    body: '316L stainless steel + 18K gold plating explained honestly.',
    linkText: 'know more',
  },
  {
    bg: '#EEF1FD', border: '#C9D4F5', shadow: 'rgba(82, 129, 233, 0.4)', title: 'Quick answers',
    list: [
      'Can I wear my jewellery in the shower?',
      'Can I wear it with perfume?',
      'Will the gold colour eventually change?',
    ],
    linkText: 'View answers',
  },
];

const WHY_ZUNUZ_CARDS = [
  {
    color: '#FA6B60', icon: Tag,
    title: 'Clear pricing. Real value.',
    copy: "We keep our pricing simple and make our offers clear so you know exactly what you're paying and what you're getting.",
  },
  {
    color: '#4A83EB', icon: Gem,
    title: "Know what you're buying",
    copy: 'We clearly tell you the material, finish and important product details before you buy.',
  },
  {
    color: '#9B6FDE', icon: Search,
    title: 'Made to be worn',
    copy: 'Jewellery designed for real outfits, real days and regular wear not just special occasions.',
  },
  {
    color: '#3FBF8A', icon: ShieldCheck,
    title: 'ZUNUZ CARE',
    copy: 'Every piece comes with clear care guidance and our ZUNUZ CARE protection, so you know what happens if something goes wrong.',
  },
  {
    color: '#E85A9B', icon: Heart,
    title: 'Choose what you actually like',
    copy: "No rules. No \"you need this season's trend.\" If you like the piece, that's enough.",
  },
];

const OCCASION_SLIDES = [
  { image: '/first_date.png', heading: 'Your FIRST DATE', sub: 'Make a lasting first impression.' },
  { image: '/college_day.png', heading: 'Your COLLEGE DAYS', sub: 'Keep it effortless, every day.' },
  { image: '/every_day.png', heading: 'Your EVERYDAY', sub: 'The pieces you’ll reach for most.' },
  { image: '/next_day.png', heading: '', sub: 'Something special for what’s next.' },
  { image: '/college_day.png', heading: 'Your NIGHTS OUT', sub: 'Made for plans worth dressing up for.' },
];

// For the infinite-loop illusion: a couple of real slides are cloned onto
// each end of the strip, so there's always something to scroll INTO past
// what looks like the first/last slide. A scroll listener (see the effect
// below) silently jumps back into the real range the moment you land on
// one of these clones, with no animation, so the wrap is invisible.
const OCCASION_LOOP_CLONES = 2;
const OCCASION_SLIDES_PADDED = [
  ...OCCASION_SLIDES.slice(-OCCASION_LOOP_CLONES).map((s, i) => ({ ...s, _key: `pre-${i}` })),
  ...OCCASION_SLIDES.map((s, i) => ({ ...s, _key: `real-${i}` })),
  ...OCCASION_SLIDES.slice(0, OCCASION_LOOP_CLONES).map((s, i) => ({ ...s, _key: `post-${i}` })),
];

const MARQUEE_TEXT = 'HANDSET  ·  18K GOLD VERMEIL  ·  MADE TO LAST  ·  SUSTAINABLY SOURCED  ·  ';

const CATEGORY_TILES = [
  { image: '/neckwear.png', label: 'Neckwear', tagline: 'The finishing touch for every look.', textColor: PAPER },
  { image: '/earwear.png', label: 'Earwear', tagline: 'Small details. Big statement.', textColor: PAPER },
  // This last photo's own background is light, where the white text (even
  // with a shadow) was still hard to read — black reads clearly against it.
  { image: '/wristwear.png', label: 'Wristwear', tagline: 'Made to move with you.', textColor: PAPER },
];

const REEL_ITEMS = [
  { poster: '/1.png', video: '/reel1.mp4', caption: 'Getting ready.' },
  { poster: '/2.png', video: '/reel2.mp4', caption: 'The reception look.' },
  { poster: '/3.png', video: '/reel3.mp4', caption: 'Just a Tuesday.' },
  { poster: '/4.png', video: '/reel1.mp4', caption: 'Date night.' },
  { poster: '/5.png', video: '/reel2.mp4', caption: 'Unboxing it.' },
];

// Same footer accordion as TestPage.jsx — reused as-is (same content,
// same expand/collapse mechanic) for consistency between the two scratch
// pages rather than inventing a second footer pattern.
const FOOTER_SECTIONS = [
  { title: 'Shop', items: ['All Products', 'Necklaces', 'Earrings', 'Bracelets'] },
  { title: 'About', items: ['Our Story', 'Why Zunuz'] },
  { title: 'Help', items: ['FAQs', 'Shipping & Returns', 'Contact Us', 'Track Order'] },
  { title: 'Join The Zunuz', items: ['Sign In', 'Create Account', 'Newsletter'] },
];

// lucide-react (this project's version) dropped brand/social icons, so the
// footer's social row uses a small inline SVG instead — same icon as
// TestPage.jsx's FooterInstagramIcon.
const FooterInstagramIcon = ({ size = 20, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

// Splits a heading into one <span> per word, each clipped by an
// overflow-hidden wrapper — the classic "mask reveal" for text: the outer
// span hides anything outside its box, so the inner span can slide up from
// fully below it (translateY(110%) -> 0) and look like it's rising INTO
// view through a slot, rather than just fading in in place.
function SplitWords({ text, style, wordStyle }) {
  const words = text.split(' ');
  return (
    <span style={{ display: 'inline' }}>
      {words.map((word, i) => (
        <span
          key={i}
          className="sw-word"
          style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', marginRight: '0.28em', ...style }}
        >
          <span className="sw-word-inner" style={{ display: 'inline-block', willChange: 'transform', ...wordStyle }}>
            {word}
          </span>
        </span>
      ))}
    </span>
  );
}

export default function Test2Page() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  const pageRef = useRef(null);
  // The app shell gives #root `overflow: hidden; height: 100%` (see
  // index.css) so the real document never scrolls — every page that wants
  // scroll owns its own internal scroll container, same convention
  // TestPage.jsx follows with its scrollContainerRef. Every ScrollTrigger
  // below is pointed at this element via `scroller`, and the fixed-position
  // chrome (nav/cursor/loader/progress bar) intentionally lives OUTSIDE it
  // so it stays pinned to the real viewport regardless of inner scroll.
  const scrollRef = useRef(null);
  // Lenis needs a wrapper (the element that actually scrolls) plus a single
  // content child it measures — this is that child.
  const scrollContentRef = useRef(null);
  const navRef = useRef(null);
  const cursorDotRef = useRef(null);
  const cursorRingRef = useRef(null);
  const progressBarRef = useRef(null);

  const heroRef = useRef(null);
  const heroSliderRef = useRef(null);
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
  const heroLine1Ref = useRef(null);
  const heroLine2Ref = useRef(null);
  const heroSubRef = useRef(null);
  const heroCtaRef = useRef(null);
  const heroScrollCueRef = useRef(null);

  // Auto-advance hero carousel slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % HERO_BANNER_IMAGES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const categoryTileRefs = useRef([]);

  const reelsHeadingRef = useRef(null);
  const reelsRowRef = useRef(null);
  const reelVideoRefs = useRef([]);
  const [playingReel, setPlayingReel] = useState(null);
  const [openFooterSection, setOpenFooterSection] = useState(null);

  const manifestoRef = useRef(null);
  const manifestoWordRefs = useRef([]);

  const showcaseRefs = useRef([]);

  const occasionHeadingRef = useRef(null);
  const occasionRowRef = useRef(null);
  const occasionDotRefs = useRef([]);
  // Before the user's first real touch/drag, the strip renders as a plain,
  // un-looped, start-aligned row (same feel as the Zunuz Unlock strip
  // below) rather than the full centered/looping carousel — see the
  // Occasions effect for why. preEngagedIndexRef remembers which card was
  // nearest at that moment, so the switch-over lands on the same card
  // instead of jumping back to the first one.
  const [occasionEngaged, setOccasionEngaged] = useState(false);
  const preEngagedIndexRef = useRef(0);

  const whyZunuzSectionRef = useRef(null);

  const zunuzCareSectionRef = useRef(null);

  const closingRef = useRef(null);
  const closingButtonRef = useRef(null);

  const footerRef = useRef(null);

  const magneticRefs = useRef([]);

  // Loader — a short, fake progress count-up (no real asset gate; this is a
  // design-only scratch page) purely to set the "curtain rises" mood before
  // any entrance animation plays. Everything below is gated on `loading`
  // being false so nothing starts animating underneath the loader.
  useEffect(() => {
    let raf;
    const start = performance.now();
    const DURATION = 1100;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / DURATION);
      setProgress(Math.round(t * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setLoading(false), 250);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Custom cursor: a small dot glued exactly to the pointer, plus a larger
  // ring that lags slightly behind via a rAF lerp (chasing the dot's
  // position each frame rather than jumping straight to it) so it reads as
  // trailing rather than teleporting. Skipped entirely on touch devices —
  // `pointer: coarse` means there's no persistent cursor to replace, and
  // forcing one on would just leave a static dot stuck wherever the last
  // tap happened.
  useEffect(() => {
    if (loading) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const dot = cursorDotRef.current;
    const ring = cursorRingRef.current;
    if (!dot || !ring) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let raf;

    const onMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      gsap.set(dot, { x: mouseX, y: mouseY });
    };
    window.addEventListener('mousemove', onMove);

    const loop = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      gsap.set(ring, { x: ringX, y: ringY });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const hoverEls = document.querySelectorAll('[data-cursor-hover]');
    const onEnter = () => gsap.to(ring, { scale: 2.4, opacity: 0.4, duration: 0.35, ease: 'power2.out' });
    const onLeave = () => gsap.to(ring, { scale: 1, opacity: 1, duration: 0.35, ease: 'power2.out' });
    hoverEls.forEach((el) => {
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);
    });

    document.body.classList.add('t2-cursor-none');

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
      hoverEls.forEach((el) => {
        el.removeEventListener('mouseenter', onEnter);
        el.removeEventListener('mouseleave', onLeave);
      });
      document.body.classList.remove('t2-cursor-none');
    };
  }, [loading]);

  // Magnetic buttons: while the pointer is within a button's bounds, the
  // button itself drifts a fraction of the way toward it (not a 1:1
  // follow — that would just make it feel glued to the cursor) and eases
  // back to (0,0) the moment the pointer leaves.
  useEffect(() => {
    if (loading) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const cleanups = magneticRefs.current.filter(Boolean).map((el) => {
      const onMove = (e) => {
        const r = el.getBoundingClientRect();
        const relX = e.clientX - (r.left + r.width / 2);
        const relY = e.clientY - (r.top + r.height / 2);
        gsap.to(el, { x: relX * 0.35, y: relY * 0.35, duration: 0.4, ease: 'power2.out' });
      };
      const onLeave = () => gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
      return () => {
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeave);
      };
    });
    return () => cleanups.forEach((fn) => fn());
  }, [loading]);

  // Top scroll-progress bar — a thin line that fills left-to-right as the
  // whole page scrolls, scrubbed directly off document scroll progress.
  useEffect(() => {
    if (loading) return;
    const bar = progressBarRef.current;
    if (!bar) return;
    const trigger = ScrollTrigger.create({
      trigger: scrollRef.current,
      scroller: scrollRef.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => gsap.set(bar, { scaleX: self.progress }),
    });
    return () => trigger.kill();
  }, [loading]);

  // Nav backdrop: transparent (with white logo/links) over the dark hero
  // video, then once scrolled past it onto the cream page body below, picks
  // up a translucent light blurred backdrop and flips the logo/links dark —
  // otherwise "Home / Shop" (and the white logo) go unreadable the instant
  // they land on the light background further down the page.
  useEffect(() => {
    if (loading) return;
    const scroller = scrollRef.current;
    const nav = navRef.current;
    if (!scroller || !nav) return;
    const logo = nav.querySelector('.nav-logo');
    const links = nav.querySelectorAll('.nav-link');
    const onScroll = () => {
      const scrolled = scroller.scrollTop > window.innerHeight * 0.7;
      nav.style.background = scrolled ? 'rgba(253,252,248,0.75)' : 'transparent';
      nav.style.backdropFilter = scrolled ? 'blur(10px)' : 'none';
      if (logo) logo.style.filter = scrolled ? 'invert(1)' : 'none';
      links.forEach((link) => { link.style.color = scrolled ? INK : PAPER; });
    };
    onScroll();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [loading]);

  // Hero entrance: each headline word rises up through its own mask
  // (see SplitWords) in a staggered wave, then the subtext/CTA fade up
  // after, then the scroll cue fades in last so it never competes with the
  // headline for attention. A slow parallax drifts the background video
  // upward as the hero scrolls past, scrubbed to scroll position.
  useEffect(() => {
    if (loading) return;
    const words1 = heroLine1Ref.current?.querySelectorAll('.sw-word-inner');
    const words2 = heroLine2Ref.current?.querySelectorAll('.sw-word-inner');
    if (!words1 || !words2) return;

    gsap.set(words1, { yPercent: 110 });
    gsap.set(words2, { yPercent: 110 });
    gsap.set([heroSubRef.current, heroCtaRef.current], { opacity: 0, y: 18 });
    gsap.set(heroScrollCueRef.current, { opacity: 0 });

    const tl = gsap.timeline({ delay: 0.15 });
    tl.to(words1, { yPercent: 0, duration: 1, ease: 'power4.out', stagger: 0.07 })
      .to(words2, { yPercent: 0, duration: 1, ease: 'power4.out', stagger: 0.07 }, '-=0.75')
      .to(heroSubRef.current, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.4')
      .to(heroCtaRef.current, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.55')
      .to(heroScrollCueRef.current, { opacity: 1, duration: 0.6, ease: 'power2.out' }, '-=0.2');

    return () => {
      tl.kill();
    };
  }, [loading]);

  // Category tiles: simple fade-in effect for category images when they scroll into view.
  useEffect(() => {
    if (loading) return;
    const tiles = categoryTileRefs.current.filter(Boolean);
    if (!tiles.length) return;

    const triggers = tiles.map((tile, i) => {
      const img = tile.querySelector('.cat-image');
      const text = tile.querySelector('.cat-text');
      const btn = tile.querySelector('.cat-btn');

      gsap.set(tile, { opacity: 0, scale: 0.96 });
      gsap.set(img, { opacity: 0 });
      gsap.set([text, btn], { opacity: 0, y: 14 });
      return ScrollTrigger.create({
        trigger: tile,
        scroller: scrollRef.current,
        start: 'top 88%',
        once: true,
        onEnter: () => {
          gsap.timeline({ delay: i * 0.08 })
            .to(tile, { opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' }, 0)
            .to(img, { opacity: 1, duration: 0.8, ease: 'power2.out' }, 0)
            .to(text, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.2)
            .to(btn, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.35);
        },
      });
    });

    const onEnterHover = (img) => gsap.to(img, { scale: 1.06, duration: 0.6, ease: 'power2.out' });
    const onLeaveHover = (img) => gsap.to(img, { scale: 1, duration: 0.6, ease: 'power2.out' });
    const hoverCleanups = tiles.map((tile) => {
      const img = tile.querySelector('.cat-image');
      const enter = () => onEnterHover(img);
      const leave = () => onLeaveHover(img);
      tile.addEventListener('mouseenter', enter);
      tile.addEventListener('mouseleave', leave);
      return () => {
        tile.removeEventListener('mouseenter', enter);
        tile.removeEventListener('mouseleave', leave);
      };
    });

    return () => {
      triggers.forEach((t) => t.kill());
      hoverCleanups.forEach((fn) => fn());
    };
  }, [loading]);

  // Video reels: just the heading reveal — the tiles themselves don't need
  // a scroll trigger, they're driven by playingReel (see the click handler
  // in the JSX below).
  useEffect(() => {
    if (loading) return;
    const heading = reelsHeadingRef.current;
    if (!heading) return;
    gsap.set(heading, { opacity: 0, y: 16 });
    const trigger = ScrollTrigger.create({
      trigger: heading,
      scroller: scrollRef.current,
      start: 'top 85%',
      once: true,
      onEnter: () => gsap.to(heading, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }),
    });
    return () => trigger.kill();
  }, [loading]);

  // Every reel tile is meant to autoplay (muted) the instant it mounts, but
  // the `autoplay` attribute only reliably triggers playback when it's
  // present in HTML the browser parses — React sets it via a property/
  // attribute assignment after the fact, which several browsers just don't
  // treat as a "start playing" signal, leaving every tile sitting paused on
  // its poster frame despite `autoplay` being true. Calling `.play()`
  // explicitly once each tile has enough data is what actually starts it.
  useEffect(() => {
    if (loading) return;
    const cleanups = reelVideoRefs.current.filter(Boolean).map((video) => {
      const tryPlay = () => video.play().catch(() => { });
      if (video.readyState >= 2) { tryPlay(); return () => { }; }
      video.addEventListener('loadeddata', tryPlay, { once: true });
      return () => video.removeEventListener('loadeddata', tryPlay);
    });
    return () => cleanups.forEach((fn) => fn());
  }, [loading]);

  // Manifesto: a short statement where every word starts dim and blurred,
  // then sharpens/brightens one at a time as the section scrolls through
  // the middle of the viewport — scrubbed to scroll position (not a
  // one-shot reveal), so reading pace and animation pace stay locked
  // together no matter how fast or slow someone scrolls.
  useEffect(() => {
    if (loading) return;
    const words = manifestoWordRefs.current.filter(Boolean);
    if (!words.length) return;
    gsap.set(words, { opacity: 0.18, filter: 'blur(4px)' });

    const trigger = ScrollTrigger.create({
      trigger: manifestoRef.current,
      scroller: scrollRef.current,
      start: 'top 75%',
      end: 'bottom 40%',
      scrub: true,
      onUpdate: (self) => {
        const litCount = self.progress * words.length;
        words.forEach((w, i) => {
          const t = Math.max(0, Math.min(1, litCount - i));
          gsap.set(w, { opacity: 0.18 + t * 0.82, filter: `blur(${4 - t * 4}px)` });
        });
      },
    });
    return () => trigger.kill();
  }, [loading]);

  // Showcase rows: each image reveals via a clip-path wipe (hidden behind a
  // vertical curtain that opens left-to-right) while the image itself
  // settles from a slight zoom, and the row's text slides up right after —
  // plays once per row, the moment it scrolls into view.
  useEffect(() => {
    if (loading) return;
    const rows = showcaseRefs.current.filter(Boolean);
    if (!rows.length) return;

    const triggers = rows.map((row) => {
      const img = row.querySelector('.sc-image');
      const text = row.querySelectorAll('.sc-text-el');
      gsap.set(img, { clipPath: 'inset(0 100% 0 0)', scale: 1.18 });
      gsap.set(text, { opacity: 0, y: 24 });

      return ScrollTrigger.create({
        trigger: row,
        scroller: scrollRef.current,
        start: 'top 78%',
        once: true,
        onEnter: () => {
          gsap.timeline()
            .to(img, { clipPath: 'inset(0 0% 0 0)', duration: 1.1, ease: 'power3.inOut' })
            .to(img, { scale: 1, duration: 1.4, ease: 'power2.out' }, 0)
            .to(text, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.12 }, 0.35);
        },
      });
    });

    return () => triggers.forEach((t) => t.kill());
  }, [loading]);

  // Occasions carousel heading: fades in once, independent of whichever
  // mode (pre-engaged or engaged) the strip below it is currently in.
  useEffect(() => {
    if (loading) return;
    const heading = occasionHeadingRef.current;
    if (!heading) return;
    gsap.set(heading, { opacity: 0, y: 16 });
    const trigger = ScrollTrigger.create({
      trigger: heading,
      scroller: scrollRef.current,
      start: 'top 85%',
      once: true,
      onEnter: () => gsap.to(heading, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }),
    });
    return () => trigger.kill();
  }, [loading]);

  // Occasions carousel strip: renders (see the JSX below) as a plain,
  // un-looped, start-aligned row — identical feel to the Zunuz Unlock
  // strip further down — until the user's first real touch/drag, at which
  // point it switches to the full looping, center-snapped carousel this
  // was originally built as. Trying to fake that "start-aligned" look by
  // just nudging scrollLeft off-center on the ALREADY-looping/centered
  // markup didn't hold up: with scroll-snap active, the browser kept
  // correcting it straight back to centered (worse once scrollSnapStop:
  // 'always' was added for the "swiping too fast" fix below, but it
  // happened even without that). Rendering two genuinely different
  // layouts and switching between them on first touch is what actually
  // sticks — and since the switch happens on pointerdown, before any drag
  // movement, there's nothing to visibly jump yet.
  useEffect(() => {
    if (loading) return;
    const row = occasionRowRef.current;
    const dots = occasionDotRefs.current.filter(Boolean);
    if (!row) return;

    const CARD_STEP = 280 + 16; // card width + gap
    const total = OCCASION_SLIDES.length;
    const firstRealIndex = OCCASION_LOOP_CLONES;
    const lastRealIndex = OCCASION_LOOP_CLONES + total - 1;

    if (!occasionEngaged) {
      // Pre-engagement: just remember which card is nearest (so the
      // switch below can pick up from the same spot) and hand off to the
      // full carousel the moment a real touch/drag starts.
      const onScroll = () => {
        preEngagedIndexRef.current = Math.max(0, Math.min(total - 1, Math.round(row.scrollLeft / CARD_STEP)));
      };
      const onPointerDown = () => setOccasionEngaged(true);
      row.addEventListener('scroll', onScroll, { passive: true });
      row.addEventListener('pointerdown', onPointerDown, { passive: true });
      return () => {
        row.removeEventListener('scroll', onScroll);
        row.removeEventListener('pointerdown', onPointerDown);
      };
    }

    // Engaged: land centered on whichever card was showing right before
    // the switch, not back at the first slide.
    row.scrollLeft = (firstRealIndex + preEngagedIndexRef.current) * CARD_STEP;

    const setActiveDot = (paddedIdx) => {
      const realIdx = ((paddedIdx - firstRealIndex) % total + total) % total;
      dots.forEach((d, i) => {
        d.style.background = i === realIdx ? GOLD : 'rgba(245,242,235,0.3)';
        d.style.width = i === realIdx ? '22px' : '8px';
      });
    };
    setActiveDot(firstRealIndex + preEngagedIndexRef.current);

    let settleTimer = null;
    const onScroll = () => {
      const idx = Math.round(row.scrollLeft / CARD_STEP);
      setActiveDot(idx);
      // Debounced: only check for a loop-jump once scrolling has actually
      // stopped, so a jump never fires mid-gesture and fights the user's
      // own scroll momentum.
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        const settledIdx = Math.round(row.scrollLeft / CARD_STEP);
        if (settledIdx < firstRealIndex) {
          row.scrollLeft = (settledIdx + total) * CARD_STEP;
        } else if (settledIdx > lastRealIndex) {
          row.scrollLeft = (settledIdx - total) * CARD_STEP;
        }
      }, 150);
    };
    row.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      row.removeEventListener('scroll', onScroll);
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, [loading, occasionEngaged]);

  // Zunuz Care: heading + the 4 care cards fade/stagger in together, same
  // recipe as the Why Zunuz USP cards above.
  useEffect(() => {
    if (loading) return;
    const section = zunuzCareSectionRef.current;
    if (!section) return;
    const els = Array.from(section.querySelectorAll('.zc-fade-el'));
    const heading = section.querySelector('h2');
    const cards = els.filter((el) => el !== heading);
    gsap.set(heading, { opacity: 0, y: 24 });
    gsap.set(cards, { opacity: 0, x: 60 });
    const trigger = ScrollTrigger.create({
      trigger: section,
      scroller: scrollRef.current,
      start: 'top 85%',
      once: true,
      onEnter: () => gsap.timeline()
        .to(heading, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' })
        .to(cards, { opacity: 1, x: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1 }, 0.15),
    });
    return () => trigger.kill();
  }, [loading]);

  // Why Zunuz: heading + the 5 USP cards fade/stagger in together, same
  // recipe as every other simple reveal section in this file.
  useEffect(() => {
    if (loading) return;
    const section = whyZunuzSectionRef.current;
    if (!section) return;
    const els = Array.from(section.querySelectorAll('.wz-fade-el'));
    const heading = section.querySelector('h2');
    const cards = els.filter((el) => el !== heading);
    gsap.set(heading, { opacity: 0, y: 24 });
    gsap.set(cards, { opacity: 0, x: 60 });
    const trigger = ScrollTrigger.create({
      trigger: section,
      scroller: scrollRef.current,
      start: 'top 85%',
      once: true,
      onEnter: () => gsap.timeline()
        .to(heading, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' })
        .to(cards, { opacity: 1, x: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1 }, 0.15),
    });
    return () => trigger.kill();
  }, [loading]);

  // Closing CTA: heading + magnetic button fade up once, background image
  // gets the same slow zoom-settle used by the hero video.
  useEffect(() => {
    if (loading) return;
    const section = closingRef.current;
    if (!section) return;
    const heading = section.querySelectorAll('.cl-el');
    gsap.set(heading, { opacity: 0, y: 24 });
    const trigger = ScrollTrigger.create({
      trigger: section,
      scroller: scrollRef.current,
      start: 'top 70%',
      once: true,
      onEnter: () => gsap.to(heading, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out', stagger: 0.15 }),
    });
    return () => trigger.kill();
  }, [loading]);

  // Smooth wheel/trackpad scrolling of the page's own scroll container.
  useSmoothScroll(scrollRef, scrollContentRef, !loading);

  // Hero: the banner slider settles in from a slight zoom as the loader
  // lifts, the scroll cue fades up after it, and while the hero scrolls
  // away the slider drifts down at a slower rate than the page (parallax).
  useEffect(() => {
    if (loading) return;
    const hero = heroRef.current;
    const slider = heroSliderRef.current;
    if (!hero || !slider) return;
    const cue = heroScrollCueRef.current;
    const intro = gsap.fromTo(slider, { scale: 1.15 }, { scale: 1, duration: 2, ease: 'power3.out' });
    const cueIntro = cue
      ? gsap.fromTo(cue, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.9, ease: 'power2.out' })
      : null;
    const parallax = gsap.to(slider, {
      yPercent: 20,
      ease: 'none',
      scrollTrigger: { trigger: hero, scroller: scrollRef.current, start: 'top top', end: 'bottom top', scrub: true },
    });
    return () => {
      intro.kill();
      cueIntro?.kill();
      parallax.scrollTrigger?.kill();
      parallax.kill();
    };
  }, [loading]);

  // Occasions cards: glide in from the right in a stagger the first time
  // the strip scrolls into view.
  useEffect(() => {
    if (loading) return;
    const row = occasionRowRef.current;
    if (!row) return;
    const cards = Array.from(row.children);
    gsap.set(cards, { opacity: 0, x: 80 });
    const trigger = ScrollTrigger.create({
      trigger: row,
      scroller: scrollRef.current,
      start: 'top 85%',
      once: true,
      onEnter: () => gsap.to(cards, { opacity: 1, x: 0, duration: 1, ease: 'power3.out', stagger: 0.1 }),
    });
    // Only runs on first load — once the user engages the carousel it
    // re-renders fresh, fully visible cards.
    return () => trigger.kill();
  }, [loading]);

  // Video reels: tiles rise and scale up into place in a stagger.
  useEffect(() => {
    if (loading) return;
    const row = reelsRowRef.current;
    if (!row) return;
    const tiles = Array.from(row.children);
    gsap.set(tiles, { opacity: 0, y: 60, scale: 0.94 });
    const trigger = ScrollTrigger.create({
      trigger: row,
      scroller: scrollRef.current,
      start: 'top 85%',
      once: true,
      onEnter: () => gsap.to(tiles, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out', stagger: 0.1 }),
    });
    return () => trigger.kill();
  }, [loading]);

  // Closing CTA image: zooms out and drifts into place, scrubbed to scroll,
  // as the banner travels up through the viewport. The scale leaves enough
  // overscan that the yPercent drift never exposes an edge.
  useEffect(() => {
    if (loading) return;
    const img = closingRef.current?.querySelector('.cl-image');
    if (!img) return;
    const tween = gsap.fromTo(img, { scale: 1.2, yPercent: -6 }, {
      scale: 1,
      yPercent: 0,
      ease: 'none',
      scrollTrigger: { trigger: img.parentElement, scroller: scrollRef.current, start: 'top bottom', end: 'bottom bottom', scrub: true },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [loading]);

  // Footer: accordion rows, social icon and copyright fade up one after
  // another.
  useEffect(() => {
    if (loading) return;
    const footer = footerRef.current;
    if (!footer) return;
    const items = Array.from(footer.children);
    gsap.set(items, { opacity: 0, y: 20 });
    const trigger = ScrollTrigger.create({
      trigger: footer,
      scroller: scrollRef.current,
      start: 'top 92%',
      once: true,
      onEnter: () => gsap.to(items, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.08 }),
    });
    return () => trigger.kill();
  }, [loading]);

  return (
    <div
      ref={pageRef}
      style={{
        width: '100%',
        height: '100dvh',
        background: CREAM,
        color: INK,
        fontFamily: "'Inter', sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Loader ── */}
      {loading && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200, background: CREAM,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px',
          }}
        >
          {/* logo_white.png is the only logo asset in this project — inverted
              here since it's sitting on the light loader background now. */}
          <img src="/logo_white.png" alt="Zunuz" style={{ height: 'clamp(28px, 5vw, 40px)', width: 'auto', filter: 'invert(1)' }} />
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', letterSpacing: '0.2em', color: GOLD }}>
            {progress}%
          </div>
        </div>
      )}

      {/* ── Custom cursor ── */}
      <div
        ref={cursorDotRef}
        style={{
          position: 'fixed', top: 0, left: 0, width: '8px', height: '8px', borderRadius: '50%',
          background: GOLD, pointerEvents: 'none', zIndex: 150, transform: 'translate(-50%, -50%)', mixBlendMode: 'difference',
        }}
      />
      <div
        ref={cursorRingRef}
        style={{
          position: 'fixed', top: 0, left: 0, width: '36px', height: '36px', borderRadius: '50%',
          border: `1px solid ${GOLD}`, pointerEvents: 'none', zIndex: 150, transform: 'translate(-50%, -50%)',
        }}
      />

      {/* ── Scroll progress bar ── */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '2px', background: 'rgba(245,242,235,0.1)', zIndex: 140 }}>
        <div ref={progressBarRef} style={{ width: '100%', height: '100%', background: GOLD, transform: 'scaleX(0)', transformOrigin: 'left' }} />
      </div>

      {/* ── Nav ── */}
      <nav ref={navRef} style={{
        position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 130,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'clamp(16px, 3vw, 28px) clamp(20px, 4vw, 48px)', boxSizing: 'border-box',
        background: 'transparent', backdropFilter: 'none', transition: 'background 0.35s ease, backdrop-filter 0.35s ease',
      }}>
        {/* Starts white (matching the dark hero video behind it) and flips to
            the inverted/dark variant once scrolled onto the cream page body
            below — see the nav-backdrop effect, which toggles this same
            filter/color set on scroll. */}
        <img className="nav-logo" src="/logo_white.png" alt="Zunuz" style={{ height: 'clamp(18px, 2.4vw, 24px)', width: 'auto' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(30px, 2.4vw, 22px)' }}>
          <button type="button" aria-label="Search" data-cursor-hover className="nav-link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: PAPER, display: 'flex' }}>
            <Search size={19} strokeWidth={1.75} />
          </button>
          <a href="/cart" aria-label="Bag" data-cursor-hover className="nav-link" style={{ color: PAPER, textDecoration: 'none', display: 'flex' }}>
            <ShoppingBag size={19} strokeWidth={1.75} />
          </a>
          <a href="/account" aria-label="Account" data-cursor-hover className="nav-link" style={{ color: PAPER, textDecoration: 'none', display: 'flex' }}>
            <User size={19} strokeWidth={1.75} />
          </a>
        </div>
      </nav>

      {/* ── Everything below is the page's own scroll container (see the
          scrollRef comment above for why) ── */}
      <div ref={scrollRef} data-t2-scroll style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <div ref={scrollContentRef}>

        {/* ── Hero ── */}
        <section ref={heroRef} style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden' }}>
          {/* Hero Image Carousel Slider */}
          <div
            ref={heroSliderRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
            }}
          >
            {HERO_BANNER_IMAGES.map((imgSrc, index) => (
              <div
                key={imgSrc}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: index === currentHeroSlide ? 1 : 0,
                  transition: 'opacity 1.4s ease-in-out',
                  willChange: 'opacity',
                }}
              >
                <img
                  src={imgSrc}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Dark Overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)' }} />

          {/* Carousel Slide Indicators */}
          <div
            style={{
              position: 'absolute',
              bottom: '32px',
              right: 'clamp(20px, 5vw, 64px)',
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {HERO_BANNER_IMAGES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentHeroSlide(i)}
                aria-label={`Slide ${i + 1}`}
                data-cursor-hover
                style={{
                  width: i === currentHeroSlide ? '28px' : '8px',
                  height: '8px',
                  borderRadius: '999px',
                  background: i === currentHeroSlide ? GOLD : 'rgba(255,255,255,0.4)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.4s ease',
                }}
              />
            ))}
          </div>

          <div style={{
            position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'flex-start', justifyContent: 'center', padding: '0 clamp(20px, 5vw, 64px)', boxSizing: 'border-box',
            color: PAPER,
          }}>
            {/* <a
              ref={heroCtaRef}
              href="/products"
              data-cursor-hover
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '14px 28px', borderRadius: '999px',
                border: `1px solid ${GOLD}`, color: PAPER, textDecoration: 'none',
                fontFamily: "'Inter', sans-serif", fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase',
              }}
            >
              Enter the collection
            </a> */}
          </div>
          <div ref={heroScrollCueRef} style={{
            position: 'absolute', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
            fontFamily: "'Inter', sans-serif", fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(245,242,235,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2
          }}>
            Scroll
            <span style={{ width: '1px', height: '28px', background: 'rgba(245,242,235,0.5)', animation: 't2-cue 1.6s ease-in-out infinite' }} />
          </div>
        </section>

        {/* ── Marquee ── */}
        {!HIDE_MARQUEE && (
          <div style={{ background: GOLD, color: INK, padding: '18px 0', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div style={{ display: 'inline-flex', animation: 't2-marquee 22s linear infinite' }}>
              {[0, 1].map((rep) => (
                <span key={rep} style={{ fontFamily: "'Inter', sans-serif", fontSize: 'clamp(13px, 1.6vw, 18px)', letterSpacing: '0.1em', paddingRight: '0.6em' }}>
                  {MARQUEE_TEXT.repeat(4)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Showcase rows ── */}
        {/* <section style={{ padding: '0px', boxSizing: 'border-box' }}>
          {SHOWCASE_ITEMS.map((item, i) => (
            <div
              key={item.title}
              ref={(el) => { showcaseRefs.current[i] = el; }}
              style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'clamp(24px, 5vw, 64px)',
                padding: 'clamp(40px, 8vw, 80px) 0', flexDirection: i % 2 === 1 ? 'row-reverse' : 'row',
              }}
            >
              <div style={{ flex: '1 1 380px', minWidth: '280px', aspectRatio: '4 / 5', overflow: 'hidden', position: 'relative' }}>
                <img
                  className="sc-image"
                  src={item.image}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ flex: '1 1 320px', minWidth: '260px' }}>
                <div className="sc-text-el" style={{ fontFamily: "'Inter', sans-serif", fontSize: '12px', letterSpacing: '0.16em', color: GOLD, marginBottom: '18px' }}>
                  {item.index}
                </div>
                <h3 className="sc-text-el" style={{ fontFamily: "'Inter', sans-serif", margin: '0 0 18px', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 500 }}>
                  {item.title}
                </h3>
              </div>
            </div>
          ))}
        </section> */}

        {/* ── Shop by category ── */}
        <section style={{ padding: '40px 0', boxSizing: 'border-box' }}>
          {/* These source images are exactly 430x500 — rather than deriving the
            card's box from a responsive aspect-ratio/percentage formula (and
            risking the crop/composition shifting across screen sizes), the
            card is pinned to that native size directly (capped by maxWidth
            so it still fits inside anything narrower than 430px) so it's
            genuinely the same image, same crop, on every phone. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '16px', justifyItems: 'center' }}>
            {CATEGORY_TILES.map((tile, i) => (
              <a
                key={tile.label}
                href="/products"
                data-cursor-hover
                ref={(el) => { categoryTileRefs.current[i] = el; }}
                style={{
                  position: 'relative', display: 'block', width: '430px', maxWidth: '100%', height: '500px',
                  overflow: 'hidden', textDecoration: 'none',
                }}
              >
                <img className="cat-image" src={tile.image} alt={tile.label} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, }} />
                <div className="cat-text" style={{ position: 'absolute', top: '32px', left: 0, right: 0, textAlign: 'center', padding: '0 24px' }}>
                  <h3 style={{ margin: '0 0 8px', fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: '32px', color: tile.textColor, textShadow: 'rgb(17 17 16/20%) 5px 5px 10px' }}>
                    {tile.label}
                  </h3>
                  <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: '18px', fontWeight: 500, color: tile.textColor, opacity: 1, textShadow: 'rgb(17 17 16 /20%) 5px 5px 10px' }}>
                    {tile.tagline}
                  </p>
                </div>
                <span className="cat-btn" style={{
                  position: 'absolute', left: '50%', bottom: '28px', transform: 'translateX(-50%)',
                  padding: '12px 26px', borderRadius: '999px', background: INK, color: PAPER,
                  fontFamily: "'Inter', sans-serif", fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap',
                }}>
                  Shop {tile.label}
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* ── Manifesto ── */}
        <section ref={manifestoRef} style={{ padding: '40px clamp(20px, 8vw, 120px)', boxSizing: 'border-box' }}>
          <p style={{
            fontFamily: "'Inter', sans-serif", margin: 0, maxWidth: '980px', fontSize: 'clamp(24px, 4vw, 46px)', lineHeight: 1.35, fontWeight: 500,
          }}>
            {'For every version of you. Discover pieces that fit every part of your life.'
              .split(' ')
              .map((word, i) => (
                <span
                  key={i}
                  ref={(el) => { manifestoWordRefs.current[i] = el; }}
                  style={{ marginRight: '0.28em', display: 'inline-block' }}
                >
                  {word}
                </span>
              ))}
          </p>
        </section>

        {/* ── Occasions carousel ── */}
        <section style={{ padding: '40px 0', boxSizing: 'border-box' }}>
          <h2
            ref={occasionHeadingRef}
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, margin: '0 0 32px', padding: '0 clamp(20px, 6vw, 80px)', fontSize: 'clamp(28px, 5vw, 56px)' }}
          >
            Dressed for the moment.
          </h2>
          {/* Two genuinely different layouts, not one layout faked into two
            looks: before the first real touch/drag (!occasionEngaged), a
            plain start-aligned strip with the SAME padding as the Zunuz
            Unlock strip below, no loop clones. The moment that first touch
            happens, it switches to the full looping/center-snapped
            version — side padding `calc(25% - 80px)`, scrollPadding
            matching so snap doesn't scroll past it (same fix the reels row
            needed), and the clone-padded slide list for the loop. */}
          <div
            ref={occasionRowRef}
            style={occasionEngaged ? {
              display: 'flex', gap: '16px', overflowX: 'auto', scrollSnapType: 'x mandatory',
              padding: '0 calc(25% - 80px) 12px', scrollPadding: '0 calc(25% - 80px)',
              WebkitOverflowScrolling: 'touch',
            } : {
              display: 'flex', gap: '16px', overflowX: 'auto', scrollSnapType: 'x mandatory',
              padding: '0 clamp(20px, 6vw, 80px) 12px', scrollPaddingLeft: 'clamp(20px, 6vw, 80px)',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {(occasionEngaged ? OCCASION_SLIDES_PADDED : OCCASION_SLIDES).map((slide, i) => (
              <div
                key={occasionEngaged ? slide._key : `pre-${i}`}
                style={{
                  position: 'relative', flex: '0 0 280px', width: '280px', height: '500px',
                  // scrollSnapStop:'always' is the "harder to slide" fix — by
                  // default a fast fling can sail past several snap points
                  // and land 3-4 cards away; this forces the browser to stop
                  // at every single card regardless of fling speed, so one
                  // swipe reliably moves one slide instead of feeling like it
                  // "goes too fast".
                  scrollSnapAlign: occasionEngaged ? 'center' : 'start', scrollSnapStop: 'always',
                  overflow: 'hidden', borderRadius: '4px',
                }}
              >
                <img src={slide.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 45%)' }} />
                <div style={{ position: 'absolute', left: '18px', right: '18px', bottom: '20px', textAlign: 'center' }}>
                  <p style={{
                    margin: '0 0 6px', fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '13px',
                    letterSpacing: '0.08em', color: GOLD,
                  }}>
                    {slide.heading}
                  </p>
                  <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: '15px', color: PAPER }}>
                    {slide.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Zunuz Care ── */}
        <section ref={zunuzCareSectionRef} style={{ padding: '40px 0', boxSizing: 'border-box' }}>
          <h2
            className="zc-fade-el"
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, margin: '0 0 32px', padding: '0 clamp(20px, 6vw, 80px)', fontSize: 'clamp(22px, 5vw, 56px)' }}
          >
            <span style={{ fontWeight: 700 }}>Zunuz Care.</span> Extra care for the pieces you love.
          </h2>
          <div
            style={{
              display: 'flex', gap: '16px', overflowX: 'auto', scrollSnapType: 'x mandatory',
              // Extra top/bottom padding (beyond the usual scroll-strip padding)
              // gives the cards' soft box-shadow room to render — overflow-x:
              // auto forces overflow-y to auto too, so a shadow bleeding past
              // the row's content box would otherwise get clipped flat.
              padding: '18px clamp(20px, 6vw, 80px) 55px', scrollPaddingLeft: 'clamp(20px, 6vw, 80px)', WebkitOverflowScrolling: 'touch',
            }}
          >
            {ZUNUZ_CARE_CARDS.map((card) => (
              <div
                key={card.title}
                className="zc-fade-el"
                style={{
                  position: 'relative', flex: '0 0 clamp(230px, 60vw, 260px)', minHeight: '190px',
                  scrollSnapAlign: 'start', borderRadius: '24px', background: card.bg, border: `1px solid ${card.border}`,
                  boxShadow: `3px 5px 16px 0 ${card.shadow}`,
                  boxSizing: 'border-box', padding: '20px', display: 'flex', flexDirection: 'column',
                }}
              >
                <h3 style={{ fontFamily: "'Inter', sans-serif", margin: '0 0 10px', fontWeight: 700, fontSize: '19px', color: INK }}>
                  {card.title}
                </h3>
                {card.list ? (
                  <div style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: '13px', lineHeight: 1.6, color: 'rgba(17,17,16,0.65)' }}>
                    {card.list.map((item, i) => <p key={item} style={{ margin: 0 }}>{i + 1}. {item}</p>)}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: '14px', lineHeight: 1.6, color: 'rgba(17,17,16,0.65)' }}>
                    {card.body}
                  </p>
                )}
                <a href="#" style={{
                  marginTop: 'auto', alignSelf: 'flex-end', paddingTop: '14px',
                  fontFamily: "'Inter', sans-serif", fontSize: '13px', color: '#3B6FE0', textDecoration: 'underline',
                }}>
                  {card.linkText}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* ── Video reels ── */}
        <section style={{ padding: '0px 0 40px', boxSizing: 'border-box' }}>
          <h2
            ref={reelsHeadingRef}
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, margin: '0 0 clamp(24px, 4vw, 40px)', padding: '0 clamp(20px, 6vw, 80px)', fontSize: 'clamp(22px, 4.5vw, 52px)' }}
          >
            <span style={{ fontWeight: 700 }}>Zunuz experience.</span> See why our customers keep coming back.
          </h2>
          {/* scrollPaddingLeft matches paddingLeft on purpose — without it, the
            scroll-snap algorithm treats the scrollport edge (not the padded
            content edge) as the "start" to snap against, and silently
            scrolls exactly the padding amount away the instant it settles,
            eating the left padding entirely (this is what was actually
            causing the "touching the edge" look — the padding value itself
            was already fine, the snap was just scrolling past it). */}
          <div ref={reelsRowRef} style={{
            display: 'flex', gap: '16px', overflowX: 'auto', scrollSnapType: 'x mandatory',
            padding: '0 18px 12px', scrollPaddingLeft: '18px',
            WebkitOverflowScrolling: 'touch',
          }}>
            {REEL_ITEMS.map((item, i) => (
              <div
                key={item.caption}
                style={{
                  // On a narrow phone, `calc(100vw - 80px)` is bigger than the
                  // 300px cap, so the cap wins and the tile fills nearly the
                  // whole visible width — one reel showing fully, with just a
                  // sliver of the next one peeking in. On wider screens the
                  // same cap keeps tiles small enough that several sit side
                  // by side, same as before.
                  position: 'relative', flex: '0 0 clamp(200px, calc(100vw - 80px), 300px)', aspectRatio: '9 / 16',
                  scrollSnapAlign: 'start', overflow: 'hidden', borderRadius: '10px', background: '#000',
                  cursor: 'pointer',
                }}
                onClick={() => setPlayingReel(playingReel === i ? null : i)}
              >
                {/* Every tile autoplays muted the moment it mounts (the only
                  way autoplay is allowed without a user gesture) — clicking
                  a tile doesn't start playback, it was already playing, it
                  just unmutes that one tile and re-mutes whichever tile was
                  unmuted before, so at most one reel is ever audible. */}
                <video
                  ref={(el) => { reelVideoRefs.current[i] = el; }}
                  src={item.video}
                  poster={item.poster}
                  autoPlay
                  muted={playingReel !== i}
                  loop
                  playsInline
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 40%)' }} />
                <div style={{
                  position: 'absolute', top: '12px', right: '12px',
                  width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(17,17,16,0.55)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {playingReel === i
                    ? <Volume2 size={14} color={PAPER} />
                    : <VolumeX size={14} color={PAPER} />}
                </div>
                <p style={{
                  position: 'absolute', left: '14px', bottom: '14px', margin: 0,
                  fontFamily: "'Inter', sans-serif", fontStyle: 'italic', fontSize: '15px', color: PAPER,
                }}>
                  {item.caption}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Why Zunuz ── */}
        <section ref={whyZunuzSectionRef} style={{ padding: '40px 0', boxSizing: 'border-box' }}>
          <h2
            className="wz-fade-el"
            style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, margin: '0 0 32px', padding: '0 clamp(20px, 6vw, 80px)', fontSize: 'clamp(22px, 2.4vw, 26px)', color: INK }}
          >Why ZUNUZ is the best place to buy jewellery.
          </h2>
          <div
            style={{
              display: 'flex', gap: '16px', overflowX: 'auto', scrollSnapType: 'x mandatory',
              // scrollPadding matches padding on purpose — same fix as the video
              // reels row needed earlier: without it, scroll-snap treats the bare
              // scrollport edge as "start" and silently scrolls the padding away
              // the instant it settles, which is what was eating the left gap.
              padding: '0 clamp(20px, 6vw, 80px) 12px', scrollPaddingLeft: 'clamp(20px, 6vw, 80px)',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {WHY_ZUNUZ_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="wz-fade-el"
                  style={{
                    position: 'relative', flex: '0 0 clamp(210px, 58vw, 250px)', minHeight: '260px',
                    scrollSnapAlign: 'start', borderRadius: '20px', background: card.color,
                    padding: '24px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
                  }}
                >
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%', background: PAPER,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', flexShrink: 0,
                  }}>
                    <Icon size={20} color={card.color} strokeWidth={2} />
                  </div>
                  <h3 style={{ fontFamily: "'Inter', sans-serif", margin: '0 0 10px', fontWeight: 700, fontSize: '18px', lineHeight: 1.25, color: PAPER }}>
                    {card.title}
                  </h3>
                  <p style={{ fontFamily: "'Inter', sans-serif", margin: 0, fontSize: '13px', lineHeight: 1.55, color: 'rgba(245,242,235,0.92)' }}>
                    {card.copy}
                  </p>
                </div>
              );
            })}
          </div>
        </section>



        {/* ── Ready? (closing CTA — same layout as TestPage.jsx's "Ready?"
          section: small heading, then a full-bleed image with the title/
          subtitle/button overlaid directly on top of it) ── */}
        <section ref={closingRef} style={{ position: 'relative', width: '100%', background: CREAM, boxSizing: 'border-box', paddingTop: '50px' }}>
          <div style={{ position: 'relative', width: '100%', height: 'clamp(620px, 60vw, 620px)', overflow: 'hidden' }}>
            <img className="cl-image" src="/cta_banner.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            {/* Soft light wash behind the top copy so the dark text stays
              readable over the wall/frame in the photo. */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 22%)' }} />
            <div className="cl-el" style={{
              position: 'absolute', left: 0, right: 0, top: 'clamp(20px, 4vw, 32px)',
              padding: '0 20px', textAlign: 'center',
            }}>
              <h3 style={{ margin: '0 0 8px', fontFamily: "'Inter', sans-serif", fontSize: 'clamp(24px, 3.4vw, 32px)', fontWeight: 600, color: INK }}>
                Three ways to live it.
              </h3>
              <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: 'clamp(18px, 2.6vw, 22px)', fontWeight: 400, color: INK, opacity: 0.85 }}>
                Lite · Classic · Max
              </p>
            </div>
            <div className="cl-el" style={{
              position: 'absolute', left: 0, right: 0, bottom: 'clamp(28px, 5vw, 48px)',
              display: 'flex', justifyContent: 'center', padding: '0 20px',
            }}>
              <a
                ref={(el) => { closingButtonRef.current = el; magneticRefs.current[0] = el; }}
                href="/products"
                data-cursor-hover
                style={{
                  display: 'inline-block', border: 'none', cursor: 'pointer', background: INK, color: PAPER, textDecoration: 'none',
                  padding: '12px 26px', borderRadius: '999px',
                  fontFamily: "'Inter', sans-serif", fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap',
                }}
              >
                Find your model →
              </a>
            </div>
          </div>
        </section>



        {/* ── Footer (accordion — same as TestPage.jsx's footer: expandable
          link sections, social icon, copyright) ── */}
        <footer ref={footerRef} style={{ background: CREAM, padding: 'clamp(24px, 4vw, 32px) 0 0', borderTop: '1px solid rgba(17,17,16,0.12)' }}>
          {FOOTER_SECTIONS.map((section, i) => {
            const isOpen = openFooterSection === i;
            return (
              <div key={section.title} style={{ borderBottom: '1px solid rgba(17,17,16,0.12)' }}>
                <button
                  type="button"
                  onClick={() => setOpenFooterSection(isOpen ? null : i)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '18px clamp(20px, 6vw, 80px)', textAlign: 'left',
                  }}
                >
                  <span style={{
                    fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase', color: INK,
                  }}>
                    {section.title}
                  </span>
                  <Plus
                    size={18}
                    color={INK}
                    strokeWidth={1.75}
                    style={{ transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.25s ease' }}
                  />
                </button>
                <div style={{ maxHeight: isOpen ? `${section.items.length * 34 + 8}px` : '0px', overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                  <div style={{ padding: '0 clamp(20px, 6vw, 80px) 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {section.items.map((item) => (
                      <a
                        key={item}
                        href="#"
                        data-cursor-hover
                        style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: 'rgba(17,17,16,0.6)', textDecoration: 'none' }}
                      >
                        {item}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', padding: '28px 0 20px' }}>
            <a href="https://instagram.com/zunuz" target="_blank" rel="noreferrer" aria-label="Instagram" data-cursor-hover style={{ color: INK }}>
              <FooterInstagramIcon size={20} />
            </a>
          </div>

          <p style={{ textAlign: 'center', margin: 0, padding: '0 0 28px', fontFamily: "'Inter', sans-serif", fontSize: '11px', color: 'rgba(17,17,16,0.45)' }}>
            &copy; 2026 ZUNUZ. All rights reserved.
          </p>
        </footer>

        </div>
      </div>

      <style>{`
        .t2-cursor-none, .t2-cursor-none * { cursor: none !important; }
        @media (pointer: coarse) {
          .t2-cursor-none, .t2-cursor-none * { cursor: auto !important; }
        }
        @keyframes t2-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes t2-cue {
          0%, 100% { transform: scaleY(1); opacity: 0.6; }
          50% { transform: scaleY(0.4); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
