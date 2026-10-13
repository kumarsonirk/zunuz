import { memo, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { Package, MapPin, CreditCard, Clock } from 'lucide-react';
import StoreShell, { primaryBtnCls, ghostBtnCls, BtnSweep, cardCls } from '../../components/store/StoreShell';
import Seo from '../../components/Seo';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { addressLine } from '../../utils/address';
import { formatPrice } from '../../store/catalogConfig';
import { computeDeliveryFee } from '../../utils/delivery';
import { paymentMethodLabel } from '../../utils/payments';
import { thumbUrl } from '../../utils/productImage';

// Order confirmation (/order/:id/success). Uses the order handed over by
// checkout (router state) for an instant paint, else fetches it — so a
// refresh or a shared link still works for the signed-in owner. A pop-in
// check + confetti burst celebrate it; an online order whose payment isn't
// confirmed shows a "pending" state instead of a false success.
export default memo(OrderSuccessPage);

const CONFETTI = ['#FF3D8B', '#F6C915', '#1A6FE8', '#7A4BD6', '#1E8A4C', '#FF8A3D'];

function Confetti() {
  const ref = useRef(null);
  useEffect(() => {
    const box = ref.current;
    if (!box || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const bits = [...box.children];
    const tl = gsap.timeline();
    bits.forEach((el, i) => {
      const angle = (i / bits.length) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 120 + Math.random() * 160;
      tl.fromTo(el,
        { x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 },
        {
          x: Math.cos(angle) * dist, y: Math.sin(angle) * dist * 0.75 + 140, rotate: Math.random() * 720 - 360,
          scale: 1, opacity: 0, duration: 1.6 + Math.random() * 0.6, ease: 'power3.out',
        }, 0.35 + Math.random() * 0.1);
    });
    return () => tl.kill();
  }, []);
  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2">
      {Array.from({ length: 34 }, (_, i) => (
        <span
          key={i}
          className={`absolute block opacity-0 ${i % 3 === 0 ? 'size-2.5 rounded-full' : 'h-3.5 w-2 rounded-[2px]'}`}
          style={{ background: CONFETTI[i % CONFETTI.length] }}
        />
      ))}
    </div>
  );
}

function OrderSuccessPage({ orderId, initialOrder }) {
  const { customer, loading: authLoading } = useAuth();
  const [order, setOrder] = useState(initialOrder && String(initialOrder.id) === String(orderId) ? initialOrder : null);
  const [error, setError] = useState('');
  const rootRef = useRef(null);

  useEffect(() => {
    if (!customer) return undefined;
    let alive = true;
    // Always refresh — the router-state copy may predate payment confirmation.
    api.get(`/orders/${orderId}`)
      .then((o) => { if (alive) setOrder(o); })
      .catch((e) => { if (alive && !order) setError(e.message || 'Order not found'); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, orderId]);

  const ready = !!order;
  useEffect(() => {
    const root = rootRef.current;
    if (!ready || !root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(root.querySelector('.os-badge'), { scale: 0, rotate: -40 }, { scale: 1, rotate: 0, duration: 0.8, ease: 'back.out(2.2)' })
      .fromTo(root.querySelector('.os-tick'), { strokeDashoffset: 30 }, { strokeDashoffset: 0, duration: 0.45 }, 0.45)
      .fromTo(root.querySelectorAll('.os-in'), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, clearProps: 'transform' }, 0.35);
    return () => tl.kill();
  }, [ready]);

  let body;
  if (authLoading || (customer && !order && !error)) {
    body = <div className="flex justify-center py-32"><span aria-label="Loading" className="size-10 animate-spin rounded-full border-[3px] border-[#111110]/10 border-t-[#FF3D8B]" /></div>;
  } else if (!customer) {
    body = (
      <div className={`mx-auto mt-16 max-w-[460px] px-6 py-10 text-center ${cardCls}`}>
        <h1 className="m-0 text-[28px] font-bold">Log in to see this order</h1>
        <Link to="/login" state={{ returnTo: `/order/${orderId}/success` }} className={`${primaryBtnCls} mt-6`}><BtnSweep />Log in</Link>
      </div>
    );
  } else if (!order) {
    body = (
      <div className={`mx-auto mt-16 max-w-[460px] px-6 py-10 text-center ${cardCls}`}>
        <h1 className="m-0 text-[28px] font-bold">We couldn't find that order</h1>
        <p className="m-0 mt-2 font-['Inter',sans-serif] text-[15px] text-[#111110]/65">{error}</p>
        <Link to="/account/orders" className={`${primaryBtnCls} mt-6`}><BtnSweep />My orders</Link>
      </div>
    );
  } else {
    const online = order.paymentMethod === 'RAZORPAY';
    const paid = order.paymentStatus === 'PAID';
    const pending = online && !paid;
    const cancelled = order.status === 'CANCELLED';
    const itemsTotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const discount = order.discount || 0;
    const creditsUsed = order.creditsUsed || 0;
    const byCredits = order.paymentMethod === 'CREDITS';
    // total = items − discount − credits + delivery, so delivery = total − items + discount + credits.
    const feeCalc = order.total - itemsTotal + discount + creditsUsed;
    const fee = feeCalc >= 0 ? feeCalc : computeDeliveryFee(itemsTotal);
    const eta = new Date(new Date(order.createdAt).getTime() + 7 * 864e5).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    const title = cancelled ? 'Order cancelled' : pending ? 'Payment pending' : online ? 'Payment successful!' : 'Order placed!';
    const sub = cancelled
      ? "This item sold out while you were paying — you'll get a full refund in 5–7 working days."
      : pending
        ? "We haven't received the payment confirmation yet. If money was deducted, it'll update shortly — or contact us."
        : `Thank you${order.customer?.name ? `, ${order.customer.name.split(' ')[0]}` : ''}! A confirmation is on its way to your email.`;

    body = (
      <>
        <div className="relative flex flex-col items-center text-center">
          {!pending && !cancelled && <Confetti />}
          <span className={`os-badge relative flex size-[clamp(84px,9vw,110px)] items-center justify-center rounded-full text-white shadow-[0_24px_50px_-20px_rgba(17,17,16,0.5)] ${cancelled ? 'bg-[#111110]' : pending ? 'bg-[#F6C915]' : 'bg-[#1E8A4C]'}`}>
            {pending ? <Clock size={44} className="text-[#111110]" /> : (
              <svg viewBox="0 0 24 24" className="size-[48%]" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path className="os-tick" d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray={30} />
              </svg>
            )}
          </span>
          <h1 className="os-in m-0 mt-6 text-[length:clamp(36px,5.4vw,68px)] leading-[0.98] font-extrabold tracking-[-0.03em] text-[#FF3D8B]">{title}</h1>
          <p className="os-in m-0 mt-3 max-w-[520px] font-['Inter',sans-serif] text-[16px] text-[#111110]/70">{sub}</p>
          <p className="os-in m-0 mt-4 rounded-full bg-white/80 px-4 py-2 font-['Inter',sans-serif] text-[14px] font-semibold">
            Order <span className="text-[#FF3D8B]">#{order.id}</span> · {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        <div className="mt-10 grid grid-cols-[minmax(0,1fr)_minmax(280px,360px)] items-start gap-5 max-[820px]:grid-cols-1">
          <section className={`os-in p-6 ${cardCls}`}>
            <h2 className="m-0 mb-4 flex items-center gap-2 text-[20px] font-bold"><Package size={20} className="text-[#FF3D8B]" /> {order.items.length} item{order.items.length === 1 ? '' : 's'}</h2>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3">
                  <span className="size-16 shrink-0 overflow-hidden rounded-[14px] bg-[#EFE8DA]">
                    {i.product?.image && <img src={thumbUrl(i.product.image, 400)} data-original={i.product.image} alt="" className="h-full w-full scale-110 object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1 font-['Inter',sans-serif]">
                    <span className="block truncate text-[15px] font-semibold">{i.product?.name || 'Item'}</span>
                    <span className="text-[13px] text-[#111110]/55">Qty {i.quantity} · {formatPrice(i.price)} each</span>
                  </span>
                  <span className="font-['Inter',sans-serif] text-[15px] font-bold">{formatPrice(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="m-0 mt-5 flex flex-col gap-2 border-t border-[#111110]/10 pt-4 font-['Inter',sans-serif] text-[15px]">
              <div className="flex justify-between"><dt className="text-[#111110]/65">Items total</dt><dd className="m-0 font-semibold">{formatPrice(itemsTotal)}</dd></div>
              {discount > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-[#111110]/65">Discount{order.couponCode && <span className="ml-1.5 rounded-full bg-[#FFE0EA] px-2 py-0.5 text-[11px] font-bold tracking-wide text-[#FF3D8B]">{order.couponCode}</span>}</dt>
                  <dd className="m-0 font-semibold text-[#1E8A4C]">−{formatPrice(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between"><dt className="text-[#111110]/65">Delivery</dt><dd className={`m-0 font-semibold ${fee ? '' : 'text-[#1E8A4C]'}`}>{fee ? formatPrice(fee) : 'Free'}</dd></div>
              {creditsUsed > 0 && (
                <div className="flex justify-between"><dt className="text-[#111110]/65">ZUNUZ Credits</dt><dd className="m-0 font-semibold text-[#1E8A4C]">−{formatPrice(creditsUsed)}</dd></div>
              )}
              <div className="flex items-baseline justify-between pt-1"><dt className="text-[17px] font-bold">{paid ? 'Paid' : 'Total'}</dt><dd className="m-0 font-['Bricolage_Grotesque',sans-serif] text-[24px] font-bold">{formatPrice(order.total)}</dd></div>
            </dl>
          </section>

          <div className="flex flex-col gap-5">
            <section className={`os-in p-6 ${cardCls}`}>
              <h2 className="m-0 mb-2 flex items-center gap-2 text-[18px] font-bold"><MapPin size={18} className="text-[#FF3D8B]" /> Delivering to</h2>
              <p className="m-0 font-['Inter',sans-serif] text-[14px] font-semibold">{order.address?.name}</p>
              <p className="m-0 mt-1 font-['Inter',sans-serif] text-[14px] leading-snug text-[#111110]/70">{order.address && addressLine(order.address)}</p>
              {!cancelled && <p className="m-0 mt-3 rounded-[12px] bg-[#E8F7EE] px-3 py-2 font-['Inter',sans-serif] text-[13px] font-semibold text-[#1E8A4C]">Expected by {eta}</p>}
            </section>
            <section className={`os-in p-6 ${cardCls}`}>
              <h2 className="m-0 mb-2 flex items-center gap-2 text-[18px] font-bold"><CreditCard size={18} className="text-[#FF3D8B]" /> Payment</h2>
              <p className="m-0 font-['Inter',sans-serif] text-[14px] text-[#111110]/75">
                {paymentMethodLabel(order.paymentMethod)} ·{' '}
                <b className={paid ? 'text-[#1E8A4C]' : pending ? 'text-[#8A6A00]' : ''}>{paid ? 'Paid' : online ? 'Pending' : `Pay ${formatPrice(order.total)} on delivery`}</b>
              </p>
              {creditsUsed > 0 && !byCredits && <p className="m-0 mt-1 font-['Inter',sans-serif] text-[13px] text-[#111110]/60">{formatPrice(creditsUsed)} paid with ZUNUZ Credits.</p>}
              {order.razorpayPaymentId && <p className="m-0 mt-1 font-['Inter',sans-serif] text-[12px] break-all text-[#111110]/50">Ref: {order.razorpayPaymentId}</p>}
            </section>
          </div>
        </div>

        <div className="os-in mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/account/orders" className={primaryBtnCls}><BtnSweep />Track my orders</Link>
          <Link to="/jewellery" className={ghostBtnCls}>Continue shopping</Link>
        </div>
      </>
    );
  }

  return (
    <StoreShell glow="bg-[radial-gradient(50%_40%_at_50%_0%,#FFE0EA_0%,transparent_70%),radial-gradient(40%_40%_at_0%_60%,#FFF0B8_0%,transparent_70%),radial-gradient(40%_40%_at_100%_70%,#D6E6FF_0%,transparent_70%)]">
      <Seo title="Order confirmed" path={`/order/${orderId}/success`} noindex />
      <main ref={rootRef} className="mx-auto max-w-[1000px] px-5 pt-[clamp(32px,5vw,64px)] pb-[clamp(56px,7vw,96px)]">
        {body}
      </main>
    </StoreShell>
  );
}

