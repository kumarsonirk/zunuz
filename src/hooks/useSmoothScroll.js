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

  return lenisRef;
}
