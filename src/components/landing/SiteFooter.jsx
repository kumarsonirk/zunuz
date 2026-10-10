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
];

const INSTAGRAM_URL = 'https://www.instagram.com/zunuz_official/';

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
    <footer ref={footerRef} className="relative overflow-hidden px-5 pt-[clamp(32px,4vw,56px)] text-[#111110]">
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
        <div className="grid grid-cols-4 gap-x-[clamp(16px,2.4vw,36px)] gap-y-10 max-[860px]:grid-cols-3 max-[639px]:block">
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

        {/* Follow us — its own centred line (outside the phone accordions). */}
        <div className="mt-[clamp(24px,3vw,40px)] flex justify-center">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="group/ig inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[#111110]/12 bg-white/70 px-5 py-2.5 font-['Inter',sans-serif] text-[15px] font-semibold text-[#111110] no-underline transition-[color,border-color,translate] duration-300 hover:-translate-y-0.5 hover:border-[#FF3D8B] hover:text-[#FF3D8B]"
          >
            {SOCIAL_ICONS.Instagram}
            Follow us on Instagram
            <span aria-hidden="true" className="text-[12px] transition-transform duration-300 group-hover/ig:translate-x-0.5 group-hover/ig:-translate-y-0.5">↗</span>
          </a>
        </div>

        {/* Bottom bar */}
        <div className="mt-[clamp(20px,3vw,40px)] flex flex-wrap items-center justify-between gap-4 border-t border-[#111110]/12 py-6 font-['Inter',sans-serif] text-[13px] text-[#111110]/60">
          <p className="m-0">© 2026 ZUNUZ. All rights reserved.</p>
          {/* Phones: this row wraps under the copyright — full width so
              "Back to top" sits on the right, Privacy / Terms on the left. */}
          <div className="flex items-center gap-5 max-[639px]:w-full">
            <Link to="/privacy" className="text-[#111110]/60 no-underline transition-colors hover:text-[#FF3D8B]">Privacy</Link>
            <Link to="/terms" className="text-[#111110]/60 no-underline transition-colors hover:text-[#FF3D8B]">Terms</Link>
            <button
              type="button"
              onClick={toTop}
              className="t3ft-top group/top ml-auto inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#111110]/15 bg-white/70 px-4 py-2 text-[13px] font-semibold text-[#111110] transition-[background-color,border-color,color] duration-300 hover:border-[#111110] hover:bg-[#111110] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3D8B]"
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
