import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import AccountLayout from '../../components/store/AccountLayout';
import { Stars } from '../../components/store/OrderBits';
import { cardCls, primaryBtnCls, BtnSweep } from '../../components/store/StoreShell';
import Seo from '../../components/Seo';
import { api } from '../../utils/api';

// My reviews (/account/reviews): read-only — product reviews can't be
// edited once posted (server-enforced). Each card links to the product.
// Reviews still waiting for admin approval (review moderation) get a
// "Pending approval" badge.
export default function MyReviewsPage() {
  const [reviews, setReviews] = useState(null);
  const gridRef = useRef(null);

  useEffect(() => {
    api.get('/customers/me/reviews').then(setReviews).catch(() => setReviews([]));
  }, []);

  useEffect(() => {
    const el = gridRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = gsap.fromTo(el.children, { opacity: 0, y: 26, rotate: (i) => (i % 2 ? 1.5 : -1.5) }, { opacity: 1, y: 0, rotate: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out', clearProps: 'transform' });
    return () => t.kill();
  }, [reviews]);

  return (
    <AccountLayout title="My reviews" subtitle="What you've said about your pieces.">
      <Seo title="My reviews" path="/account/reviews" noindex />
      {reviews === null ? (
        <div className="grid grid-cols-2 gap-3 max-[700px]:grid-cols-1">{[0, 1].map((i) => <div key={i} className="h-[160px] animate-pulse rounded-[24px] bg-white/60" />)}</div>
      ) : reviews.length === 0 ? (
        <div className={`ac-in flex flex-col items-center px-6 py-12 text-center ${cardCls}`}>
          <span aria-hidden="true" className="flex size-16 animate-cp-bob items-center justify-center rounded-full bg-[#FFF0B8] text-[30px]">⭐</span>
          <p className="m-0 mt-4 text-[22px] font-bold">No reviews yet</p>
          <p className="m-0 mt-1 max-w-[380px] font-['Inter',sans-serif] text-[15px] text-[#111110]/60">Loved something you bought? Leave a review on its product page — it really helps.</p>
          <Link to="/account/orders" className={`${primaryBtnCls} mt-5`}><BtnSweep />Go to my orders</Link>
        </div>
      ) : (
        <ul ref={gridRef} className="m-0 grid list-none grid-cols-2 gap-3 p-0 max-[700px]:grid-cols-1">
          {reviews.map((r) => {
            const inner = (
              <>
                <span className="flex items-center gap-3">
                  <span className="size-14 shrink-0 overflow-hidden rounded-[14px] bg-[#EFE8DA]">{r.product?.image && <img src={r.product.image} alt="" className="h-full w-full scale-110 object-cover" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-bold">{r.product?.name || 'Product'}</span>
                    <span className="font-['Inter',sans-serif] text-[12px] text-[#111110]/50">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </span>
                </span>
                <span className="mt-3 flex flex-wrap items-center gap-2">
                  <Stars value={r.rating} size={17} />
                  {r.isApproved === false && (
                    <span title="Our team will check it shortly — then it shows on the product page." className="inline-flex items-center gap-1 rounded-full bg-[#FFF0B8] px-2.5 py-0.5 font-['Inter',sans-serif] text-[11px] font-bold text-[#7A5B00]">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-[#F2A900]" />Pending approval
                    </span>
                  )}
                </span>
                {r.comment && <span className="mt-2 block font-['Inter',sans-serif] text-[14px] leading-relaxed text-[#111110]/75">“{r.comment}”</span>}
                {r.image && <img src={r.image} alt="Your photo" className="mt-3 size-20 rounded-[12px] object-cover" />}
              </>
            );
            const cls = `block h-full p-5 text-[#111110] no-underline transition-[translate,box-shadow] duration-300 ${cardCls}`;
            return (
              <li key={r.id}>
                {r.product?.slug
                  ? <Link to={`/products/${r.product.slug}#reviews`} className={`${cls} hover:-translate-y-1 hover:shadow-[0_24px_44px_-26px_rgba(17,17,16,0.55)]`}>{inner}</Link>
                  : <div className={cls}>{inner}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </AccountLayout>
  );
}
