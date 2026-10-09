import { Fragment, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { Sparkles, Mail, MessageCircle } from 'lucide-react';
import StoreShell, { cardCls } from './StoreShell';
import { CONTACT, HELP_PAGES } from '../../data/contact';

// Shared page for the customer-care policies + Terms / Privacy. Content is
// data: `sections` = [{ heading, body?, list?, footer?, subsections? }]
// (subsections have the same shape with `subheading`). Layout: hero, chips
// to the sibling help pages, a sticky contents list (desktop) beside the
// sections, then a "still need help?" card. Sections rise in as they
// scroll into view.
const slug = (s, i) => `s${i}-${String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

function Block({ s }) {
  return (
    <>
      {s.body?.map((p, j) => <p key={`b${j}`} className="m-0">{p}</p>)}
      {s.list && (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {s.list.map((item, j) => (
            <li key={j} className="flex items-start gap-3">
              <Sparkles size={15} className="mt-[4px] shrink-0 text-[#FF3D8B]" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      {s.footer?.map((p, j) => <p key={`f${j}`} className="m-0">{p}</p>)}
    </>
  );
}

export default function PolicyLayout({ eyebrow = 'Customer care', title, intro, sections = [], closing, accent = 'text-[#FF3D8B]', children }) {
  const rootRef = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(root.querySelectorAll('.pl-word'), { yPercent: 110, rotate: 3 }, { yPercent: 0, rotate: 0, duration: 0.85, stagger: 0.05 })
      .fromTo(root.querySelectorAll('.pl-in'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, clearProps: 'transform' }, 0.2);
    // Sections rise in as they enter the viewport.
    const items = [...root.querySelectorAll('.pl-sec')];
    gsap.set(items, { opacity: 0, y: 36 });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        gsap.to(e.target, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', clearProps: 'transform' });
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => io.observe(el));
    return () => { tl.kill(); io.disconnect(); gsap.killTweensOf(items); };
  }, [pathname]);

  const jump = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    // Finish its rise-in first, or we'd scroll to its pre-animation spot.
    gsap.killTweensOf(el);
    gsap.set(el, { opacity: 1, y: 0, clearProps: 'transform' });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const all = closing ? [...sections, closing] : sections;

  return (
    <StoreShell>
      <main ref={rootRef} className="mx-auto max-w-[1180px] px-5 pt-[clamp(24px,4vw,56px)] pb-[clamp(56px,7vw,96px)]">
        <p className="pl-in m-0 font-['Inter',sans-serif] text-[13px] font-bold tracking-[0.16em] text-[#111110]/50 uppercase">{eyebrow}</p>
        <h1 className={`m-0 mt-2 max-w-[900px] text-[length:clamp(38px,6vw,84px)] leading-[0.95] font-extrabold tracking-[-0.03em] ${accent}`}>
          {title.split(' ').map((w, i) => (
            <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-top"><span className="pl-word inline-block">{w}&nbsp;</span></span>
          ))}
        </h1>
        {intro && <p className="pl-in m-0 mt-4 max-w-[640px] font-['Inter',sans-serif] text-[17px] leading-relaxed text-[#111110]/70">{intro}</p>}

        <nav aria-label="Help pages" className="pl-in -mx-1.5 mt-[18px] flex gap-2 overflow-x-auto px-1.5 pt-1.5 pb-2 [scrollbar-width:none]">
          {HELP_PAGES.map((p) => {
            const on = p.path === pathname;
            return (
              <Link
                key={p.path}
                to={p.path}
                aria-current={on ? 'page' : undefined}
                className={`shrink-0 rounded-full border-2 px-4 py-2 font-['Inter',sans-serif] text-[14px] font-semibold no-underline transition-[background-color,color,border-color,translate] duration-300 hover:-translate-y-0.5 ${on ? 'border-[#111110] bg-[#111110] text-white' : 'border-[#111110]/12 bg-white/70 text-[#111110] hover:border-[#111110]'}`}
              >
                {p.label}
              </Link>
            );
          })}
        </nav>

        <div className={`mt-10 grid gap-[clamp(24px,4vw,56px)] ${all.length > 2 ? 'grid-cols-[220px_minmax(0,1fr)] max-[900px]:grid-cols-1' : 'grid-cols-1'}`}>
          {all.length > 2 && (
            <aside className="pl-in sticky top-6 self-start max-[900px]:hidden">
              <p className="m-0 mb-3 font-['Inter',sans-serif] text-[12px] font-bold tracking-[0.14em] text-[#111110]/45 uppercase">On this page</p>
              <ol className="m-0 flex list-none flex-col gap-1 border-l-2 border-[#111110]/10 p-0">
                {all.map((s, i) => (
                  <li key={i}>
                    <a href={`#${slug(s.heading, i)}`} onClick={(e) => jump(e, slug(s.heading, i))} className="-ml-[2px] block border-l-2 border-transparent py-1.5 pl-4 font-['Inter',sans-serif] text-[14px] leading-snug text-[#111110]/60 no-underline transition-colors hover:border-[#FF3D8B] hover:text-[#111110]">
                      {s.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </aside>
          )}

          <div className="flex min-w-0 flex-col gap-4">
            {children}
            {all.map((s, i) => (
              <section key={i} id={slug(s.heading, i)} className={`pl-sec scroll-mt-6 p-[clamp(20px,2.6vw,32px)] ${cardCls}`}>
                <h2 className="m-0 flex items-baseline gap-3 text-[length:clamp(20px,2vw,26px)] leading-tight font-bold">
                  <span className="font-['Inter',sans-serif] text-[13px] font-bold text-[#FF3D8B]">{String(i + 1).padStart(2, '0')}</span>
                  {s.heading}
                </h2>
                <div className="mt-4 flex flex-col gap-3 font-['Inter',sans-serif] text-[15px] leading-relaxed text-[#111110]/72">
                  <Block s={s} />
                  {s.subsections?.map((sub, k) => (
                    <Fragment key={k}>
                      <h3 className="m-0 mt-2 text-[17px] font-bold text-[#111110]">{sub.subheading}</h3>
                      <Block s={sub} />
                    </Fragment>
                  ))}
                </div>
              </section>
            ))}

            {/* Still need help? */}
            <section className="pl-sec relative overflow-hidden rounded-[28px] bg-[#111110] p-[clamp(24px,3vw,40px)] text-white">
              <span aria-hidden="true" className="absolute -top-16 -right-10 size-56 rounded-full bg-[#FF3D8B] opacity-30 blur-3xl" />
              <h2 className="relative m-0 text-[length:clamp(24px,2.6vw,34px)] font-bold">Still need help?</h2>
              <p className="relative m-0 mt-2 font-['Inter',sans-serif] text-[15px] text-white/70">We reply {CONTACT.hours}.</p>
              <div className="relative mt-5 flex flex-wrap gap-3">
                <a href={`mailto:${CONTACT.email}`} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-['Inter',sans-serif] text-[15px] font-bold text-[#111110] no-underline transition-[background-color,translate] duration-300 hover:-translate-y-0.5 hover:bg-[#F6C915]">
                  <Mail size={17} /> Email us
                </a>
                <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 px-5 py-3 font-['Inter',sans-serif] text-[15px] font-bold text-white no-underline transition-[border-color,translate] duration-300 hover:-translate-y-0.5 hover:border-white">
                  <MessageCircle size={17} /> WhatsApp
                </a>
              </div>
            </section>
          </div>
        </div>
      </main>
    </StoreShell>
  );
}
