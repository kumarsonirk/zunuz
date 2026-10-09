import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { Truck, RotateCcw, XCircle, Sparkles, HelpCircle, FileText, Shield, Mail, MessageCircle, Clock, ArrowRight, Package } from 'lucide-react';
import StoreShell, { cardCls } from '../components/store/StoreShell';
import Seo from '../components/Seo';
import { CONTACT } from '../data/contact';
import { FAQS } from '../data/faqs';

// Customer care hub (/customer-care, also /account/help-center): contact
// options, topic cards for every policy page, and the top FAQs.
const TOPICS = [
  { to: '/customer-care/faq', label: 'FAQs', sub: 'Quick answers to common questions', icon: HelpCircle, tint: 'bg-[#FFE0EA] text-[#FF3D8B]' },
  { to: '/customer-care/shipping-policy', label: 'Shipping & delivery', sub: 'Dispatch, timelines, tracking', icon: Truck, tint: 'bg-[#D6E6FF] text-[#1A6FE8]' },
  { to: '/customer-care/returns-replacements', label: 'Returns & replacements', sub: 'Damaged or wrong item? Start here', icon: RotateCcw, tint: 'bg-[#FFF0B8] text-[#8A6A00]' },
  { to: '/customer-care/cancellation-policy', label: 'Cancellations', sub: 'Cancel within 6 hours, refunds', icon: XCircle, tint: 'bg-[#FFE0EA] text-[#E8304F]' },
  { to: '/customer-care/product-care', label: 'Product care', sub: 'Keep your pieces shining', icon: Sparkles, tint: 'bg-[#E8F7EE] text-[#1E8A4C]' },
  { to: '/account/orders', label: 'My orders', sub: 'Track an order or get an invoice', icon: Package, tint: 'bg-[#E6DCFA] text-[#7A4BD6]' },
  { to: '/terms', label: 'Terms & conditions', sub: 'The fine print', icon: FileText, tint: 'bg-[#111110]/6 text-[#111110]' },
  { to: '/privacy', label: 'Privacy policy', sub: 'How we handle your data', icon: Shield, tint: 'bg-[#111110]/6 text-[#111110]' },
];

