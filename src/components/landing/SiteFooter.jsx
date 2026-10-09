import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import scrollRise from './scrollRise';

gsap.registerPlugin(ScrollTrigger);

// Shared site footer for the storefront pages. Needs the
// page's scroll container ref and its Lenis ref (from useSmoothScroll) for
// "Back to top".

// Footer link columns. `external` opens in a new tab and gets a ↗; internal
// ones are router Links. Social links other than Instagram are placeholders
// ('#') until the real profile URLs are known.
const FOOTER_COLUMNS = [
  { title: 'Shop', links: [
    { label: 'All jewellery', href: '/jewellery' },
    { label: 'Festive Glow', href: '/festive-glow' },
    { label: 'Navratri Offers (3 @ ₹999)', href: '/navratri-offers' },
    { label: 'Necklaces', href: '/necklaces' },
    { label: 'Bracelets', href: '/bracelets' },
    { label: 'Earrings', href: '/earrings' },
  ] },
  { title: 'Budget', links: [
    { label: '₹199+', href: '/shop?tier=199-plus' },
    { label: '₹499+', href: '/shop?tier=499-plus' },
    { label: '₹999+', href: '/shop?tier=999-plus' },
    { label: 'Shop everything', href: '/shop' },
  ] },
  { title: 'Help', links: [
    { label: 'Contact', href: '/customer-care' },
    { label: 'Shipping', href: '/customer-care/shipping-policy' },
    { label: 'Returns', href: '/customer-care/returns-replacements' },
    { label: 'Product care', href: '/customer-care/product-care' },
    { label: 'FAQs', href: '/customer-care/faq' },
  ] },
  { title: 'Account', links: [
    { label: 'My account', href: '/account' },
    { label: 'Orders', href: '/account/orders' },
    { label: 'Bag', href: '/cart' },
  ] },
  { title: 'Social', links: [
    { label: 'Instagram', href: 'https://instagram.com/zunuz', external: true },
    { label: 'Pinterest', href: '#', external: true },
    { label: 'YouTube', href: '#', external: true },
  ] },
];

// Footer backdrop wordmark, set in Qrokinex — the brand display font the
// logo uses — as real text so it stays sharp at any size (the 424px logo
// PNG blurred when stretched full width). One span per letter so each can
// rise in and wave on its own.
const FOOTER_WORD = 'ZUNUZ';

// Footer. Same live animation as the rest of the page, kept light:
// - brand block + each link column rise with the shared scrollRise;
// - a full-width "ZUNUZ" (Qrokinex, the logo's font) sits behind everything
//   as a faint backdrop, its letters rising up from behind the bottom edge
//   one by one as you scroll to the end — transforms only;
// - links: pink + an underline that sweeps in on hover (CSS only);
// - live cursor interaction: a wave through the backdrop wordmark's letters
//   and a magnetic "Back to top" (see the pointer effect);
// - "Back to top" glides up via Lenis (falls back to native smooth scroll).
// No permanent GPU layers, nothing animating while off screen.
// Brand glyphs (lucide-react in this project has no brand icons). 24×24,
// drawn in currentColor so they follow the link's colour / hover.
const SOCIAL_ICONS = {
  Instagram: (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  ),
  Pinterest: (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3.64 19.31c-.09-.79-.16-2 .03-2.86l1.17-4.97s-.3-.6-.3-1.48c0-1.39.8-2.42 1.81-2.42.85 0 1.26.64 1.26 1.4 0 .86-.55 2.14-.83 3.33-.24 1 .5 1.81 1.48 1.81 1.77 0 3.14-1.87 3.14-4.57 0-2.39-1.72-4.06-4.17-4.06-2.84 0-4.51 2.13-4.51 4.34 0 .86.33 1.78.74 2.28a.3.3 0 0 1 .07.29l-.27 1.13c-.04.18-.15.22-.34.13-1.25-.58-2.03-2.41-2.03-3.88 0-3.16 2.3-6.06 6.62-6.06 3.48 0 6.18 2.48 6.18 5.79 0 3.45-2.18 6.23-5.2 6.23-1.02 0-1.97-.53-2.3-1.15l-.62 2.39c-.23.87-.84 1.96-1.25 2.63A10 10 0 1 0 12 2z" />
    </svg>
  ),
  YouTube: (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
      <path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
    </svg>
  ),
};

