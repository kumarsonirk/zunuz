import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Shared section-heading entrance, scrubbed to scroll: as a section comes
// up the screen its heading pieces rise from a little below and fade in,
// settling into place as the section nears the top. Each piece starts a bit
// lower than the one before it (capped after the 4th, so long lists don't
// start miles away), so they slide up as a layered stack and meet.
// scrub: 0.8 trails the scroll slightly so it glides; scrolling back up
// reverses it. end uses clamp() so it still completes on the last section,
// where the page can end before the section's top reaches 20%.
// Options: base/step = starting offset (px) of the first piece / extra per
// piece; gap = stagger in timeline units; at = timeline offset (to let one
// group follow another on the same scroll range); end = when it completes
// (default 'clamp(top 20%)').
// Returns a cleanup function. No-op with reduced motion.
export default function scrollRise(section, scroller, elements, { base = 70, step = 35, gap = 0.12, at = 0, end = 'clamp(top 20%)' } = {}) {
  const els = Array.from(elements || []).filter(Boolean);
  if (!section || !scroller || !els.length) return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const tl = gsap.timeline({
    scrollTrigger: { trigger: section, scroller, start: 'top 95%', end, scrub: 0.8 },
  });
  if (at) tl.set({}, {}, 0);
  // Own compositor layer per piece: otherwise fading opacity repaints the
  // text every scroll frame (measured: ~30 slow frames over a full page
  // scroll without this, ~0 with it).
  gsap.set(els, { willChange: 'transform, opacity' });
  els.forEach((el, i) => {
    tl.fromTo(el, { y: base + Math.min(i, 3) * step, opacity: 0 }, { y: 0, opacity: 1, ease: 'power2.out', duration: 1 }, at + i * gap);
  });
  return () => { tl.scrollTrigger?.kill(); tl.kill(); gsap.set(els, { clearProps: 'willChange' }); };
}
