import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Plus, Search, ShoppingBag, User } from 'lucide-react';

import CategoryHero from '../components/category/CategoryHero';
import ThreeWaysSection from '../components/category/ThreeWaysSection';
import CloserLookSection from '../components/category/CloserLookSection';
import FeatureRowsSection from '../components/category/FeatureRowsSection';
import OccasionTabsSection from '../components/category/OccasionTabsSection';
import StyleReelsSection from '../components/category/StyleReelsSection';
import MoreCategoryTilesSection from '../components/category/MoreCategoryTilesSection';
import useSmoothScroll from '../hooks/useSmoothScroll';

gsap.registerPlugin(ScrollTrigger);

const GOLD = '#D8B26B';
const INK = '#1F2024';
const PAPER = '#F5F2EB';
const CREAM = '#F0EEE4';

const FEATURE_ROWS = [
  {
    image: '/chain_water.png',
    title: 'Waterproof.',
    copy: 'Ready for rain, splashes, and everything in between — take it off only if you want to, never because you have to.',
  },
  {
    image: '/sweate_resis.png',
    title: 'Sweatproof.',
    copy: 'Made to keep up with your day, from morning plans to late nights, without losing its shine along the way.',
  },
  {
    image: '/everyday.png',
    title: 'Made for all-day comfort.',
    copy: 'Light enough to wear all day and comfortable enough to forget it is even there by lunch.',
  },
];

const THREE_WAYS_CARDS = [
  { image: '/college_day.png', label: 'Lite', tagline: 'Light, by nature.', href: '/products' },
  { image: '/every_day.png', label: 'Classic', tagline: 'Timeless, by design.', href: '/products' },
  { image: '/next_day.png', label: 'Max', tagline: 'More, by choice.', href: '/products' },
];

const OCCASION_TABS = [
  { label: 'College', image: '/college_day.png', desc: 'Easy to wear from your first class to your last plan of the day. A chain that adds something to your everyday look without trying too hard.' },
  { label: 'Work', image: '/office_day.png', desc: 'Clean, simple, and easy to style. The kind of chain that works with your everyday office look and still feels like you.' },
  { label: 'First Date', image: '/first_date.png', desc: 'You want to look good, but still feel like yourself. Choose a chain that adds just the right amount of detail.' },
  { label: 'Everyday', image: '/every_day.png', desc: 'The chain you reach for without thinking twice. Easy with a T-shirt, a shirt, or whatever your day calls for.' },
  { label: 'Night Out', image: '/next_day.png', desc: 'When the plans start after dark, add a little more to your look. Designed to catch attention without taking over.' },
  { label: 'Special Occasion', image: '/5.png', desc: 'For the moments that deserve something extra. A chain that brings your whole look together when it matters.' },
];

const STYLE_REELS = [
  { poster: '/1.png', video: '/reel1.mp4', caption: 'Layered up.' },
  { poster: '/2.png', video: '/reel2.mp4', caption: 'Kept it simple.' },
  { poster: '/3.png', video: '/reel3.mp4', caption: 'Styled for the day.' },
];

const MORE_FROM_ZUNUZ = [
  { image: '/earwear.png', label: 'Earwear', href: '/earwear' },
  { image: '/wristwear.png', label: 'Wristwear', href: '/wristwear' },
];

const FOOTER_SECTIONS = [
  { title: 'Shop', items: ['All Products', 'Necklaces', 'Earrings', 'Bracelets'] },
  { title: 'About', items: ['Our Story', 'Why Zunuz'] },
  { title: 'Help', items: ['FAQs', 'Shipping & Returns', 'Contact Us', 'Track Order'] },
  { title: 'Join The Zunuz', items: ['Sign In', 'Create Account', 'Newsletter'] },
];

