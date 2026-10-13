import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

// Smooth scrolling for pages that scroll inside their own container (the app
// shell keeps #root from scrolling — see index.css). Lenis eases wheel and
// trackpad scrolling of `wrapperRef` (touch keeps native momentum) and is
// driven off GSAP's ticker, so every ScrollTrigger pointed at the same
// scroller updates on the same frame Lenis moves. Horizontal swipes on card
// strips pass straight through. Skipped for users who prefer reduced motion.
//
// `contentRef` must be the wrapper's single child holding all the content.
// Returns a ref to the live Lenis instance (null while inactive).
export default function useSmoothScroll(wrapperRef, contentRef, enabled = true) {
  const lenisRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const lenis = new Lenis({
      wrapper,
      content,
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [enabled, wrapperRef, contentRef]);

  // Keep every scroll animation's start/end positions in step with the page.
  // ScrollTrigger measures once; when the page grows afterwards (products,
  // photos or fonts arriving late — slowest in in-app browsers like
  // Instagram's, whose toolbar also resizes the screen while you scroll) the
  // stored positions go stale and scroll-linked fade-ins can stop half-way,
  // leaving headings / forms invisible. Re-measure (debounced) whenever the
  // content or the scroll box changes size, and after fonts + page load.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return undefined;
    let timer = null;
    let lastH = 0;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { ScrollTrigger.refresh(); ScrollTrigger.update(); }, 180);
    };
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
        const h = Math.round(content.scrollHeight) + Math.round(wrapper.clientHeight) * 10000;
        if (h !== lastH) { lastH = h; refresh(); }
      })
      : null;
    ro?.observe(content);
    ro?.observe(wrapper);
    const onLoad = () => refresh();
    if (document.readyState !== 'complete') window.addEventListener('load', onLoad, { once: true });
    document.fonts?.ready?.then(refresh, () => {});
    // Late images need nothing extra: if one changes the page height, the
    // ResizeObserver above sees it. (Re-measuring on every image load used to
    // run a full ScrollTrigger.refresh() while photos streamed in mid-scroll
    // — a hitch each time on slower phones.)
    return () => {
      clearTimeout(timer);
      ro?.disconnect();
      window.removeEventListener('load', onLoad);
    };
  }, [wrapperRef, contentRef]);

  return lenisRef;
}
