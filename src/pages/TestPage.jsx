import React, { useState, useEffect, useRef } from 'react';
import { Menu, ArrowRight, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Br, m1 } from '../data/productData';
import zr from '../utils/audio';
import Preloader from '../components/Preloader';

gsap.registerPlugin(ScrollTrigger);

// Scratch page for trying things out — not linked from anywhere, reachable
// only by visiting /test directly. Bypasses MainLayout (see App.jsx).
//
// Forced into a mobile phone-frame (see the outer/inner wrapper divs in the
// JSX below) regardless of the actual browser window size, so design work
// here always previews at mobile width. The inner frame has `transform:
// translateZ(0)`, which — per the CSS spec — makes it the "containing block"
// for any `position: fixed` descendant, including Preloader.jsx's own fixed
// full-viewport overlay; that traps it inside the frame instead of covering
// the real browser window, without needing to touch Preloader.jsx itself.
//
// Currently: a clone of the real intro sequence (Preloader + rapid photo-flash
// shutter, both copied from src/components/Preloader.jsx and the flash logic
// in src/hooks/useAppState.js) with two changes on top:
// 1. The card itself continuously grows to fill the screen over the whole
//    flash sequence, instead of staying one small fixed size the whole time.
// 2. EVERY individual photo, not just the frame as a whole, does its own
//    quick zoom-out — pops in larger, settles to its resting size — one after
//    another as the sequence cycles. That needs each photo to be a *fresh*
//    DOM node each time it flashes (a CSS animation on an element that just
//    toggles opacity/display while staying mounted never replays on its own;
//    remounting via a changing `key` is what makes it restart every frame),
//    so this renders one active <img> at a time, keyed by a running frame
//    counter, rather than all 8 photos stacked with opacity toggling.
// Everything else here is self-contained; none of the real intro files are touched.
const FLASH_FRAME_MS = 70;
const FLASH_TOTAL_FRAMES = 23;
const ZOOM_PULSE_MS = 150; // each individual photo's own pop-in-and-settle duration

// TEMPORARY: skips straight to the page content, bypassing the preloader +
// shutter-flash intro entirely, so the sections below can be worked on
// without sitting through the ~13s intro every reload. Flip back to false
// (or delete) to restore the intro.
const SKIP_INTRO = true;

// TEMPORARY: hides section 3 ("Imagine It" → "Okay... better" → "Wait..."
// → "Perfect Now I can go.") while working on the other sections. Flip
// back to false (or delete) to bring it back.
const HIDE_SECTION_3 = true;

// Content for the "rectangle mask" fullscreen slider (section 2) — modeled
// on artemsemkin.com's Asli template ("Fullscreen Sliders / Rectangle
// Mask"): each slide's image sits behind a rectangular clip that expands
// from a collapsed center band to fill the frame, while the image itself
// settles from a slight zoom. Purely scroll-driven — no autoplay timer.
// First slide is a blank black screen (no image — see the `slide.image`
// check where these render) with just a centered heading, ahead of the
// photo slides that follow.
const RECT_MASK_SLIDES = [
  { image: null, heading: 'Imagine It.', subheading: '' },
  { image: '/5.png', heading: 'No Jewellery', subheading: 'Too Plain' },
  { image: '/2.png', heading: 'Okay..', subheading: 'Better' },
  { image: '/3.png', heading: 'Wait..', subheading: '' },
  { image: '/4.png', heading: 'Perfect', subheading: 'Now I can go.' },
];

// The 3 photos for the "Shop all" fan (section 4) — same 3 images as the
// original design, but now each can become the centered one: dragging
// cycles which photo is front-and-center while the other two settle into
// the left/right peeking-wing positions, using the same drag-tracking
// mechanic as the real product-card swiper in ProductPage.jsx (continuous
// drag position, 55px flick threshold, 250ms ease-out snap).
const SHOP_FAN_IMAGES = ['/flow.webp', '/12.webp', '/7.webp'];

// Cards for the "Where will you wear it?" horizontal carousel (last section).
const OCCASION_CARDS = [
  { image: '/1.png', label: 'Your First Date' },
  { image: '/2.png', label: 'Your Wedding Day' },
  { image: '/3.png', label: 'Your Everyday' },
  { image: '/4.png', label: 'Your Big Day' },
  { image: '/5.png', label: 'Your Night Out' },
];

// Cards for the "Your day doesn't stop." 2x2 feature grid (last section).
const DAY_FEATURE_CARDS = [
  { image: '/sweate_resis.png', label: 'Sweat Resistant' },
  { image: '/water_resis.png', label: 'Water Resistant' },
  { image: '/office_day.png', label: 'Long Office Day' },
  { image: '/everyday.png', label: 'Everyday' },
];

// Cards for the "See it on her." horizontal carousel (last section) — same
// component/style as the "Where will you wear it?" carousel above, just
// with customer-quote captions instead of occasion labels.
const SEE_HER_CARDS = [
  { image: '/1.png', quote: 'I literally wear these every day.' },
  { image: '/2.png', quote: 'They go with everything I own.' },
  { image: '/3.png', quote: 'Got so many compliments on my wedding day.' },
  { image: '/4.png', quote: 'My everyday go-to piece now.' },
  { image: '/5.png', quote: 'Perfect for work and weekends.' },
];

// Accordion sections for the footer at the very bottom of the page. Only
// Instagram has a real link right now — the other socials are placeholders
// until those accounts exist.
const FOOTER_SECTIONS = [
  { title: 'Shop', items: ['All Products', 'Necklaces', 'Earrings', 'Bracelets'] },
  { title: 'About', items: ['Our Story', 'Why Zunuz'] },
  { title: 'Help', items: ['FAQs', 'Shipping & Returns', 'Contact Us', 'Track Order'] },
  { title: 'Join The Zunuz', items: ['Sign In', 'Create Account', 'Newsletter'] },
];

// lucide-react (this project's version) dropped brand/social icons, so the
// footer's social row uses small inline SVGs instead — same pattern as the
// existing InstagramIcon in ShineWithUsPage.jsx/admin/CampaignPage.jsx.
const FooterInstagramIcon = ({ size = 20, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);
const FooterTikTokIcon = ({ size = 20, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M9 18a4 4 0 1 0 4-4V2h3a5 5 0 0 0 5 5" />
  </svg>
);
const FooterPinterestIcon = ({ size = 20, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v8" />
    <path d="M9.5 14c1-2 1-4 1-5a2 2 0 0 1 4 0c0 1.5-1 4-1 4" />
  </svg>
);
const FooterYouTubeIcon = ({ size = 20, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect x="2" y="6" width="20" height="12" rx="4" />
    <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" stroke="none" />
  </svg>
);

// Drag mechanic for the "Shop all" fan (see the effect below), ported
// from the real product-card swiper in ProductPage.jsx: a continuous
// drag position (`pos`), a 55px flick threshold to decide the target
// index, and a 250ms ease-out-cubic rAF tween to snap there — the same
// feel used elsewhere in the app. Adapted here for exactly 3 images that
// continuously swap between the fan's left-wing / center / right-wing
// positions as `pos` changes, instead of ProductPage's "next card rises
// from behind the stack" look — the visual composition itself (offset,
// scaled side images behind a full-size center one) stays exactly what
// it was.
function attachFanDrag(container, images) {
  const n = images.length;
  const wrap = (d) => {
    const half = n / 2;
    let r = d;
    while (r > half) r -= n;
    while (r < -half) r += n;
    return r;
  };

  // Keyframes taken directly from the original absolute layout (a 230x300
  // box; the side image was 150x250 at top:20, ±55 from that box's edge)
  // — expressed as a translate+scale of the same 230x300 box so every
  // image can share one size and animate continuously between roles
  // instead of actually resizing.
  const CENTER = { tx: 0, ty: 0, sx: 1, sy: 1 };
  const SIDE = { tx: 95, ty: -5, sx: 150 / 230, sy: 250 / 300 };
  const lerp = (a, b, t) => a + (b - a) * t;

  let pos = Math.floor(n / 2); // middle image starts centered, matching the original design
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let dragStartPos = pos;
  let directionChecked = false;
  let horizontal = false;
  let raf = null;

  const applyPos = (p) => {
    images.forEach((img, idx) => {
      const delta = wrap(idx - p);
      const clamped = Math.max(-1, Math.min(1, delta));
      const side = clamped <= 0 ? -1 : 1;
      const t = 1 - Math.abs(clamped); // 1 at center (delta 0), 0 at the wing (|delta| 1)
      const tx = lerp(side * SIDE.tx, CENTER.tx, t);
      const ty = lerp(SIDE.ty, CENTER.ty, t);
      const sx = lerp(SIDE.sx, CENTER.sx, t);
      const sy = lerp(SIDE.sy, CENTER.sy, t);
      const zIndex = Math.round(10 - Math.abs(delta) * 5);
      gsap.set(img, { x: tx, y: ty, scaleX: sx, scaleY: sy, zIndex });
    });
  };
  applyPos(pos);

  const animateTo = (target) => {
    if (raf) cancelAnimationFrame(raf);
    const start = pos;
    const startTime = performance.now();
    const duration = 250;
    const step = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      pos = start + (target - start) * ease;
      applyPos(pos);
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        pos = ((Math.round(target) % n) + n) % n;
        applyPos(pos);
      }
    };
    raf = requestAnimationFrame(step);
  };

  const onPointerDown = (e) => {
    if (raf) cancelAnimationFrame(raf);
    pos = ((Math.round(pos) % n) + n) % n;
    applyPos(pos);
    dragStartPos = pos;
    startX = e.clientX;
    startY = e.clientY;
    dragging = true;
    directionChecked = false;
    horizontal = false;
    container.style.cursor = 'grabbing';
    try { container.setPointerCapture(e.pointerId); } catch { /* not a real pointer — ignore */ }
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!directionChecked) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        horizontal = Math.abs(dx) > Math.abs(dy);
        directionChecked = true;
        if (!horizontal) { dragging = false; animateTo(Math.round(pos)); }
      }
      return;
    }
    if (horizontal) {
      pos = dragStartPos - dx / 300;
      applyPos(pos);
    }
  };
  const onPointerUp = (e) => {
    if (!dragging) return;
    dragging = false;
    container.style.cursor = 'grab';
    if (!horizontal) return;
    const dx = e.clientX - startX;
    let target;
    if (dx < -55) target = Math.floor(dragStartPos) + 1;
    else if (dx > 55) target = Math.floor(dragStartPos) - 1;
    else target = Math.round(dragStartPos);
    animateTo(target);
  };

  container.style.cursor = 'grab';
  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', onPointerUp);
  container.addEventListener('pointercancel', onPointerUp);

  return {
    // Exposed so the entrance reveal's ScrollTrigger (tied to *vertical*
    // scroll position) can skip re-triggering while a drag is in
    // progress — a touch that isn't perfectly horizontal can still let a
    // sliver of vertical scroll through even with `touch-action: pan-y`,
    // and if that sliver happens to cross the trigger's boundary, it was
    // resetting all 3 images to opacity 0 and restarting the fade-in
    // *mid-drag* — images flashing to invisible while you're actively
    // dragging them, which is what read as "a full glitch."
    isDragging: () => dragging,
    detach: () => {
      if (raf) cancelAnimationFrame(raf);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointercancel', onPointerUp);
    },
  };
}

