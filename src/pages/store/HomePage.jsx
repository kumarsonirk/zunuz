import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCatalog, productsIn } from '../../store/catalog';
import { FAQS } from '../../data/faqs';
import { gsap } from 'gsap';
import { ArrowRight, Check, Mail } from 'lucide-react';
import { formatPrice } from '../../store/catalogConfig';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import useSmoothScroll from '../../hooks/useSmoothScroll';
import { LandingHeader, LandingLoader } from '../../components/landing/LandingIntro';
import BudgetCardPhotos from '../../components/landing/BudgetCardPhotos';
import useHeroIntro from '../../components/landing/useHeroIntro';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import scrollRise from '../../components/landing/scrollRise';
import PriceEdit from '../../components/landing/PriceEdit';
import SiteFooter from '../../components/landing/SiteFooter';
import { getContent, CONTENT_DEFAULTS } from '../../store/content';
import { SETTINGS } from '../../store/settings';

gsap.registerPlugin(ScrollTrigger);

// Scratch page #3 — not linked from anywhere, reachable only by visiting
// /test3 directly. Bypasses MainLayout (see App.jsx), same as Test2Page.jsx.
// Like the other scratch pages it owns its own scroll container (the app
// shell keeps #root from scrolling), so any ScrollTrigger added here should
// pass `scroller: scrollRef.current`.
// Colours live in the Tailwind classes below (Tailwind needs literal class
// strings, so they can't be interpolated from constants). INK is still used
// by the Sparkle SVG fill.
//   ink #111110 · poster red #E8304F · marquee yellow #F6C915
//   teal #4EB8C9 · link blue #1A6FE8 · GRWM pink #FF3D8B
// Section backgrounds come from SECTION_THEMES (see the shared bg layer).
const INK = '#111110';
const FONT_CLASS = "font-['Bricolage_Grotesque','Inter',sans-serif]";

// Editable copy/images (admin → Homepage & Banners) come from the content
// store (src/store/content.js), loaded before the app renders — plain object
// reads, no hooks/subscriptions, so the memo'd page never re-renders for it.
// A custom image is applied as an inline background over the built-in class
// (so with the defaults the markup is exactly as before).
const customBg = (src, def) => (src && src !== def ? { backgroundImage: `url("${src}")` } : undefined);

// The big faded "Your" is baked into poster2.png — only the headline words
// (content 'home.hero'.headline) are live text.

// "Jewellery, by budget." cards. Each photo already has its own coloured
// backdrop, so the card is just the photo with the copy laid on top —
// `textClass` is picked per photo for contrast (dark on the pale yellow one).
// Photo + copy are editable (content 'shared.budget' card1…3); prices fixed.
const BUDGET_CARDS = [
  { price: 199, textClass: 'text-white' },
  { price: 499, textClass: 'text-white' },
  { price: 999, textClass: 'text-white' },
];

// "The fit budget check" cards — same card treatment as BUDGET_CARDS, with a
// two-line label top-left and the price bottom-right. `textClass` picked per
// photo for contrast (dark on the pale beige one).
const FIT_CARDS = [
  { image: '/fashion1.png', label: ['Cute on a', 'Budget'], price: 599, textClass: 'text-[#111110]' },
  { image: '/fashion2.png', label: ['The Sweet', 'Spot'], price: 999, textClass: 'text-white' },
  { image: '/fashion3.png', label: ['Main Character', 'Budget'], price: 1999, textClass: 'text-white' },
];
// "GRWM: what are we wearing?" looks. Stills for now — the play badge is
// drawn on top (it isn't part of the photos).
const GRWM_LOOKS = [
  { image: '/grwm1.png', caption: 'Class at 10. Coffee at 11.' },
  { image: '/grwm2.png', caption: 'Meeting at 9. Plans at 8.' },
  { image: '/grwm3.png', caption: 'No plans. Still dressed.' },
];

// Background palette per section (after the hero). One shared layer sits
// behind every section and cross-fades between these as you scroll, so there
// are never hard seams between sections. `base` is the wash; `glows` are the
// three soft colour blobs floating over it.
const SECTION_THEMES = [
  { base: '#FFFBED', glows: ['#FFF1CC', '#FFE4EC', '#E9F6F2'] }, // Jewellery, by budget — light cream (patterns get a colour boost to stay visible)
  { base: '#FDEBEF', glows: ['#F9C6D3', '#E4D4FF', '#FFD8C2'] }, // The fit budget check — blush
  { base: '#F1ECFF', glows: ['#D9CCFF', '#CDEBFF', '#FFD1EA'] }, // GRWM — lavender
  { base: '#FFFDF7', glows: ['#FFE3EF', '#DDF4F6', '#FFF4C9'] }, // For every version of you — near-white
  { base: '#FFFBEA', glows: ['#FFF0B8', '#DFF5F3', '#FFE6D6'] }, // Shop the look — warm cream
  { base: '#FFF8E7', glows: ['#FFE3EF', '#FFF0B8', '#DDF4F6'] }, // The under ₹499 edit — cream with pink/mint
  { base: '#FDEFF4', glows: ['#FFD6E5', '#FFF0C9', '#E6E0FF'] }, // The under ₹999 edit — soft rose
  { base: '#F1F0E3', glows: ['#E3E8F7', '#FFE3EF', '#E6F0D8'] }, // The under ₹699 edit — soft sage
  { base: '#FFFBEA', glows: ['#FFEFC2', '#FFE3EF', '#E4F3F4'] }, // Follow the fits — warm cream
  { base: '#FFF7EC', glows: ['#FFE0EC', '#FFF0B8', '#DFF3F5'] }, // FAQs — soft peach-cream
  { base: '#FFFBEA', glows: ['#D9F2F4', '#FFE6EF', '#FFF0B8'] }, // Newsletter — cream with a teal glow
];

// Brand headline: content 'home.brand'.headline.

// Floating image wall behind the brand statement: jewellery + clothing
// photos shuffled into columns with mixed tile shapes and staggered start
// offsets so it reads as random and unorganised. The shuffle is fixed here
// (not Math.random at render) so the layout never jumps between renders.
// Each column: [start offset, animation duration, direction, tiles...].
const J1 = '/jewel1.webp', J2 = '/jewel2.webp', J3 = '/jewel3.webp';
// Brand wall jewellery shots (WebP copies of /public/jewel6–10.png).
const F1 = '/jewel6.webp', F2 = '/jewel7.webp', F3 = '/jewel8.webp', J9 = '/jewel9.webp', J10 = '/jewel10.webp';
const TALL = 'aspect-[466/600]', SQUARE = 'aspect-square', PORTRAIT = 'aspect-[3/4]', FOUR_FIVE = 'aspect-[4/5]';
const BRAND_WALL = [
  { offset: '-12%', duration: '46s', dir: 'up', tiles: [[F2, TALL], [J10, SQUARE], [F1, PORTRAIT], [J1, FOUR_FIVE], [J9, SQUARE], [J2, TALL]] },
  { offset: '-38%', duration: '38s', dir: 'down', tiles: [[J9, SQUARE], [F3, TALL], [J10, PORTRAIT], [F2, SQUARE], [J3, FOUR_FIVE], [F1, TALL]] },
  { offset: '-4%', duration: '52s', dir: 'up', tiles: [[J1, PORTRAIT], [J10, SQUARE], [J3, TALL], [F3, FOUR_FIVE], [J9, SQUARE], [F2, PORTRAIT]] },
  { offset: '-27%', duration: '42s', dir: 'down', tiles: [[F3, FOUR_FIVE], [J2, TALL], [J9, SQUARE], [J10, SQUARE], [F1, PORTRAIT], [J3, TALL]] },
  { offset: '-18%', duration: '49s', dir: 'up', tiles: [[J10, SQUARE], [F2, PORTRAIT], [J9, FOUR_FIVE], [F1, TALL], [J1, SQUARE], [F3, PORTRAIT]] },
];

// "Shop the look" — each look lists its pieces (each individually addable)
// plus a bundle price for the whole look. Pieces/prices are placeholders
// copied from the design.
const LOOK_PIECES = [
  { name: 'Ribbed tee', price: 499 },
  { name: 'Ribbed tee', price: 499 },
  { name: 'Ribbed tee', price: 499 },
  { name: 'Ribbed tee', price: 499 },
];
const SHOP_LOOKS = [
  { image: '/modal1.webp', title: 'The campus fit', pieces: LOOK_PIECES, total: 1647, accent: '#3FB4E6' }, // sky
  { image: '/modal2.webp', title: 'Desk to dinner', pieces: LOOK_PIECES, total: 1647, accent: '#E8304F' }, // poster red
  { image: '/modal3.webp', title: 'Friday energy', pieces: LOOK_PIECES, total: 1647, accent: '#F2A900' }, // amber
];

// Banner phrases + photos: content 'home.vibeBanner' / 'home.posterBanner'.



// "Follow the fits" curved reel carousel. The three reels repeat to fill a
// run that's wider than any screen; the run is rendered twice so the strip
// can loop seamlessly (the browser only downloads each file once).
const FOLLOW_REELS = ['/reel1.mp4', '/reel2.mp4', '/reel3.mp4'];
const FOLLOW_RUN = [...FOLLOW_REELS, ...FOLLOW_REELS];

// Clothing isn't in the catalogue yet — every clothing section / button is
// behind this switch. Flip to true once clothing products exist.
const SHOW_CLOTHING = false;

// "made for every you" poster banner — hidden for now; flip back to true to
// show it again (its text / photo are still editable in admin content).
const SHOW_POSTER_BANNER = false;

// Marquee text: content 'home.marquee'.

// Four-point sparkle used between marquee phrases.
const Sparkle = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
    <path d="M12 0c.9 6.6 5.4 11.1 12 12-6.6.9-11.1 5.4-12 12-.9-6.6-5.4-11.1-12-12C6.6 11.1 11.1 6.6 12 0z" fill={INK} />
  </svg>
);


// Full-bleed 16:9 banner with a Momo Signature phrase that "writes" itself
// left → right every time the banner scrolls into view (see the effect).
// `className` carries the background image/colour — it must be a literal
// Tailwind class string at the call site (e.g. bg-[url(/x.png)]).
// `overlay` adds a soft dark wash for light photos; `textClassName`
// positions the phrase inside the banner.
function ScriptBanner({ scrollRef, text, className = '', style, overlay = false, textClassName = 'pt-[12%]' }) {
  const sectionRef = useRef(null);
  const photoRef = useRef(null);

  // Parallax: the photo drifts from -7% to +7% of its height while the
  // banner crosses the screen. scrub: 0.8 eases it, so it glides rather than
  // tracking every scroll tick.
  useEffect(() => {
    const section = sectionRef.current;
    const photo = photoRef.current;
    const scroller = scrollRef.current;
    if (!section || !photo || !scroller) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const tween = gsap.fromTo(photo, { yPercent: -7 }, {
      yPercent: 7,
      ease: 'none',
      scrollTrigger: { trigger: section, scroller, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
    });
    return () => { tween.scrollTrigger?.kill(); tween.kill(); };
  }, [scrollRef]);
  const svgRef = useRef(null);
  const fillRef = useRef(null);
  const penRef = useRef(null);
  // useId can contain characters that aren't safe inside url(#…).
  const maskId = `t3w-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  // Writing effect. The phrase is SVG text revealed by a
  // mask that sweeps left → right like a pen moving along the line — the
  // solid letters appear directly as it passes (no outline pass).
  //
  // The SVG's viewBox is fitted to the text's measured bounds, so the phrase
  // fills the width without clipping. That measurement must use the real
  // Momo Signature glyphs: document.fonts.load() can resolve before the
  // Google Fonts stylesheet has even registered the face (then it measures
  // the narrower fallback and the real text overflows once it swaps in), so
  // we wait until the face actually reports "loaded", and re-fit whenever
  // any font finishes loading. Once written, the mask is widened to cover
  // everything so it can never crop a letter.
  useEffect(() => {
    const section = sectionRef.current;
    const scroller = scrollRef.current;
    if (!section || !scroller) return;
    const svg = svgRef.current;
    const fill = fillRef.current;
    const pen = penRef.current;
    if (!svg || !fill || !pen) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fonts = document.fonts;

    let cancelled = false;
    let started = false;
    let written = false;
    let box = null;
    let trigger;
    let resetTrigger;
    let tl;

    const revealAll = () => {
      pen.setAttribute('x', -10000);
      pen.setAttribute('y', -10000);
      pen.setAttribute('width', 20000);
      pen.setAttribute('height', 20000);
    };

    const fit = () => {
      if (cancelled) return;
      const b = fill.getBBox();
      if (!b.width) return;
      const pad = b.height * 0.2;
      box = { x: b.x - pad, y: b.y - pad, w: b.width + pad * 2, h: b.height + pad * 2 };
      svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.w} ${box.h}`);
      if (written) {
        revealAll();
      } else {
        pen.setAttribute('x', box.x);
        pen.setAttribute('y', box.y);
        pen.setAttribute('height', box.h);
      }
    };

    const begin = () => {
      if (started || cancelled) return;
      started = true;
      fit();

      if (reduced || !box) {
        written = true;
        revealAll();
        return;
      }

      // Replays every time the banner comes into view (scrolling down to it
      // or back up to it). It only resets once the banner is completely
      // off-screen, so the phrase never vanishes while it can be seen.
      let hidden = false;
      const hide = () => {
        tl?.kill();
        hidden = true;
        written = false;
        fit();
        pen.setAttribute('width', 0);
      };
      const write = () => {
        // Only after a real reset — scrolling a little past and straight
        // back shouldn't wipe a phrase that's still on screen.
        if (!box || !hidden) return;
        hidden = false;
        tl = gsap.timeline({ onComplete: () => { written = true; revealAll(); } });
        tl.to(pen, { attr: { width: box.w }, duration: 2.6, ease: 'power1.inOut' });
      };

      hide();
      trigger = ScrollTrigger.create({
        trigger: section,
        scroller,
        start: 'top 60%',
        end: 'bottom 40%',
        onEnter: write,
        onEnterBack: write,
      });
      resetTrigger = ScrollTrigger.create({
        trigger: section,
        scroller,
        start: 'top bottom',
        end: 'bottom top',
        onLeave: hide,
        onLeaveBack: hide,
      });
    };

    const momoLoaded = () => {
      if (!fonts) return true;
      for (const face of fonts) {
        if (face.family.replace(/["']/g, '') === 'Momo Signature' && face.status === 'loaded') return true;
      }
      return false;
    };

    const onFontsLoaded = () => {
      fit();
      if (momoLoaded()) begin();
    };
    fonts?.addEventListener?.('loadingdone', onFontsLoaded);
    if (momoLoaded()) begin();
    else fonts?.load?.('400 100px "Momo Signature"').then(onFontsLoaded, () => {});
    // Never leave the phrase hidden if the font can't load at all.
    const fallback = setTimeout(begin, 4000);

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      fonts?.removeEventListener?.('loadingdone', onFontsLoaded);
      trigger?.kill();
      resetTrigger?.kill();
      tl?.kill();
    };
  }, [scrollRef, text]);

  return (
    <section
      ref={sectionRef}
      aria-label={text}
      className={`relative aspect-[16/9] w-full overflow-hidden ${className.split(/\s+/).filter((c) => !c.includes('bg-[url(')).join(' ')}`}
    >
      {/* Parallax photo layer: 120% tall (10% spare above and below) so it
          can glide slower than the page without ever showing an edge. */}
      <div ref={photoRef} aria-hidden="true" className={`pointer-events-none absolute inset-x-0 -top-[10%] bg-cover bg-center will-change-transform ${className} h-[120%]! aspect-auto!`} style={style} />
      {overlay && (
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_top,rgba(17,17,16,0.45)_0%,rgba(17,17,16,0.15)_35%,rgba(17,17,16,0)_60%)]" />
      )}
      <div className={`absolute inset-0 flex justify-center px-[4vw] ${textClassName}`}>
        {/* viewBox is replaced with the measured text bounds on mount. */}
        <svg
          ref={svgRef}
          className="h-auto w-[min(92vw,1100px)] overflow-visible [filter:drop-shadow(0_4px_18px_rgba(0,0,0,0.15))]"
          viewBox="0 0 1000 200"
          aria-hidden="true"
        >
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="-10000" y="-10000" width="20000" height="20000">
              <rect ref={penRef} x="0" y="0" width="0" height="200" fill="white" />
            </mask>
          </defs>
          <g mask={`url(#${maskId})`} className="font-['Momo_Signature',cursive]">
            <text ref={fillRef} x="500" y="130" textAnchor="middle" fontSize="100" fill="white">{text}</text>
          </g>
        </svg>
      </div>
    </section>
  );
}


