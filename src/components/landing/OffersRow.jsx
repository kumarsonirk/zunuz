import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Check, Copy, Gift } from 'lucide-react';
import { SETTINGS } from '../../store/settings';
import { formatPrice } from '../../store/catalogConfig';
import scrollRise from './scrollRise';
import { inSwipeStrip } from './swipeStrip';

// "Offers, unlocked." — one bold card per live offer, above "Jewellery, by
// budget" on the home page: the Navratri collection, the Pick-3 combo, 50%
// off a first order (WELCOME50) and Refer & Earn. Combo and referral cards
// follow their on/off + amounts in admin → Settings. Desktop: four across;
// tablets: 2×2; phones: a swipe strip, two cards in view, that moves on by
// one card every few seconds (looping back at the end) and pauses for a
// while once the shopper swipes or taps it (swiping works both ways).
// Each card is a stretched link (so the WELCOME50 "copy" button can sit
// inside it without nesting a button in a link).
const FIRST_ORDER_CODE = 'WELCOME50';
const AUTO_MS = 3200; // phones: time per step of the auto-rotation
const RESUME_MS = 6000; // …and how long it waits after the shopper touches it

const Spark = ({ className = '', fill = 'currentColor' }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
    <path d="M12 0c.9 6.6 5.4 11.1 12 12-6.6.9-11.1 5.4-12 12-.9-6.6-5.4-11.1-12-12C6.6 11.1 11.1 6.6 12 0z" fill={fill} />
  </svg>
);

function getOffers() {
  const offers = [
    {
      key: 'navratri',
      to: '/festive-glow',
      tag: 'Festive edit',
      title: <>Navratri<br />Collection</>,
      copy: 'Nine nights, endless ways to shine.',
      cta: 'Shop the edit',
      cls: 'bg-[linear-gradient(150deg,#5A0F0A_0%,#2A0503_55%,#120201_100%)] text-[#FFE9B8]',
      tagCls: 'bg-[#F6C915] text-[#2A0503]',
      ctaCls: 'bg-[#F6C915] text-[#2A0503]',
      art: (
        <>
          <Spark className="t3o-spin absolute -top-3 -right-3 size-[42%] text-[#F6C915]/90" />
          <Spark className="absolute top-[30%] right-[34%] size-[9%] text-[#FFE9B8]/70" />
          <Spark className="absolute top-[12%] right-[44%] size-[6%] text-[#F6C915]/60" />
          <span className="absolute -bottom-[18%] -left-[14%] size-[70%] rounded-full bg-[#E8304F]/25 blur-2xl" />
        </>
      ),
    },
  ];
  if (SETTINGS.navratriOfferEnabled) {
    const count = SETTINGS.navratriBundleCount ?? 3;
    offers.push({
      key: 'combo',
      to: '/navratri-offers',
      tag: 'Combo deal',
      title: <>Pick any {count}<br />@ {formatPrice(SETTINGS.navratriBundlePrice ?? 999)}</>,
      copy: `${count} pieces, one price. Mix and match your set.`,
      cta: 'Pick your set',
      cls: 'bg-[linear-gradient(150deg,#FFD84D_0%,#F6C915_60%,#F2B705_100%)] text-[#111110]',
      tagCls: 'bg-[#111110] text-[#F6C915]',
      ctaCls: 'bg-[#111110] text-white',
      art: <span className="absolute -top-[14%] -right-[6%] text-[length:clamp(150px,15vw,210px)] font-black leading-none text-white/35 select-none">{count}</span>,
    });
  }
  offers.push({
    key: 'first-order',
    to: '/jewellery',
    tag: 'New here?',
    title: <>50% off your<br />first order</>,
    copy: 'On first orders above ₹2,000.',
    cta: 'Shop now',
    code: FIRST_ORDER_CODE,
    cls: 'bg-[linear-gradient(150deg,#FF6FA8_0%,#FF3D8B_55%,#E8246F_100%)] text-white',
    tagCls: 'bg-white text-[#FF3D8B]',
    ctaCls: 'bg-white text-[#E8246F]',
    art: <span className="absolute -top-[10%] -right-[4%] text-[length:clamp(130px,13vw,190px)] font-black leading-none text-white/20 select-none">%</span>,
  });
  const reward = Number(SETTINGS.referralReward) || 0;
  const bonus = Number(SETTINGS.referralFriendBonus) || 0;
  if (SETTINGS.referralEnabled && (reward || bonus)) {
    offers.push({
      key: 'refer',
      to: '/account/refer',
      tag: 'Refer & earn',
      title: reward ? <>Refer a Friend.<br />Get ₹{reward}!</> : <>Refer a<br />Friend.</>,
      copy: [bonus && `Your friend gets ₹${bonus}.`, reward && `You earn ₹${reward}.`].filter(Boolean).join(' '),
      cta: 'Invite friends',
      cls: 'bg-[linear-gradient(150deg,#4C8DFF_0%,#1A6FE8_55%,#0F4FB8_100%)] text-white',
      tagCls: 'bg-[#F6C915] text-[#0F3E8F]',
      ctaCls: 'bg-white text-[#1A6FE8]',
      art: <Gift aria-hidden="true" strokeWidth={1.6} className="absolute -top-[6%] -right-[8%] size-[52%] rotate-12 text-white/25" />,
    });
  }
  return offers;
}