const FooterInstagramIcon = ({ size = 20, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export default function NeckwearPage() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [openFooterSection, setOpenFooterSection] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [playingStyleReel, setPlayingStyleReel] = useState(null);

  const pageRef = useRef(null);
  const scrollRef = useRef(null);
  // Single child of scrollRef that Lenis measures (see useSmoothScroll).
  const scrollContentRef = useRef(null);
  const navRef = useRef(null);
  const cursorDotRef = useRef(null);
  const cursorRingRef = useRef(null);
  const progressBarRef = useRef(null);

  const heroRef = useRef(null);
  const heroVideoRef = useRef(null);

  const threeWaysSectionRef = useRef(null);
  const threeWaysTileRefs = useRef([]);

  const detailRef = useRef(null);
  const detailVideoRef = useRef(null);

  const featureRefs = useRef([]);
  const featureHeadingRef = useRef(null);

  const tabsHeadingRef = useRef(null);
  const tabsSectionRef = useRef(null);
  const tabsRowRef = useRef(null);

  const styleRef = useRef(null);
  const styleReelVideoRefs = useRef([]);
  const styleRowRef = useRef(null);

  const moreTileRefs = useRef([]);
  const moreSectionRef = useRef(null);

  const footerRef = useRef(null);

  // Smooth wheel/trackpad scrolling of the page's own scroll container.
  const lenisRef = useSmoothScroll(scrollRef, scrollContentRef, !loading);

  // Loader count-up
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

  // Custom cursor
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

    document.body.classList.add('nw-cursor-none');

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
      hoverEls.forEach((el) => {
        el.removeEventListener('mouseenter', onEnter);
        el.removeEventListener('mouseleave', onLeave);
      });
      document.body.classList.remove('nw-cursor-none');
    };
  }, [loading]);

  // Scroll progress bar
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

  // Nav backdrop
  useEffect(() => {
    if (loading) return;
    const scroller = scrollRef.current;
    const nav = navRef.current;
    if (!scroller || !nav) return;
    const logo = nav.querySelector('.nav-logo');
    const links = nav.querySelectorAll('.nav-link');
    const onScroll = () => {
      const scrolled = scroller.scrollTop > window.innerHeight * 0.7;
      nav.style.background = scrolled ? 'rgba(240,238,228,0.75)' : 'transparent';
      nav.style.backdropFilter = scrolled ? 'blur(10px)' : 'none';
      if (logo) logo.style.filter = scrolled ? 'invert(1)' : 'none';
      links.forEach((link) => { link.style.color = scrolled ? INK : PAPER; });
    };
    onScroll();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [loading]);

  // Hero entrance + parallax
  useEffect(() => {
    if (loading) return;
    const words = heroRef.current?.querySelectorAll('.nw-word-inner');
    const rest = heroRef.current?.querySelectorAll('.nw-fade-el');
    if (!words) return;
    gsap.set(words, { yPercent: 110 });
    gsap.set(rest, { opacity: 0, y: 18 });

    const tl = gsap.timeline({ delay: 0.15 });
    tl.to(words, { yPercent: 0, duration: 1, ease: 'power4.out', stagger: 0.07 })
      .to(rest, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.12 }, '-=0.4');

    let parallaxTrigger;
    if (heroVideoRef.current) {
      parallaxTrigger = ScrollTrigger.create({
        trigger: heroRef.current,
        scroller: scrollRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => gsap.set(heroVideoRef.current, { yPercent: self.progress * 18 }),
      });
    }
    return () => {
      tl.kill();
      if (parallaxTrigger) parallaxTrigger.kill();
    };
  }, [loading]);

  // Three ways tiles fade-in & hover
  useEffect(() => {
    if (loading) return;
    const section = threeWaysSectionRef.current;
    const tiles = threeWaysTileRefs.current.filter(Boolean);
    if (!section) return;

    const headingEls = section.querySelectorAll('.tw-fade-el');
    gsap.set(headingEls, { opacity: 0, y: 16 });
    const headingTrigger = ScrollTrigger.create({
      trigger: section,
      scroller: scrollRef.current,
      start: 'top 85%',
      once: true,
      onEnter: () => gsap.to(headingEls, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: 0.1 }),
    });

    const tileTriggers = tiles.map((tile, i) => {
      gsap.set(tile, { opacity: 0, y: 50, scale: 0.95 });
      return ScrollTrigger.create({
        trigger: tile,
        scroller: scrollRef.current,
        start: 'top 88%',
        once: true,
        onEnter: () => gsap.to(tile, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out', delay: i * 0.1 }),
      });
    });

    const onEnterHover = (img) => gsap.to(img, { scale: 1.06, duration: 0.6, ease: 'power2.out' });
    const onLeaveHover = (img) => gsap.to(img, { scale: 1, duration: 0.6, ease: 'power2.out' });
    const hoverCleanups = tiles.map((tile) => {
      const img = tile.querySelector('.tw-tile-image');
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
      headingTrigger.kill();
      tileTriggers.forEach((t) => t.kill());
      hoverCleanups.forEach((fn) => fn());
    };
  }, [loading]);

  // Closer look video card
  useEffect(() => {
    if (loading) return;
    const section = detailRef.current;
    const video = detailVideoRef.current;
    if (!section) return;
    const els = section.querySelectorAll('.nw-fade-el');
    gsap.set(els, { opacity: 0, y: 24 });
    const trigger = ScrollTrigger.create({
      trigger: section,
      scroller: scrollRef.current,
      start: 'top 75%',
      once: true,
      onEnter: () => gsap.to(els, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.12 }),
    });
    let zoom;
    if (video) {
      const tryPlay = () => video.play().catch(() => {});
      if (video.readyState >= 2) tryPlay();
      else video.addEventListener('loadeddata', tryPlay, { once: true });
      zoom = gsap.fromTo(video, { scale: 1.25 }, {
        scale: 1,
        ease: 'none',
        scrollTrigger: { trigger: video.parentElement, scroller: scrollRef.current, start: 'top bottom', end: 'center center', scrub: true },
      });
    }
    return () => {
      trigger.kill();
      zoom?.scrollTrigger?.kill();
      zoom?.kill();
    };
  }, [loading]);

  // Feature rows fade-in
  useEffect(() => {
    if (loading) return;
    const rows = featureRefs.current.filter(Boolean);
    if (!rows.length) return;
    const heading = featureHeadingRef.current;
    let headingTrigger;
    if (heading) {
      gsap.set(heading, { opacity: 0, y: 24 });
      headingTrigger = ScrollTrigger.create({
        trigger: heading,
        scroller: scrollRef.current,
        start: 'top 85%',
        once: true,
        onEnter: () => gsap.to(heading, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }),
      });
    }
    const triggers = rows.map((row) => {
      const img = row.querySelector('.nw-feature-image');
      const text = row.querySelectorAll('.nw-feature-text');
      gsap.set(img, { clipPath: 'inset(100% 0 0 0)', scale: 1.2 });
      gsap.set(text, { opacity: 0, y: 24 });
      return ScrollTrigger.create({
        trigger: row,
        scroller: scrollRef.current,
        start: 'top 78%',
        once: true,
        onEnter: () => {
          gsap.to(img, { clipPath: 'inset(0% 0 0 0)', duration: 1.2, ease: 'power3.inOut' });
          gsap.to(img, { scale: 1, duration: 1.6, ease: 'power2.out' });
          gsap.to(text, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.12, delay: 0.15 });
        },
      });
    });
    return () => {
      headingTrigger?.kill();
      triggers.forEach((t) => t.kill());
    };
  }, [loading]);

  // Occasion tabs & style section entrance
  useEffect(() => {
    if (loading) return;
    const sections = [tabsSectionRef.current, styleRef.current].filter(Boolean);
    const triggers = sections.map((section) => {
      const els = section.querySelectorAll('.nw-fade-el');
      gsap.set(els, { opacity: 0, y: 20 });
      return ScrollTrigger.create({
        trigger: section,
        scroller: scrollRef.current,
        start: 'top 78%',
        once: true,
        onEnter: () => gsap.to(els, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.1 }),
      });
    });
    return () => triggers.forEach((t) => t.kill());
  }, [loading]);

  // Occasion tabs image crossfade
  useEffect(() => {
    if (loading) return;
    const img = tabsHeadingRef.current?.querySelector('img');
    if (!img) return;
    gsap.fromTo(img, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' });
  }, [activeTab, loading]);

  // Occasion tabs row wheel handling
  useEffect(() => {
    if (loading) return;
    const row = tabsRowRef.current;
    const scroller = scrollRef.current;
    if (!row || !scroller) return;
    const onWheel = (e) => {
      if (lenisRef.current) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        scroller.scrollTop += e.deltaY;
      }
    };
    row.addEventListener('wheel', onWheel, { passive: false });
    return () => row.removeEventListener('wheel', onWheel);
  }, [loading, lenisRef]);

  // Style reels autoplay
  useEffect(() => {
    if (loading) return;
    const cleanups = styleReelVideoRefs.current.filter(Boolean).map((video) => {
      const tryPlay = () => video.play().catch(() => {});
      if (video.readyState >= 2) { tryPlay(); return () => {}; }
      video.addEventListener('loadeddata', tryPlay, { once: true });
      return () => video.removeEventListener('loadeddata', tryPlay);
    });
    return () => cleanups.forEach((fn) => fn());
  }, [loading]);

  // More from Zunuz tiles fade-in & hover
  useEffect(() => {
    if (loading) return;
    const tiles = moreTileRefs.current.filter(Boolean);
    if (!tiles.length) return;
    const triggers = tiles.map((tile, i) => {
      gsap.set(tile, { opacity: 0, y: 50, scale: 0.95 });
      return ScrollTrigger.create({
        trigger: tile,
        scroller: scrollRef.current,
        start: 'top 88%',
        once: true,
        onEnter: () => gsap.to(tile, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out', delay: i * 0.1 }),
      });
    });
    const onEnterHover = (img) => gsap.to(img, { scale: 1.06, duration: 0.6, ease: 'power2.out' });
    const onLeaveHover = (img) => gsap.to(img, { scale: 1, duration: 0.6, ease: 'power2.out' });
    const hoverCleanups = tiles.map((tile) => {
      const img = tile.querySelector('.nw-more-image');
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

  // Style reels: tiles rise and scale up into place in a stagger.
  useEffect(() => {
    if (loading) return;
    const row = styleRowRef.current;
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

  // "More from Zunuz" heading + subtitle fade up ahead of the tiles.
  useEffect(() => {
    if (loading) return;
    const section = moreSectionRef.current;
    if (!section) return;
    const els = section.querySelectorAll(':scope > h2, :scope > p');
    gsap.set(els, { opacity: 0, y: 20 });
    const trigger = ScrollTrigger.create({
      trigger: section,
      scroller: scrollRef.current,
      start: 'top 85%',
      once: true,
      onEnter: () => gsap.to(els, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: 0.1 }),
    });
    return () => trigger.kill();
  }, [loading]);

  // Footer: accordion rows, social icon and copyright fade up in turn.
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
    <div ref={pageRef} style={{ width: '100%', height: '100dvh', background: CREAM, color: INK, fontFamily: "'Inter', sans-serif", position: 'relative', overflow: 'hidden' }}>
      {loading && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: CREAM, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px' }}>
          <img src="/logo_white.png" alt="Zunuz" style={{ height: 'clamp(28px, 5vw, 40px)', width: 'auto', filter: 'invert(1)' }} />
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', letterSpacing: '0.2em', color: GOLD }}>{progress}%</div>
        </div>
      )}

      <div ref={cursorDotRef} style={{ position: 'fixed', top: 0, left: 0, width: '8px', height: '8px', borderRadius: '50%', background: GOLD, pointerEvents: 'none', zIndex: 150, transform: 'translate(-50%, -50%)', mixBlendMode: 'difference' }} />
      <div ref={cursorRingRef} style={{ position: 'fixed', top: 0, left: 0, width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${GOLD}`, pointerEvents: 'none', zIndex: 150, transform: 'translate(-50%, -50%)' }} />

      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '2px', background: 'rgba(245,242,235,0.1)', zIndex: 140 }}>
        <div ref={progressBarRef} style={{ width: '100%', height: '100%', background: GOLD, transform: 'scaleX(0)', transformOrigin: 'left' }} />
      </div>

      <nav ref={navRef} style={{
        position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 130,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'clamp(16px, 3vw, 28px) clamp(20px, 4vw, 48px)', boxSizing: 'border-box',
        background: 'transparent', backdropFilter: 'none', transition: 'background 0.35s ease, backdrop-filter 0.35s ease',
      }}>
        <img className="nav-logo" src="/logo_white.png" alt="Zunuz" style={{ height: 'clamp(18px, 2.4vw, 24px)', width: 'auto' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(14px, 2.4vw, 22px)' }}>
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

      <div ref={scrollRef} data-nw-scroll style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <div ref={scrollContentRef}>
        {/* Modular Sections */}
        <CategoryHero
          title="Neckwear"
          subtitle="The finishing touch for every look."
          videoSrc="/main_video.mp4"
          heroRef={heroRef}
          heroVideoRef={heroVideoRef}
          wordClass="nw-word-inner"
          fadeClass="nw-fade-el"
        />

        <ThreeWaysSection
          title="Three ways to live it."
          subtitle="Designed around the way you live."
          cards={THREE_WAYS_CARDS}
          sectionRef={threeWaysSectionRef}
          tileRefs={threeWaysTileRefs}
        />

        <CloserLookSection
          title="Get a closer look."
          subtitle="Discover the details that make every piece special."
          videoSrc="/reel1.mp4"
          sectionRef={detailRef}
          videoRef={detailVideoRef}
          videoPlaying={videoPlaying}
          onTogglePlay={() => setVideoPlaying((v) => !v)}
          fadeClass="nw-fade-el"
        />

        <FeatureRowsSection
          heading="Stay stylish. Stay relaxed. Sweatproof, waterproof, and comfortable enough for all day."
          items={FEATURE_ROWS}
          featureRefs={featureRefs}
          headingRef={featureHeadingRef}
          imgClass="nw-feature-image"
          textClass="nw-feature-text"
        />

        <OccasionTabsSection
          title="Made for every moment."
          subtitle="From everyday looks to nights out, find a chain for every occasion."
          tabs={OCCASION_TABS}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sectionRef={tabsSectionRef}
          tabsHeadingRef={tabsHeadingRef}
          tabsRowRef={tabsRowRef}
          fadeClass="nw-fade-el"
          rowClass="nw-tabs-row"
        />

        <StyleReelsSection
          title="Style it your way."
          subtitle="See how Zunuz pieces come together with every look."
          reels={STYLE_REELS}
          sectionRef={styleRef}
          reelVideoRefs={styleReelVideoRefs}
          rowRef={styleRowRef}
          playingStyleReel={playingStyleReel}
          setPlayingStyleReel={setPlayingStyleReel}
          fadeClass="nw-fade-el"
        />

        <MoreCategoryTilesSection
          title="More from Zunuz."
          subtitle="Take a look at what's next."
          items={MORE_FROM_ZUNUZ}
          moreTileRefs={moreTileRefs}
          sectionRef={moreSectionRef}
          imgClass="nw-more-image"
        />

        {/* Footer */}
        <footer ref={footerRef} style={{ background: CREAM, padding: 'clamp(24px, 4vw, 32px) 0 0', borderTop: '1px solid rgba(17,17,16,0.12)' }}>
          {FOOTER_SECTIONS.map((section, i) => {
            const isOpen = openFooterSection === i;
            return (
              <div key={section.title} style={{ borderBottom: '1px solid rgba(17,17,16,0.12)' }}>
                <button
                  type="button"
                  onClick={() => setOpenFooterSection(isOpen ? null : i)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: '18px clamp(20px, 6vw, 80px)', textAlign: 'left' }}
                >
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{section.title}</span>
                  <Plus size={18} strokeWidth={1.75} style={{ transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.25s ease' }} />
                </button>
                <div style={{ maxHeight: isOpen ? `${section.items.length * 34 + 8}px` : '0px', overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                  <div style={{ padding: '0 clamp(20px, 6vw, 80px) 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {section.items.map((item) => (
                      <a key={item} href="#" data-cursor-hover style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: 'rgba(17,17,16,0.6)', textDecoration: 'none' }}>{item}</a>
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
          <p style={{ fontFamily: "'Inter', sans-serif", textAlign: 'center', margin: 0, padding: '0 0 28px', fontSize: '11px', color: 'rgba(17,17,16,0.45)' }}>&copy; 2026 ZUNUZ. All rights reserved.</p>
        </footer>
        </div>
      </div>

      <style>{`
        .nw-cursor-none, .nw-cursor-none * { cursor: none !important; }
        @media (pointer: coarse) {
          .nw-cursor-none, .nw-cursor-none * { cursor: auto !important; }
        }
        .nw-tabs-row { scrollbar-width: none; }
        .nw-tabs-row::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