// Shared drag-to-slide behavior for the horizontal card carousels (see the
// "Where will you wear it?" and "See it on her." effects below). Relying
// on native scroll-snap felt heavy — a small flick often didn't register
// at all, needing a large drag before anything moved. This replaces it
// with pointer-tracked 1:1 dragging (the row follows your finger exactly
// while dragging) plus a GSAP tween to the nearest/target card on
// release, so both a tiny flick and a big drag reliably land on exactly
// one card with the same smooth slide.
function attachCarouselDrag(row, cards, { onDragStart } = {}) {
  let dragging = false;
  let startX = 0;
  let startScrollLeft = 0;
  let dragDelta = 0;
  let currentIndex = 0;
  let scrollTween = null;

  // Center the active card in the row's own visible width instead of
  // resting it flush against a fixed left padding — whatever space that
  // leaves on each side is exactly the "peek" of the neighboring card. For
  // a 350px card in this mobile-width row that comes out to roughly a 10%
  // peek on both sides, matching the original design's peek, but derived
  // from real centering math instead of a fixed padding number.
  const cardWidth0 = cards[0].offsetWidth;
  const paddingLeft = Math.max(0, (row.clientWidth - cardWidth0) / 2);
  row.style.paddingLeft = `${paddingLeft}px`;
  row.style.paddingRight = `${paddingLeft}px`;

  // `offsetLeft`/`offsetWidth` are pure layout measurements — relative to
  // the row (which has `position: relative`, making it the offsetParent)
  // and, crucially, unaffected by the `scale` transform applied below.
  // getBoundingClientRect() would reflect that scale, which — since
  // updateScales() also *drives* that same scale off these measurements —
  // creates a feedback loop: a card already scaled down reports a smaller
  // rect, so it looks "further away" than it really is and takes longer to
  // grow back to full size than a card approached from the other side.
  const step = () => (cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : cardWidth0);

  const goToIndex = (idx) => {
    currentIndex = Math.max(0, Math.min(cards.length - 1, idx));
    if (scrollTween) scrollTween.kill();
    const target = Math.max(0, cards[currentIndex].offsetLeft - paddingLeft);
    scrollTween = gsap.to(row, { scrollLeft: target, duration: 0.45, ease: 'power3.out' });
  };

  // The active (settled/flush) card sits at scale 1; every other card
  // scales down toward 0.5 the further it sits from that resting spot —
  // so the upcoming card visibly grows from ~0.5 to 1 as you drag it into
  // place, instead of every card just staying full-size the whole time.
  // Exposed (see `restingScale` on the returned object) so the entrance
  // reveal can animate each card straight to *its own* correct resting
  // scale, instead of popping every card to scale 1 and only correcting
  // the neighbors back down to 0.5 afterward — that two-step version is
  // exactly what read as a glitch on first reveal.
  const restingScale = (card) => {
    const scrollLeft = row.scrollLeft;
    const restingLeft = card.offsetLeft - paddingLeft;
    const cardWidth = card.offsetWidth || 1;
    return 1 - Math.min(1, Math.abs(scrollLeft - restingLeft) / cardWidth) * 0.5;
  };

  // Driven straight off `row.scrollLeft`, and re-run on every 'scroll'
  // event, this stays in sync automatically whether that scrollLeft is
  // changing because of the manual drag (onPointerMove, below) or the
  // GSAP settle tween (goToIndex, above) — one code path for both.
  const updateScales = () => {
    const scrollLeft = row.scrollLeft;
    cards.forEach((card) => {
      const restingLeft = card.offsetLeft - paddingLeft;
      const diff = scrollLeft - restingLeft;
      // The centering padding is sized so a sliver of the neighboring card
      // already naturally peeks in on each side — but scaling a card down
      // around its *center* drags that peeking edge inward with it,
      // hiding the very sliver that should stay visible. Scaling instead
      // around whichever edge faces the active card keeps that edge
      // anchored in place while the far (already off-screen) edge is what
      // shrinks away.
      const origin = diff <= 0 ? 'left center' : 'right center';
      gsap.set(card, { scale: restingScale(card), transformOrigin: origin });
    });
  };
  row.addEventListener('scroll', updateScales, { passive: true });
  updateScales();

  const onPointerDown = (e) => {
    dragging = true;
    startX = e.clientX;
    startScrollLeft = row.scrollLeft;
    dragDelta = 0;
    if (scrollTween) scrollTween.kill();
    if (onDragStart) onDragStart();
    row.style.cursor = 'grabbing';
    try { row.setPointerCapture(e.pointerId); } catch { /* not a real pointer (e.g. synthetic) — ignore */ }
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    dragDelta = e.clientX - startX;
    row.scrollLeft = startScrollLeft - dragDelta;
  };
  const onPointerUp = () => {
    if (!dragging) return;
    dragging = false;
    row.style.cursor = 'grab';
    const THRESHOLD = 30; // a small, deliberate flick is enough — no need to drag a whole card-width
    if (dragDelta < -THRESHOLD) goToIndex(currentIndex + 1);
    else if (dragDelta > THRESHOLD) goToIndex(currentIndex - 1);
    else goToIndex(Math.round(row.scrollLeft / step())); // barely moved — settle on whichever card is nearest
  };

  row.style.cursor = 'grab';
  row.addEventListener('pointerdown', onPointerDown);
  row.addEventListener('pointermove', onPointerMove);
  row.addEventListener('pointerup', onPointerUp);
  row.addEventListener('pointercancel', onPointerUp);

  return {
    // Exposed so the entrance-reveal animation can target each card's own
    // correct resting scale directly (see restingScale above) instead of
    // animating every card to scale 1 and correcting the neighbors back
    // down afterward.
    restingScale,
    // Exposed so anything that forces cards to a uniform scale (e.g.
    // interrupting the reveal mid-flight) can re-sync immediately after.
    refresh: updateScales,
    detach: () => {
      row.removeEventListener('pointerdown', onPointerDown);
      row.removeEventListener('pointermove', onPointerMove);
      row.removeEventListener('pointerup', onPointerUp);
      row.removeEventListener('pointercancel', onPointerUp);
      row.removeEventListener('scroll', updateScales);
      if (scrollTween) scrollTween.kill();
    },
  };
}

