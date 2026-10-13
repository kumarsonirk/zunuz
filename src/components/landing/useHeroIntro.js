import { useEffect, useLayoutEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// See LandingIntro.jsx for the markup contract (class names) this hook
// animates, and for <LandingLoader />, whose ref it takes.
// Loader + hero intro + hero scroll parallax. `posterSrc` is the hero photo
// to wait for (fully decoded) before the loader dissolves into it.
// `withLoader: false` skips the loading screen: the photo fades in as soon as
// it's decoded (≤ ~1.2s) and the text plays right after.
export default function useHeroIntro({ heroRef, loaderRef, scrollRef, posterSrc, withLoader = true }) {
  // Loading screen + hero load animation.
  // A branded loader (cream, "ZUNUZ" in Qrokinex bobbing, real progress
  // bar + %) covers the page until it's actually ready (see "What loaded
  // means" below), so nobody sees a bare pink background. Then: the loader's
  // letters lift away and it dissolves straight into the (already drawn)
  // hero photo → then the header drops, headline lines (.t3-line) rise
  // out of their masks, the sub-lines fade up, the strip slides up and the
  // buttons pop. useLayoutEffect sets the hidden states before first paint
  // so nothing flashes. Transforms/opacity only. Reduced motion: the loader
  // simply disappears when ready and everything is shown in place.
  useLayoutEffect(() => {
    const hero = heroRef.current;
    const loader = loaderRef?.current;
    if (!hero) return;
    if (withLoader && !loader) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const head = hero.querySelector('.t3h-head');
    const photo = hero.querySelector('.t3h-photo');
    const lines = hero.querySelectorAll('.t3-line');
    const subs = hero.querySelectorAll('.t3h-sub');
    const btns = hero.querySelectorAll('.t3h-btn');
    const strip = hero.querySelectorAll('.t3h-strip'); // optional (empty is fine)

    // ── No loading screen: smooth fade-in entrance without any blink ──
    if (!withLoader) {
      if (loader) gsap.set(loader, { display: 'none' });
      if (reduced) {
        // Flat list of elements (NodeLists spread) — nested NodeLists made GSAP throw.
        gsap.set([head, photo, ...lines, ...subs, ...btns, ...strip].filter(Boolean), { opacity: 1, y: 0, yPercent: 0, rotate: 0, scale: 1 });
        return undefined;
      }

      // Photo: shown as-is, no fade — a fade that stalls mid-way (the page's
      // first heavy render lands in the same second) looked "stuck".
      // Text: hidden now, and the entrance starts once that first heavy work
      // is done (idle, or 600ms at most), so it plays smoothly.
      if (photo) gsap.set(photo, { opacity: 1 });
      gsap.set(head, { y: -16, opacity: 0 });
      gsap.set(lines, { yPercent: 35, opacity: 0 });
      gsap.set(subs, { y: 14, opacity: 0 });
      gsap.set(btns, { y: 12, opacity: 0, scale: 0.96 });
      gsap.set(strip, { yPercent: 50, opacity: 0 });
      const quickTl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
      quickTl
        .to(head, { y: 0, opacity: 1, duration: 0.6 }, 0)
        .to(lines, { yPercent: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.08 }, 0.05)
        .to(subs, { y: 0, opacity: 1, duration: 0.6, stagger: 0.08 }, 0.2)
        .to(btns, { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.08 }, 0.32)
        .to(strip, { yPercent: 0, opacity: 1, duration: 0.6 }, 0.25);
      let started = false;
      const start = () => { if (!started) { started = true; quickTl.play(); } };
      const idleId = window.requestIdleCallback ? window.requestIdleCallback(start, { timeout: 600 }) : null;
      const fallback = setTimeout(start, 600);

      return () => {
        if (idleId && window.cancelIdleCallback) window.cancelIdleCallback(idleId);
        clearTimeout(fallback);
        quickTl.kill();
      };
    }

    const ldLetters = loader ? loader.querySelectorAll('.t3-ld-inner') : [];
    const ldBar = loader ? loader.querySelector('.t3-ld-bar') : null;
    const ldPct = loader ? loader.querySelector('.t3-ld-pct') : null;

    if (!reduced) {
      gsap.set(head, { y: -30, opacity: 0 });
      // The photo stays visible UNDER the (opaque) loader rather than at
      // opacity 0: it looks the same, but the browser can count it as painted
      // as soon as it's drawn — hiding it held Largest Contentful Paint back
      // until the loader finished (~11s on PageSpeed's slow mobile run).
      gsap.set(photo, { opacity: 1 });
      gsap.set(lines, { yPercent: 115, rotate: 4, transformOrigin: '0% 100%' });
      gsap.set(subs, { y: 24, opacity: 0 });
      gsap.set(btns, { y: 18, opacity: 0, scale: 0.92 });
      gsap.set(strip, { yPercent: 100 });
    }
    // Show the loader's content once the brand font (Qrokinex) is ready, so
    // its letters never render in the fallback font first and then jump
    // (measured: each letter's width snapped 104px → 160px). CSS handles the
    // fade/bob from here, so main-thread stalls can't freeze them.
    const qrokinexReady = () => {
      if (!document.fonts) return true;
      for (const face of document.fonts) {
        if (face.family.replace(/["']/g, '') === 'Qrokinex' && face.status === 'loaded') return true;
      }
      return false;
    };
    const showLoader = () => { loader.dataset.ready = 'true'; };
    let ldPoll;
    const ldStart = performance.now();
    const waitQrokinex = () => {
      if (qrokinexReady() || performance.now() - ldStart > 1200) { showLoader(); return; }
      ldPoll = setTimeout(waitQrokinex, 30);
    };
    document.fonts?.load?.('400 100px "Qrokinex"').catch(() => {});
    waitQrokinex();

    let tl;
    let cancelled = false;
    const play = () => {
      if (cancelled || tl) return;
      clearTimeout(ldPoll);
      showLoader();
      if (reduced) { gsap.set(loader, { display: 'none' }); return; }
      if (ldBar) ldBar.style.transform = 'scaleX(1)'; // CSS transition glides it to full
      if (ldPct) ldPct.textContent = '100%';
      tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.4 });
      // 1) Loader out: letters lift away and the bar/% fade.
      tl.to(ldLetters, { yPercent: -130, duration: 0.5, ease: 'power3.in', stagger: 0.05 })
        .to(loader.querySelectorAll('.t3-ld-meta'), { opacity: 0, duration: 0.35 }, '<')
      // 2) The photo is put fully in place UNDER the loader, then the loader
      //    dissolves straight into it — cream → photo, never a bare pink
      //    frame (a curtain slide used to uncover the pink background first).
        .to(loader, { opacity: 0, duration: 0.9, ease: 'power2.inOut' }, '-=0.1')
        .set(loader, { display: 'none' })
      // 3) …then the text and controls follow.
        .addLabel('text', '>')
        .to(head, { y: 0, opacity: 1, duration: 0.8 }, 'text')
        .to(lines, { yPercent: 0, rotate: 0, duration: 1, ease: 'power4.out', stagger: 0.12 }, 'text+=0.1')
        .to(strip, { yPercent: 0, duration: 0.7 }, 'text+=0.6')
        .to(subs, { y: 0, opacity: 1, duration: 0.7, stagger: 0.12 }, 'text+=0.55')
        .to(btns, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.8)', stagger: 0.1 }, 'text+=0.8');
    };

    // ── What "loaded" means ──
    // Only what the first screen needs:
    // - Bricolage Grotesque really loaded (document.fonts.load() can resolve
    //   before the stylesheet registers the face, so check the face itself);
    // - the hero photo fully decoded.
    // (It used to also wait for the page's `load` event and every non-lazy
    // image — the other hero posters included — which on a slow phone held
    // the loader up to its safety limit.) Never more than SAFETY_MS.
    const fontLoaded = () => {
      if (!document.fonts) return true;
      for (const face of document.fonts) {
        if (face.family.replace(/["']/g, '') === 'Bricolage Grotesque' && face.status === 'loaded') return true;
      }
      return false;
    };
    let photoReady = false;
    const posterImg = new Image();
    posterImg.src = posterSrc;
    posterImg.decode().then(() => { photoReady = true; }, () => { photoReady = true; });

    // Progress shown on the loader: real completed steps, eased so the
    // number glides rather than jumping.
    const started = performance.now();
    let shown = 0;
    let poll;
    const SAFETY_MS = 3500; // never trap anyone on the loader
    const wait = () => {
      if (cancelled) return;
      const steps = [fontLoaded(), photoReady];
      const done = steps.filter(Boolean).length;
      const total = steps.length;
      const target = total ? (done / total) * 100 : 100;
      shown += (target - shown) * 0.18;
      if (ldPct) ldPct.textContent = `${Math.round(shown)}%`;
      if (ldBar) ldBar.style.transform = `scaleX(${shown / 100})`;
      const ready = done === total;
      const timedOut = performance.now() - started > SAFETY_MS;
      if ((ready && shown > 97) || timedOut) { play(); return; }
      poll = setTimeout(wait, 40);
    };
    document.fonts?.load?.('700 64px "Bricolage Grotesque"').catch(() => {});
    wait();

    return () => {
      cancelled = true;
      clearTimeout(poll);
      clearTimeout(ldPoll);
      tl?.kill();
    };
  }, [heroRef, loaderRef, posterSrc, withLoader]);

  // Scrolling away from the hero: the copy block lifts and fades a little
  // faster than the page (light parallax), reversing on the way back. Only
  // the small text block moves — not the full-screen photo, which would
  // repaint a huge area every scroll frame.
  useEffect(() => {
    const hero = heroRef.current;
    const scroller = scrollRef.current;
    if (!hero || !scroller) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const copy = hero.querySelector('.t3h-copy');
    if (!copy) return;
    const tween = gsap.fromTo(copy, { y: 0, opacity: 1 }, {
      y: -110, opacity: 0.25, ease: 'none', immediateRender: false,
      scrollTrigger: { trigger: hero, scroller, start: 'top top', end: 'bottom top', scrub: 0.5 },
    });
    return () => { tween.scrollTrigger?.kill(); tween.kill(); };
  }, [heroRef, scrollRef]);

  // index.html paints the page cream from the first frame on landing pages (/test3, /jewel) (so the
  // site's default dark body doesn't flash before the loader mounts). Undo
  // that when leaving this page, since the app switches routes without a
  // reload.
  useEffect(() => () => {
    document.getElementById('t3-boot-bg')?.remove();
    document.documentElement.style.background = '';
  }, []);
}