// FAQs. Copy from the design.
// FAQS live in src/data/faqs.js (shared with /customer-care/faq).

// How many of FAQS to show for now — the rest stay listed above, ready to
// bring back by raising this.
const FAQ_SHOWN = 5;

// Accent per question, cycling through the page's pink / yellow / teal.
// Literal classes so Tailwind generates them.
const FAQ_ACCENTS = [
  { spot: 'rgba(255,61,139,0.14)', chip: 'bg-[#FF3D8B] text-white', open: 'border-[#FF3D8B]/60 bg-[#FFF0F6]', icon: 'bg-[#FF3D8B] text-white border-[#FF3D8B]' },
  { spot: 'rgba(246,201,21,0.24)', chip: 'bg-[#F6C915] text-[#111110]', open: 'border-[#F6C915] bg-[#FFF8DA]', icon: 'bg-[#F6C915] text-[#111110] border-[#F6C915]' },
  { spot: 'rgba(78,184,201,0.2)', chip: 'bg-[#4EB8C9] text-white', open: 'border-[#4EB8C9]/60 bg-[#EAF7F9]', icon: 'bg-[#4EB8C9] text-white border-[#4EB8C9]' },
];

// FAQ accordion. Owns its own open/closed state so a click only re-renders
// this section (the page itself is memoised and heavy). Only one answer is
// open at a time; the first starts open. Answers open/close by animating
// grid-template-rows 0fr ↔ 1fr, which tweens to the content's real height.
function FaqSection({ scrollRef, sectionRef }) {
  const [open, setOpen] = useState(0);
  const copy = getContent('home.faq');
  const baseId = `t3q-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  // Entrance.
  // - Heading block ("FAQs", the "questions." line, the Still-stuck card)
  //   is scrubbed to scroll: as the section comes up the screen each piece
  //   rises from a little below and fades in, settling into place by the
  //   time the section reaches the top area. Each piece starts a bit lower
  //   than the one above it, so they slide up as a layered stack and meet.
  //   scrub: 0.8 makes it trail the scroll slightly so it glides rather
  //   than jittering with each wheel notch; scrolling back up reverses it.
  // - Question cards rise in once, staggered.
  useEffect(() => {
    const section = sectionRef.current;
    const scroller = scrollRef.current;
    if (!section || !scroller) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const heading = Array.from(section.querySelectorAll('.t3q-fade'));
    const items = section.querySelectorAll('.t3q-item');

    const unrise = scrollRise(section, scroller, heading);

    gsap.set(items, { opacity: 0, y: 36 });
    let tl;
    const trigger = ScrollTrigger.create({
      trigger: section,
      scroller,
      start: 'top 75%',
      once: true,
      onEnter: () => {
        tl = gsap.timeline();
        tl.to(items, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.07 }, 0.1);
      },
    });
    return () => {
      unrise();
      trigger.kill();
      tl?.kill();
    };
  }, [scrollRef, sectionRef]);

  // Live pointer interaction (mouse/trackpad only, skipped for reduced
  // motion). Everything here only touches transforms and one CSS variable
  // pair on the hovered card, so it stays cheap:
  // - a soft spotlight follows the cursor across the hovered question card
  //   (--mx/--my feed a radial gradient inside it);
  // - the hovered card tilts a couple of degrees toward the cursor and eases
  //   back flat on leave (gsap.quickTo, so moves are smoothed, not jumpy);
  // - the eyes icon in the "Still stuck?" card turns/shifts toward wherever
  //   the cursor is in the section.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const list = section.querySelector('.t3q-list');
    const eyes = section.querySelector('.t3q-eyes');
    const tilts = new Map();
    const tiltFor = (card) => {
      if (!tilts.has(card)) {
        gsap.set(card, { transformPerspective: 900 });
        tilts.set(card, {
          rx: gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3.out' }),
          ry: gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3.out' }),
        });
      }
      return tilts.get(card);
    };

    let active = null;
    const release = (card) => {
      if (!card) return;
      const t = tiltFor(card);
      t.rx(0);
      t.ry(0);
    };
    const onCardMove = (e) => {
      const card = e.target.closest('.t3q-item');
      if (card !== active) { release(active); active = card; }
      if (!card) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
      const t = tiltFor(card);
      t.ry((px - 0.5) * 4); // ±2°
      t.rx((0.5 - py) * 4);
    };
    const onListLeave = () => { release(active); active = null; };
    list?.addEventListener('pointermove', onCardMove);
    list?.addEventListener('pointerleave', onListLeave);

    let eyeX;
    let eyeY;
    let eyeR;
    if (eyes) {
      eyeX = gsap.quickTo(eyes, 'x', { duration: 0.5, ease: 'power3.out' });
      eyeY = gsap.quickTo(eyes, 'y', { duration: 0.5, ease: 'power3.out' });
      eyeR = gsap.quickTo(eyes, 'rotation', { duration: 0.6, ease: 'power3.out' });
    }
    const onSectionMove = (e) => {
      if (!eyes) return;
      const r = eyes.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const pull = Math.min(dist / 300, 1);
      eyeX((dx / dist) * 4 * pull);
      eyeY((dy / dist) * 4 * pull);
      eyeR(Math.max(-12, Math.min(12, dx / 40)));
    };
    const onSectionLeave = () => { if (eyes) { eyeX(0); eyeY(0); eyeR(0); } };
    section.addEventListener('pointermove', onSectionMove);
    section.addEventListener('pointerleave', onSectionLeave);

    return () => {
      list?.removeEventListener('pointermove', onCardMove);
      list?.removeEventListener('pointerleave', onListLeave);
      section.removeEventListener('pointermove', onSectionMove);
      section.removeEventListener('pointerleave', onSectionLeave);
    };
  }, [sectionRef]);

  // Opening/closing changes the section's height, so let ScrollTrigger
  // re-measure once the height animation has finished. Skipped on mount:
  // a full refresh re-measures every trigger on the page (measured ~0.5s),
  // and on load it landed mid hero-animation as a visible freeze.
  const openMounted = useRef(false);
  useEffect(() => {
    if (!openMounted.current) { openMounted.current = true; return undefined; }
    const t = setTimeout(() => ScrollTrigger.refresh(), 550);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <section ref={sectionRef} className="relative overflow-x-clip px-5 pt-[clamp(48px,6vw,88px)] pb-[clamp(72px,9vw,128px)] text-[#111110]">
      <div className="relative z-[1] mx-auto grid max-w-[1100px] grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start gap-[clamp(28px,5vw,72px)] max-[860px]:grid-cols-1">
        {/* Heading block — sticks while the questions scroll past (desktop). */}
        <div className="min-[861px]:sticky min-[861px]:top-[calc(var(--store-header-h)+clamp(16px,3vh,32px))]">
          <h2 className="t3q-fade m-0 text-[length:clamp(40px,6vw,84px)] font-bold leading-none tracking-[-0.02em]">
            {copy.heading}
          </h2>
          <p className="t3q-fade mt-[0.5em] text-[length:clamp(20px,2.2vw,30px)] font-semibold leading-tight">
            {copy.lead}{' '}
            <span className="font-['Momo_Signature',cursive] text-[1.15em] font-normal text-[#FF3D8B]">{copy.script}</span>
          </p>

          {/* Still-stuck card */}
          <div className="t3q-fade mt-[clamp(20px,2.6vw,32px)] flex items-center gap-4 rounded-[20px] border border-[#111110]/10 bg-white/70 p-4 shadow-[0_10px_30px_-20px_rgba(17,17,16,0.35)] backdrop-blur-sm max-[860px]:hidden">
            <img src="/icon1.png" alt="" aria-hidden="true" className="t3q-eyes size-12 shrink-0" />
            <div className="min-w-0">
              <p className="m-0 text-[15px] font-bold">{copy.stuckTitle}</p>
              <p className="m-0 mt-0.5 font-['Inter',sans-serif] text-[13px] text-[#111110]/65">{copy.stuckText}</p>
            </div>
            <a
              href="/customer-care"
              className="ml-auto shrink-0 rounded-full bg-[#FF3D8B] px-4 py-2 text-[13px] font-bold text-white no-underline transition-[background-color,color,translate] duration-300 hover:-translate-y-0.5 hover:bg-[#F6C915] hover:text-[#111110]"
            >
              Contact us
            </a>
          </div>
        </div>

        {/* Accordion */}
        <ul className="t3q-list m-0 flex list-none flex-col gap-[clamp(8px,0.9vw,12px)] p-0">
          {FAQS.slice(0, FAQ_SHOWN).map((item, i) => {
            const isOpen = open === i;
            const accent = FAQ_ACCENTS[i % FAQ_ACCENTS.length];
            const btnId = `${baseId}-q${i}`;
            const panelId = `${baseId}-a${i}`;
            return (
              <li
                key={item.q}
                style={{ '--spot': accent.spot }}
                className={`t3q-item group/card relative isolate rounded-[20px] border transition-[background-color,border-color,box-shadow] duration-500 ${isOpen ? `${accent.open} shadow-[0_18px_40px_-26px_rgba(17,17,16,0.45)]` : 'border-[#111110]/10 bg-white/80 hover:border-[#111110]/25'}`}
              >
                {/* Cursor spotlight in the card's own accent (--spot); position
                    from --mx/--my, set on pointermove. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -z-10 rounded-[20px] bg-[radial-gradient(260px_circle_at_var(--mx,50%)_var(--my,50%),var(--spot),transparent_65%)] opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
                />
                <h3 className="m-0">
                  <button
                    id={btnId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="group/q flex w-full cursor-pointer items-center gap-[clamp(10px,1.2vw,16px)] rounded-[20px] bg-transparent px-[clamp(14px,1.6vw,22px)] py-[clamp(14px,1.4vw,18px)] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3D8B]"
                  >
                    <span aria-hidden="true" className={`flex size-8 shrink-0 items-center justify-center rounded-full font-['Inter',sans-serif] text-[12px] font-bold transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${accent.chip} ${isOpen ? 'scale-110' : 'scale-100 group-hover/q:scale-105'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1 text-[length:clamp(15px,1.35vw,19px)] font-bold leading-snug">{item.q}</span>
                    {/* + that turns into − : the vertical bar rotates flat. */}
                    <span aria-hidden="true" className={`relative flex size-9 shrink-0 items-center justify-center rounded-full border transition-[background-color,color,border-color,rotate] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? `${accent.icon} rotate-180` : 'border-[#111110]/15 bg-white text-[#111110] group-hover/q:border-[#111110]/40'}`}>
                      <span className="absolute h-[2px] w-3.5 rounded-full bg-current" />
                      <span className={`absolute h-3.5 w-[2px] rounded-full bg-current transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'rotate-90' : 'rotate-0'}`} />
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                >
                  <div className="overflow-hidden">
                    <p className={`m-0 pr-[clamp(14px,1.6vw,22px)] pb-[clamp(16px,1.6vw,20px)] pl-[calc(clamp(14px,1.6vw,22px)+2rem+clamp(10px,1.2vw,16px))] font-['Inter',sans-serif] text-[length:clamp(14px,1.1vw,16px)] leading-relaxed text-[#111110]/75 transition-[opacity,translate] duration-500 ${isOpen ? 'translate-y-0 opacity-100 delay-100' : '-translate-y-1 opacity-0'}`}>
                      {item.a}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}


// On/off switch for the newsletter section (false hides it; the shared
// background skips it automatically).
const SHOW_NEWSLETTER = true;

// "Follow the fits" reel section on/off (hidden for now — set true to bring it back).
const SHOW_FOLLOW = false;

// Newsletter CTA photos: fanned out over the panel's top-right edge.
// rot = resting tilt, depth = scroll-parallax strength, bob = idle bob speed.
// Literal position classes so Tailwind generates them.
const NEWS_PHOTOS = [
  { src: '/jewel7.webp', pos: 'right-[30%] top-[-14%] w-[clamp(110px,13vw,170px)] max-[760px]:right-[46%]', rot: -9, depth: 50, bob: 3.2 },
  { src: '/jewel1.webp', pos: 'right-[15%] top-[-24%] w-[clamp(120px,14vw,185px)] max-[760px]:right-[22%]', rot: 5, depth: 80, bob: 2.6 },
  { src: '/jewel8.webp', pos: 'right-[2%] top-[-10%] w-[clamp(105px,12.5vw,160px)] max-[760px]:right-[2%]', rot: 11, depth: 35, bob: 3.6 },
];

// Simple check — the real validation belongs to whatever service the form
// is eventually wired to.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// "Be first in line for the good stuff." newsletter CTA. Owns its form state so typing
// never re-renders the page.
// Animation (kept light — see the effect below for why):
// - the panel rises in once on arrival; the heading uses the shared scrollRise;
// - the photos fan out once from a tight stack, then drift at different
//   speeds with the scroll (parallax) and bob gently, only while on screen;
// - submit: valid email → the form swaps for a "you're on the list" note
//   with a small pop; invalid → the field shakes and shows a hint.
// Valid emails are saved via POST /api/newsletter/subscribe (welcome email +
// one-click unsubscribe; admin → Subscribers lists them).
function NewsletterSection({ scrollRef, sectionRef }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | error | sending | failed | done
  const [failMsg, setFailMsg] = useState('');
  const formRef = useRef(null);
  const doneRef = useRef(null);
  const inputId = `t3n-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const copy = getContent('home.newsletter');

  // Kept deliberately light — this section caused scroll glitches when its
  // animations were all scroll-scrubbed:
  // - the panel rises in ONCE when it arrives (not scrubbed: scaling a big
  //   panel with text + a soft shadow on every scroll frame was the heaviest
  //   thing here), then sits completely still;
  // - the photos fan out ONCE on arrival (same look as before);
  // - the photos' scroll drift (parallax) and idle bob only run while the
  //   section is actually on screen;
  // - will-change is only applied during the entrance, then cleared, so the
  //   browser isn't holding extra GPU layers for the rest of the page's life.
  // The heading still uses the shared scrollRise, like every section.
  useEffect(() => {
    const section = sectionRef.current;
    const scroller = scrollRef.current;
    if (!section || !scroller) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const panel = section.querySelector('.t3n-panel');
    const photos = Array.from(section.querySelectorAll('.t3n-photo'));
    const unrise = scrollRise(section, scroller, section.querySelectorAll('.t3n-fade'));
    if (reduced || !panel) return unrise;

    const drifts = photos.map((ph) => ph.querySelector('.t3n-drift'));
    const bobs = photos.map((ph) => ph.querySelector('.t3n-bob'));

    // Entrance (one-shot).
    // Panel only slides (no fade/scale): it stays visible, so the browser
    // paints it ahead of time while it's still just below the screen,
    // instead of painting the whole panel in one frame when the entrance
    // starts (that measured as a one-off ~70ms hitch).
    gsap.set(panel, { y: 60 });
    photos.forEach((ph, i) => gsap.set(ph, { rotation: 0, xPercent: (1 - i) * 60, yPercent: 30, scale: 0.85, opacity: 0 }));
    let entrance;
    const entranceTrigger = ScrollTrigger.create({
      trigger: section,
      scroller,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        gsap.set(panel, { willChange: 'transform' });
        gsap.set(photos, { willChange: 'transform, opacity' });
        entrance = gsap.timeline({
          onComplete: () => gsap.set([panel, ...photos], { clearProps: 'willChange' }),
        });
        entrance.to(panel, { y: 0, duration: 0.9, ease: 'power3.out' }, 0);
        photos.forEach((ph, i) => {
          entrance.to(ph, { rotation: NEWS_PHOTOS[i].rot, xPercent: 0, yPercent: 0, scale: 1, opacity: 1, duration: 1, ease: 'back.out(1.4)' }, 0.25 + i * 0.1);
        });
      },
    });

    // Parallax drift: scrubbed, but its ScrollTrigger only covers the time
    // the section is on screen, and it moves three small photo layers only.
    const drift = drifts.map((el, i) => gsap.fromTo(el, { y: NEWS_PHOTOS[i].depth * 0.5 }, {
      y: -NEWS_PHOTOS[i].depth * 0.5, ease: 'none',
      scrollTrigger: { trigger: section, scroller, start: 'top bottom', end: 'clamp(bottom top)', scrub: true },
    }));

    // Idle bob — paused whenever the section is off screen.
    const bob = bobs.map((el, i) => gsap.to(el, {
      y: -8, rotation: i % 2 ? 1.5 : -1.5, duration: NEWS_PHOTOS[i].bob, ease: 'sine.inOut', repeat: -1, yoyo: true, paused: true,
    }));
    const bobToggle = ScrollTrigger.create({
      trigger: section,
      scroller,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => bob.forEach((t) => (self.isActive ? t.play() : t.pause())),
    });

    return () => {
      unrise();
      entranceTrigger.kill();
      entrance?.kill();
      bobToggle.kill();
      drift.forEach((t) => { t.scrollTrigger?.kill(); t.kill(); });
      bob.forEach((t) => t.kill());
    };
  }, [scrollRef, sectionRef]);

  // Success pop once the confirmation note mounts.
  useEffect(() => {
    if (status !== 'done' || !doneRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = gsap.fromTo(doneRef.current, { scale: 0.85, opacity: 0, y: 10 }, { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: 'back.out(2)' });
    return () => t.kill();
  }, [status]);

  const submit = async (e) => {
    e.preventDefault();
    if (status === 'sending') return;
    if (EMAIL_RE.test(email.trim())) {
      setStatus('sending');
      try {
        await api.post('/newsletter/subscribe', { email: email.trim(), source: 'home' });
        setStatus('done');
      } catch (err) {
        setFailMsg(err.message || "We couldn't add you right now — please try again.");
        setStatus('failed');
      }
      return;
    }
    setStatus('error');
    if (formRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(formRef.current, { x: 0 }, { keyframes: { x: [0, -10, 9, -6, 4, 0] }, duration: 0.45, ease: 'power1.out' });
    }
  };

  return (
    <section ref={sectionRef} className="relative overflow-x-clip px-5 pt-[clamp(90px,11vw,150px)] pb-[clamp(16px,2vw,28px)] text-[#111110]">
      <div className="t3n-panel relative z-[1] mx-auto max-w-[1100px] rounded-[clamp(24px,3vw,40px)] bg-[#4EC5CF] px-[clamp(24px,5vw,72px)] pt-[clamp(40px,5.5vw,76px)] pb-[clamp(28px,3.4vw,44px)] shadow-[0_24px_44px_-30px_rgba(31,140,150,0.6)]">
        {/* Photos — decorative. Outer = fan-out, middle = scroll drift,
            inner = idle bob; each layer owns one transform so they never
            fight. Baked-in rounded PNG corners → 110% inside the frame. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {NEWS_PHOTOS.map((ph) => (
            <div key={ph.src} className={`t3n-photo absolute ${ph.pos}`}>
              <div className="t3n-drift">
                <div className="t3n-bob overflow-hidden rounded-[18px] border-[5px] border-white bg-white shadow-[0_22px_40px_-18px_rgba(17,17,16,0.45)]">
                  <div className="aspect-[466/600] overflow-hidden rounded-[12px]">
                    <img src={ph.src} alt="" className="h-full w-full scale-110 object-cover" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Headline spans the full width (so "Be first in line for the" fits
            on one line), starting below the photos on desktop; then two
            columns under it — subtitle left, form right (bottom-aligned,
            below the photos). Stacked on phones, under the photos. */}
        <div className="relative grid items-end gap-x-[clamp(24px,4vw,56px)] gap-y-[clamp(18px,2.6vw,28px)] min-[761px]:grid-cols-[minmax(0,1fr)_minmax(0,440px)] min-[761px]:pt-[clamp(24px,3vw,44px)] max-[760px]:pt-[clamp(120px,32vw,190px)]">
          {/* "good stuff." in the banners' Momo Signature script, white, on a
              yellow marker swoosh — same accent device as "Follow the fits". */}
          <h2 className="t3n-fade m-0 text-[length:clamp(30px,4vw,54px)] font-bold leading-[1.05] tracking-[-0.015em] min-[761px]:col-span-2">
            <span className="min-[761px]:whitespace-nowrap">{copy.heading}</span>{' '}
            <br className="max-[760px]:hidden" />
            <span className="relative inline-block whitespace-nowrap">
              <svg aria-hidden="true" viewBox="0 0 200 30" preserveAspectRatio="none" className="absolute -bottom-[0.06em] left-[-3%] h-[0.32em] w-[106%]">
                <path d="M4 20 C 50 6, 120 4, 196 14" fill="none" stroke="#F6C915" strokeWidth="14" strokeLinecap="round" />
              </svg>
              <span className="relative font-['Momo_Signature',cursive] text-[1.08em] font-normal tracking-normal text-white">{copy.script}</span>
            </span>
          </h2>

          <p className="t3n-fade m-0 max-w-[520px] self-start font-['Inter',sans-serif] text-[length:clamp(15px,1.4vw,19px)] leading-snug text-[#111110]/80">
            {copy.subtext}
          </p>

          <div className="t3n-fade min-w-0">
            {status === 'done' ? (
              <div ref={doneRef} role="status" className="flex w-full items-center gap-3 rounded-[18px] bg-white px-5 py-4 shadow-[0_16px_34px_-20px_rgba(17,17,16,0.55)]">
                <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FF3D8B] text-white"><Check size={20} strokeWidth={3} /></span>
                <span className="min-w-0">
                  <span className="block text-[length:clamp(15px,1.3vw,17px)] font-bold">{copy.doneTitle}</span>
                  <span className="block font-['Inter',sans-serif] text-[13px] text-[#111110]/65">{copy.doneText}</span>
                </span>
              </div>
            ) : (
              <form ref={formRef} onSubmit={submit} noValidate className="flex w-full gap-2.5 max-[480px]:flex-col">
                <label htmlFor={inputId} className="sr-only">Email address</label>
                <div className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-[16px] bg-white px-4 transition-shadow duration-300 ${status === 'error' ? 'shadow-[0_0_0_3px_#FF3D8B]' : 'shadow-[0_14px_30px_-18px_rgba(17,17,16,0.5)] focus-within:shadow-[0_0_0_3px_#111110]'}`}>
                  <Mail size={18} strokeWidth={2} aria-hidden="true" className="shrink-0 text-[#111110]/45" />
                  <input
                    id={inputId}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (status === 'error' || status === 'failed') setStatus('idle'); }}
                    aria-invalid={status === 'error'}
                    aria-describedby={`${inputId}-hint`}
                    className="min-w-0 flex-1 bg-transparent py-[clamp(13px,1.2vw,16px)] font-['Inter',sans-serif] text-[15px] text-[#111110] outline-none placeholder:text-[#111110]/45"
                  />
                </div>
                {/* Yellow (hero/marquee yellow) → pink on hover. */}
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="group/btn inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[16px] bg-[#F6C915] disabled:cursor-wait disabled:opacity-75 px-6 py-[clamp(13px,1.2vw,16px)] text-[15px] font-bold text-[#111110] shadow-[0_14px_30px_-18px_rgba(17,17,16,0.5)] transition-[background-color,color,translate,scale] duration-300 hover:-translate-y-0.5 hover:bg-[#FF3D8B] hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111110]"
                >
                  {status === 'sending' ? 'Joining…' : copy.buttonLabel}
                  <span aria-hidden="true" className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/btn:translate-x-1">→</span>
                </button>
              </form>
            )}
            <p id={`${inputId}-hint`} role={status === 'failed' ? 'alert' : undefined} className={`m-0 mt-3 font-['Inter',sans-serif] text-[12px] ${status === 'error' || status === 'failed' ? 'font-semibold text-[#111110]' : 'text-[#111110]/70'}`}>
              {status === 'error' ? 'Hmm, that email doesn’t look right — mind checking it?' : status === 'failed' ? failMsg : 'No spam, ever. Unsubscribe in one click.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}


// memo: App re-renders whenever useAppState refreshes categories/products
// (on mount, every 60s, and on window focus). This page takes no props, so
// without memo each of those refreshes re-rendered every section here —
// a 60–90ms main-thread hitch that showed up as a stall mid-scroll.
// First hero slide art (cream "Your" poster) — desktop / phone.
const HERO_IMG = '/poster1_desk.webp';
const HERO_IMG_M = '/poster1_mob.webp';

// Image-only hero slides (after the brand + Navratri slides). Each has a 16:9
// desktop poster and a tall phone poster; both cover the hero. `deskPos` /
// `mobilePos` pick the part that stays in view when the screen crops it.
// WebP copies are generated from the PNGs in /public.
const POSTER_SLIDES = [
  {
    key: 'navaratri',
    name: 'Navaratri Collection',
    label: 'Navaratri Collection — nine nights, endless ways to shine. Shop the collection',
    to: '/festive-glow',
    desk: '/navaratri.webp',
    mobile: '/navaratri_mobile.webp',
    mobileFallback: '/navaratri_mobile.jpeg',
    deskPos: 'object-[80%_50%]', // keeps the poster's own headline in view (NavaratriCta mirrors 80%)
    mobilePos: 'object-center',
    mobileShift: '-translate-y-[5%]', // lifts the art so the link clears the slide dots
    bg: 'bg-[#1A0503] portrait:bg-[#020001]',
    copy: 'navaratri', // "Shop the collection →" under the poster's own text (see NavaratriCta)
  },
  {
    key: 'first-order',
    darkHeader: true, // white poster → dark logo/menu, no shade
    name: '50% off your first order',
    label: '50% off your first order — valid on first orders above ₹2,000. Shop now',
    to: '/jewellery',
    desk: '/50-off-poster-desk.webp',
    mobile: '/50-off-poster-mobile.webp',
    mobileFallback: '/50-off-poster-mobile.png',
    deskPos: 'object-[95%_80%]', // keeps "50% OFF" + the fine print in view
    mobilePos: 'object-[center_60%]',
    bg: 'bg-white',
  },
  {
    key: 'top3',
    name: 'Your top 3 combo',
    label: 'Your top 3, just one combo price — pick your set',
    to: '/navratri-offers',
    copy: 'top3', // text overlay (see Top3Copy)
    desk: '/top3-poster-desk.webp',
    mobile: '/top3-poster-mobile.webp',
    mobileFallback: '/top3-poster-mobile.png',
    deskPos: 'object-[70%_30%]', // keeps both faces in view
    mobilePos: 'object-[center_70%]',
    // Phones: image nudged down so the text sits above the faces; the gap at
    // the top is filled with the poster's own orange.
    mobileShift: 'translate-y-[12%]',
    bg: 'bg-[#F59A4E] portrait:bg-[linear-gradient(to_right,#E46424_0%,#ED7232_27%,#F38541_50%,#F8914B_75%,#FB853E_100%)]',
  },
];

// "Your top 3. Just ₹999." copy on the top3 poster — left/centre on desktop,
// top/centre on phones (as in the poster mock-ups). Price follows the combo
// settings. The whole slide is the link, so the "button" is a styled span.
function Top3Copy() {
  const price = formatPrice(SETTINGS.navratriBundlePrice ?? 999).replace('₹', '');
  const count = SETTINGS.navratriBundleCount ?? 3;
  return (
    <div className="absolute z-[3] top-1/2 left-[clamp(28px,4.2vw,72px)] max-w-[44%] -translate-y-[46%] text-white portrait:top-[calc(clamp(84px,12vh,120px)+var(--announce-h,0px))] portrait:inset-x-5 portrait:max-w-none portrait:translate-y-0 portrait:text-center">
      <h2 className="m-0 text-[length:clamp(40px,5.6vw,96px)] font-black uppercase leading-[0.95] tracking-[-0.02em] [text-shadow:0_4px_28px_rgba(120,40,0,0.35)] portrait:text-[length:clamp(36px,11vw,60px)]">
        <span className="block">Your top {count}.</span>
        <span className="block">Just <span className="price-symbol">₹</span>{price}.</span>
      </h2>
      <p className="m-0 mt-[clamp(10px,1.2vw,18px)] font-['Inter',sans-serif] text-[length:clamp(16px,1.7vw,28px)] font-medium text-white/95 [text-shadow:0_2px_14px_rgba(120,40,0,0.35)] portrait:text-[length:clamp(15px,4.3vw,20px)]">
        {count === 3 ? 'Three' : count} pieces. Endless possibilities.
      </p>
      <span className="mt-[clamp(18px,2.4vw,40px)] inline-flex items-center gap-2 rounded-full bg-[#FFF8EE] px-[clamp(24px,2.6vw,44px)] py-[clamp(11px,1.15vw,18px)] font-['Inter',sans-serif] text-[length:clamp(13px,1.15vw,19px)] font-bold tracking-[0.12em] text-[#B4471A] uppercase shadow-[0_10px_30px_-8px_rgba(120,40,0,0.45)] transition-transform duration-200 group-hover:-translate-y-0.5 portrait:mt-4">
        Pick your set <ArrowRight size={18} strokeWidth={2.4} />
      </span>
    </div>
  );
}

// "Shop the collection →" on the Navaratri poster. The poster already carries
// its headline, so this sits right under it. Each box below mirrors how the
// image is scaled by object-cover — desktop art is 3840×1800 at 80% across,
// phone art 2160×3840 centred and lifted 5% — so the link lines up with the
// poster text on any screen. Keep these in sync with POSTER_SLIDES.
// The whole slide is the link; this is the visible label, gently swaying.
function NavaratriCta() {
  const label = (
    <span className="inline-flex animate-[cta-sway_2.4s_ease-in-out_infinite] items-center gap-2 whitespace-nowrap font-['Inter',sans-serif] font-semibold tracking-[0.08em] text-[#D9C7B8] uppercase transition-colors group-hover:text-white motion-reduce:animate-none">
      Shop the collection <ArrowRight size={16} strokeWidth={2.2} />
    </span>
  );
  return (
    <>
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-[calc((100cqw-max(100cqw,213.33cqh))*0.8)] z-[3] h-[max(100cqh,46.875cqw)] w-[max(100cqw,213.33cqh)] -translate-y-1/2 portrait:hidden">
        <span className="absolute top-[71%] left-[57.3%] text-[length:clamp(13px,1.05cqw,19px)]">{label}</span>
      </span>
      <span aria-hidden="true" className="pointer-events-none absolute top-[45%] left-1/2 z-[3] hidden h-[max(100cqh,177.78cqw)] w-[max(100cqw,56.25cqh)] -translate-x-1/2 -translate-y-1/2 portrait:block">
        <span className="absolute top-[94.2%] left-1/2 -translate-x-1/2 text-[length:clamp(11px,3.1cqw,14px)]">{label}</span>
      </span>
    </>
  );
}

// Set once the loading screen has played in this tab.
const INTRO_KEY = 'zunuz_intro_seen';

export default memo(HomePage);

// Hide the newsletter box for a signed-in customer who's already on the
// list (GET /api/newsletter/status). The last answer is remembered per
// customer on this device so the box doesn't show and then vanish on the
// next visit; it's re-checked on every load. Someone joining right now
// keeps seeing their "you're on the list" note (this only runs on load /
// sign-in, not after they join).
function useShowNewsletter() {
  const { customer } = useAuth();
  const id = customer?.id || null;
  const [known, setKnown] = useState(() => ({ id: null, subscribed: false }));
  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    api.get('/newsletter/status')
      .then((r) => {
        if (!alive) return;
        setKnown({ id, subscribed: !!r.subscribed });
        try { localStorage.setItem(`zunuz_news_sub_${id}`, r.subscribed ? '1' : '0'); } catch { /* ignore */ }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [id]);
  if (!id) return true;
  if (known.id === id) return !known.subscribed;
  try { return localStorage.getItem(`zunuz_news_sub_${id}`) !== '1'; } catch { return true; }
}

function HomePage() {
  const catalog = useCatalog();
  const under499 = useMemo(
    () => productsIn(catalog, null, '199-plus').filter((p) => p.price < 499).sort((a, b) => a.price - b.price).slice(0, 4),
    [catalog],
  );
  // The under ₹999 edit: the ₹499+ tier, cheapest first.
  const under999 = useMemo(
    () => productsIn(catalog, null, '499-plus').filter((p) => p.price < 999).sort((a, b) => a.price - b.price).slice(0, 4),
    [catalog],
  );
  // Editable copy (see customBg above). Plain reads — no subscriptions.
  const hero = getContent('home.hero') || {};
  const heroDefaults = CONTENT_DEFAULTS['home.hero'] || {};
  const heroHeadline = Array.isArray(hero.headline) && hero.headline.length
    ? hero.headline
    : (Array.isArray(heroDefaults.headline) ? heroDefaults.headline : ['MOOD.', 'FIT.', 'RULES.']);
  const [activeSlide, setActiveSlide] = useState(0);
  const [prevSlide, setPrevSlide] = useState(null);
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  // Slides: 0 brand hero, then the POSTER_SLIDES.
  const firstOrderSlide = 1; // first poster slide
  const totalSlides = firstOrderSlide + POSTER_SLIDES.length;
  // Header logo/menu colour per slide: dark on the light (cream/white) slides.
  const heroDarkInk = activeSlide === 0 || !!POSTER_SLIDES[activeSlide - firstOrderSlide]?.darkHeader;
  const slideNames = ['ZUNUZ Brand Hero', ...POSTER_SLIDES.map((p) => p.name)];

  const changeSlide = useCallback((nextIndex) => {
    setActiveSlide((curr) => {
      if (curr === nextIndex) return curr;
      setPrevSlide(curr);
      return nextIndex;
    });
  }, []);

  useEffect(() => {
    if (prevSlide === null) return undefined;
    const t = setTimeout(() => {
      setPrevSlide(null);
    }, 1050);
    return () => clearTimeout(t);
  }, [prevSlide]);

  // Auto-advance hero carousel slides every 7.5 seconds (5-10s interval range)
  useEffect(() => {
    if (totalSlides <= 1 || isHeroHovered) return undefined;
    const timer = setInterval(() => {
      setActiveSlide((curr) => {
        const next = (curr + 1) % totalSlides;
        setPrevSlide(curr);
        return next;
      });
    }, 7500);
    return () => clearInterval(timer);
  }, [totalSlides, isHeroHovered, activeSlide]); // activeSlide: a swipe/tap restarts the 7.5s wait

  // Swipe / drag the hero left or right to change slide (touch + mouse).
  // Horizontal moves only — vertical scrolling is left alone — and a swipe
  // doesn't also count as a tap on the slide's link.
  const swipeRef = useRef(null);
  const swipedRef = useRef(false);
  const onSwipeStart = (e) => {
    if (totalSlides <= 1 || (e.pointerType === 'mouse' && e.button !== 0)) return;
    swipeRef.current = { x: e.clientX, y: e.clientY };
    swipedRef.current = false;
  };
  const onSwipeEnd = (e) => {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    swipedRef.current = true;
    changeSlide((activeSlide + (dx < 0 ? 1 : -1) + totalSlides) % totalSlides);
  };
  const onSwipeClick = (e) => {
    if (swipedRef.current) { e.preventDefault(); e.stopPropagation(); swipedRef.current = false; }
  };

  const getSlideClasses = (index) => {
    if (activeSlide === index) {
      return 'opacity-100 z-[2] pointer-events-auto transition-opacity duration-1000 ease-in-out';
    }
    if (prevSlide === index) {
      return 'opacity-100 z-[1] pointer-events-none transition-none';
    }
    return 'opacity-0 z-0 pointer-events-none transition-none';
  };

  // Strip points (one per line in admin), shown with a ✦ between each.
  const marqueePoints = [].concat(getContent('home.marquee').text).filter(Boolean);
  // Each half of the loop repeats the points enough to fill a wide screen.
  const marqueeRun = Array.from({ length: Math.max(2, Math.ceil(4 / marqueePoints.length)) }, () => marqueePoints).flat();
  const budget = getContent('shared.budget');
  const brand = getContent('home.brand');
  const vibe = getContent('home.vibeBanner');
  const poster = getContent('home.posterBanner');
  const edit499 = getContent('home.under499');
  const follow = getContent('home.follow');
  const scrollRef = useRef(null);
  // Single child of scrollRef that Lenis measures (see useSmoothScroll).
  const scrollContentRef = useRef(null);

  const heroRef = useRef(null);
  const loaderRef = useRef(null);
  const budgetRef = useRef(null);
  const fitRef = useRef(null);
  const grwmRef = useRef(null);
  const brandRef = useRef(null);
  const shopRef = useRef(null);
  const underRef = useRef(null);
  const under699Ref = useRef(null);
  const under999Ref = useRef(null);
  const vibeStackRef = useRef(null);

  // "Wear your vibe" stack: while the cream panel slides up over the stuck
  // (full-width) banner, the banner dims — scrubbed + eased.
  useEffect(() => {
    const stack = vibeStackRef.current;
    const scroller = scrollRef.current;
    if (!stack || !scroller) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const dim = stack.querySelector('.vibe-dim');
    const cover = stack.querySelector('.vibe-cover');
    if (!dim || !cover) return undefined;
    // The banner must never scale (full width, square edges) — clear any
    // transform a previous version of this effect may have left inline.
    gsap.set(stack.querySelectorAll('.vibe-stick, .vibe-inner'), { clearProps: 'transform,scale' });
    const tl = gsap.timeline({
      scrollTrigger: { trigger: cover, scroller, start: 'top bottom', end: 'top top', scrub: 0.8 },
    });
    tl.fromTo(dim, { opacity: 0 }, { opacity: 0.45, ease: 'none' }, 0);
    // Once fully covered, hide the banner: the panel can then fade into the
    // page's shared background below (continuous with the next sections).
    const stick = stack.querySelector('.vibe-stick');
    const hideTrigger = ScrollTrigger.create({
      trigger: cover, scroller, start: 'top top',
      onEnter: () => gsap.set(stick, { autoAlpha: 0 }),
      onLeaveBack: () => gsap.set(stick, { autoAlpha: 1 }),
    });
    return () => { tl.scrollTrigger?.kill(); tl.kill(); hideTrigger.kill(); gsap.set(stick, { clearProps: 'opacity,visibility' }); };
  }, []);
  const followRef = useRef(null);
  const faqRef = useRef(null);
  const newsRef = useRef(null);
  const showNews = useShowNewsletter() && SHOW_NEWSLETTER;
  // Shop the look: which pieces have been tapped "Add" — keys `${look}-${item}`.
  // Local to this page for now; not wired to the real cart yet.
  const [addedPieces, setAddedPieces] = useState({});
  const togglePiece = (key) => setAddedPieces((prev) => ({ ...prev, [key]: !prev[key] }));
  const addFullLook = (lookIndex, count) => setAddedPieces((prev) => {
    const next = { ...prev };
    for (let i = 0; i < count; i += 1) next[`${lookIndex}-${i}`] = true;
    return next;
  });
  const bgRef = useRef(null);


  // lenisRef gives sections the live scroll velocity (Follow the fits uses it).
  const lenisRef = useSmoothScroll(scrollRef, scrollContentRef);


  // Pre-decode every photo once the page is idle after load. Large PNGs
  // otherwise decode the first time they scroll into view, which landed as
  // 50–100ms render hitches right as each new section arrived. Lazy images
  // are switched to eager so they're fetched up front too. One at a time,
  // in idle callbacks, so this never competes with interaction.
  useEffect(() => {
    const root = scrollContentRef.current;
    if (!root) return;
    let cancelled = false;
    const keep = []; // hold decoded banner images so they stay cached
    const idle = window.requestIdleCallback
      ? (cb) => window.requestIdleCallback(cb, { timeout: 2000 })
      : (cb) => setTimeout(cb, 300);
    const bannerUrls = [
      window.matchMedia('(orientation: portrait)').matches ? HERO_IMG_M : HERO_IMG,
      ...POSTER_SLIDES.map((p) => (window.matchMedia('(orientation: portrait)').matches ? p.mobile : p.desk)),
      getContent('home.vibeBanner')?.image,
      ...(SHOW_POSTER_BANNER ? [getContent('home.posterBanner')?.image] : [])
    ].filter(Boolean);
    const imgs = Array.from(root.querySelectorAll('img'));
    const jobs = [
      ...bannerUrls.map((src) => () => { const im = new Image(); im.src = src; keep.push(im); return im.decode(); }),
      ...imgs.map((img) => () => {
        if (img.loading === 'lazy') img.loading = 'eager';
        return img.decode();
      }),
    ];
    const next = () => {
      if (cancelled || !jobs.length) return;
      const job = jobs.shift();
      idle(() => {
        if (cancelled) return;
        Promise.resolve().then(job).catch(() => {}).finally(next);
      });
    };
    // Start once the hero load animation is done (it begins after the page's
    // load event and runs ~2s) so decoding never competes with it.
    const startTimer = setTimeout(next, 4500);
    return () => { cancelled = true; clearTimeout(startTimer); };
  }, []);

  // Loading screen + hero intro + hero parallax (shared with /jewel).
  // Phones (portrait) show the tall photo — preload that one for the intro.
  const [posterSrc] = useState(() => (window.matchMedia('(orientation: portrait)').matches ? HERO_IMG_M : HERO_IMG));
  // No loading screen (same as the jewellery page): the photo fades in as
  // soon as it's decoded and the headline / text animate in right after.
  // Branded loading screen only on the first visit in a browser tab
  // (sessionStorage is per tab: a new tab, or reopening the site, shows it
  // again; moving between pages or reloading in the same tab doesn't).
  const [showLoader] = useState(() => {
    try { return !sessionStorage.getItem(INTRO_KEY); } catch { return false; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(INTRO_KEY, '1'); } catch { /* private mode */ }
  }, []);
  useHeroIntro({ heroRef, loaderRef, scrollRef, posterSrc, withLoader: showLoader });

  // Budget section:
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

  // Fit budget section: title fades up, cards rise in a stagger while each
  // label slides in (prices stay static), then the link follows.
  useEffect(() => {
    const section = fitRef.current;
    const scroller = scrollRef.current;
    if (!section || !scroller) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const title = section.querySelector('.t3b-title');
    const cards = section.querySelectorAll('.t3b-card');
    const labels = section.querySelectorAll('.t3f-label');
    const link = section.querySelector('.t3b-link');

    const unrise = scrollRise(section, scroller, [title]);
    gsap.set(cards, { opacity: 0, y: 70, rotate: (i) => [-3, 0, 3][i] ?? 0 });
    gsap.set(labels, { opacity: 0, x: -14 });
    gsap.set(link, { opacity: 0, x: -12 });

    let tl;
    const trigger = ScrollTrigger.create({
      trigger: section,
      scroller,
      start: 'top 75%',
      once: true,
      onEnter: () => {
        tl = gsap.timeline();
        tl.to(cards, { opacity: 1, y: 0, rotate: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12 }, 0)
          .to(labels, { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out', stagger: 0.12 }, 0.4)
          .to(link, { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' }, '-=0.3');
      },
    });

    return () => {
      unrise();
      trigger.kill();
      tl?.kill();
    };
  }, []);

  // GRWM section: title fades up, then each look rises in (card, caption,
  // link) one after another.
  useEffect(() => {
    const section = grwmRef.current;
    const scroller = scrollRef.current;
    if (!section || !scroller) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const title = section.querySelector('.t3g-title');
    const cards = section.querySelectorAll('.t3g-card');
    const texts = section.querySelectorAll('.t3g-text');

    const unrise = scrollRise(section, scroller, [title]);
    gsap.set(cards, { opacity: 0, y: 70, scale: 0.96 });
    gsap.set(texts, { opacity: 0, y: 14 });

    let tl;
    const trigger = ScrollTrigger.create({
      trigger: section,
      scroller,
      start: 'top 75%',
      once: true,
      onEnter: () => {
        tl = gsap.timeline();
        tl.to(cards, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out', stagger: 0.12 }, 0)
          .to(texts, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.08 }, 0.4);
      },
    });

    return () => {
      unrise();
      trigger.kill();
      tl?.kill();
    };
  }, []);

  // Shared background: as each section scrolls up into view, the wash and the
  // three glows cross-fade (scrubbed to scroll, so it plays both ways) from
  // the previous section's palette to its own. The glows also drift across
  // the screen over the whole page scroll, on top of their own idle float
  // (CSS animate-t3-float-*).
  useEffect(() => {
    const scroller = scrollRef.current;
    const bg = bgRef.current;
    const content = scrollContentRef.current;
    // Each section paired with its theme (same order as SECTION_THEMES);
    // sections that aren't rendered (e.g. hidden via a SHOW_* switch) are
    // dropped so the remaining ones still blend correctly.
    const entries = [budgetRef, fitRef, grwmRef, brandRef, shopRef, underRef, under999Ref, under699Ref, followRef, faqRef, newsRef]
      .map((ref, i) => ({ el: ref.current, theme: SECTION_THEMES[i] }))
      .filter((e) => e.el);
    if (!scroller || !bg || !content || !entries.length) return;

    const glows = bg.querySelectorAll('.t3-glow');
    const drifts = bg.querySelectorAll('.t3-glow-drift');

    gsap.set(bg, { backgroundColor: entries[0].theme.base });
    glows.forEach((g, j) => gsap.set(g, { '--c': entries[0].theme.glows[j] }));

    const timelines = entries.slice(1).map(({ el: section, theme: to }, k) => {
      const from = entries[k].theme;
      // The last section can't scroll its top up to 30% (the page ends
      // first), so its blend finishes at the very bottom of the page instead.
      const isLast = k === entries.length - 2;
      const tl = gsap.timeline({
        scrollTrigger: { trigger: section, scroller, start: 'top 90%', end: isLast ? 'bottom bottom' : 'top 30%', scrub: true },
      });
      // immediateRender:false — otherwise every fromTo would stamp its
      // "from" palette onto the layer at load and the last one would win.
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
    // Re-built if the newsletter box is hidden after load (already subscribed).
  }, [showNews]);

  // Brand statement — same scroll-linked rise as every section heading:
  // the headline rises word by word (tight stagger so the line assembles
  // left to right), then the body text and the button follow on the same
  // scroll range.
  useEffect(() => {
    const section = brandRef.current;
    const scroller = scrollRef.current;
    if (!section || !scroller) return;
    const words = section.querySelectorAll('.t3v-word');
    const rest = section.querySelectorAll('.t3v-fade');
    const unWords = scrollRise(section, scroller, words, { base: 60, step: 10, gap: 0.06 });
    const unRest = scrollRise(section, scroller, rest, { at: 0.35 });
    return () => { unWords(); unRest(); };
  }, []);

  // Shop the look: title + subtitle fade up, cards rise in a stagger, then
  // each card's piece rows slide in one after another.
  useEffect(() => {
    const section = shopRef.current;
    const scroller = scrollRef.current;
    if (!section || !scroller) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const heading = section.querySelectorAll('.t3s-fade');
    const cards = section.querySelectorAll('.t3s-card');
    const rows = section.querySelectorAll('.t3s-row');

    const unrise = scrollRise(section, scroller, heading);
    gsap.set(cards, { opacity: 0, y: 70, scale: 0.96 });
    gsap.set(rows, { opacity: 0, x: -16 });

    let tl;
    const trigger = ScrollTrigger.create({
      trigger: section,
      scroller,
      start: 'top 75%',
      once: true,
      onEnter: () => {
        tl = gsap.timeline();
        tl.to(cards, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out', stagger: 0.12 }, 0)
          .to(rows, { opacity: 1, x: 0, duration: 0.45, ease: 'power2.out', stagger: 0.04 }, 0.45);
      },
    });

    return () => {
      unrise();
      trigger.kill();
      tl?.kill();
    };
  }, []);


  // Follow the fits:
  // - heading fades up, the strip fades/settles in, the link follows;
  // - the strip scrolls sideways forever (GSAP x loop over one run's width),
  //   easing to a stop while hovered;
  // - every frame each tile is curved by its distance from the centre:
  //   tiles toward the edges come closer (z) and turn inward (rotateY), so
  //   the row reads like the inside of a curved wall, taller at the sides.
  //   Positions come from untransformed layout measured once (not per
  //   frame), so the curve never feeds back into itself or forces layout;
  // - reels start a few seconds after the strip is in view, one at a time,
  //   never mid-scroll; page scroll speed live-boosts the strip and curve;
  // - the per-frame work only runs while the section is on screen.
  useEffect(() => {
    const section = followRef.current;
    const scroller = scrollRef.current;
    if (!section || !scroller) return;
    const strip = section.querySelector('.t3r-strip');
    const track = section.querySelector('.t3r-track');
    const tiles = Array.from(section.querySelectorAll('.t3r-tile'));
    const videos = Array.from(section.querySelectorAll('video'));
    if (!strip || !track || !tiles.length) return;

    // Reels are ~5MB a set: don't download them with the page (that stalled
    // the hero intro). Start buffering once the section is ~a screen away.
    const preloadIo = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      videos.forEach((v) => { if (v.preload !== 'auto') v.preload = 'auto'; });
      preloadIo.disconnect();
    }, { root: scroller, rootMargin: '100% 0px' });
    preloadIo.observe(section);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const MAX_TURN = 22; // degrees at the strip edge
    const MAX_DEPTH = 140; // px closer at the strip edge

    // Layout is measured once (and again on resize), never inside the
    // per-frame loop: reading offsetLeft right after writing a transform
    // forced a style recalc per tile per frame, which is what made page
    // scrolling stutter around this section.
    let half = 0;
    let slots = [];
    const measure = () => {
      half = strip.clientWidth / 2;
      slots = tiles.map((tile) => ({ mid: tile.offsetLeft + tile.offsetWidth / 2, width: tile.offsetWidth }));
    };

    // quickSetters skip GSAP's per-call parsing — cheap enough for every frame.
    const setTurn = tiles.map((tile) => gsap.quickSetter(tile, 'rotationY', 'deg'));
    const setDepth = tiles.map((tile) => gsap.quickSetter(tile, 'z', 'px'));

    // Video playback. Every on-screen tile plays its reel, but nothing starts
    // straight away and nothing starts mid-scroll:
    // - VIDEO_DELAY after the strip comes into view, reels start one at a
    //   time (PLAY_GAP apart), left to right;
    // - while the page is actively scrolling every reel pauses on its frame
    //   and nothing starts; once scrolling has been still for SCROLL_QUIET
    //   they resume one by one — so video work never lands mid-scroll;
    // - at most MAX_PLAYING reels play at once (nearest the centre first).
    //   Each playing video costs a slice of every frame in this 3D strip,
    //   and the strip is still partly on screen over the FAQs/newsletter —
    //   so with several playing, the whole page drops to ~30fps there and
    //   scrolling the last sections felt stuck. Measured with human-paced
    //   scrolling (bursts + 3s pauses): 3 reels → 215 slow frames,
    //   2 → 211, 1 → 1. Keep this at 1.
    // Pauses are immediate (cheap). `playing` tracks the wanted state so
    // play()/pause() only fire on changes.
    const VIDEO_DELAY = 2500; // ms after the strip comes into view
    const PLAY_GAP = 300; // ms between reel starts
    const SCROLL_QUIET = 350; // ms of no scrolling before a start may run
    const MAX_PLAYING = 1;

    let videosEnabled = false;
    let enableTimer = null;

    const playing = videos.map(() => false);
    const queue = [];
    let queueTimer = null;
    const schedule = (ms) => { if (!queueTimer) queueTimer = setTimeout(pump, ms); };
    function pump() {
      queueTimer = null;
      const sinceScroll = performance.now() - lastScrollAt;
      if (sinceScroll < SCROLL_QUIET) { schedule(SCROLL_QUIET - sinceScroll + 20); return; }
      const i = queue.shift();
      if (i !== undefined && playing[i]) videos[i]?.play().catch(() => {});
      if (queue.length) schedule(PLAY_GAP);
    }
    const setPlaying = (i, on) => {
      if (playing[i] === on) return;
      playing[i] = on;
      const v = videos[i];
      if (!v) return;
      if (on) {
        if (!queue.includes(i)) queue.push(i);
        schedule(0);
      } else {
        const q = queue.indexOf(i);
        if (q !== -1) queue.splice(q, 1);
        v.pause();
      }
    };

    let lastScrollAt = 0;
    // While the page is being scrolled, playing reels pause on their current
    // frame (so scrolling only has to move the page, not also push new video
    // frames through the 3D strip) and queue back up; pump() restarts them
    // one by one once scrolling has been quiet for SCROLL_QUIET.
    const onScroll = () => {
      lastScrollAt = performance.now();
      videos.forEach((v, i) => {
        if (!v.paused) {
          v.pause();
          if (playing[i] && !queue.includes(i)) queue.push(i);
        }
      });
      if (queue.length) schedule(SCROLL_QUIET);
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });

    // Live scroll interaction: page scroll velocity (from Lenis) speeds the
    // strip up and deepens the curve a touch, both easing back when the
    // page settles. `boost` is smoothed so it never jumps.
    let boost = 0; // 0 … 1
    let hovered = false;
    let speed = 1; // current loop timeScale

    let visible = false;
    let lastX = null;
    let lastBoost = -1;
    const curve = (force) => {
      if (!half) return;
      const x = Number(gsap.getProperty(track, 'x')) || 0;
      if (force !== true && x === lastX && Math.abs(boost - lastBoost) < 0.001) return;
      lastX = x;
      lastBoost = boost;
      const depth = MAX_DEPTH * (1 + boost * 0.6);
      const turn = MAX_TURN * (1 + boost * 0.35);
      const onScreen = [];
      slots.forEach((slot, i) => {
        const centre = slot.mid + x;
        const n = Math.max(-1.6, Math.min(1.6, (centre - half) / half));
        setTurn[i](-n * turn);
        setDepth[i](n * n * depth);
        if (centre > -slot.width / 2 && centre < half * 2 + slot.width / 2) onScreen.push([Math.abs(n), i]);
      });
      // Nearest-to-centre first, capped at MAX_PLAYING.
      onScreen.sort((a, b) => a[0] - b[0]);
      const want = new Set(videosEnabled ? onScreen.slice(0, MAX_PLAYING).map(([, i]) => i) : []);
      slots.forEach((_, i) => setPlaying(i, want.has(i)));
    };

    const tick = () => {
      const v = Math.abs(lenisRef.current?.velocity || 0);
      boost += (Math.min(v / 40, 1) - boost) * 0.08;
      const target = hovered ? 0 : 1 + boost * 3;
      speed += (target - speed) * 0.08;
      if (loop) loop.timeScale(Math.max(0, speed));
      curve(false);
    };

    let loop;
    const buildLoop = () => {
      loop?.kill();
      gsap.set(track, { x: 0 });
      measure();
      const runWidth = track.scrollWidth / 2;
      if (runWidth && !reduced) {
        loop = gsap.to(track, { x: -runWidth, duration: runWidth / 45, ease: 'none', repeat: -1 });
        loop.timeScale(speed);
        if (!visible) loop.pause();
      }
      curve(true);
    };
    buildLoop();

    const setVisible = (on) => {
      if (on === visible) return;
      visible = on;
      clearTimeout(enableTimer);
      if (on) {
        gsap.ticker.add(tick);
        loop?.play();
        enableTimer = setTimeout(() => { videosEnabled = true; curve(true); }, VIDEO_DELAY);
      } else {
        gsap.ticker.remove(tick);
        loop?.pause();
        videosEnabled = false;
      }
      curve(true);
    };
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { root: scroller, threshold: 0 });
    io.observe(section);

    const onEnter = () => { hovered = true; };
    const onLeave = () => { hovered = false; };
    strip.addEventListener('mouseenter', onEnter);
    strip.addEventListener('mouseleave', onLeave);

    const ro = new ResizeObserver(() => buildLoop());
    ro.observe(strip);

    // Entrance.
    let entrance;
    let entranceTrigger;
    const unrise = scrollRise(section, scroller, section.querySelectorAll('.t3r-fade'));
    if (!reduced) {
      const link = section.querySelector('.t3r-link');
      gsap.set(strip, { opacity: 0, y: 40 });
      gsap.set(link, { opacity: 0, x: -12 });
      entranceTrigger = ScrollTrigger.create({
        trigger: section,
        scroller,
        start: 'top 75%',
        once: true,
        onEnter: () => {
          entrance = gsap.timeline();
          entrance.to(strip, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 0.1)
            .to(link, { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' }, 0.45);
        },
      });
    }

    return () => {
      preloadIo.disconnect();
      io.disconnect();
      ro.disconnect();
      gsap.ticker.remove(tick);
      strip.removeEventListener('mouseenter', onEnter);
      strip.removeEventListener('mouseleave', onLeave);
      scroller.removeEventListener('scroll', onScroll);
      loop?.kill();
      clearTimeout(queueTimer);
      clearTimeout(enableTimer);
      unrise();
      entranceTrigger?.kill();
      entrance?.kill();
      videos.forEach((v) => v.pause());
    };
  }, [lenisRef]);

  return (
    <div className={`relative h-dvh w-full overflow-hidden bg-[#E8304F] text-white ${FONT_CLASS}`}>
      {/* React 19 hoists this into <head>; the font is only needed here. */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Momo+Signature&display=swap" />

      {/* Shared, viewport-sized background behind every section after the
          hero (the hero's own red poster covers it at the top). The glows
          are radial gradients rather than blur() filters — much cheaper to
          animate. Outer div = scroll drift (GSAP), inner = idle float (CSS). */}
      <div ref={bgRef} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-[#FFFBED]">
        <div className="t3-glow-drift absolute -top-[20vmax] -left-[15vmax] size-[70vmax]">
          <div className="t3-glow size-full animate-t3-float-a rounded-full bg-[radial-gradient(circle,var(--c)_0%,transparent_65%)] opacity-90 motion-reduce:animate-none" />
        </div>
        <div className="t3-glow-drift absolute top-[15vh] -right-[25vmax] size-[65vmax]">
          <div className="t3-glow size-full animate-t3-float-b rounded-full bg-[radial-gradient(circle,var(--c)_0%,transparent_65%)] opacity-85 motion-reduce:animate-none" />
        </div>
        <div className="t3-glow-drift absolute -bottom-[30vmax] left-[10vw] size-[75vmax]">
          <div className="t3-glow size-full animate-t3-float-c rounded-full bg-[radial-gradient(circle,var(--c)_0%,transparent_65%)] opacity-80 motion-reduce:animate-none" />
        </div>
      </div>


      {showLoader && <LandingLoader loaderRef={loaderRef} />}
      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden">
        <div ref={scrollContentRef}>

          {/* ── Hero poster: exactly 100vh — photo area 95vh, yellow strip 5vh. Header floats over it — the photo
            area fills everything above the marquee strip, so her sneakers sit
            right on top of it (as in the design) instead of being hidden
            behind it. ── */}
          <section
            ref={heroRef}
            onMouseEnter={() => setIsHeroHovered(true)}
            onMouseLeave={() => setIsHeroHovered(false)}
            className="relative flex h-dvh flex-col overflow-hidden bg-[#F3E4D3] portrait:bg-[#F5E9DC]" /* cream like the first poster — no pink blink while it fades in */
          >
            {/* Transparent header laid over the top of the poster. It lives
                inside the hero (not fixed) so it scrolls away with it rather
                than floating, white-on-cream, over the sections below. */}
            <div className="t3h-head absolute inset-x-0 top-0 z-10">
              <LandingHeader darkInk={heroDarkInk} />
            </div>

            {/* Size container (cqw/cqh) so the photo and copy scale off the
                poster area itself, not the whole window. */}
            <div
              className="relative min-h-0 flex-1 touch-pan-y overflow-hidden select-none [container-type:size]"
              onPointerDown={onSwipeStart}
              onPointerUp={onSwipeEnd}
              onPointerCancel={() => { swipeRef.current = null; }}
              onClickCapture={onSwipeClick}
              onDragStart={(e) => e.preventDefault()}
            >
              {/* ── Slide 0: Main Brand Hero ── */}
              <div
                className={`absolute inset-0 ${getSlideClasses(0)}`}
              >
                {/* Matches the design: photo ~106% of the poster width (never
                    less than what's needed to fill the height), positioned so
                    the baked-in "Your" and the woman sit where they do in the
                    reference. Portrait screens fall back to cover. */}
                <div
                  role="img"
                  aria-label="Smiling woman sitting cross-legged in front of a large faded word Your"
                  className="t3h-photo absolute inset-0 bg-[#F3E4D3] bg-[image:var(--hero-img)] bg-no-repeat bg-[length:max(100cqw,213.4cqh)_auto] bg-[position:40%_60%] portrait:bg-[image:var(--hero-img-m)] portrait:bg-[#F5E9DC] portrait:bg-[length:auto_max(calc(100cqh-var(--announce-h,0px)-44px),177.8cqw)] portrait:bg-[position:right_bottom]"
                  style={{ '--hero-img': `url("${HERO_IMG}")`, '--hero-img-m': `url("${HERO_IMG_M}")` }}
                />
                {/* Phones: the photo is bottom-anchored, so a strip of plain fill sits
                    above it. This short fade (fill → transparent) starts just above
                    the photo's top edge (same formula as its size) and hides the join. */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[calc(100cqh-max(calc(100cqh-var(--announce-h,0px)-44px),177.8cqw)-4px)] hidden h-[56px] bg-[linear-gradient(to_bottom,#F5E9DC_0%,rgba(245,233,220,0.85)_30%,rgba(245,233,220,0)_100%)] portrait:block" />
                {/* Phones: soft dark fade at the bottom so the centred copy stays readable */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[42%] bg-[linear-gradient(to_top,rgba(17,17,16,0.62),rgba(17,17,16,0.28)_55%,transparent)] portrait:block" />

                {/* Copy block */}
                <div className="t3h-copy absolute top-[20%] right-[4%] left-[56%] z-[1] portrait:top-[calc(clamp(72px,11vh,110px)+var(--announce-h,0px))] portrait:right-5 portrait:bottom-[10%] portrait:left-5 portrait:flex portrait:flex-col">
                  <h1 aria-label={heroHeadline.map((l) => `Your ${l.toLowerCase()}`).join(' ')} className="mt-[25px] portrait:mt-2 pl-[min(calc(0.4*(100cqw-max(100cqw,213.4cqh))+0.66*max(100cqw,213.4cqh)-56cqw),calc(40cqw-3.3em))] portrait:self-end portrait:text-left text-[90px] font-bold leading-[0.98] tracking-[-0.01em] portrait:pl-0 text-[#B07E49] [text-shadow:0_2px_8px_rgba(176,126,73,0.08)] portrait:text-[length:clamp(42px,13vw,72px)]">
                    {heroHeadline.map((line, i) => (
                      <span key={i} className="-mx-[0.1em] -my-[0.08em] block overflow-hidden px-[0.1em] py-[0.08em]">
                        <span className="t3-line block">{line}</span>
                      </span>
                    ))}
                  </h1>
                  <div className="portrait:mt-auto portrait:text-center">
                    <p className="t3h-sub mt-[clamp(14px,1.8cqw,28px)] text-[length:clamp(15px,1.65vw,24px)] font-semibold text-[#111110] [text-shadow:0_2px_8px_rgba(255,255,255,0.3)] portrait:text-white portrait:[text-shadow:0_2px_12px_rgba(0,0,0,0.45),0_1px_3px_rgba(0,0,0,0.5)] portrait:mt-0 portrait:text-[length:clamp(15px,4.2vw,20px)] portrait:leading-snug">
                      {hero.tagline}
                    </p>
                    <p className="t3h-sub mt-[0.45em] text-[length:clamp(15px,1.65vw,24px)] font-normal text-[#111110]/75 portrait:text-white portrait:[text-shadow:0_2px_12px_rgba(0,0,0,0.45),0_1px_3px_rgba(0,0,0,0.5)] portrait:text-[length:clamp(14px,3.9vw,18px)]">
                      {SHOW_CLOTHING ? `${hero.priceLine} · Clothing from ₹499` : hero.priceLine}
                    </p>
                    <div className="mt-[clamp(20px,2.4vw,32px)] flex flex-wrap gap-3 portrait:mt-4 portrait:justify-center">
                      {SHOW_CLOTHING && (
                        <Link
                          to="/jewellery"
                          className="t3h-btn inline-flex items-center justify-center rounded-full border-2 border-[#111110] bg-[#111110] px-[clamp(24px,2.2vw,34px)] py-3 text-[length:clamp(14px,1.15vw,17px)] font-semibold text-white no-underline transition-[background-color,color,border-color,translate] duration-[250ms] ease-in-out hover:-translate-y-0.5 hover:border-[#F6C915] hover:bg-[#F6C915] hover:text-[#111110] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white"
                        >
                          Shop Clothes
                        </Link>
                      )}
                      <Link
                        to={hero.buttonLink}
                        className="t3h-btn inline-flex items-center justify-center rounded-full border-2 border-[#111110] bg-[#111110] px-[clamp(24px,2.2vw,34px)] py-3 text-[length:clamp(14px,1.15vw,17px)] font-semibold text-white no-underline transition-[background-color,color,border-color,translate] duration-[250ms] ease-in-out hover:-translate-y-0.5 hover:border-[#B07E49] hover:bg-[#B07E49] hover:text-white portrait:border-white portrait:hover:border-[#B07E49] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white portrait:bg-white portrait:px-8 portrait:text-[#B07E49] portrait:hover:bg-[#B07E49] portrait:hover:text-white portrait:shadow-[0_10px_24px_-10px_rgba(0,0,0,0.5)]"
                      >
                        {hero.buttonLabel}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Poster slides (POSTER_SLIDES) — desktop / phone art ── */}
              {POSTER_SLIDES.map((poster, i) => (
                <Link
                  key={poster.key}
                  to={poster.to}
                  aria-label={poster.label}
                  className={`group absolute inset-0 block ${poster.bg} ${getSlideClasses(firstOrderSlide + i)}`}
                >
                  {/* Desktop: poster covers the whole hero */}
                  <img
                    src={poster.desk}
                    alt=""
                    decoding="async"
                    className={`absolute inset-0 size-full object-cover ${poster.deskPos} portrait:hidden`}
                  />
                  {/* Phones: tall poster, full-bleed */}
                  <picture className="hidden portrait:block">
                    <source srcSet={poster.mobile} type="image/webp" />
                    <img
                      src={poster.mobileFallback}
                      alt=""
                      decoding="async"
                      className={`absolute inset-0 size-full object-cover ${poster.mobilePos} ${poster.mobileShift || ''}`}
                    />
                  </picture>
                  {/* Soft shade at the top so the white header reads (dark slides only;
                      light slides switch the header to dark ink instead). */}
                  {poster.darkHeader && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[clamp(110px,16vh,160px)] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.55)_50%,rgba(255,255,255,0)_100%)]" />}
                  {!poster.darkHeader && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[clamp(110px,18vh,170px)] bg-[linear-gradient(to_bottom,rgba(17,17,16,0.62)_0%,rgba(17,17,16,0.25)_55%,transparent_100%)]" />}
                  {poster.copy === 'top3' && <Top3Copy />}
                  {poster.copy === 'navaratri' && <NavaratriCta />}
                </Link>
              ))}

              {/* ── Slide indicators ── */}
              {totalSlides > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full portrait:left-auto portrait:right-6 portrait:translate-x-0 border border-white/40 bg-white/20 px-3.5 py-1.5 shadow-[0_8px_24px_-8px_rgba(17,17,16,0.35),inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-xl backdrop-saturate-150">
                  {slideNames.map((name, i) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => changeSlide(i)}
                      aria-label={`Slide ${i + 1}: ${name}`}
                      aria-current={activeSlide === i ? 'true' : undefined}
                      className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer border-0 ${
                        activeSlide === i ? 'w-6 bg-white shadow-[0_1px_4px_rgba(17,17,16,0.3)]' : 'w-2.5 bg-white/45 hover:bg-white/80'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Scrolling strip ── */}
            <div className="t3h-strip relative z-[2] flex h-[5dvh] shrink-0 items-center overflow-hidden whitespace-nowrap bg-[#F6C915] text-[length:clamp(13px,1.15vw,16px)] text-[#111110]">
              <div className="inline-flex animate-t3-marquee motion-reduce:animate-none">
                {[0, 1].map((rep) => (
                  <div key={rep} aria-hidden={rep === 1} className="inline-flex items-center">
                    {marqueeRun.map((point, i) => (
                      <span key={i} className="inline-flex items-center gap-[clamp(14px,1.6vw,22px)] pr-[clamp(14px,1.6vw,22px)]">
                        <span className="font-semibold">{point}</span>
                        <Sparkle size={15} />
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Jewellery, by budget ── */}
          <section ref={budgetRef} className="relative overflow-hidden px-5 pt-[clamp(56px,7vw,96px)] pb-[clamp(64px,8vw,10px)] text-[#111110]">
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
                    <BudgetCardPhotos tier={`${card.price}-plus`} fallback={budget[`card${ci + 1}Image`]} alt={`Jewellery from ₹${card.price}`} delay={ci * 1200} />
                    <div className="absolute inset-x-0 bottom-0 z-[1] px-[clamp(16px,1.8vw,26px)] pb-[clamp(18px,2vw,28px)]">
                      <p className="mb-[0.3em] text-[length:clamp(24px,2.6vw,38px)] font-bold leading-none">
                        ₹{card.price}+
                      </p>
                      <p className="m-0 max-w-[32ch] text-[length:clamp(12px,1vw,14px)] font-medium leading-[1.35] opacity-95 max-[760px]:text-[13px]">{budget[`card${ci + 1}Copy`]}</p>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="flex justify-end">
                <Link to="/jewellery" className="t3b-link group/link mt-[clamp(20px,2.6vw,34px)] inline-flex items-center gap-1.5 text-[length:clamp(16px,1.6vw,22px)] font-bold text-[#1A6FE8] no-underline underline-offset-4 hover:underline">
                  {budget.linkLabel} <span className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/link:translate-x-1.5" aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </section>

          {SHOW_CLOTHING && (<>
          {/* ── The fit budget check ── same card treatment as the budget section. */}
          <section ref={fitRef} className="relative overflow-hidden px-5 pt-6 pb-[clamp(64px,8vw,10px)] text-[#111110]">
            <div className="relative z-[1] mx-auto max-w-[1100px]">
              <h2 className="t3b-title m-0 text-[length:clamp(28px,4.2vw,60px)] font-bold leading-[1.1] tracking-[-0.01em]">The fit budget check</h2>

              <div className="mt-[clamp(28px,3.6vw,48px)] grid grid-cols-3 gap-[clamp(12px,1.6vw,22px)] max-[760px]:-mx-5 max-[760px]:flex max-[760px]:snap-x max-[760px]:snap-mandatory max-[760px]:scroll-pl-5 max-[760px]:overflow-x-auto max-[760px]:px-5 max-[760px]:pt-2 max-[760px]:pb-3">
                {FIT_CARDS.map((card) => (
                  <Link key={card.price} to={`/shop?tier=${card.price}-plus`} className={`t3b-card group relative isolate block aspect-[466/600] overflow-hidden rounded-[clamp(18px,2vw,28px)] no-underline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#1A6FE8] max-[760px]:shrink-0 max-[760px]:basis-[72%] max-[760px]:snap-start ${card.textClass}`}>
                    <img className="absolute inset-0 h-full w-full scale-100 object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]" src={card.image} alt={`Outfits from ₹${card.price.toLocaleString('en-IN')}`} />
                    <p className="t3f-label absolute top-[clamp(16px,2vw,26px)] left-[clamp(16px,2vw,26px)] m-0 text-[length:clamp(12px,1vw,15px)] font-bold leading-[1.25]">
                      {card.label[0]}<br />{card.label[1]}
                    </p>
                    <p className="absolute right-[clamp(14px,1.6vw,22px)] bottom-[clamp(12px,1.4vw,20px)] m-0 text-[length:clamp(26px,2.8vw,42px)] font-bold leading-none tracking-[-0.01em]">
                      ₹{card.price.toLocaleString('en-IN')}+
                    </p>
                  </Link>
                ))}
              </div>

              <div className="flex justify-end">
                <a href="/products" className="t3b-link group/link mt-[clamp(20px,2.6vw,34px)] inline-flex items-center gap-1.5 text-[length:clamp(16px,1.6vw,22px)] font-bold text-[#1A6FE8] no-underline underline-offset-4 hover:underline">
                  Shop clothing <span className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/link:translate-x-1.5" aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </section>
          </>)}

          {SHOW_CLOTHING && (<>
          {/* ── GRWM: what are we wearing? ── */}
          <section ref={grwmRef} className="relative overflow-hidden px-5 pt-6 pb-[clamp(64px,8vw,110px)] text-[#111110]">
            <div className="relative z-[1] mx-auto max-w-[1100px]">
              <h2 className="t3g-title m-0 text-[length:clamp(28px,4.2vw,60px)] font-bold leading-[1.1] tracking-[-0.01em]">
                <span className="text-[#FF3D8B]">GRWM:</span> what are we wearing?
              </h2>

              {/* Phones: a swipeable strip, same as the budget sections. */}
              <div className="mt-[clamp(24px,3vw,40px)] grid grid-cols-3 gap-[clamp(12px,1.6vw,22px)] max-[760px]:-mx-5 max-[760px]:flex max-[760px]:snap-x max-[760px]:snap-mandatory max-[760px]:scroll-pl-5 max-[760px]:overflow-x-auto max-[760px]:px-5 max-[760px]:pt-2 max-[760px]:pb-3">
                {GRWM_LOOKS.map((look) => (
                  <div key={look.image} className="max-[760px]:shrink-0 max-[760px]:basis-[72%] max-[760px]:snap-start">
                    {/* Same baked-in rounded PNG corners as the budget cards,
                        so the photo sits at 110% to keep the card's own
                        radius as the visible edge. */}
                    <a href="/products" aria-label={`Shop the look: ${look.caption}`} className="t3g-card group relative isolate block aspect-[463/700] overflow-hidden rounded-[clamp(18px,2vw,28px)] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#1A6FE8]">
                      <img className="absolute inset-0 h-full w-full scale-110 object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.16]" src={look.image} alt="" />
                      {/* Play badge: soft ping ring behind a frosted triangle. */}
                      <span aria-hidden="true" className="absolute right-[clamp(14px,1.6vw,22px)] bottom-[clamp(14px,1.6vw,22px)] flex size-[clamp(36px,3.4vw,50px)] items-center justify-center">
                        <span className="absolute inset-0 animate-ping rounded-full bg-white/30 [animation-duration:2.4s] motion-reduce:animate-none" />
                        <span className="relative flex size-full items-center justify-center rounded-full bg-white/25 backdrop-blur-sm transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110">
                          <svg viewBox="0 0 24 24" className="ml-[8%] size-[45%]" fill="white" fillOpacity="0.9"><path d="M7 4.5v15a1 1 0 0 0 1.52.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5z" /></svg>
                        </span>
                      </span>
                    </a>
                    <p className="t3g-text mt-[clamp(10px,1.2vw,16px)] text-[length:clamp(15px,1.5vw,21px)] font-semibold leading-tight">{look.caption}</p>
                    <a href="/products" className="t3g-text group/link mt-1 inline-flex items-center gap-1 text-[length:clamp(12px,1vw,14px)] font-semibold text-[#1A6FE8] no-underline underline-offset-4 hover:underline">
                      Shop this look <span className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/link:translate-x-1" aria-hidden="true">→</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </section>
          </>)}

          {/* ── For every version of you ── */}
          <section ref={brandRef} className="relative flex min-h-[clamp(560px,92vh,900px)] items-center justify-center overflow-hidden px-5 py-[clamp(80px,11vw,160px)] text-center text-[#111110]">
            {/* Floating image wall, faded right back. Columns drift up/down
                forever at different speeds (CSS animate-t3-col-*); phones
                show the first three columns only. */}
            {/* The mask fades the wall to nothing at its top and bottom edges,
                so it melts into the sections around it instead of ending in
                a hard line. */}
            <div aria-hidden="true" className="brand-wall pointer-events-none absolute inset-0 flex gap-[clamp(10px,1.2vw,18px)] px-[clamp(10px,1.2vw,18px)] opacity-[0.25] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]">
              {BRAND_WALL.map((col, c) => (
                <div key={c} className={`relative min-w-0 flex-1 ${c > 2 ? 'max-[760px]:hidden' : ''}`} style={{ marginTop: col.offset }}>
                  <div
                    className={`flex flex-col motion-reduce:animate-none ${col.dir === 'up' ? 'animate-t3-col-up' : 'animate-t3-col-down'}`}
                    style={{ animationDuration: col.duration }}
                  >
                    {/* Rendered twice for a seamless -50% loop. Spacing is
                        bottom padding (not gap) so both halves are identical. */}
                    {[...col.tiles, ...col.tiles].map(([src, shape], i) => (
                      <div key={i} className="shrink-0 pb-[clamp(10px,1.2vw,18px)]">
                        {/* Photos have baked-in rounded PNG corners — 110%
                            keeps the tile's own radius as the visible edge. */}
                        <div className={`${shape} overflow-hidden rounded-[clamp(14px,1.6vw,22px)]`}>
                          <img src={src} alt="" loading="lazy" className="h-full w-full scale-110 object-cover" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* Soft cream glow behind the copy so it reads clearly over the wall. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_center,rgba(255,253,247,0.95)_0%,rgba(255,253,247,0.75)_45%,rgba(255,253,247,0)_100%)]" />

            <div className="relative z-[2] mx-auto max-w-[900px]">
              <h2 aria-label={brand.headline} className="m-0 text-[length:clamp(34px,5.2vw,76px)] font-bold leading-[1.1] tracking-[-0.01em] text-[#FF3D8B] [text-shadow:0_2px_6px_rgba(0,0,0,0.2),0_1px_1px_rgba(0,0,0,0.2)]">
                {brand.headline.split(' ').filter(Boolean).map((word, i) => (
                  <span key={i} aria-hidden="true" className="t3v-word mr-[0.25em] inline-block last:mr-0">{word}</span>
                ))}
              </h2>
              {/* First sentence stays on one line from 640px up; narrower
                  phones can't fit it, so it wraps there. */}
              <p className="t3v-fade mx-auto mt-[clamp(16px,2vw,28px)] font-['Inter',sans-serif] text-[length:clamp(14px,1.3vw,18px)] font-medium leading-snug">
                <span className="min-[640px]:whitespace-nowrap">{brand.line1}</span>
                <br className="max-[560px]:hidden" />{' '}
                {brand.line2}
              </p>
              {/* No brand/about page yet — points at the jewellery page. */}
              {/* Pink pill (matches the headline) → flips to the hero/marquee
                  yellow on hover, with dark text like the hero's Shop Clothes
                  button (white on yellow is too faint); the arrow sits in its
                  own white circle and nudges forward. */}
              <Link to={brand.buttonLink} className="t3v-fade group/link mt-[clamp(24px,3vw,40px)] inline-flex items-center gap-3 rounded-full bg-[#FF3D8B] py-[clamp(6px,0.6vw,8px)] pr-[clamp(6px,0.6vw,8px)] pl-[clamp(20px,2vw,28px)] text-[length:clamp(15px,1.3vw,18px)] font-bold text-white no-underline shadow-[0_10px_24px_-10px_rgba(255,61,139,0.7)] transition-[background-color,color,box-shadow,translate] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-[#F6C915] hover:text-[#111110] hover:shadow-[0_14px_28px_-10px_rgba(246,201,21,0.8)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF3D8B]">
                {brand.buttonLabel}
                <span aria-hidden="true" className="flex size-[clamp(32px,2.8vw,40px)] items-center justify-center rounded-full bg-white text-[#FF3D8B] transition-[color,translate] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/link:translate-x-1 group-hover/link:text-[#111110]">→</span>
              </Link>
            </div>
          </section>

          {SHOW_CLOTHING && (<>
          {/* ── Shop the look ── */}
          <section ref={shopRef} className="relative overflow-hidden px-5 pt-[clamp(40px,6vw,80px)] pb-[clamp(64px,8vw,110px)] text-[#111110]">
            <div className="relative z-[1] mx-auto max-w-[1100px]">
              <h2 className="t3s-fade m-0 text-[length:clamp(28px,4.2vw,60px)] font-bold leading-[1.1] tracking-[-0.01em]">Shop the look</h2>
              <p className="t3s-fade mt-[0.4em] text-[length:clamp(16px,1.6vw,24px)] font-semibold text-[#F6C915]">Every piece is tappable. Add one or add the lot.</p>

              {/* Phones: a swipeable strip, same as the other card sections. */}
              <div className="mt-[clamp(20px,2.6vw,34px)] grid grid-cols-3 gap-[clamp(12px,1.6vw,22px)] max-[760px]:-mx-5 max-[760px]:flex max-[760px]:snap-x max-[760px]:snap-mandatory max-[760px]:scroll-pl-5 max-[760px]:overflow-x-auto max-[760px]:px-5 max-[760px]:pt-2 max-[760px]:pb-3">
                {SHOP_LOOKS.map((look, li) => {
                  const addedCount = look.pieces.filter((_, pi) => addedPieces[`${li}-${pi}`]).length;
                  const allAdded = addedCount === look.pieces.length;
                  return (
                    <div key={look.title} style={{ '--accent': look.accent }} className="t3s-card flex flex-col rounded-[clamp(18px,2vw,26px)] bg-[#EEF0E2] p-[clamp(6px,0.6vw,8px)] max-[760px]:shrink-0 max-[760px]:basis-[80%] max-[760px]:snap-start">
                      {/* Photos have baked-in rounded PNG corners — 110% keeps
                          the frame's own radius as the visible edge. */}
                      <div className="group relative isolate aspect-[2/2] overflow-hidden rounded-[clamp(14px,1.6vw,20px)]">
                        <img className="absolute inset-0 h-full w-full scale-100 object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]" src={look.image} alt={look.title} />
                      </div>

                      {/* Everything below the photo takes the look's accent
                          colour from --accent (set per card via style). */}
                      <div className="flex flex-1 flex-col px-[clamp(4px,0.6vw,8px)] pt-[clamp(12px,1.4vw,18px)] pb-[clamp(4px,0.6vw,8px)]">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="m-0 text-[length:clamp(17px,1.5vw,21px)] font-bold">{look.title}</h3>
                          <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--accent)_16%,white)] px-2.5 py-1 font-['Inter',sans-serif] text-[11px] font-semibold text-[#111110]/70">
                            {look.pieces.length} pieces
                          </span>
                        </div>

                        <ul className="m-0 mt-[clamp(10px,1.1vw,14px)] flex list-none flex-col gap-[clamp(6px,0.6vw,8px)] p-0">
                          {look.pieces.map((piece, pi) => {
                            const key = `${li}-${pi}`;
                            const added = !!addedPieces[key];
                            return (
                              <li
                                key={pi}
                                className={`t3s-row flex items-center gap-3 rounded-[14px] border p-[clamp(6px,0.6vw,8px)] pr-[clamp(6px,0.6vw,8px)] transition-[background-color,border-color] duration-300 ${added ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,white)]' : 'border-transparent bg-white'}`}
                              >
                                <span aria-hidden="true" className="flex size-[clamp(28px,2.4vw,34px)] shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_18%,white)] text-[12px] font-bold text-[#111110]">
                                  {pi + 1}
                                </span>
                                <span className="min-w-0 flex-1 leading-tight">
                                  <span className="block truncate text-[length:clamp(13px,1.05vw,15px)] font-semibold">{piece.name}</span>
                                  <span className="block font-['Inter',sans-serif] text-[length:clamp(11px,0.9vw,13px)] text-[#111110]/60">₹{piece.price.toLocaleString('en-IN')}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePiece(key)}
                                  aria-pressed={added}
                                  aria-label={`${added ? 'Remove' : 'Add'} ${piece.name} from ${look.title}`}
                                  className={`flex size-[clamp(32px,2.6vw,38px)] shrink-0 cursor-pointer items-center justify-center rounded-full border-2 text-[18px] leading-none font-bold transition-[background-color,color,border-color,rotate,scale] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${added ? 'rotate-[360deg] border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-[#111110]/15 bg-white text-[#111110] hover:border-[var(--accent)] hover:text-[var(--accent)]'}`}
                                >
                                  {added ? '✓' : '+'}
                                </button>
                              </li>
                            );
                          })}
                        </ul>

                        {/* How much of the look is in the bag. */}
                        <div className="mt-[clamp(12px,1.3vw,16px)] mb-[clamp(12px,1.3vw,16px)]">
                          <div className="h-1.5 overflow-hidden rounded-full bg-[#111110]/10">
                            <div
                              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                              style={{ width: `${(addedCount / look.pieces.length) * 100}%` }}
                            />
                          </div>
                          <p className="m-0 mt-1.5 font-['Inter',sans-serif] text-[11px] font-medium text-[#111110]/60">
                            {addedCount} of {look.pieces.length} added
                          </p>
                        </div>

                        {/* Black pill with the price in its own chip → yellow
                            on hover (same yellow as the hero); switches to the
                            accent once the whole look is in. */}
                        <button
                          type="button"
                          onClick={() => addFullLook(li, look.pieces.length)}
                          className={`group/full mt-auto flex w-full cursor-pointer items-center justify-between rounded-full py-[clamp(6px,0.6vw,8px)] pr-[clamp(6px,0.6vw,8px)] pl-[clamp(16px,1.6vw,22px)] text-[length:clamp(13px,1.1vw,15px)] font-bold transition-[background-color,color,translate] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--accent)] ${allAdded ? 'bg-[var(--accent)] text-white' : 'bg-[#111110] text-white hover:bg-[#F6C915] hover:text-[#111110]'}`}
                        >
                          <span>{allAdded ? 'Full look added ✓' : 'Add full look'}</span>
                          <span className={`rounded-full px-[clamp(12px,1.2vw,16px)] py-[clamp(6px,0.6vw,8px)] ${allAdded ? 'bg-white/25 text-white' : 'bg-white text-[#111110]'}`}>
                            ₹{look.total.toLocaleString('en-IN')}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
          </>)}

          {/* ── Wear your vibe ── full-bleed banner at the photo's own 16:9 ratio,
              so bg-cover shows the whole image with no zoom or crop.
              It sticks (bottom-aligned when taller than the screen) while the
              price edits below slide up over it as a cream panel (square
              edges, full width); the banner dims underneath (vibeStackRef). */}
          <div ref={vibeStackRef} className="relative">
          <div className="vibe-stick sticky motion-reduce:static top-[min(0px,calc(100dvh-56.25vw))] z-0 max-[700px]:top-[min(0px,calc(100dvh-133.34vw))]">
          <div className="vibe-inner relative">
          <ScriptBanner
            scrollRef={scrollRef}
            text={vibe.text}
            className="bg-[#E8520F] bg-[url(/vibe_banner.webp)] max-[700px]:aspect-[3/4] max-[700px]:bg-[url(/vibe_banner_mobile.webp)]" /* phones: tall photo */
            style={customBg(vibe.image, CONTENT_DEFAULTS['home.vibeBanner'].image)}
            textClassName="items-center pt-[12%] max-[700px]:items-end max-[700px]:pt-0 max-[700px]:pb-[16%]"
          />
          <div aria-hidden="true" className="vibe-dim pointer-events-none absolute inset-0 bg-[#111110] opacity-0" />
          </div>
          </div>

          <div className="vibe-cover relative z-[1] overflow-hidden bg-[linear-gradient(180deg,#FFF8E7_0,#FFF8E7_100dvh,rgba(255,248,231,0)_calc(100dvh+420px))]">

          {/* ── The under ₹499 edit ── real products from the ₹199+ tier
              (cheapest first); hidden until that tier has products. */}
          {under499.length > 0 && (
            <PriceEdit
              scrollRef={scrollRef}
              sectionRef={underRef}
              title={edit499.title}
              subtitle={edit499.subtitle}
              linkText={edit499.linkLabel}
              linkHref="/shop?tier=199-plus"
              items={under499}
              imageAspect="aspect-[4/5]"
              /* tighter bottom when the ₹999 edit follows straight after */
              sectionClassName={under999.length > 0 ? 'pt-[clamp(48px,6vw,88px)] pb-[clamp(20px,2.5vw,36px)]' : undefined}
            />
          )}

          {/* ── The under ₹999 edit ── same layout, ₹499+ tier (₹499–₹998);
              hidden until that tier has products. */}
          {under999.length > 0 && (
            <PriceEdit
              scrollRef={scrollRef}
              sectionRef={under999Ref}
              title="The under ₹999 edit"
              subtitle="A little more sparkle, still under a grand."
              linkText="Shop under ₹999"
              linkHref="/shop?tier=499-plus"
              items={under999}
              imageAspect="aspect-[4/5]"
              sectionClassName="pt-[clamp(20px,2.5vw,36px)] pb-[clamp(64px,8vw,110px)]"
            />
          )}
          </div>
          </div>

          {/* ── Poster 3 ── same writing banner. The photo is light (beige
              wall, cream dress), so a soft dark wash rises from the bottom
              and the phrase sits low across the dresses where it can read. */}
          {SHOW_POSTER_BANNER && (
          <ScriptBanner
            scrollRef={scrollRef}
            text={poster.text}
            className="bg-[#D8C3AD] bg-[url(/poster3.png)]"
            style={customBg(poster.image, CONTENT_DEFAULTS['home.posterBanner'].image)}
            overlay
            textClassName="items-end pb-[6%]"
          />
          )}

          {SHOW_CLOTHING && (<>
          {/* ── The under ₹699 edit ── */}
          <PriceEdit
            scrollRef={scrollRef}
            sectionRef={under699Ref}
            title="The under ₹699 edit"
            subtitle="Cute doesn't have to cost a lot."
            linkText="Shop under ₹699"
            items={[] /* clothing products, once a Clothing category exists */}
            imageAspect="aspect-[326/400]"
          />
          </>)}

          {/* ── Follow the fits ── curved, endlessly looping reel strip. */}
          {SHOW_FOLLOW && (
          <section ref={followRef} className="relative overflow-hidden pt-[clamp(8px,1vw,16px)] pb-[clamp(48px,6vw,80px)] text-[#111110]">
            <div className="relative z-[1] mx-auto flex max-w-[1100px] items-center justify-between gap-8 px-5">
              <div className="min-w-0">
                {/* Handle tag */}
                <a
                  href="https://www.instagram.com/zunuz_official/"
                  target="_blank"
                  rel="noreferrer"
                  className="t3r-fade inline-flex items-center gap-2 rounded-full border border-[#FF3D8B]/25 bg-white/80 px-3.5 py-1.5 font-['Inter',sans-serif] text-[13px] font-semibold text-[#111110] no-underline shadow-[0_6px_18px_-12px_rgba(255,61,139,0.6)] backdrop-blur-sm transition-colors hover:border-[#FF3D8B]"
                >
                  {/* lucide-react in this project has no brand icons — inline glyph. */}
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#FF3D8B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                  @zunuz_official
                </a>

                {/* "Follow the" bold + "fits" in the banners' Momo Signature
                    script, pink, with a yellow marker swoosh and a sparkle. */}
                <h2 className="t3r-fade m-0 mt-[clamp(14px,1.6vw,22px)] text-[length:clamp(34px,5.2vw,76px)] font-bold leading-[1.02] tracking-[-0.015em]">
                  Follow the{' '}
                  <span className="relative inline-block whitespace-nowrap">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 200 30"
                      preserveAspectRatio="none"
                      className="absolute -bottom-[0.02em] left-[-4%] -z-0 h-[0.34em] w-[108%]"
                    >
                      <path d="M4 20 C 50 6, 120 4, 196 14" fill="none" stroke="#F6C915" strokeWidth="14" strokeLinecap="round" />
                    </svg>
                    <span className="relative font-['Momo_Signature',cursive] text-[1.12em] font-normal tracking-normal text-[#FF3D8B]">fits</span>
                    <span aria-hidden="true" className="absolute -top-[0.18em] -right-[0.42em] text-[0.34em]">
                      <svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M12 0c.9 6.6 5.4 11.1 12 12-6.6.9-11.1 5.4-12 12-.9-6.6-5.4-11.1-12-12C6.6 11.1 11.1 6.6 12 0z" fill="#4EB8C9" /></svg>
                    </span>
                  </span>
                </h2>

                <p className="t3r-fade mt-[clamp(12px,1.4vw,18px)] max-w-[600px] font-['Inter',sans-serif] text-[length:clamp(16px,1.6vw,22px)] leading-snug text-[#111110]/80">
                  {follow.description}
                </p>

                {/* What's on the feed — page accent colours. */}
                <ul className="t3r-fade m-0 mt-[clamp(14px,1.6vw,20px)] flex list-none flex-wrap gap-2 p-0">
                  <li className="rounded-full bg-[#F6C915] px-3.5 py-1.5 text-[13px] font-semibold text-[#111110]">Fit checks</li>
                  <li className="rounded-full bg-[#FF3D8B] px-3.5 py-1.5 text-[13px] font-semibold text-white">Styling ideas</li>
                  <li className="rounded-full bg-[#4EB8C9] px-3.5 py-1.5 text-[13px] font-semibold text-white">New drops</li>
                </ul>

                <p className="t3r-fade mt-[clamp(12px,1.3vw,16px)] font-['Inter',sans-serif] text-[length:clamp(12px,1vw,14px)] text-[#111110]/55">
                  {follow.note}
                </p>
              </div>

              {/* Spinning "follow the fits" badge with the eyes icon (desktop). */}
              <a
                href="https://www.instagram.com/zunuz_official/"
                target="_blank"
                rel="noreferrer"
                aria-label="Follow Zunuz on Instagram"
                className="t3r-fade group/badge relative hidden size-[clamp(130px,13vw,180px)] shrink-0 min-[900px]:block"
              >
                <svg viewBox="0 0 200 200" className="absolute inset-0 size-full animate-[spin_18s_linear_infinite] motion-reduce:animate-none" aria-hidden="true">
                  <defs>
                    <path id="t3r-badge-ring" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
                  </defs>
                  <circle cx="100" cy="100" r="98" fill="#FFFFFF" fillOpacity="0.7" />
                  <text className="font-['Bricolage_Grotesque',sans-serif]" fontSize="17" fontWeight="700" letterSpacing="4.2" fill="#111110">
                    <textPath href="#t3r-badge-ring" textLength="486" lengthAdjust="spacing">FOLLOW THE FITS ✦ ON THE FEED ✦ </textPath>
                  </text>
                </svg>
                <img
                  src="/icon1.png"
                  alt=""
                  aria-hidden="true"
                  className="absolute top-1/2 left-1/2 size-[42%] -translate-x-1/2 -translate-y-1/2 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/badge:scale-110 group-hover/badge:rotate-12"
                />
              </a>
            </div>

            {/* The strip supplies the perspective; the track keeps 3D so each
                tile's curve (set per frame) is seen through it. */}
            <div className="t3r-strip relative mt-[clamp(36px,5vw,72px)] py-[clamp(24px,3vw,48px)] [perspective:1100px]">
              <div className="t3r-track flex w-max gap-[clamp(10px,1.1vw,16px)] [transform-style:preserve-3d] will-change-transform">
                {[0, 1].map((copy) => FOLLOW_RUN.map((src, i) => (
                  <div
                    key={`${copy}-${i}`}
                    aria-hidden={copy === 1}
                    className="t3r-tile relative aspect-[332/460] w-[clamp(180px,24vw,340px)] shrink-0 [backface-visibility:hidden] outline-1 outline-transparent will-change-transform"
                  >
                    {/* Anti-aliasing: Chrome doesn't smooth the outer edge of
                        a 3D-rotated layer, so the slanted top/bottom edges
                        stair-step. Insetting the visible frame 1px leaves a
                        transparent border inside the layer, which makes the
                        real edge an interior pixel that gets filtered smoothly. */}
                    <div className="absolute inset-px overflow-hidden bg-[#EDDDAA]">
                      <video
                        src={src}
                        muted
                        loop
                        playsInline
                        preload="none" /* switched to "auto" as the section nears — see the reels effect */
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                  </div>
                )))}
              </div>
            </div>

            <div className="relative z-[1] mx-auto flex max-w-[1100px] justify-end px-5">
              <a
                href="https://www.instagram.com/zunuz_official/"
                target="_blank"
                rel="noreferrer"
                className="t3r-link group/link inline-flex items-center gap-1.5 font-['Inter',sans-serif] text-[length:clamp(16px,1.5vw,21px)] text-[#111110] no-underline underline-offset-4 hover:underline"
              >
                Follow on Instagram <span className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/link:translate-x-1.5" aria-hidden="true">→</span>
              </a>
            </div>
          </section>
          )}

          {/* ── FAQs ── */}
          <FaqSection scrollRef={scrollRef} sectionRef={faqRef} />

          {/* ── Newsletter CTA ── (toggle with SHOW_NEWSLETTER) */}
          {showNews && <NewsletterSection scrollRef={scrollRef} sectionRef={newsRef} />}

          {/* ── Footer ── */}
          <SiteFooter scrollRef={scrollRef} lenisRef={lenisRef} />

        </div>
      </div>
    </div>
  );
}
