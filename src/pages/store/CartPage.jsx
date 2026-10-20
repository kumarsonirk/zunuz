import { memo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { Trash2, Truck, ShieldCheck, RotateCcw, ArrowRight, Check } from 'lucide-react';
import StoreShell, { primaryBtnCls, BtnSweep, cardCls } from '../../components/store/StoreShell';
import ProductCard from '../../components/store/ProductCard';
import Seo from '../../components/Seo';
import { FreeDeliveryBar, TotalsRows } from '../../components/store/BagSummary';
import { useBagLines } from '../../store/bag';
import { removeFromCart } from '../../store/cart';
import { isOwnPageOnly } from '../../store/catalog';
import { formatPrice, productPath } from '../../store/catalogConfig';
import { SETTINGS } from '../../store/settings';
import useCoupon from '../../components/store/checkout/useCoupon';
import BagOffers from '../../components/store/checkout/BagOffers';
import CouponBox from '../../components/store/checkout/CouponBox';
import { thumbUrl } from '../../utils/productImage';

// The bag (/cart). Prices and stock are always the live catalogue values
// (the stored item only snapshots them at add time). Items that are sold
// out or no longer sold are shown greyed and left out of the total; the
// checkout button only moves on with what can actually be bought.
export default memo(CartPage);

function BagLine({ line }) {
  const ref = useRef(null);
  const { item, product, unit, qty, ok, note } = line;
  const href = product ? productPath(product) : null;
  const remove = () => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { removeFromCart(item.id); return; }
    gsap.to(el, {
      x: 40, opacity: 0, duration: 0.3, ease: 'power2.in',
      onComplete: () => gsap.to(el, { height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0, duration: 0.3, ease: 'power2.inOut', onComplete: () => removeFromCart(item.id) }),
    });
  };
  const Img = (
    <span className="relative block size-[clamp(84px,11vw,120px)] shrink-0 overflow-hidden rounded-[16px] bg-[#EFE8DA]">
      {item.image && <img src={thumbUrl(product?.image || item.image, 400)} data-original={product?.image || item.image} alt="" className={`h-full w-full scale-110 object-cover ${ok ? '' : 'grayscale'}`} />}
    </span>
  );
  return (
    <li ref={ref} className={`bag-line flex gap-4 overflow-hidden rounded-[22px] bg-white/85 p-3 shadow-[0_14px_30px_-26px_rgba(17,17,16,0.5)] ${ok ? '' : 'opacity-60'}`}>
      {href ? <Link to={href} aria-label={item.name}>{Img}</Link> : Img}
      <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {href
              ? <Link to={href} className="block truncate text-[17px] font-bold text-[#111110] no-underline hover:text-[#FF3D8B]">{item.name}</Link>
              : <span className="block truncate text-[17px] font-bold">{item.name}</span>}
            <span className="font-['Inter',sans-serif] text-[14px] text-[#111110]/60">{formatPrice(unit)} each</span>
            {note && <span className={`mt-1 block w-fit rounded-full px-2.5 py-0.5 font-['Inter',sans-serif] text-[12px] font-bold ${ok ? 'bg-[#FFF0B8] text-[#8A6A00]' : 'bg-[#111110]/8 text-[#111110]/70'}`}>{note}</span>}
          </div>
          <button type="button" onClick={remove} aria-label={`Remove ${item.name}`} className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[#111110]/45 transition-colors hover:bg-[#FFE0EA] hover:text-[#E8304F]">
            <Trash2 size={17} />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          {ok ? (
            <span className="inline-flex items-center rounded-full border border-[#111110]/15 bg-white px-2.5 py-1 font-['Inter',sans-serif] text-[12px] font-bold text-[#111110]/70">
              Qty: 1
            </span>
          ) : <span className="font-['Inter',sans-serif] text-[13px] text-[#111110]/55">Not included in total</span>}
          <span className={`text-[18px] font-bold ${ok ? '' : 'line-through'}`}>{formatPrice(unit * qty)}</span>
        </div>
      </div>
    </li>
  );
}

function CartPage() {
  const { lines, buyable, itemsTotal, discountedItemsTotal, bundleDiscount, bundleCount, bundleQualifyingCount, bundleLabel, deliveryFee, total, ready, catalog } = useBagLines();
  const listRef = useRef(null);
  const count = lines.reduce((n, l) => n + l.item.quantity, 0);
  const inBag = new Set(lines.map((l) => String(l.item.id)));
  const picks = catalog.products.filter((p) => p.stock > 0 && !inBag.has(p.id) && !isOwnPageOnly(p)).slice(0, 4);
  const checkoutPaused = !!SETTINGS.checkoutPaused; // Admin → Settings → Pause checkout
  const canCheckout = buyable.length > 0 && ready && !checkoutPaused;
  // Offers: an applied coupon shows in the totals here and carries on to
  // checkout (same tab), where it's re-checked.
  const coupon = useCoupon(discountedItemsTotal, ready && lines.length > 0);
  // One offer per order: with the Navratri combo applied, a coupon is set
  // aside (kept for later in case the combo items leave the bag).
  const comboOn = bundleDiscount > 0;
  const comboSize = SETTINGS.navratriBundleCount ?? 3;
  const comboPrice = SETTINGS.navratriBundlePrice ?? 999;
  const couponDiscount = comboOn ? 0 : coupon.discount;
  const payable = Math.max(0, total - couponDiscount);

  // Heading + lines rise in on first paint.
  useEffect(() => {
    const el = listRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(el.querySelectorAll('.bag-in'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06 })
      .fromTo(el.querySelectorAll('.bag-line'), { opacity: 0, y: 30, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.07, clearProps: 'transform' }, 0.1);
    return () => tl.kill();
  }, []);

  const checkoutLink = (
    <>
    {checkoutPaused && (
      <p role="status" className="m-0 mb-2.5 rounded-[14px] border-2 border-[#F6C915]/60 bg-[#FFF8DB] px-3.5 py-2.5 font-['Inter',sans-serif] text-[13px] font-semibold text-[#7A5A00]">
        {SETTINGS.checkoutPausedMessage}
      </p>
    )}
    <Link
      to="/checkout"
      aria-disabled={!canCheckout || undefined}
      onClick={(e) => { if (!canCheckout) e.preventDefault(); }}
      className={`${primaryBtnCls} w-full ${canCheckout ? 'hover:-translate-y-0.5' : 'pointer-events-none opacity-50'}`}
    >
      <BtnSweep />
      {checkoutPaused ? 'Checkout paused' : <>Checkout <ArrowRight size={18} className="transition-transform duration-300 group-hover/pb:translate-x-1" /></>}
    </Link>
    </>
  );

  return (
    <StoreShell
      after={lines.length > 0 && (
        <div className="absolute inset-x-0 bottom-0 z-30 flex items-center gap-4 border-t border-[#111110]/10 bg-white/95 px-4 py-3 backdrop-blur-md min-[901px]:hidden">
          <span className="shrink-0">
            <span className="block font-['Inter',sans-serif] text-[12px] text-[#111110]/55">Total</span>
            <span className="text-[20px] font-bold">{formatPrice(payable)}</span>
          </span>
          <div className="flex-1">{checkoutLink}</div>
        </div>
      )}
    >
      <Seo title="Your bag" path="/cart" noindex />
      <main ref={listRef} className="mx-auto max-w-[1180px] px-5 pt-[clamp(20px,3vw,40px)] pb-[clamp(56px,7vw,96px)] max-[900px]:pb-28">
        <h1 className="bag-in m-0 text-[length:clamp(40px,6vw,80px)] leading-[0.95] font-extrabold tracking-[-0.03em] text-[#FF3D8B]">Your bag</h1>
        <p className="bag-in m-0 mt-2 font-['Inter',sans-serif] text-[15px] text-[#111110]/60">
          {count ? `${count} item${count === 1 ? '' : 's'}` : 'Nothing in here yet.'}
        </p>

        {lines.length === 0 ? (
          <div className="bag-in mx-auto mt-10 flex max-w-[460px] flex-col items-center rounded-[28px] bg-white/80 px-6 py-12 text-center shadow-[0_18px_40px_-28px_rgba(17,17,16,0.45)]">
            <span aria-hidden="true" className="flex size-20 animate-cp-bob items-center justify-center rounded-full bg-[#FFE0EA] text-[38px]">👜</span>
            <h2 className="m-0 mt-5 text-[28px] font-bold">Your bag is empty</h2>
            <p className="m-0 mt-2 font-['Inter',sans-serif] text-[15px] text-[#111110]/65">Find something cute — pieces start at ₹199.</p>
            <Link to="/jewellery" className={`${primaryBtnCls} mt-6`}><BtnSweep />Start shopping</Link>
          </div>
        ) : (
          <div className="mt-7 grid grid-cols-[minmax(0,1fr)_minmax(300px,380px)] items-start gap-[clamp(20px,3vw,40px)] max-[900px]:grid-cols-1">
            <div className="flex flex-col gap-4">
              <div className="bag-in"><FreeDeliveryBar itemsTotal={discountedItemsTotal} /></div>
              {bundleQualifyingCount > 0 && bundleCount === 0 && (
                <div className="bag-in rounded-[20px] border-2 border-[#E8304F]/25 bg-[linear-gradient(135deg,#FFF5F7_0%,#FFF9F2_100%)] p-4 sm:p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-full bg-[#E8304F] text-[12px] font-black text-white">
                          {bundleQualifyingCount % comboSize}/{comboSize}
                        </span>
                        <h3 className="m-0 font-['Inter',sans-serif] text-[15px] font-extrabold text-[#111110]">
                          Navratri Combo: {SETTINGS.navratriOfferTitle || `Pick Any ${comboSize} @ ${formatPrice(comboPrice)}`}
                        </h3>
                      </div>
                      <p className="m-0 mt-1 font-['Inter',sans-serif] text-[13px] text-[#111110]/75">
                        You have <b className="text-[#111110]">{bundleQualifyingCount}</b> of {comboSize} eligible pieces in your bag. Add <b className="text-[#E8304F]">{comboSize - (bundleQualifyingCount % comboSize)} more</b> to unlock all {comboSize} for just <b>{formatPrice(comboPrice)}</b> (Save up to {formatPrice(comboSize * (SETTINGS.navratriMaxPrice ?? 699) - comboPrice)})!
                      </p>
                    </div>
                    <Link
                      to="/navratri-offers"
                      className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#E8304F] px-4 py-2 font-['Inter',sans-serif] text-[13px] font-bold text-white no-underline shadow-[0_4px_14px_rgba(232,48,79,0.35)] hover:bg-[#D02442] transition-colors"
                    >
                      Pick {comboSize - (bundleQualifyingCount % comboSize)} more <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )}
              {bundleCount > 0 && (
                <div className="bag-in rounded-[20px] border-2 border-[#1E8A4C]/30 bg-[#E8F7EE] p-3.5 sm:p-4 shadow-sm flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-full bg-[#1E8A4C] text-white">
                      <Check size={16} strokeWidth={3} />
                    </span>
                    <div>
                      <h4 className="m-0 font-['Inter',sans-serif] text-[14px] font-extrabold text-[#111110]">
                        🎉 Navratri 3-Pack Combo Applied!
                      </h4>
                      <p className="m-0 font-['Inter',sans-serif] text-[12px] text-[#111110]/70">
                        You saved <b className="text-[#1E8A4C]">{formatPrice(bundleDiscount)}</b> with this festive offer.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#1E8A4C] px-3 py-1 text-[12px] font-black text-white">
                    ₹999 TRIO
                  </span>
                </div>
              )}
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {lines.map((l) => <BagLine key={l.item.id} line={l} />)}
              </ul>
            </div>

            <aside className={`bag-in sticky top-[calc(var(--store-header-h)+var(--announce-h,0px)+20px)] p-6 ${cardCls}`}>
              <h2 className="m-0 mb-4 text-[22px] font-bold">Order summary</h2>
              <TotalsRows
                itemsTotal={itemsTotal}
                deliveryFee={deliveryFee}
                total={payable}
                discount={couponDiscount}
                couponCode={comboOn ? null : coupon.applied?.code}
                bundleDiscount={bundleDiscount}
                bundleLabel={bundleLabel}
              />
              <BagOffers coupon={coupon} itemsTotal={discountedItemsTotal} showError={false} lockedNote={comboOn ? 'Navratri combo applied — only one offer per order, so coupons can’t be added.' : ''} />
              {/* Any other code — coupons are added here, not at checkout. */}
              <div className="mt-3">
                <CouponBox coupon={coupon} mode="entry" lockedNote={comboOn ? 'Navratri combo applied' : ''} />
              </div>
              <div className="mt-5 max-[900px]:hidden">{checkoutLink}</div>
              {!canCheckout && ready && <p className="m-0 mt-3 font-['Inter',sans-serif] text-[13px] text-[#E8304F]">Nothing in your bag can be bought right now.</p>}
              <ul className="m-0 mt-5 flex list-none flex-col gap-2 p-0 font-['Inter',sans-serif] text-[13px] text-[#111110]/65">
                <li className="flex items-center gap-2"><ShieldCheck size={16} className="text-[#FF3D8B]" /> Secure payments via Razorpay</li>
                <li className="flex items-center gap-2"><RotateCcw size={16} className="text-[#FF3D8B]" /> Damaged or wrong item? Free replacement</li>
                <li className="flex items-center gap-2"><Truck size={16} className="text-[#FF3D8B]" /> {SETTINGS.pincodeRestriction ? 'Delivering in Bengaluru · 1–3 days' : 'Arrives in 2–7 business days'}</li>
              </ul>
            </aside>
          </div>
        )}

        {picks.length > 0 && (
          <section className="mt-[clamp(48px,7vw,90px)]">
            <h2 className="m-0 text-[length:clamp(26px,3.4vw,44px)] font-bold tracking-[-0.01em]">{lines.length ? 'Pair it with' : 'Fresh picks for you'}</h2>
            <div className="mt-5 grid grid-cols-4 gap-[clamp(10px,1.6vw,22px)] max-[900px]:grid-cols-2">
              {picks.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </main>
    </StoreShell>
  );
}
