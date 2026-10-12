import { useEffect } from 'react';
import { inSwipeStrip } from './swipeStrip';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ProductCard from '../store/ProductCard';
import scrollRise from './scrollRise';

gsap.registerPlugin(ScrollTrigger);

// Product row: heading + link, then product cards (real catalogue products,
// see components/store/ProductCard — Quick add goes to the real bag).
// `imageAspect` is a literal Tailwind aspect class matching the photos
// (e.g. aspect-square, aspect-[326/400]). `sectionRef` is passed in so the
// page's shared background can blend on this section.
const DEFAULT_TITLE_CLASS = 'text-[length:clamp(28px,4.2vw,60px)] text-[#FF3D8B]';
const DEFAULT_SECTION_CLASS = 'pt-[clamp(48px,6vw,88px)] pb-[clamp(64px,8vw,110px)]';

export default function PriceEdit({
  scrollRef, sectionRef, title, subtitle, linkText, linkHref = '/products', items,
  imageAspect = 'aspect-[4/5]',
  // Literal Tailwind classes (size + colour) for the title, and the
  // section's vertical padding — so pages can restyle without forking.
  titleClassName = DEFAULT_TITLE_CLASS,
  sectionClassName = DEFAULT_SECTION_CLASS,
}) {

  // Heading (title, subtitle, "Shop under" link) rises with the shared
  // scroll-linked scrollRise; product cards scale in from 0.7 in a stagger
  // (same arrival as the budget cards).
  useEffect(() => {
    const section = sectionRef.current;
    const scroller = scrollRef.current;
    if (!section || !scroller) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const heading = section.querySelectorAll('.t3u-fade');
    const link = section.querySelector('.t3u-link');
    const cards = section.querySelectorAll('.t3u-card');

    // The heading finishes rising (top 60%) before the cards pop in (top 75%
    // + their own animation), so the cards never show under an empty title.
    const unrise = scrollRise(section, scroller, [...heading, link], { end: 'clamp(top 60%)' });
    gsap.set(cards, inSwipeStrip(cards[0]) ? { opacity: 0, y: 40 } : { opacity: 0, scale: 0.7, transformOrigin: 'center center' });

    let tl;
    const trigger = ScrollTrigger.create({
      trigger: section,
      scroller,
      start: 'top 75%',
      once: true,
      onEnter: () => {
        tl = gsap.timeline();
        tl.to(cards, { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: 'power3.out', stagger: 0.1 }, 0.1);
      },
    });

    return () => {
      unrise();
      trigger.kill();
      tl?.kill();
    };
  }, [scrollRef, sectionRef]);

  return (
    <section ref={sectionRef} className={`relative overflow-hidden px-5 text-[#111110] ${sectionClassName}`}>
      <div className="relative z-[1] mx-auto max-w-[1100px]">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h2 className={`t3u-fade m-0 font-bold leading-[1.1] tracking-[-0.01em] ${titleClassName}`}>{title}</h2>
            {subtitle && <p className="t3u-fade mt-[0.4em] font-['Inter',sans-serif] text-[length:clamp(14px,1.3vw,18px)] font-medium">{subtitle}</p>}
          </div>
          <Link to={linkHref} className="t3u-link group/link mb-1 inline-flex items-center gap-1.5 text-[length:clamp(15px,1.4vw,19px)] font-bold text-[#1A6FE8] no-underline underline-offset-4 hover:underline">
            {linkText} <span className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/link:translate-x-1.5" aria-hidden="true">→</span>
          </Link>
        </div>

        {/* 4 across on desktop, 2 on tablets, a swipeable strip on phones. */}
        <div className="mt-[clamp(24px,3.4vw,48px)] grid grid-cols-4 gap-[clamp(10px,1.2vw,16px)] max-[900px]:grid-cols-2 max-[560px]:-mx-5 max-[560px]:flex max-[560px]:snap-x max-[560px]:snap-mandatory max-[560px]:scroll-pl-5 max-[560px]:overflow-x-auto max-[560px]:px-5 max-[560px]:pt-2 max-[560px]:pb-3">
          {items.map((item) => (
            <ProductCard
              key={item.id}
              product={item}
              imageAspect={imageAspect}
              className="t3u-card max-[560px]:shrink-0 max-[560px]:basis-[62%] max-[560px]:snap-start max-[560px]:snap-always"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