export default function TestPage() {
  const [preloaderPercentage, setPreloaderPercentage] = useState(0);
  const [showPreloader, setShowPreloader] = useState(!SKIP_INTRO);
  const [showShutter, setShowShutter] = useState(false);
  const [showBackdrop, setShowBackdrop] = useState(false);
  const [shutterActiveIndex, setShutterActiveIndex] = useState(0);
  const [flashTick, setFlashTick] = useState(-1);
  const [showZunuzText, setShowZunuzText] = useState(false);
  const [shutterEnding, setShutterEnding] = useState(false);
  const [growFrame, setGrowFrame] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [showContent, setShowContent] = useState(SKIP_INTRO);
  const [openFooterSection, setOpenFooterSection] = useState(null);

  const scrollContainerRef = useRef(null);
  const imagineSectionRef = useRef(null);
  const imagineImageRef = useRef(null);
  const topTextRef = useRef(null);
  const bottomTextRef = useRef(null);
  const betterImageRef = useRef(null);
  const betterTextRef = useRef(null);
  const waitImageRef = useRef(null);
  const waitTextRef = useRef(null);
  const perfectImageRef = useRef(null);
  const perfectTextRef = useRef(null);
  const wasntSectionRef = useRef(null);
  const wasntLine1Ref = useRef(null);
  const wasntLine2Ref = useRef(null);
  const wasntLine3Ref = useRef(null);
  const wasntLine4Ref = useRef(null);
  const shopSectionRef = useRef(null);
  const shopFanContainerRef = useRef(null);
  const shopFanImageRefs = useRef([]);
  const shopAllRef = useRef(null);
  const rectMaskWrapperRef = useRef(null);
  const rectMaskSectionRef = useRef(null);
  const rectMaskImageRefs = useRef([]);
  const rectMaskHeadingRefs = useRef([]);
  const rectMaskSubRefs = useRef([]);
  const rectMaskDotRefs = useRef([]);
  const occasionSectionRef = useRef(null);
  const occasionHeadingRef = useRef(null);
  const occasionCardRefs = useRef([]);
  const occasionViewportRef = useRef(null);
  const occasionLeftArrowRef = useRef(null);
  const occasionRightArrowRef = useRef(null);
  const dayFeatureSectionRef = useRef(null);
  const dayFeatureHeadingRef = useRef(null);
  const dayFeatureCardRefs = useRef([]);
  const seeHerSectionRef = useRef(null);
  const seeHerHeadingRef = useRef(null);
  const seeHerSubRef = useRef(null);
  const seeHerCardRefs = useRef([]);
  const readySectionRef = useRef(null);
  const readyHeadingRef = useRef(null);
  const readyImageRef = useRef(null);
  const readyTitleRef = useRef(null);
  const readySubRef = useRef(null);
  const readyButtonRef = useRef(null);

  // "Imagine It" → "Okay... better" → "Wait..." → "Perfect Now I can go." is
  // ONE section — every time the user scrolls into it (from above OR back
  // into it from below), the whole timed sequence restarts from scratch:
  // 4.png fades in, its three captions reveal one at a time, a hold,
  // crossfade to 2.png + its caption, another hold, crossfade to 3.png +
  // its caption, another hold, crossfade back to 4.png + its final caption.
  useEffect(() => {
    if (!showContent) return;
    const scroller = scrollContainerRef.current;
    const section = imagineSectionRef.current;
    const imgImagine = imagineImageRef.current;
    const imgBetter = betterImageRef.current;
    const imgWait = waitImageRef.current;
    const imgPerfect = perfectImageRef.current;
    if (!scroller || !section || !imgImagine || !imgBetter || !imgWait || !imgPerfect) return;

    const captionEls = [topTextRef.current, bottomTextRef.current];
    const allAnimatedEls = [imgImagine, imgBetter, imgWait, imgPerfect, ...captionEls, betterTextRef.current, waitTextRef.current, perfectTextRef.current];
    const BLUR = 'blur(24px)';
    const SHARP = 'blur(0px)';

    let currentTl = null;

    const playSequence = () => {
      // Stop whatever's mid-flight and snap every element back to its start
      // state before replaying, so a re-entry never begins from a stale
      // mid-sequence pose.
      if (currentTl) currentTl.kill();
      gsap.killTweensOf(allAnimatedEls);
      gsap.set(imgImagine, { opacity: 0, filter: SHARP });
      gsap.set(imgBetter, { opacity: 0, filter: BLUR });
      gsap.set(imgWait, { opacity: 0, filter: BLUR });
      gsap.set(imgPerfect, { opacity: 0, filter: BLUR });
      gsap.set([...captionEls, betterTextRef.current, waitTextRef.current, perfectTextRef.current], { opacity: 0 });

      currentTl = gsap.timeline();
      currentTl
        // "Imagine It." alone, centered on the section's plain black
        // background — no image yet (imgImagine is still at opacity 0).
        .to(topTextRef.current, { opacity: 1, duration: 0.7, ease: 'power1.out' })
        .to({}, { duration: 0.8 })
        // It fades back out before the image ever appears — it's only
        // shown on the black intro, never over 1.png itself.
        .to(topTextRef.current, { opacity: 0, duration: 0.5, ease: 'power1.inOut' })
        // 1.png fades in, then its caption.
        .to(imgImagine, { opacity: 1, duration: 0.9, ease: 'power1.out' }, '+=0.1')
        .to(bottomTextRef.current, { opacity: 1, duration: 0.6, ease: 'power1.out' }, '+=0.15')
        // Hold — fully revealed, readable, before moving on.
        .to({}, { duration: 1.6 })
        // Blur dissolve: 4.png (+ its captions) blurs out while 2.png sharpens/fades in.
        .to(imgImagine, { opacity: 0, filter: BLUR, duration: 1.1, ease: 'power1.inOut' }, 'crossfade1')
        .to(captionEls, { opacity: 0, duration: 0.7, ease: 'power1.inOut' }, 'crossfade1')
        .to(imgBetter, { opacity: 1, filter: SHARP, duration: 1.1, ease: 'power1.inOut' }, 'crossfade1')
        .to(betterTextRef.current, { opacity: 1, duration: 0.6, ease: 'power1.out' }, '+=0.3')
        // Hold again on "Okay... better."
        .to({}, { duration: 1.6 })
        // Blur dissolve: 2.png (+ its caption) out while 3.png in.
        .to(imgBetter, { opacity: 0, filter: BLUR, duration: 1.1, ease: 'power1.inOut' }, 'crossfade2')
        .to(betterTextRef.current, { opacity: 0, duration: 0.7, ease: 'power1.inOut' }, 'crossfade2')
        .to(imgWait, { opacity: 1, filter: SHARP, duration: 1.1, ease: 'power1.inOut' }, 'crossfade2')
        .to(waitTextRef.current, { opacity: 1, duration: 0.6, ease: 'power1.out' }, '+=0.3')
        // Hold again on "Wait...".
        .to({}, { duration: 1.6 })
        // Blur dissolve: 3.png (+ its caption) out while 4.png back in.
        .to(imgWait, { opacity: 0, filter: BLUR, duration: 1.1, ease: 'power1.inOut' }, 'crossfade3')
        .to(waitTextRef.current, { opacity: 0, duration: 0.7, ease: 'power1.inOut' }, 'crossfade3')
        .to(imgPerfect, { opacity: 1, filter: SHARP, duration: 1.1, ease: 'power1.inOut' }, 'crossfade3')
        .to(perfectTextRef.current, { opacity: 1, duration: 0.6, ease: 'power1.out' }, '+=0.3');
    };

    gsap.set(imgImagine, { opacity: 0, filter: SHARP });
    gsap.set(imgBetter, { opacity: 0, filter: BLUR });
    gsap.set(imgWait, { opacity: 0, filter: BLUR });
    gsap.set(imgPerfect, { opacity: 0, filter: BLUR });
    gsap.set([...captionEls, betterTextRef.current, waitTextRef.current, perfectTextRef.current], { opacity: 0 });

    const trigger = ScrollTrigger.create({
      trigger: section,
      scroller,
      start: 'top 65%',
      onEnter: playSequence,
      onEnterBack: playSequence,
    });

    return () => {
      trigger.kill();
      if (currentTl) currentTl.kill();
    };
  }, [showContent]);

  // Section 3 — plain white card, four lines of copy in normal document
  // flow (no fixed section height, no pin, no scroll-jacking). Each line
  // just fades/slides in on its own the moment IT scrolls into view, like
  // an ordinary webpage reveal-on-scroll — and resets if you scroll back
  // above it, so scrolling down into it again replays that line.
  useEffect(() => {
    if (!showContent) return;
    const scroller = scrollContainerRef.current;
    const lines = [wasntLine1Ref.current, wasntLine2Ref.current, wasntLine3Ref.current, wasntLine4Ref.current];
    if (!scroller || lines.some(l => !l)) return;

    gsap.set(lines, { opacity: 0, y: 16 });

    const triggers = lines.map((line) => ScrollTrigger.create({
      trigger: line,
      scroller,
      start: 'top 85%',
      onEnter: () => gsap.to(line, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }),
      onEnterBack: () => gsap.to(line, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }),
      onLeaveBack: () => gsap.set(line, { opacity: 0, y: 16 }),
    }));

    return () => triggers.forEach(t => t.kill());
  }, [showContent]);

  // Section 4 — stacked product-card fan + "Shop all" link. Same 3-image
  // fan composition as the original design; dragging now cycles which
  // photo is centered via attachFanDrag (see above), ported from the real
  // product-card swiper in ProductPage.jsx. Entrance: the two side images
  // fade in first, then the center image fades in on top, then the
  // "Shop all" link — plays once only (see `once: true` below), unlike
  // sections 1-3, which still replay every time they're scrolled into view.
  useEffect(() => {
    if (!showContent) return;
    const scroller = scrollContainerRef.current;
    const section = shopSectionRef.current;
    const container = shopFanContainerRef.current;
    const images = shopFanImageRefs.current;
    const shopAll = shopAllRef.current;
    if (!scroller || !section || !container || !shopAll || images.some(el => !el)) return;

    let currentTl = null;
    let isDraggingFan = null;

    const playSequence = () => {
      // A touch that isn't perfectly horizontal can still let a sliver of
      // vertical scroll through even with `touch-action: pan-y` — if that
      // sliver crosses this trigger's boundary mid-drag, don't reset the
      // images to invisible and restart the fade-in while the user is
      // actively dragging them.
      if (isDraggingFan && isDraggingFan()) return;
      if (currentTl) currentTl.kill();
      gsap.killTweensOf([...images, shopAll]);
      gsap.set(images, { opacity: 0 });
      gsap.set(shopAll, { opacity: 0, y: 10 });

      currentTl = gsap.timeline();
      currentTl
        .to([images[0], images[2]], { opacity: 1, duration: 0.7, ease: 'power2.out' })
        .to(images[1], { opacity: 1, duration: 0.7, ease: 'power2.out' }, '-=0.4')
        .to(shopAll, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '+=0.1');
    };

    gsap.set(images, { opacity: 0 });
    gsap.set(shopAll, { opacity: 0, y: 10 });

    // Triggered off the LAST line of the previous section, not this
    // section's own position — otherwise "top 65%" of the shop section can
    // fire while that section's text is still fully on screen above it,
    // since adjacent sections naturally overlap in the same viewport
    // during a normal scroll. Requiring wasntLine4 to have scrolled most of
    // the way to the top first guarantees its reveal is long finished
    // before the cards ever start animating in.
    const trigger = ScrollTrigger.create({
      trigger: wasntLine4Ref.current || section,
      scroller,
      start: 'top 35%',
      once: true,
      onEnter: playSequence,
    });

    // If the user starts dragging while the entrance is still mid-flight,
    // jump straight to fully visible first — same fix as the other
    // carousels, so a drag never races an in-flight reveal.
    const settleFan = () => {
      if (currentTl) { currentTl.kill(); currentTl = null; }
      gsap.set(images, { opacity: 1 });
    };
    container.addEventListener('pointerdown', settleFan, { capture: true });
    const { isDragging, detach: detachDrag } = attachFanDrag(container, images);
    isDraggingFan = isDragging;

    return () => {
      trigger.kill();
      if (currentTl) currentTl.kill();
      container.removeEventListener('pointerdown', settleFan, { capture: true });
      detachDrag();
    };
  }, [showContent]);

  // Last section — "Where will you wear it?" — a one-full-card-at-a-time
  // carousel with left/right arrow navigation, modeled on the feature
  // carousels used on Apple's product pages (apple.com/macbook-pro):
  // exactly one card fills the frame, the previous/next ones sit fully
  // off to the side, and clicking an arrow slides the whole strip across
  // by one card width — a different visual language from this page's
  // other carousels, which instead peek neighboring cards and scale the
  // active one up. Heading fades in on scroll, then the first card fades
  // in on top of it — plays once only (unlike sections 1-3, which still
  // replay every time they're scrolled into view).
  useEffect(() => {
    if (!showContent) return;
    const scroller = scrollContainerRef.current;
    const section = occasionSectionRef.current;
    const heading = occasionHeadingRef.current;
    const viewport = occasionViewportRef.current;
    const cards = occasionCardRefs.current;
    const leftArrow = occasionLeftArrowRef.current;
    const rightArrow = occasionRightArrowRef.current;
    if (!scroller || !section || !heading || !viewport || !leftArrow || !rightArrow || cards.some(el => !el)) return;

    const lastIndex = cards.length - 1;
    let activeIndex = 0;
    let animating = false;

    gsap.set(heading, { opacity: 0, y: 14 });
    // Every card is visible by default — for any card except the active
    // one, sitting fully off to the side (see positionCards) is what
    // hides it, not opacity. Only the initially-active card needs its own
    // fade-in, played once the section scrolls into view.
    gsap.set(cards, { opacity: 1 });
    gsap.set(cards[0], { opacity: 0 });

    // Every card rests at its own slot in one long virtual strip
    // ((i - activeIndex) * viewportWidth), sliding along it as the active
    // index changes. The next/previous card sitting off to the side isn't
    // just full-size-and-invisible, though — it sits zoomed in to 120%,
    // and as it slides into the center it scales back down to a 100% fit
    // while fading/deblurring in; the outgoing card does the same in
    // reverse, growing to 120% as it fades out on its way off-frame.
    // `scaleOpacityForX` is the one formula behind all of it: scale/
    // opacity/blur are a pure function of how far a card's x currently is
    // from center (1/1/0 at center, CARD_SCALE_SIDE/0/CARD_BLUR_MAX a full
    // card-width away, linear in between) — used identically by the live
    // drag, the arrow-click transition, and the drag-release settle, so
    // there's never a mismatch or a visible "pop" handing off between
    // them; whichever one is acting, it's just continuing the same
    // relationship from wherever the card currently sits. The blur is
    // what turns the fade into an actual soft dissolve instead of a
    // sharp-edged rectangle appearing/disappearing — without it, opacity
    // alone still leaves the card's straight photo edges crisply visible
    // right up until they hit 0.
    const CARD_SCALE_SIDE = 1.2;
    const CARD_BLUR_MAX = 14;
    const scaleOpacityForX = (x, width) => {
      const t = Math.max(0, Math.min(1, 1 - Math.abs(x) / width));
      return {
        scale: CARD_SCALE_SIDE + t * (1 - CARD_SCALE_SIDE),
        opacity: t,
        filter: `blur(${(1 - t) * CARD_BLUR_MAX}px)`,
      };
    };

    const positionCards = (index, animate = false) => {
      const width = viewport.offsetWidth;
      cards.forEach((card, i) => {
        const x = (i - index) * width;
        const vars = { x, ...scaleOpacityForX(x, width) };
        if (animate) gsap.to(card, { ...vars, duration: 0.4, ease: 'power2.out' });
        else gsap.set(card, vars);
      });
    };

    const updateArrows = () => {
      const atStart = activeIndex === 0;
      const atEnd = activeIndex === lastIndex;
      gsap.set(leftArrow, { opacity: atStart ? 0.3 : 1 });
      leftArrow.style.pointerEvents = atStart ? 'none' : 'auto';
      gsap.set(rightArrow, { opacity: atEnd ? 0.3 : 1 });
      rightArrow.style.pointerEvents = atEnd ? 'none' : 'auto';
    };

    const transitionTo = (target) => {
      if (target < 0 || target > lastIndex || target === activeIndex) { positionCards(activeIndex, true); return; }
      animating = true;
      const direction = target > activeIndex ? 1 : -1;
      const width = viewport.offsetWidth;
      const outgoing = cards[activeIndex];
      const incoming = cards[target];

      // Every OTHER card just needs to be at its correct resting slot —
      // only the outgoing/incoming pair gets an animated transition.
      // outgoing/incoming are NOT force-reset here: GSAP tweens from
      // whatever they're currently at, which (thanks to the shared
      // formula above) is already correct whether this was triggered by
      // a flat arrow click or is continuing straight out of a drag.
      cards.forEach((card, i) => {
        if (i === activeIndex || i === target) return;
        const x = (i - target) * width;
        gsap.set(card, { x, ...scaleOpacityForX(x, width) });
      });

      // The outgoing card shrinks down a little (not up to the CARD_SCALE_
      // SIDE resting size every other off-center card uses) as it leaves —
      // that's what reads as "something going away" rather than "growing".
      // It's snapped to the real CARD_SCALE_SIDE afterward, once it's fully
      // transparent and off-frame, purely so it's back in sync with the
      // shared formula for whenever a future drag/transition reads its
      // position again — that snap is never visible.
      //
      // The incoming card gets noticeably more time so it visibly settles
      // into the frame instead of snapping there the instant the outgoing
      // card is gone. This needed an actual frame-by-frame check, not just
      // the end values, to get right: 'power4.out' technically ran for the
      // full duration below, but its curve front-loads so hard that the
      // card was already ~97% of the way to its resting scale by ~700ms —
      // for the rest of the duration it kept "animating" (blocking input)
      // while visibly doing nothing, which read as frozen/stuck rather
      // than smoothly settling. 'power1.out' (plain quad-out) spreads the
      // motion much more evenly across the whole duration — still
      // decelerating into a soft stop, but with real, visible movement
      // most of the way through — which is what actually reads as
      // "something arriving" rather than just appearing.
      const OUTGOING_EXIT_SCALE = 0.7;
      gsap.timeline({ onComplete: () => { activeIndex = target; animating = false; updateArrows(); gsap.set(outgoing, { scale: CARD_SCALE_SIDE }); } })
        .to(outgoing, { x: -direction * width, scale: OUTGOING_EXIT_SCALE, opacity: 0, filter: `blur(${CARD_BLUR_MAX}px)`, duration: 0.6, ease: 'power2.in' }, 0)
        .to(incoming, { x: 0, scale: 1, opacity: 1, filter: 'blur(0px)', duration: 1.5, ease: 'power1.out' }, 0);
    };

    const goTo = (target) => {
      if (animating) return;
      transitionTo(target);
    };

    positionCards(0);
    updateArrows();

    const onLeftClick = () => goTo(activeIndex - 1);
    const onRightClick = () => goTo(activeIndex + 1);
    leftArrow.addEventListener('click', onLeftClick);
    rightArrow.addEventListener('click', onRightClick);

    // Drag-to-slide: the strip follows the finger 1:1 while dragging,
    // snapping to whichever neighbor is closer on release — same
    // one-card-at-a-time feel as the arrows, just via touch/mouse. Scale/
    // opacity update live during the drag too (via scaleOpacityForX), so
    // the "scale down and fade as it leaves, scale up and fade in as the
    // next one arrives" motion tracks your finger directly instead of
    // only appearing once you let go.
    let dragging = false;
    let startX = 0;
    let dragStartIndex = 0;
    const onPointerDown = (e) => {
      if (animating) return;
      dragging = true;
      startX = e.clientX;
      dragStartIndex = activeIndex;
      try { viewport.setPointerCapture(e.pointerId); } catch { /* not a real pointer — ignore */ }
    };
    const onPointerMove = (e) => {
      if (!dragging) return;
      const width = viewport.offsetWidth;
      const dx = e.clientX - startX;
      cards.forEach((card, i) => {
        const x = (i - dragStartIndex) * width + dx;
        gsap.set(card, { x, ...scaleOpacityForX(x, width) });
      });
    };
    const onPointerUp = (e) => {
      if (!dragging) return;
      dragging = false;
      const width = viewport.offsetWidth;
      const dx = e.clientX - startX;
      const THRESHOLD = width * 0.18;
      let target = dragStartIndex;
      if (dx < -THRESHOLD) target = Math.min(lastIndex, dragStartIndex + 1);
      else if (dx > THRESHOLD) target = Math.max(0, dragStartIndex - 1);
      activeIndex = dragStartIndex; // transitionTo reads activeIndex as "the outgoing card"
      transitionTo(target);
    };
    viewport.style.cursor = 'grab';
    viewport.addEventListener('pointerdown', onPointerDown);
    viewport.addEventListener('pointermove', onPointerMove);
    viewport.addEventListener('pointerup', onPointerUp);
    viewport.addEventListener('pointercancel', onPointerUp);

    const headingTrigger = ScrollTrigger.create({
      trigger: heading,
      scroller,
      start: 'top 85%',
      once: true,
      onEnter: () => gsap.to(heading, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }),
    });

    const cardsTrigger = ScrollTrigger.create({
      trigger: section,
      scroller,
      start: 'top 70%',
      once: true,
      onEnter: () => gsap.to(cards[0], { opacity: 1, duration: 0.6, ease: 'power2.out' }),
    });

    return () => {
      headingTrigger.kill();
      cardsTrigger.kill();
      leftArrow.removeEventListener('click', onLeftClick);
      rightArrow.removeEventListener('click', onRightClick);
      viewport.removeEventListener('pointerdown', onPointerDown);
      viewport.removeEventListener('pointermove', onPointerMove);
      viewport.removeEventListener('pointerup', onPointerUp);
      viewport.removeEventListener('pointercancel', onPointerUp);
      gsap.killTweensOf(cards);
    };
  }, [showContent]);

  // Last section — "Your day doesn't stop." 2x2 feature grid (see
  // DAY_FEATURE_CARDS above). Same reveal convention as the occasion
  // carousel just above: heading first, then the four cards stagger in —
  // plays once only (unlike sections 1-3, which still replay every time
  // they're scrolled into view).
  useEffect(() => {
    if (!showContent) return;
    const scroller = scrollContainerRef.current;
    const section = dayFeatureSectionRef.current;
    const heading = dayFeatureHeadingRef.current;
    const cards = dayFeatureCardRefs.current;
    if (!scroller || !section || !heading || cards.some(el => !el)) return;

    gsap.set(heading, { opacity: 0, y: 14 });
    gsap.set(cards, { opacity: 0, y: 20 });

    const headingTrigger = ScrollTrigger.create({
      trigger: heading,
      scroller,
      start: 'top 85%',
      once: true,
      onEnter: () => gsap.to(heading, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }),
    });

    let currentTl = null;
    const playCards = () => {
      if (currentTl) currentTl.kill();
      gsap.killTweensOf(cards);
      gsap.set(cards, { opacity: 0, y: 20 });
      currentTl = gsap.timeline();
      cards.forEach((card, i) => {
        currentTl.to(card, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, i === 0 ? undefined : '-=0.4');
      });
    };

    const cardsTrigger = ScrollTrigger.create({
      trigger: section,
      scroller,
      start: 'top 70%',
      once: true,
      onEnter: playCards,
    });

    return () => {
      headingTrigger.kill();
      cardsTrigger.kill();
      if (currentTl) currentTl.kill();
    };
  }, [showContent]);

  // Last section — "See it on her." horizontal carousel (see SEE_HER_CARDS
  // above) — same carousel component/style as "Where will you wear it?",
  // just with a two-line heading (title + subtitle) ahead of the cards.
  // Plays once only (unlike sections 1-3, which still replay every time
  // they're scrolled into view).
  useEffect(() => {
    if (!showContent) return;
    const scroller = scrollContainerRef.current;
    const section = seeHerSectionRef.current;
    const heading = seeHerHeadingRef.current;
    const sub = seeHerSubRef.current;
    const cards = seeHerCardRefs.current;
    if (!scroller || !section || !heading || !sub || cards.some(el => !el)) return;

    gsap.set(heading, { opacity: 0, y: 14 });
    gsap.set(sub, { opacity: 0, y: 14 });
    gsap.set(cards, { opacity: 0, scale: 0.85 });

    let headingTl = null;
    const playHeading = () => {
      if (headingTl) headingTl.kill();
      gsap.killTweensOf([heading, sub]);
      gsap.set([heading, sub], { opacity: 0, y: 14 });
      headingTl = gsap.timeline()
        .to(heading, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' })
        .to(sub, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '-=0.35');
    };

    const headingTrigger = ScrollTrigger.create({
      trigger: heading,
      scroller,
      start: 'top 85%',
      once: true,
      onEnter: playHeading,
    });

    let currentTl = null;
    let refreshScales = null;
    let restingScaleFn = null;
    const playCards = () => {
      if (currentTl) currentTl.kill();
      gsap.killTweensOf(cards);
      gsap.set(cards, { opacity: 0, scale: 0.85 });
      currentTl = gsap.timeline();
      cards.forEach((card, i) => {
        // Animate straight to this card's own correct resting scale (1 for
        // the active card, 0.5 for the peeking neighbors) instead of
        // popping every card to scale 1 and correcting the neighbors back
        // down afterward — that two-step version is what read as a glitch
        // on first reveal.
        const targetScale = restingScaleFn ? restingScaleFn(card) : 1;
        currentTl.to(card, { opacity: 1, scale: targetScale, duration: 0.6, ease: 'back.out(1.5)' }, i === 0 ? undefined : '-=0.4');
      });
    };

    const cardsTrigger = ScrollTrigger.create({
      trigger: section,
      scroller,
      start: 'top 70%',
      once: true,
      onEnter: playCards,
    });

    // Same fix as the occasion carousel above: settle the cards instantly
    // once the user actually starts dragging the row, so a drag never
    // races an in-flight stagger-in reveal.
    const row = cards[0].parentElement;
    const settleCards = () => {
      if (currentTl) { currentTl.kill(); currentTl = null; }
      gsap.set(cards, { opacity: 1 });
      if (refreshScales) refreshScales();
      else gsap.set(cards, { scale: 1 });
    };
    const { refresh, restingScale, detach: detachDrag } = attachCarouselDrag(row, cards, { onDragStart: settleCards });
    refreshScales = refresh;
    restingScaleFn = restingScale;

    return () => {
      headingTrigger.kill();
      cardsTrigger.kill();
      if (headingTl) headingTl.kill();
      if (currentTl) currentTl.kill();
      detachDrag();
    };
  }, [showContent]);

  // Final section — "Ready?" closing CTA: a small heading, a full-width
  // image, then a centered title/subtitle/button block, each fading in —
  // plays once only (unlike sections 1-3, which still replay every time
  // they're scrolled into view).
  useEffect(() => {
    if (!showContent) return;
    const scroller = scrollContainerRef.current;
    const section = readySectionRef.current;
    const heading = readyHeadingRef.current;
    const image = readyImageRef.current;
    const title = readyTitleRef.current;
    const sub = readySubRef.current;
    const button = readyButtonRef.current;
    if (!scroller || !section || !heading || !image || !title || !sub || !button) return;

    gsap.set(heading, { opacity: 0, y: 14 });
    gsap.set(image, { opacity: 0, y: 20 });
    gsap.set([title, sub, button], { opacity: 0, y: 16 });

    let headingTl = null;
    const playHeading = () => {
      if (headingTl) headingTl.kill();
      gsap.killTweensOf(heading);
      gsap.set(heading, { opacity: 0, y: 14 });
      headingTl = gsap.to(heading, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
    };

    const headingTrigger = ScrollTrigger.create({
      trigger: heading,
      scroller,
      start: 'top 85%',
      once: true,
      onEnter: playHeading,
    });

    let contentTl = null;
    const playContent = () => {
      if (contentTl) contentTl.kill();
      gsap.killTweensOf([image, title, sub, button]);
      gsap.set(image, { opacity: 0, y: 20 });
      gsap.set([title, sub, button], { opacity: 0, y: 16 });
      contentTl = gsap.timeline()
        .to(image, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' })
        .to(title, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '-=0.2')
        .to(sub, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.35')
        .to(button, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, '-=0.3');
    };

    const contentTrigger = ScrollTrigger.create({
      trigger: section,
      scroller,
      start: 'top 70%',
      once: true,
      onEnter: playContent,
    });

    return () => {
      headingTrigger.kill();
      contentTrigger.kill();
      if (headingTl) headingTl.kill();
      if (contentTl) contentTl.kill();
    };
  }, [showContent]);

  // Section 2 — "rectangle mask" fullscreen slider (see RECT_MASK_SLIDES
  // above). Wheel/touch input is fully hijacked while inside this
  // section's scroll range — the same "one gesture = one section, no
  // matter how fast" pattern as a real hand-rolled stepper (preventDefault
  // + manually animate scrollTop to the exact next slide's position over a
  // fixed duration, blocking further input until that step's animation and
  // dwell finish). A previous version tied the reveal to raw scroll-scrub
  // progress with a clamp to stop fast flicks skipping slides; clamping
  // could only ever soften the symptom because native scroll had already
  // moved by however much it moved before any JS ran. Fully taking over
  // the input is what actually guarantees it. The wrapper is still N
  // viewport-heights tall with the visible box `position: sticky` inside
  // it, purely so this section still occupies real document scroll height
  // (letting the rest of the page flow around it normally) — WE decide
  // exactly how far scrollTop moves within that range, never the browser.
  useEffect(() => {
    if (!showContent) return;
    const scroller = scrollContainerRef.current;
    const wrapper = rectMaskWrapperRef.current;
    const images = rectMaskImageRefs.current;
    const headings = rectMaskHeadingRefs.current;
    const subs = rectMaskSubRefs.current;
    const dots = rectMaskDotRefs.current;
    if (!scroller || !wrapper || images.some(el => !el)) return;

    const lastIndex = images.length - 1;

    // t=0 → fully open/settled, t=1 → fully collapsed/zoomed. A pure
    // function of progress (no independent tweens/timers baked into it) —
    // unchanged from before; only how progress reaches it has changed.
    const insetFor = (t) => `inset(${t * 90}% 0% ${t * 90}% 0%)`;
    const scaleFor = (t) => 1 + t * 0.12;
    const textOutOpacity = (t) => Math.max(0, 1 - t / 0.4);

    const setDots = (idx) => {
      dots.forEach((dot, i) => { if (dot) dot.style.background = i === idx ? '#F3D882' : 'rgba(255,255,255,0.35)'; });
    };
    let lastDot = -1;

    const render = (progress) => {
      const fIdx = Math.min(lastIndex, Math.max(0, progress * lastIndex));
      const low = Math.min(lastIndex, Math.floor(fIdx));
      const high = Math.min(lastIndex, low + 1);
      const t = high === low ? 0 : fIdx - low;

      images.forEach((img, i) => {
        if (low === high) {
          if (i === low) {
            gsap.set(img, { clipPath: insetFor(0), scale: scaleFor(0), zIndex: 2 });
            // Heading/sub opacity is NOT touched here — settle() below
            // owns revealing them (with a brief delay) once a step
            // actually finishes arriving.
          } else {
            gsap.set(img, { clipPath: insetFor(1), scale: scaleFor(1), zIndex: 1 });
            gsap.set(headings[i], { opacity: 0 });
            gsap.set(subs[i], { opacity: 0 });
          }
        } else if (i === low) {
          gsap.set(img, { clipPath: insetFor(t), scale: scaleFor(t), zIndex: 1 });
          gsap.set(headings[i], { opacity: textOutOpacity(t) });
          gsap.set(subs[i], { opacity: textOutOpacity(t) });
        } else if (i === high) {
          gsap.set(img, { clipPath: insetFor(1 - t), scale: scaleFor(1 - t), zIndex: 2 });
          // Stays hidden for the whole transition — see settle() below,
          // which reveals it once the image has actually finished opening.
          gsap.set(headings[i], { opacity: 0 });
          gsap.set(subs[i], { opacity: 0 });
        } else {
          gsap.set(img, { clipPath: insetFor(1), scale: scaleFor(1), zIndex: 1 });
          gsap.set(headings[i], { opacity: 0 });
          gsap.set(subs[i], { opacity: 0 });
        }
      });

      const nearest = Math.round(fIdx);
      if (nearest !== lastDot) { lastDot = nearest; setDots(nearest); }
    };

    render(0);
    // render() never sets the resting slide's text opacity itself (see
    // above) — set slide 0's up front, since settle() is never called for
    // it (there's no "step into" the very first slide).
    gsap.set([headings[0], subs[0]], { opacity: 1 });

    let currentIndex = 0;
    // True for a step's whole animation AND the dwell afterward — wheel/
    // touch input is fully swallowed (preventDefault, no native scroll,
    // no additional step) for as long as this is true, exactly matching
    // the reference's `isAnimating` lock.
    let locked = false;
    let lockTimer = null;
    let stepTween = null;
    let textTween = null;

    const getBounds = () => {
      const scrollerRect = scroller.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      const top = scroller.scrollTop + (wrapperRect.top - scrollerRect.top);
      return { top, span: wrapper.offsetHeight - scroller.clientHeight };
    };

    // Reveal this slide's heading/sub only now that a step has actually
    // finished arriving — with a brief pause first, so the caption reads
    // as following the photo instead of arriving alongside it. Slide 0 is
    // never passed here (nothing "steps into" the first slide).
    const revealText = (idx) => {
      const heading = headings[idx];
      const sub = subs[idx];
      gsap.killTweensOf([heading, sub]);
      gsap.set([heading, sub], { opacity: 0 });
      if (textTween) textTween.kill();
      textTween = gsap.to([heading, sub], { opacity: 1, duration: 0.45, delay: 0.3, ease: 'power2.out' });
    };

    // Holds at the newly-arrived slide for 1s (matching the dwell time
    // this slider always had) before unlocking wheel/touch input again.
    const settle = (idx) => {
      currentIndex = idx;
      if (idx !== 0) revealText(idx);
      if (lockTimer) clearTimeout(lockTimer);
      lockTimer = setTimeout(() => { locked = false; }, 1000);
    };

    // Animates scrollTop (and, via it, render()) to the EXACT target
    // slide's position over a fixed duration — never however far/fast the
    // triggering gesture happened to be — so the same mask-opening motion
    // always actually plays, and nothing in between is ever skipped.
    const animateTo = (targetIndex) => {
      if (stepTween) stepTween.kill();
      locked = true;
      const { top, span } = getBounds();
      const targetTop = top + (span * targetIndex) / lastIndex;
      const proxy = { v: scroller.scrollTop };
      stepTween = gsap.to(proxy, {
        v: targetTop,
        duration: 0.6,
        ease: 'power2.inOut',
        onUpdate: () => {
          scroller.scrollTop = proxy.v;
          render((proxy.v - top) / span);
        },
        onComplete: () => {
          scroller.scrollTop = targetTop;
          render(targetIndex / lastIndex);
          settle(targetIndex);
        },
      });
    };

    // At an edge (e.g. asking to go back from slide 0), the previous
    // version did nothing and let that one wheel/touch event's raw,
    // uncapped native scroll take over completely — meaning a hard flick
    // landing on exactly that event could jump the page far past the
    // video hero in a single uncontrolled leap, skipping everything in
    // between. Instead, nudge scrollTop by a small, fixed amount toward
    // the adjacent section ourselves — still capped and controlled, just
    // not an animated step — so leaving the slider is always gradual
    // regardless of how hard the triggering gesture was. Once scrollTop
    // has actually moved past the range's tolerance, isWithinRange() goes
    // false and ordinary fast scrolling resumes normally from there.
    const EDGE_NUDGE = 80;
    const tryStep = (direction) => {
      if (locked) return true; // already consumed by an in-flight step/dwell — still ours to swallow
      const next = currentIndex + direction;
      if (next < 0 || next > lastIndex) {
        scroller.scrollTop += direction * EDGE_NUDGE;
        return true;
      }
      animateTo(next);
      return true;
    };

    const isWithinRange = () => {
      const { top, span } = getBounds();
      const st = scroller.scrollTop;
      return st > top - 4 && st < top + span + 4;
    };

    // If ordinary page scroll (not our own hijack) lands us inside this
    // section's range from outside it — e.g. the user scrolled down past
    // the video hero with a normal gesture — snap-align to whichever
    // slide is nearest instead of leaving the view at an arbitrary
    // in-between position.
    let wasWithinRange = false;
    const onScroll = () => {
      if (locked) return;
      const within = isWithinRange();
      if (within && !wasWithinRange) {
        const { top, span } = getBounds();
        const p = Math.max(0, Math.min(1, (scroller.scrollTop - top) / span));
        currentIndex = Math.round(p * lastIndex);
        animateTo(currentIndex);
      }
      wasWithinRange = within;
    };

    const onWheel = (e) => {
      if (!isWithinRange() && !locked) return;
      // A trackpad swipe with any horizontal component (even a mostly-
      // vertical one that also drifts sideways) can report deltaY: 0 on
      // some of its events — `0 > 0` is false, so that was silently read
      // as "scroll backward" and could quietly reverse a step for no
      // reason the user did. Ignore wheel events with no vertical
      // component instead of guessing a direction for them.
      if (e.deltaY === 0) return;
      tryStep(e.deltaY > 0 ? 1 : -1);
      e.preventDefault();
    };

    // Touch: re-baselines the reference point every time the 30px
    // threshold is crossed, so a single continuous swipe needs genuinely
    // fresh motion for each additional step instead of the same
    // accumulated distance re-triggering steps one after another as soon
    // as each dwell clears.
    let touchStartY = 0;
    let touchActive = false;
    const onTouchStart = (e) => {
      touchActive = isWithinRange() || locked;
      touchStartY = e.touches[0].clientY;
    };
    const onTouchMove = (e) => {
      if (!touchActive) return;
      const currentY = e.touches[0].clientY;
      const delta = touchStartY - currentY;
      if (Math.abs(delta) < 30) { e.preventDefault(); return; }
      touchStartY = currentY;
      tryStep(delta > 0 ? 1 : -1);
      e.preventDefault();
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    scroller.addEventListener('wheel', onWheel, { passive: false });
    scroller.addEventListener('touchstart', onTouchStart, { passive: true });
    scroller.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      scroller.removeEventListener('scroll', onScroll);
      scroller.removeEventListener('wheel', onWheel);
      scroller.removeEventListener('touchstart', onTouchStart);
      scroller.removeEventListener('touchmove', onTouchMove);
      if (stepTween) stepTween.kill();
      if (textTween) textTween.kill();
      if (lockTimer) clearTimeout(lockTimer);
    };
  }, [showContent]);

  useEffect(() => {
    if (SKIP_INTRO) return;
    let timer;
    let cancelled = false;

    const shutterImagesReady = Promise.all(Br.map(src => new Promise(resolve => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve;
      img.src = src;
    })));

    const countUp = (currentVal) => {
      if (currentVal >= 100) {
        shutterImagesReady.then(() => { if (!cancelled) triggerShutterReveal(); });
        return;
      }
      let increment = 1, delay = 50;
      if (currentVal < 25) {
        increment = Math.floor(Math.random() * 2) + 1;
        if (currentVal + increment >= 25) increment = 25 - currentVal;
        delay = 60;
      } else if (currentVal < 50) {
        increment = Math.floor(Math.random() * 2) + 1;
        if (currentVal + increment >= 50) increment = 50 - currentVal;
        delay = 70;
      } else {
        increment = Math.floor(Math.random() * 3) + 1;
        if (currentVal + increment >= 100) increment = 100 - currentVal;
        delay = 55;
      }
      const nextVal = currentVal + increment;
      timer = setTimeout(() => {
        setPreloaderPercentage(nextVal);
        zr.playTick();
        countUp(nextVal);
      }, delay);
    };
    countUp(0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  const triggerShutterReveal = () => {
    setShowShutter(true);
    setTimeout(() => {
      setShowBackdrop(true);
      setTimeout(() => {
        startShutterFlashSequence();
      }, 250);
    }, 100);
  };

  const startShutterFlashSequence = () => {
    // Kick off the continuous grow-to-fullscreen transition right as the first
    // photo flashes, timed (via CSS transition-duration below) to finish
    // exactly as the last photo settles — so the "zooming out" and the photo
    // flashing happen together the whole time, not as two separate stages.
    setGrowFrame(true);

    let index = 0;
    const flash = () => {
      if (index >= FLASH_TOTAL_FRAMES) {
        setShutterActiveIndex(Br.length - 1);
        zr.playFinalClank();
        setShowZunuzText(true);
        setShutterEnding(true);
        setTimeout(() => {
          // Frame is already fullscreen by now — just fade it away to reveal
          // the page underneath, instead of a separate shrink/slide.
          zr.playSplitOpen();
          setFadeOut(true);
          setShowContent(true);
          setShowPreloader(false);
          setTimeout(() => {
            setShowShutter(false);
          }, 700);
        }, 500);
        return;
      }
      const activeFrame = index % Br.length;
      setShutterActiveIndex(activeFrame);
      setFlashTick(index);
      const pitchMultiplier = 1 + (index / FLASH_TOTAL_FRAMES) * 0.95;
      zr.playCameraShutter(pitchMultiplier);
      index++;
      setTimeout(flash, FLASH_FRAME_MS);
    };
    flash();
  };

  return (
    // Outer backdrop — fills the real browser window, centers the phone frame in it.
    // `100dvh` (not `100vh`) matches the rest of the app's convention (see
    // index.css) and tracks the real visible height as mobile browser chrome
    // shows/hides, instead of the taller, stale value `100vh` can report.
    <div className="test-frame-outer" style={{ width: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
      {/* Inner mobile frame — see the file-level comment above for why
          `transform: translateZ(0)` matters here (fixed-position containment).
          The 430x900 cap (see .test-frame-inner below) only exists to
          simulate a phone frame when previewing on a real desktop browser —
          detected via `pointer: coarse` (a touchscreen), not a width
          breakpoint, since real phones can legitimately be wider than
          430px (large phablets, OS-level display-zoom settings) and a
          width-only check would still letterbox those. */}
      <div className="test-frame-inner" style={{ width: '100%', height: '100%', background: '#1F2024', color: '#F5F2EB', position: 'relative', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.65)', transform: 'translateZ(0)' }}>
      {/* Each photo pops in bigger than its resting size, then quickly settles
          to it (--end-transform, set per-image) — remounting the <img> via a
          changing `key` each frame is what makes this replay every single
          time instead of only once. */}
      <style>{`
        .test-frame-outer {
          height: 100dvh;
        }
        .test-frame-inner {
          max-width: 430px;
          max-height: 900px;
        }
        @media (pointer: coarse), (max-width: 430px) {
          .test-frame-inner {
            max-width: none;
            max-height: none;
          }
        }
        @keyframes testShutterZoomPulse {
          from { transform: scale(1.4); opacity: 0.5; }
          to { transform: var(--end-transform, scale(1)); opacity: 1; }
        }
        .test-shutter-zoom-pulse {
          animation: testShutterZoomPulse ${ZOOM_PULSE_MS}ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .test-occasion-scroll::-webkit-scrollbar {
          display: none;
        }
        @keyframes testCtaPulse {
          0% { box-shadow: 0 0 0 0 rgba(17,17,17,0.35); }
          70% { box-shadow: 0 0 0 14px rgba(17,17,17,0); }
          100% { box-shadow: 0 0 0 0 rgba(17,17,17,0); }
        }
        .test-cta-pulse {
          animation: testCtaPulse 2.2s ease-out infinite;
          transition: transform 0.15s ease-out;
        }
        .test-cta-pulse:active {
          transform: scale(0.94) !important;
        }
      `}</style>

      {/* Destination "page" behind the intro — a scroll-snapped stack of
          full-frame sections: video hero, then the "Imagine It" image section. */}
      {showContent && (
        <div
          ref={scrollContainerRef}
          className="animate-fade-in-platform"
          style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden' }}
        >
          {/* Section 1 — video hero */}
          <div style={{ position: 'relative', height: '100%', width: '100%', overflow: 'hidden' }}>
            <video
              src="/main_video.mp4"
              autoPlay
              loop
              muted
              playsInline
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {/* Header */}
            <div
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '20px 20px 0',
              }}
            >
              <img src="/logo_white.png" alt="Zunuz" style={{ height: '22px' }} />
              <button
                type="button"
                style={{ background: 'rgba(0,0,0,0.35)', border: 'none', borderRadius: '10px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Menu size={20} color="#F5F2EB" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {/* Section 2 (right after the video hero) — "rectangle mask"
              fullscreen slider (see the effect above and RECT_MASK_SLIDES
              at the top of the file). The outer wrapper is N viewport-
              heights tall (N = slide count) — the only source of scroll
              distance here; the inner box is `position: sticky`, staying
              pinned on screen for that whole stretch while scroll progress
              through the wrapper drives which slide is showing. */}
          <div
            ref={rectMaskWrapperRef}
            style={{ position: 'relative', width: '100%', height: `${RECT_MASK_SLIDES.length * 100}%` }}
          >
          <div
            ref={rectMaskSectionRef}
            style={{ position: 'sticky', top: 0, width: '100%', height: `${100 / RECT_MASK_SLIDES.length}%`, overflow: 'hidden', background: '#000' }}
          >
            {RECT_MASK_SLIDES.map((slide, i) => (
              slide.image ? (
                <img
                  key={slide.heading}
                  ref={(el) => { rectMaskImageRefs.current[i] = el; }}
                  src={slide.image}
                  alt=""
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', willChange: 'clip-path, transform' }}
                />
              ) : (
                <div
                  key={slide.heading}
                  ref={(el) => { rectMaskImageRefs.current[i] = el; }}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000', willChange: 'clip-path, transform' }}
                />
              )
            ))}

            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.55) 100%)', pointerEvents: 'none', zIndex: 3 }} />

            {RECT_MASK_SLIDES.map((slide, i) => (
              <div
                key={`text-${slide.heading}`}
                style={i === 0
                  ? { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 28px', pointerEvents: 'none', zIndex: 4 }
                  : { position: 'absolute', left: 0, right: 0, bottom: '84px', textAlign: 'center', padding: '0 28px', pointerEvents: 'none', zIndex: 4 }}
              >
                <h2
                  ref={(el) => { rectMaskHeadingRefs.current[i] = el; }}
                  style={{
                    margin: 0, fontFamily: "'Inter', sans-serif", fontSize: '40px', fontWeight: 700,
                    color: '#FFFFFF', textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  }}
                >
                  {slide.heading}
                </h2>
                <p
                  ref={(el) => { rectMaskSubRefs.current[i] = el; }}
                  style={{
                    margin: '0 0 8px', fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: 600,
                    letterSpacing: '0.24em', textTransform: 'uppercase', color: '#F3D882',
                    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                  }}
                >
                  {slide.subheading}
                </p>
                
              </div>
            ))}

            {/* <div style={{ position: 'absolute', bottom: '28px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '8px', zIndex: 4 }}>
              {RECT_MASK_SLIDES.map((_, i) => (
                <span
                  key={i}
                  ref={(el) => { rectMaskDotRefs.current[i] = el; }}
                  style={{ width: '7px', height: '7px', borderRadius: '50%', background: i === 0 ? '#F3D882' : 'rgba(255,255,255,0.35)', transition: 'background 0.3s ease' }}
                />
              ))}
            </div> */}
          </div>
          </div>

          {/* Section 3 — "Imagine It" → "Okay... better", one section, one
              timed sequence (see the effect above): 4.png in, captions in
              one by one, hold, crossfade to 2.png, its caption in.
              Temporarily hidden — see HIDE_SECTION_3 at the top of the file. */}
          {!HIDE_SECTION_3 && (
          <div
            ref={imagineSectionRef}
            style={{ position: 'relative', height: '100%', width: '100%', overflow: 'hidden', background: '#000' }}
          >
            <img
              ref={imagineImageRef}
              src="/5.png"
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', willChange: 'filter, opacity' }}
            />
            <img
              ref={betterImageRef}
              src="/2.png"
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', willChange: 'filter, opacity' }}
            />
            <img
              ref={waitImageRef}
              src="/3.png"
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', willChange: 'filter, opacity' }}
            />
            <img
              ref={perfectImageRef}
              src="/4.png"
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', willChange: 'filter, opacity' }}
            />
            {/* Gentle top/bottom vignette so the gold captions stay legible
                over whatever the photo is doing there, without flattening it
                with a heavy solid scrim. */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.78) 100%)' }} />

            <p
              ref={topTextRef}
              style={{
                position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', textAlign: 'center',
                fontFamily: "'Inter', sans-serif", fontSize: '22px', fontWeight: 500,
                letterSpacing: '0.28em', color: '#F3D882', textTransform: 'uppercase',
                textShadow: '0 1px 3px rgba(0,0,0,0.45), 0 2px 10px rgba(0,0,0,0.45), 0 10px 28px rgba(0,0,0,0.45)',
              }}
            >
              Imagine It.
            </p>

            <p
              ref={bottomTextRef}
              style={{
                position: 'absolute', bottom: '64px', left: 0, right: 0, textAlign: 'center',
                fontFamily: "'Inter', sans-serif", fontSize: '32px', fontWeight: 500,
                color: '#F3D882', textShadow: '0 2px 4px rgba(0,0,0,0.45), 0 4px 14px rgba(0,0,0,0.45), 0 14px 36px rgba(0,0,0,0.45)',
              }}
            >
              Too plain.
            </p>

            <h2
              ref={betterTextRef}
              style={{
                position: 'absolute', bottom: '64px', left: 0, right: 0, textAlign: 'center',
                fontFamily: "'Inter', sans-serif", fontSize: '32px', fontWeight: 500, lineHeight: 1.1,
                color: '#F3D882', textShadow: '0 2px 4px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.45), 0 16px 40px rgba(0,0,0,0.45)',
                padding: '0 32px',
              }}
            >
              Okay... better.
            </h2>

            <h2
              ref={waitTextRef}
              style={{
                position: 'absolute', bottom: '64px', left: 0, right: 0, textAlign: 'center',
                fontFamily: "'Inter', sans-serif", fontSize: '32px', fontWeight: 500, lineHeight: 1.1,
                color: '#F3D882', textShadow: '0 2px 4px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.45), 0 16px 40px rgba(0,0,0,0.45)',
                padding: '0 32px',
              }}
            >
              Wait...
            </h2>

            <h2
              ref={perfectTextRef}
              style={{
                position: 'absolute', bottom: '64px', left: 0, right: 0, textAlign: 'center',
                fontFamily: "'Inter', sans-serif", fontSize: '32px', fontWeight: 500, lineHeight: 1.1,
                color: '#F3D882', textShadow: '0 2px 4px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.45), 0 16px 40px rgba(0,0,0,0.45)',
                padding: '0 32px',
              }}
            >
              Perfect <br/> Now I can go.
            </h2>
          </div>
          )}

          {/* Section 4 — plain white card, four lines revealing one at a
              time as the user scrolls (see the effect above). Normal
              document flow — no fixed section height, no pin, sized to
              whatever the content + spacing actually needs. */}
          <div
            ref={wasntSectionRef}
            style={{
              position: 'relative', width: '100%',
              background: '#F8F8F6', display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '100px 28px', gap: '40px', boxSizing: 'border-box',
            }}
          >
            <p
              ref={wasntLine1Ref}
              style={{
                margin: 0, textAlign: 'center', textTransform: 'uppercase',
                fontFamily: "'Inter', sans-serif", fontSize: '38px', fontWeight: 800, lineHeight: 1.15,
                color: '#111111',
              }}
            >
              I wasn't looking for anything.
            </p>

            <p
              ref={wasntLine2Ref}
              style={{
                margin: 0, textAlign: 'center',
                fontFamily: "'Inter', sans-serif", fontSize: '38px', fontWeight: 500,
                color: '#111111',
              }}
            >
              But...
            </p>

            <p
              ref={wasntLine3Ref}
              style={{
                margin: 0, textAlign: 'center', textTransform: 'uppercase',
                fontFamily: "'Inter', sans-serif", fontSize: '26px', fontWeight: 700,
                color: '#111111',
              }}
            >
              I saw this.
            </p>

            <p
              ref={wasntLine4Ref}
              style={{
                margin: 0, textAlign: 'center', textTransform: 'uppercase',
                fontFamily: "'Inter', sans-serif", fontSize: '18px', fontWeight: 700, letterSpacing: '0.02em',
                color: '#111111',
              }}
            >
              We made these for you.
            </p>
          </div>

          {/* Section 4 — stacked product-card fan (see the effect above
              for both the reveal choreography and attachFanDrag), + the
              "Shop all" link below it. Exactly the original composition —
              a 230x300 box with two smaller side images behind a
              full-size center image — except now all 3 images share that
              same box and are positioned purely via transform (see
              attachFanDrag's keyframes), so dragging can continuously
              swap which one is centered instead of it being fixed. */}
          <div
            ref={shopSectionRef}
            style={{
              position: 'relative', width: '100%',
              background: '#F8F8F6', display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '20px 28px 50px', boxSizing: 'border-box',
            }}
          >
            <div
              ref={shopFanContainerRef}
              style={{ position: 'relative', width: '230px', height: '300px', cursor: 'grab', touchAction: 'pan-y' }}
            >
              {SHOP_FAN_IMAGES.map((src, i) => (
                <img
                  key={src}
                  ref={(el) => { shopFanImageRefs.current[i] = el; }}
                  src={src}
                  alt=""
                  draggable={false}
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: 'cover', borderRadius: '22px', boxShadow: '0 14px 32px rgba(0,0,0,0.13)',
                  }}
                />
              ))}
            </div>

            <div
              ref={shopAllRef}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '28px' }}
            >
              <span style={{ fontFamily: "'Inter', sans-serif", fontStyle: 'italic', fontSize: '16px', color: '#111111' }}>
                Shop all
              </span>
              <ArrowRight size={18} color="#111111" />
            </div>
          </div>

          {/* Last section — "Where will you wear it?" — one full card at a
              time with left/right arrow navigation (see the effect above
              and OCCASION_CARDS at the top of the file), modeled on the
              feature carousels on Apple's product pages. */}
          <div
            ref={occasionSectionRef}
            style={{ position: 'relative', width: '100%', background: '#F8F8F6', padding: '64px 0px 64px 0px', boxSizing: 'border-box' }}
          >
            <h2
              ref={occasionHeadingRef}
              style={{
                margin: '0 20px 20px', padding: '0 10px',
                fontFamily: "'Inter', sans-serif", fontSize: '24px', fontWeight: 700,
                letterSpacing: '0.04em', color: '#111111',
              }}
            >
              Where will you wear it?
            </h2>

            <div style={{ position: 'relative', width: '100%' }}>
              <div
                ref={occasionViewportRef}
                style={{ position: 'relative', width: '100%', height: '480px', overflow: 'hidden', touchAction: 'pan-y', background: '#000' }}
              >
                {OCCASION_CARDS.map((card, i) => (
                  <div
                    key={card.label}
                    ref={(el) => { occasionCardRefs.current[i] = el; }}
                    style={{ position: 'absolute', inset: 0 }}
                  >
                    <img
                      src={card.image}
                      alt=""
                      draggable={false}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 40%)' }} />
                    <p
                      style={{
                        position: 'absolute', left: '20px', right: '20px', bottom: '20px', margin: 0,
                        fontFamily: "'Inter', sans-serif", fontSize: '18px', fontWeight: 600, color: '#FFFFFF',
                        textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      }}
                    >
                      {card.label}
                    </p>
                  </div>
                ))}
              </div>

              <button
                ref={occasionLeftArrowRef}
                type="button"
                aria-label="Previous"
                style={{
                  position: 'absolute', top: '50%', left: '16px', transform: 'translateY(-50%)',
                  width: '42px', height: '42px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3,
                }}
              >
                <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2} />
              </button>
              <button
                ref={occasionRightArrowRef}
                type="button"
                aria-label="Next"
                style={{
                  position: 'absolute', top: '50%', right: '16px', transform: 'translateY(-50%)',
                  width: '42px', height: '42px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3,
                }}
              >
                <ChevronRight size={22} color="#FFFFFF" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Last section — "Your day doesn't stop." 2x2 feature grid (see
              the effect above and DAY_FEATURE_CARDS at the top of the
              file). Edge-to-edge mosaic grid, thin gap between cells, no
              rounded corners — a different visual language from the
              carousel's rounded/padded cards, matching the reference. */}
          <div
            ref={dayFeatureSectionRef}
            style={{ position: 'relative', width: '100%', background: '#F8F8F6', padding: '48px 0 0', boxSizing: 'border-box' }}
          >
            <h2
              ref={dayFeatureHeadingRef}
              style={{
                margin: '0 0 12px', padding: '0 16px',
                fontFamily: "'Inter', sans-serif", fontSize: '15px', fontWeight: 700,
                letterSpacing: '0.04em', textTransform: 'uppercase', color: '#111111',
              }}
            >
              Your day doesn't stop.
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
              {DAY_FEATURE_CARDS.map((card, i) => (
                <div
                  key={card.label}
                  ref={(el) => { dayFeatureCardRefs.current[i] = el; }}
                  style={{ position: 'relative', width: '100%', height: '340px', overflow: 'hidden' }}
                >
                  <img
                    src={card.image}
                    alt=""
                    draggable={false}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 45%)' }} />
                  <p
                    style={{
                      position: 'absolute', left: '20px', right: '12px', bottom: '20px', margin: 0,
                      fontFamily: "'Inter', sans-serif", fontSize: '20px', fontWeight: 600, lineHeight: 1.2, color: '#fff',
                    }}
                  >
                    {card.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Last section — "See it on her." carousel, same component/style
              as the "Where will you wear it?" occasion carousel above, just
              with a two-line heading (title + subtitle) ahead of the cards. */}
          <div
            ref={seeHerSectionRef}
            style={{ position: 'relative', width: '100%', background: '#F8F8F6', padding: '64px 0px 64px 0px', boxSizing: 'border-box' }}
          >
            <h2
              ref={seeHerHeadingRef}
              style={{
                margin: '0 20px 8px', padding: '0 10px',
                fontFamily: "'Inter', sans-serif", fontSize: '24px', fontWeight: 700,
                letterSpacing: '0.04em', color: '#111111',
              }}
            >
              See it on her.
            </h2>
            <p
              ref={seeHerSubRef}
              style={{
                margin: '0 20px 20px', padding: '0 10px',
                fontFamily: "'Inter', sans-serif", fontSize: '14px', fontWeight: 400,
                color: '#666666',
              }}
            >
              Real women. Real outfits. Real jewellery.
            </p>

            <div
              className="test-occasion-scroll"
              style={{
                display: 'flex', gap: '16px', overflowX: 'auto', padding: '0 18px',
                scrollbarWidth: 'none',
                // `position: relative` makes this row the `offsetParent`
                // for its cards, so `card.offsetLeft` (used by
                // attachCarouselDrag) is measured relative to it directly
                // — and, unlike getBoundingClientRect(), offsetLeft/
                // offsetWidth ignore the cards' own scale transform, so
                // measuring a card's position/size isn't thrown off by
                // whatever scale that same code just applied to it.
                position: 'relative',
                // JS (see attachCarouselDrag) now owns horizontal dragging
                // entirely — native scroll-snap felt heavy and inconsistent
                // about short flicks. `pan-y` stops the browser's own
                // horizontal-pan gesture recognition from competing with
                // it, while still letting vertical page scroll pass through.
                touchAction: 'pan-y',
              }}
            >
              {SEE_HER_CARDS.map((card, i) => (
                <div
                  key={card.quote}
                  ref={(el) => { seeHerCardRefs.current[i] = el; }}
                  style={{
                    position: 'relative', flex: '0 0 auto', width: '350px', height: '380px',
                    borderRadius: '18px', overflow: 'hidden',
                  }}
                >
                  <img
                    src={card.image}
                    alt=""
                    draggable={false}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 40%)' }} />
                  <p
                    style={{
                      position: 'absolute', left: '16px', right: '16px', bottom: '16px', margin: 0,
                      fontFamily: "'Inter', sans-serif", fontSize: '16px', fontWeight: 600, color: '#FFFFFF',
                      textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    }}
                  >
                    {card.quote}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Final section — "Ready?" closing CTA (see the effect above):
              small heading, then a full-bleed image with the title/
              subtitle/button overlaid directly on top of it. */}
          <div
            ref={readySectionRef}
            style={{ position: 'relative', width: '100%', background: '#F8F8F6', boxSizing: 'border-box' }}
          >
            <h2
              ref={readyHeadingRef}
              style={{
                margin: 0, padding: '24px 28px 20px',
                fontFamily: "'Inter', sans-serif", fontSize: '28px', fontWeight: 500, color: '#111111',
              }}
            >
              Ready?
            </h2>

            <div
              ref={readyImageRef}
              style={{ position: 'relative', width: '100%', height: '600px', overflow: 'hidden' }}
            >
              <img
                src="/4.png"
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0) 60%)' }} />

              <div
                style={{
                  position: 'absolute', left: 0, right: 0, bottom: '48px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '0 28px', textAlign: 'center',
                }}
              >
                <p
                  ref={readyTitleRef}
                  style={{
                    margin: '0 0 8px',
                    fontFamily: "'Inter', sans-serif", fontSize: '36px', fontWeight: 600, color: '#fff',
                  }}
                >
                  Yep.
                </p>
                <p
                  ref={readySubRef}
                  style={{
                    margin: '0 0 28px',
                    fontFamily: "'Inter', sans-serif", fontSize: '15px', fontWeight: 400, color: '#f5f5f5',
                  }}
                >
                  This is so me.
                </p>
                <button
                  ref={readyButtonRef}
                  type="button"
                  className="test-cta-pulse"
                  style={{
                    border: 'none', cursor: 'pointer', background: '#111111', color: '#FFFFFF',
                    padding: '16px 40px', borderRadius: '999px',
                    fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: 600,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}
                >
                  Get Yours
                </button>
              </div>
            </div>
          </div>

          {/* Footer — accordion link sections, social icons, copyright. */}
          <div style={{ background: '#FFFFFF', padding: '32px 0 0', borderTop: '1px solid #EAEAEA' }}>
            {FOOTER_SECTIONS.map((section, i) => {
              const isOpen = openFooterSection === i;
              return (
                <div key={section.title} style={{ borderBottom: '1px solid #EAEAEA' }}>
                  <button
                    type="button"
                    onClick={() => setOpenFooterSection(isOpen ? null : i)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'none', border: 'none', cursor: 'pointer', padding: '18px 28px', textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase', color: '#111111',
                      }}
                    >
                      {section.title}
                    </span>
                    <Plus
                      size={18}
                      color="#111111"
                      strokeWidth={1.75}
                      style={{ transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.25s ease' }}
                    />
                  </button>
                  <div style={{ maxHeight: isOpen ? `${section.items.length * 34 + 8}px` : '0px', overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                    <div style={{ padding: '0 28px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {section.items.map((item) => (
                        <a
                          key={item}
                          href="#"
                          style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: '#555555', textDecoration: 'none' }}
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
              <a href="https://instagram.com/zunuz" target="_blank" rel="noreferrer" aria-label="Instagram" style={{ color: '#111111' }}>
                <FooterInstagramIcon size={20} />
              </a>
            </div>

            <p style={{ textAlign: 'center', margin: 0, padding: '0 0 28px', fontFamily: "'Inter', sans-serif", fontSize: '11px', color: '#999999' }}>
              © 2026 ZUNUZ. All rights reserved.
            </p>
          </div>
        </div>
      )}

      {showPreloader && !showBackdrop && (
        <Preloader percentage={preloaderPercentage} muted={false} onMuteToggle={() => {}} />
      )}

      {showShutter && showBackdrop && (
        <div
          className="fixed inset-0 z-[998] overflow-hidden pointer-events-none bg-[#1F2024] border-b border-[#F5F2EB]/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)]"
          style={{
            opacity: fadeOut ? 0 : 1,
            transition: 'opacity 600ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="absolute inset-0 flex flex-col justify-center items-center bg-[#1F2024]">
            <div className="relative flex items-center justify-center w-full h-full">
              {/* Shutter Card Frame — continuously grows to fill the screen over
                  the whole flash sequence (started in startShutterFlashSequence),
                  so every photo flashes at a slightly wider frame than the one
                  before it, instead of one small fixed card the whole time. */}
              <div
                className="relative border border-zinc-800/60 bg-zinc-950 overflow-hidden z-10 animate-fade-in"
                style={{
                  width: growFrame ? '100%' : '75%',
                  height: growFrame ? '100%' : '55%',
                  borderRadius: growFrame ? '0px' : '8px',
                  transition: `width ${FLASH_TOTAL_FRAMES * FLASH_FRAME_MS}ms cubic-bezier(0.16, 1, 0.3, 1), height ${FLASH_TOTAL_FRAMES * FLASH_FRAME_MS}ms cubic-bezier(0.16, 1, 0.3, 1), border-radius ${FLASH_TOTAL_FRAMES * FLASH_FRAME_MS}ms ease`,
                }}
              >
                {shutterEnding ? (
                  // Final settle keeps the original smooth hand-off — everything
                  // else (mid-sequence) uses the per-photo zoom-pulse below instead.
                  <img
                    src={Br[Br.length - 1]}
                    alt="ZunUz Portrait"
                    className="absolute inset-0 w-full h-full object-cover filter contrast-[1.25] grayscale brightness-95"
                    style={{
                      transform: m1[Br.length - 1],
                      transition: 'transform 1200ms cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                ) : (
                  <img
                    key={flashTick}
                    src={Br[shutterActiveIndex]}
                    alt="ZunUz Portrait"
                    className="absolute inset-0 w-full h-full object-cover filter contrast-[1.25] grayscale brightness-95 test-shutter-zoom-pulse"
                    style={{ '--end-transform': m1[shutterActiveIndex] }}
                  />
                )}
              </div>

              {/* Shutter Text Overlay */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                style={{
                  opacity: fadeOut ? 0 : 1,
                  transition: 'opacity 500ms ease',
                }}
              >
                <div className="relative w-full text-center flex flex-col items-center justify-center">
                  <img
                    src="/logo_white.png"
                    alt="Zunuz Logo"
                    className={`w-[60%] max-w-[320px] h-auto object-contain drop-shadow-[0_20px_45px_rgba(0,0,0,0.98)] transition-all duration-[750ms] cubic-bezier(0.16, 1, 0.3, 1) ${showZunuzText ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-16 scale-95'}`}
                  />
                  <p
                    className={`text-[12px] md:text-sm font-mono tracking-[0.45em] text-[#F5F2EB]/60 mt-5 uppercase transition-opacity duration-1000 delay-300 ${showZunuzText ? 'opacity-100' : 'opacity-0'}`}
                  >
                    You Love it! Buy it!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