function CodeChip({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); } catch { /* still show the code */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `Code ${code} copied` : `Copy code ${code}`}
      className="relative z-[2] mt-3 inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border-2 border-dashed border-white/80 bg-white/10 px-3 py-1 font-['Inter',sans-serif] text-[12px] max-[560px]:mt-2 max-[560px]:gap-1.5 max-[560px]:px-2 max-[560px]:text-[10px] font-bold tracking-[0.12em] text-white transition-colors hover:bg-white/20"
    >
      {code}
      {copied ? <Check size={14} strokeWidth={2.6} /> : <Copy size={13} strokeWidth={2.4} />}
      <span aria-live="polite" className="sr-only">{copied ? 'Copied' : ''}</span>
    </button>
  );
}

export default function OffersRow({ scrollRef }) {
  const [offers] = useState(getOffers);
  const ref = useRef(null);
  const stripRef = useRef(null);
  const holdUntil = useRef(0);

  // Move the phone strip one card on (wrapping back to the start).
  const go = useCallback(() => {
    const strip = stripRef.current;
    const card = strip?.firstElementChild;
    if (!card) return;
    const stepW = card.offsetWidth + parseFloat(getComputedStyle(strip).columnGap || 0);
    const max = strip.scrollWidth - strip.clientWidth;
    const left = strip.scrollLeft >= max - 4 ? 0 : strip.scrollLeft + stepW;
    strip.scrollTo({ left, behavior: 'smooth' });
  }, []);

  // Heading rises with the scroll like every section; cards follow in a stagger.
  useEffect(() => {
    const section = ref.current;
    const scroller = scrollRef?.current;
    if (!section || !scroller) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const cards = section.querySelectorAll('.t3o-card');
    const unrise = scrollRise(section, scroller, section.querySelectorAll('.t3o-fade'));
    gsap.set(cards, inSwipeStrip(cards[0]) ? { opacity: 0, y: 40 } : { opacity: 0, y: 60, scale: 0.94 });
    let tween;
    const trigger = ScrollTrigger.create({
      trigger: section,
      scroller,
      start: 'top 80%',
      once: true,
      onEnter: () => { tween = gsap.to(cards, { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'power3.out', stagger: 0.1 }); },
    });
    const spins = gsap.to(section.querySelectorAll('.t3o-spin'), { rotate: 360, duration: 24, ease: 'none', repeat: -1 });
    return () => { unrise(); trigger.kill(); tween?.kill(); spins.kill(); };
  }, [scrollRef]);

  // Phones: auto-advance the strip one card at a time, back to the start
  // after the last. Only while it's a swipe strip and on screen; any touch,
  // wheel or keyboard focus pauses it for RESUME_MS. Off with reduced motion.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let visible = false;
    const hold = () => { holdUntil.current = Date.now() + RESUME_MS; };
    const step = () => {
      if (!visible || Date.now() < holdUntil.current || document.hidden) return;
      if (!/auto|scroll/.test(getComputedStyle(strip).overflowX)) return; // grid layout (tablet / desktop)
      go();
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.5 });
    io.observe(strip);
    const timer = setInterval(step, AUTO_MS);
    const events = ['touchstart', 'pointerdown', 'wheel', 'focusin'];
    events.forEach((ev) => strip.addEventListener(ev, hold, { passive: true }));
    return () => {
      clearInterval(timer);
      io.disconnect();
      events.forEach((ev) => strip.removeEventListener(ev, hold));
    };
  }, [go]);

  return (
    <section ref={ref} aria-label="Offers" className="relative overflow-hidden px-5 pt-[clamp(56px,7vw,96px)] pb-6 text-[#111110]">
      <div className="relative z-[1] mx-auto max-w-[1100px]">
        <h2 className="t3o-fade m-0 flex items-center gap-[0.3em] text-[length:clamp(28px,4.2vw,60px)] font-bold leading-[1.1] tracking-[-0.01em]">
          Offers, unlocked.
          <Spark className="t3o-spin size-[0.7em] shrink-0" fill="#FF3D8B" />
        </h2>
        <p className="t3o-fade mt-[0.5em] text-[length:clamp(16px,1.6vw,24px)] font-medium text-[#FF3D8B]">Every deal on ZUNUZ right now.</p>

        <div className="mt-[clamp(24px,3vw,40px)] grid grid-cols-4 gap-[clamp(12px,1.6vw,22px)] max-[1000px]:grid-cols-2 max-[560px]:-mx-5 max-[560px]:flex max-[560px]:snap-x max-[560px]:snap-mandatory max-[560px]:scroll-pl-5 max-[560px]:overflow-x-auto max-[560px]:px-5 max-[560px]:gap-3 max-[560px]:pt-2 max-[560px]:pb-3" ref={stripRef}>
          {offers.map((o) => (
            <div
              key={o.key}
              className={`t3o-card group relative isolate flex min-h-[clamp(280px,27vw,340px)] flex-col overflow-hidden rounded-[clamp(18px,2vw,28px)] p-[clamp(18px,1.8vw,24px)] shadow-[0_18px_40px_-22px_rgba(17,17,16,0.45)] transition-[translate,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:shadow-[0_28px_50px_-22px_rgba(17,17,16,0.55)] max-[560px]:min-h-[250px] max-[560px]:shrink-0 max-[560px]:basis-[calc((100%-12px)/2)] max-[560px]:rounded-[18px] max-[560px]:p-3.5 max-[560px]:snap-start max-[560px]:snap-always ${o.cls}`}
            >
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-[1] overflow-hidden transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]">{o.art}</span>
              <span className={`w-fit rounded-full px-3 py-1 font-['Inter',sans-serif] text-[11px] font-bold tracking-[0.12em] uppercase max-[560px]:px-2 max-[560px]:text-[9px] max-[560px]:tracking-[0.08em] ${o.tagCls}`}>{o.tag}</span>
              <h3 className="m-0 mt-auto pt-6 text-[length:clamp(26px,2.4vw,34px)] max-[560px]:pt-4 max-[560px]:text-[19px] font-extrabold leading-[1.02] tracking-[-0.02em]">
                <Link to={o.to} className="text-inherit no-underline after:absolute after:inset-0 after:z-[1] after:rounded-[inherit] focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-offset-4 focus-visible:after:outline-[#1A6FE8]">
                  {o.title}
                </Link>
              </h3>
              <p className="m-0 mt-2 max-w-[30ch] font-['Inter',sans-serif] text-[13px] leading-[1.4] font-medium opacity-90 max-[560px]:line-clamp-3 max-[560px]:text-[11px]">{o.copy}</p>
              {o.code && <CodeChip code={o.code} />}
              <span aria-hidden="true" className={`mt-4 inline-flex w-fit items-center gap-1.5 rounded-full px-4 py-2 font-['Inter',sans-serif] text-[12px] whitespace-nowrap max-[560px]:mt-3 max-[560px]:gap-1 max-[560px]:px-3 max-[560px]:py-1.5 max-[560px]:text-[10px] max-[560px]:tracking-[0.04em] font-bold tracking-[0.06em] uppercase shadow-[0_8px_20px_-10px_rgba(17,17,16,0.5)] ${o.ctaCls}`}>
                {o.cta} <ArrowRight size={14} strokeWidth={2.6} className="transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