export default function SiteFooter({ scrollRef, lenisRef }) {
  const footerRef = useRef(null);
  // Phones (< 640px): link columns become an accordion (one open at a time);
  // Social stays an always-open row. Desktop/tablet: plain columns.
  const [openCol, setOpenCol] = useState(null);

  useEffect(() => {
    const footer = footerRef.current;
    const scroller = scrollRef.current;
    if (!footer || !scroller) return;
    const unCols = scrollRise(footer, scroller, footer.querySelectorAll('.t3ft-col'), { base: 50, step: 18, gap: 0.08 });

    // Wordmark reveal: each letter starts fully hidden below the footer's
    // bottom edge (the footer clips it) and slides up into place one after
    // another, scrubbed to scroll, so "ZUNUZ" assembles as you reach the end
    // of the page and sinks back when you scroll up. Slight scale-up from
    // the baseline for a bit of pop. Ends at max scroll (clamp) since this
    // is the bottom of the page.
    let word;
    const letters = footer.querySelectorAll('.t3ft-letter');
    if (letters.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      word = gsap.timeline({
        scrollTrigger: { trigger: footer, scroller, start: 'top 80%', end: 'clamp(bottom bottom)', scrub: 0.6 },
      });
      word.fromTo(letters,
        { yPercent: 105, scaleY: 0.85, transformOrigin: '50% 100%' },
        { yPercent: 0, scaleY: 1, ease: 'power3.out', duration: 1, stagger: 0.12 });
    }
    return () => {
      unCols();
      word?.scrollTrigger?.kill();
      word?.kill();
    };
  }, [scrollRef]);

  // Live pointer interaction (mouse/trackpad only; off for reduced motion).
  // Transforms + opacity only, so nothing here triggers layout or repaint:
  // - the faint "zunuz." letters lift and grow in a wave around the cursor's
  //   x position (the pink dot bounces a little extra), settling flat on leave;
  // - "Back to top" is pulled gently toward the cursor when it's near.
  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const waves = Array.from(footer.querySelectorAll('.t3ft-wave'));
    const top = footer.querySelector('.t3ft-top');

    const waveY = waves.map((w) => gsap.quickTo(w, 'y', { duration: 0.5, ease: 'power3.out' }));
    const waveS = waves.map((w) => gsap.quickTo(w, 'scale', { duration: 0.5, ease: 'power3.out' }));
    const topX = gsap.quickTo(top, 'x', { duration: 0.4, ease: 'power3.out' });
    const topY = gsap.quickTo(top, 'y', { duration: 0.4, ease: 'power3.out' });

    // Letter centres are measured on enter (not every move) — positions are
    // fixed while hovering, and this keeps pointermove free of layout reads.
    let letterX = [];
    let topRect = null;
    let footerRect = null;
    const measure = () => {
      footerRect = footer.getBoundingClientRect();
      letterX = waves.map((w) => { const r = w.getBoundingClientRect(); return r.left + r.width / 2; });
      topRect = top?.getBoundingClientRect() || null;
    };

    const onEnter = () => measure();
    const onMove = (e) => {
      if (!footerRect) measure();
      waves.forEach((w, i) => {
        const d = Math.abs(e.clientX - letterX[i]);
        const k = Math.max(0, 1 - d / 260); // 1 right under the cursor → 0 at 260px
        waveY[i](-k * 40);
        waveS[i](1 + k * 0.08);
      });
      if (top && topRect) {
        const cx = topRect.left + topRect.width / 2;
        const cy = topRect.top + topRect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const near = Math.hypot(dx, dy) < 110;
        topX(near ? dx * 0.3 : 0);
        topY(near ? dy * 0.3 : 0);
      }
    };
    const onLeave = () => {
      waveY.forEach((f) => f(0));
      waveS.forEach((f) => f(1));
      topX(0);
      topY(0);
      footerRect = null;
    };
    footer.addEventListener('pointerenter', onEnter);
    footer.addEventListener('pointermove', onMove);
    footer.addEventListener('pointerleave', onLeave);
    // Page scroll moves the footer under a still cursor — re-measure then.
    const scroller = scrollRef.current;
    const onScroll = () => { footerRect = null; };
    scroller?.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      footer.removeEventListener('pointerenter', onEnter);
      footer.removeEventListener('pointermove', onMove);
      footer.removeEventListener('pointerleave', onLeave);
      scroller?.removeEventListener('scroll', onScroll);
      gsap.killTweensOf([...waves, top]);
    };
  }, [scrollRef]);

  const toTop = () => {
    const lenis = lenisRef.current;
    if (lenis) lenis.scrollTo(0, { duration: 1.6 });
    else scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer ref={footerRef} className="relative overflow-hidden px-5 pt-[clamp(48px,6vw,80px)] text-[#111110]">
      {/* "ZUNUZ" in Qrokinex as a faint, full-width backdrop behind
          everything (the wrapper's low opacity keeps it a watermark while each
          letter still rises in on scroll and waves under the cursor).
          Decorative — hidden from screen readers. */}
      {/* bottom: -0.11em cancels Qrokinex's built-in space below the
          letters (measured: a constant 0.11× the font size at every width),
          so the letters sit right on the footer's bottom edge. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[-0.11em] z-0 flex select-none items-end justify-between px-[2vw] font-['Qrokinex','Syncopate',sans-serif] text-[length:19vw] leading-[0.8] text-[#111110] opacity-[0.08]">
        {FOOTER_WORD.split('').map((ch, i) => (
          <span key={i} className="t3ft-letter inline-block"><span className="t3ft-wave inline-block origin-bottom">{ch}</span></span>
        ))}
      </div>

      <div className="relative z-[1] mx-auto max-w-[1100px] border-t border-[#111110]/12 pt-[clamp(40px,5vw,64px)]">
        <div className="grid grid-cols-5 gap-x-[clamp(16px,2.4vw,36px)] gap-y-10 max-[860px]:grid-cols-3 max-[639px]:block">
          {/* Link columns */}
          {FOOTER_COLUMNS.map((col) => {
            const social = col.title === 'Social';
            const open = openCol === col.title;
            const linkCls = "group/fl inline-flex items-center gap-1 font-['Inter',sans-serif] text-[15px] text-[#111110]/80 no-underline transition-colors duration-200 hover:text-[#FF3D8B] focus-visible:text-[#FF3D8B] focus-visible:outline-none";
            const links = col.links.map((link) => { const LinkTag = link.external ? 'a' : Link; return (
              <li key={link.label}>
                <LinkTag
                  {...(link.external ? { href: link.href, target: '_blank', rel: 'noreferrer' } : { to: link.href })}
                  className={linkCls}
                >
                  {SOCIAL_ICONS[link.label] && <span className="mr-1 inline-flex shrink-0">{SOCIAL_ICONS[link.label]}</span>}
                  {/* Underline sweeps in from the left on hover/focus. */}
                  <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1.5px] bg-[position:0_100%] bg-no-repeat pb-0.5 transition-[background-size] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/fl:bg-[length:100%_1.5px] group-focus-visible/fl:bg-[length:100%_1.5px]">
                    {link.label}
                  </span>
                  {link.external && (
                    <span aria-hidden="true" className="inline-block text-[12px] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/fl:-translate-y-0.5 group-hover/fl:translate-x-0.5">↗</span>
                  )}
                </LinkTag>
              </li>
            ); });
            return (
              <nav key={col.title} aria-label={col.title} className={`t3ft-col max-[639px]:border-b max-[639px]:border-[#111110]/10 ${social ? 'max-[639px]:border-b-0 max-[639px]:pt-5' : ''}`}>
                {/* Desktop / tablet heading */}
                <h3 className="m-0 text-[length:clamp(17px,1.4vw,20px)] font-bold max-[639px]:hidden">{col.title}</h3>
                {/* Phone heading: accordion toggle (Social is a plain label) */}
                {social ? (
                  <h3 className="m-0 hidden text-[15px] font-bold max-[639px]:block">Follow us</h3>
                ) : (
                  <h3 className="m-0 hidden max-[639px]:block">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenCol(open ? null : col.title)}
                      className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent py-4 text-left text-[16px] font-bold text-[#111110]"
                    >
                      {col.title}
                      <span aria-hidden="true" className={`relative flex size-7 items-center justify-center rounded-full transition-[background-color,color,rotate] duration-300 ${open ? 'rotate-180 bg-[#FF3D8B] text-white' : 'bg-[#111110]/6'}`}>
                        <span className="absolute h-[2px] w-3 rounded-full bg-current" />
                        <span className={`absolute h-3 w-[2px] rounded-full bg-current transition-transform duration-300 ${open ? 'rotate-90' : ''}`} />
                      </span>
                    </button>
                  </h3>
                )}
                {/* Desktop / tablet list */}
                <ul className="m-0 mt-4 flex list-none flex-col gap-2 p-0 max-[639px]:hidden">{links}</ul>
                {/* Phone list: accordion panel, or a wrapping row for Social */}
                {social ? (
                  <ul className="m-0 mt-3 hidden list-none flex-wrap gap-x-5 gap-y-2 p-0 max-[639px]:flex">{links}</ul>
                ) : (
                  <div className={`hidden transition-[grid-template-rows] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] max-[639px]:grid ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-3 p-0 pb-5">{links}</ul>
                    </div>
                  </div>
                )}
              </nav>
            );
          })}
        </div>

        {/* Bottom bar */}
        <div className="mt-[clamp(20px,3vw,40px)] flex flex-wrap items-center justify-between gap-4 border-t border-[#111110]/12 py-6 font-['Inter',sans-serif] text-[13px] text-[#111110]/60">
          <p className="m-0">© 2026 ZUNUZ. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="text-[#111110]/60 no-underline transition-colors hover:text-[#FF3D8B]">Privacy</Link>
            <Link to="/terms" className="text-[#111110]/60 no-underline transition-colors hover:text-[#FF3D8B]">Terms</Link>
            <button
              type="button"
              onClick={toTop}
              className="t3ft-top group/top inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#111110]/15 bg-white/70 px-4 py-2 text-[13px] font-semibold text-[#111110] transition-[background-color,border-color,color] duration-300 hover:border-[#111110] hover:bg-[#111110] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3D8B]"
            >
              Back to top
              <span aria-hidden="true" className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/top:-translate-y-0.5">↑</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
