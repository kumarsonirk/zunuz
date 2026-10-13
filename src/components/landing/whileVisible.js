// Run looping decoration (spinning shapes, glancing eyes…) only while its
// section is on screen: `getTweens` returns the GSAP tweens / timelines to
// pause when `el` scrolls out of view and resume when it's back. Off-screen
// loops otherwise keep restyling elements every frame, costing CPU and
// battery for nothing. A function, so tweens created later (e.g. on entry)
// are included. Returns a cleanup function.
export default function whileVisible(el, getTweens) {
  if (!el || typeof IntersectionObserver === 'undefined') return () => {};
  const io = new IntersectionObserver(([entry]) => {
    // ratio > 0, not isIntersecting: a section that only touches the screen
    // edge (e.g. starts exactly where the hero ends) counts as intersecting.
    const onScreen = entry.intersectionRatio > 0;
    getTweens().forEach((t) => t && (onScreen ? t.resume() : t.pause()));
  });
  io.observe(el);
  return () => io.disconnect();
}