export default function CustomerCarePage() {
  const rootRef = useRef(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(root.querySelectorAll('.cc-word'), { yPercent: 110, rotate: 3 }, { yPercent: 0, rotate: 0, duration: 0.85, stagger: 0.06 })
      .fromTo(root.querySelectorAll('.cc-in'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, clearProps: 'transform' }, 0.2);
    return () => tl.kill();
  }, []);

  return (
    <StoreShell>
      <Seo
        title="Customer Care"
        description="Get help with ZUNUZ orders — shipping, returns & replacements, cancellations, and product care, all in one place."
        path="/customer-care"
      />
      <main ref={rootRef} className="mx-auto max-w-[1180px] px-5 pt-[clamp(24px,4vw,56px)] pb-[clamp(56px,7vw,96px)]">
        <p className="cc-in m-0 font-['Inter',sans-serif] text-[13px] font-bold tracking-[0.16em] text-[#111110]/50 uppercase">Customer care</p>
        <h1 className="m-0 mt-2 text-[length:clamp(40px,6.4vw,92px)] leading-[0.95] font-extrabold tracking-[-0.03em] text-[#FF3D8B]">
          {'How can we help?'.split(' ').map((w, i) => (
            <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-top"><span className="cc-word inline-block">{w}&nbsp;</span></span>
          ))}
        </h1>
        <p className="cc-in m-0 mt-3 max-w-[560px] font-['Inter',sans-serif] text-[17px] text-[#111110]/65">Real people, quick replies. Pick a topic or reach us directly.</p>

        {/* Contact */}
        <div className="mt-8 grid grid-cols-3 gap-3 max-[800px]:grid-cols-1">
          <a href={`mailto:${CONTACT.email}`} className="cc-in group/c relative flex items-center gap-4 overflow-hidden rounded-[24px] bg-[#111110] p-5 text-white no-underline transition-[translate] duration-300 hover:-translate-y-1">
            <span aria-hidden="true" className="absolute -right-8 -bottom-10 size-32 rounded-full bg-[#FF3D8B] opacity-40 blur-2xl transition-transform duration-500 group-hover/c:scale-150" />
            <span className="relative flex size-12 items-center justify-center rounded-full bg-white/12"><Mail size={22} /></span>
            <span className="relative min-w-0">
              <span className="block font-['Inter',sans-serif] text-[12px] font-semibold tracking-wide text-white/60 uppercase">Email</span>
              <span className="block truncate text-[16px] font-bold">{CONTACT.email}</span>
            </span>
          </a>
          <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noreferrer" className="cc-in group/c relative flex items-center gap-4 overflow-hidden rounded-[24px] bg-[#1E8A4C] p-5 text-white no-underline transition-[translate] duration-300 hover:-translate-y-1">
            <span aria-hidden="true" className="absolute -right-8 -bottom-10 size-32 rounded-full bg-[#F6C915] opacity-40 blur-2xl transition-transform duration-500 group-hover/c:scale-150" />
            <span className="relative flex size-12 items-center justify-center rounded-full bg-white/15"><MessageCircle size={22} /></span>
            <span className="relative">
              <span className="block font-['Inter',sans-serif] text-[12px] font-semibold tracking-wide text-white/70 uppercase">Call / WhatsApp</span>
              <span className="block text-[16px] font-bold">{CONTACT.phone}</span>
            </span>
          </a>
          <div className={`cc-in flex items-center gap-4 p-5 ${cardCls}`}>
            <span className="flex size-12 items-center justify-center rounded-full bg-[#FFF0B8] text-[#8A6A00]"><Clock size={22} /></span>
            <span>
              <span className="block font-['Inter',sans-serif] text-[12px] font-semibold tracking-wide text-[#111110]/50 uppercase">Support hours</span>
              <span className="block text-[16px] font-bold">{CONTACT.hours}</span>
            </span>
          </div>
        </div>

        {/* Topics */}
        <h2 className="cc-in m-0 mt-12 text-[length:clamp(26px,3vw,38px)] font-bold">Browse help topics</h2>
        <div className="mt-5 grid grid-cols-4 gap-3 max-[1000px]:grid-cols-2 max-[520px]:grid-cols-1">
          {TOPICS.map(({ to, label, sub, icon: Icon, tint }) => (
            <Link key={to} to={to} className={`cc-in group/t flex flex-col gap-3 p-5 text-[#111110] no-underline transition-[translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_44px_-26px_rgba(17,17,16,0.55)] ${cardCls}`}>
              <span className={`flex size-11 items-center justify-center rounded-full transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/t:rotate-[-12deg] group-hover/t:scale-110 ${tint}`}><Icon size={20} /></span>
              <span className="text-[17px] font-bold">{label}</span>
              <span className="flex items-end justify-between gap-2 font-['Inter',sans-serif] text-[13px] text-[#111110]/55">
                {sub}
                <ArrowRight size={16} className="shrink-0 text-[#111110]/30 transition-[translate,color] duration-300 group-hover/t:translate-x-1 group-hover/t:text-[#FF3D8B]" />
              </span>
            </Link>
          ))}
        </div>

        {/* Top FAQs */}
        <div className="mt-12 flex flex-wrap items-end justify-between gap-3">
          <h2 className="cc-in m-0 text-[length:clamp(26px,3vw,38px)] font-bold">Popular questions</h2>
          <Link to="/customer-care/faq" className="cc-in font-['Inter',sans-serif] text-[15px] font-bold text-[#1A6FE8] no-underline hover:underline">All FAQs →</Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 max-[800px]:grid-cols-1">
          {FAQS.slice(0, 4).map((f) => (
            <div key={f.q} className={`cc-in p-5 ${cardCls}`}>
              <p className="m-0 text-[17px] font-bold">{f.q}</p>
              <p className="m-0 mt-2 font-['Inter',sans-serif] text-[14px] leading-relaxed text-[#111110]/65">{f.a}</p>
            </div>
          ))}
        </div>
      </main>
    </StoreShell>
  );
}
