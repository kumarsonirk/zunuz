import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { gsap } from 'gsap';
import { X, Download, Package, MapPin, CreditCard } from 'lucide-react';
import AccountLayout from '../../components/store/AccountLayout';
import { OrderStatusBadge, OrderTimeline, Stars, StarInput, RefundBadge } from '../../components/store/OrderBits';
import { TrackingCard, RefundCard, ProblemSection } from '../../components/store/fulfilment/OrderFulfilment';
import { CancelSection } from '../../components/store/fulfilment/OrderCancel';
import { cancelDeadline, useNow } from '../../components/store/fulfilment/cancelUtils';
import { cardCls, primaryBtnCls, ghostBtnCls, BtnSweep } from '../../components/store/StoreShell';
import Seo from '../../components/Seo';
import { api } from '../../utils/api';
import { addressLine } from '../../utils/address';
import { downloadInvoice, canInvoice } from '../../utils/invoice';
import { formatPrice } from '../../store/catalogConfig';
import { paymentMethodLabel } from '../../utils/payments';
import { thumbUrl } from '../../utils/productImage';

// My orders (/account/orders): filter tabs + order cards; a card opens a
// slide-over (bottom sheet on phones) with progress, items, address,
// payment, invoice, cancelling (before it ships, within the cancellation
// window) and — once delivered — returns and the order rating. `?open=<id>`
// opens one directly (used by the account overview).
const TABS = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'active', label: 'In progress', match: (o) => ['PENDING', 'CONFIRMED', 'SHIPPED'].includes(o.status) },
  { key: 'delivered', label: 'Delivered', match: (o) => o.status === 'DELIVERED' },
  { key: 'cancelled', label: 'Cancelled', match: (o) => o.status === 'CANCELLED' },
];
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function OrderDrawer({ order, request, onClose, onReviewed, onReported, onCancelled }) {
  const panelRef = useRef(null);
  const backRef = useRef(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // Latest onClose without re-running the open animation on parent renders.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = window.matchMedia('(max-width: 700px)').matches;
    const tl = gsap.timeline();
    tl.fromTo(backRef.current, { opacity: 0 }, { opacity: 1, duration: reduced ? 0 : 0.3 })
      .fromTo(panelRef.current, mobile ? { yPercent: 100 } : { xPercent: 100 }, { yPercent: 0, xPercent: 0, duration: reduced ? 0 : 0.55, ease: 'power3.out' }, 0);
    const onKey = (e) => { if (e.key === 'Escape') onCloseRef.current(); };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => { tl.kill(); window.removeEventListener('keydown', onKey); };
  }, []);

  const close = () => {
    const mobile = window.matchMedia('(max-width: 700px)').matches;
    gsap.to(backRef.current, { opacity: 0, duration: 0.25 });
    gsap.to(panelRef.current, { ...(mobile ? { yPercent: 100 } : { xPercent: 100 }), duration: 0.35, ease: 'power2.in', onComplete: () => onCloseRef.current() });
  };

  const submit = async () => {
    if (!rating) { setErr('Pick a star rating.'); return; }
    setBusy(true); setErr('');
    try {
      const review = await api.post(`/orders/${order.id}/review`, { rating, comment: comment.trim() });
      onReviewed(order.id, review);
    } catch (e) { setErr(e.message || 'Could not submit.'); }
    finally { setBusy(false); }
  };

  const itemsTotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = order.discount || 0;
  const creditsUsed = order.creditsUsed || 0;
  // total = items − discount − credits + delivery.
  const fee = Math.max(0, order.total - itemsTotal + discount + creditsUsed);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="od-title">
      <div ref={backRef} onClick={close} className="absolute inset-0 bg-[#111110]/45 backdrop-blur-[2px]" />
      <div
        ref={panelRef}
        tabIndex={-1}
        data-lenis-prevent
        className="absolute top-0 right-0 flex h-full w-[min(520px,100%)] flex-col overflow-y-auto bg-[#FFF8EE] font-['Bricolage_Grotesque','Inter',sans-serif] text-[#111110] shadow-[-30px_0_60px_-30px_rgba(17,17,16,0.5)] outline-none max-[700px]:top-auto max-[700px]:bottom-0 max-[700px]:h-[88dvh] max-[700px]:w-full max-[700px]:rounded-t-[28px]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#111110]/8 bg-[#FFF8EE]/95 px-6 py-4 backdrop-blur-md">
          <div>
            <h2 id="od-title" className="m-0 text-[22px] font-bold">Order #{order.id}</h2>
            <p className="m-0 font-['Inter',sans-serif] text-[13px] text-[#111110]/55">Placed {fmtDate(order.createdAt)}</p>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-[#111110]/6 text-[#111110] transition-[background-color,rotate] duration-300 hover:rotate-90 hover:bg-[#111110] hover:text-white"><X size={19} /></button>
        </div>

        <div className="flex flex-col gap-4 p-6">
          {/* Cancelled orders: the cancel card below says when, why and about the refund. */}
          {order.status !== 'CANCELLED' && <div className={`p-5 ${cardCls}`}><OrderTimeline status={order.status} order={order} /></div>}

          <TrackingCard order={order} />

          <CancelSection order={order} onCancelled={onCancelled} />

          <ProblemSection order={order} request={request} onCreate={onReported} />

          <RefundCard order={order} />

          <section className={`p-5 ${cardCls}`}>
            <h3 className="m-0 mb-3 flex items-center gap-2 text-[17px] font-bold"><Package size={17} className="text-[#FF3D8B]" /> Items</h3>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {order.items.map((i) => {
                const slug = i.product?.slug;
                const body = (
                  <>
                    <span className="size-14 shrink-0 overflow-hidden rounded-[12px] bg-[#EFE8DA]">{i.product?.image && <img src={thumbUrl(i.product.image, 400)} data-original={i.product.image} alt="" className="h-full w-full scale-110 object-cover" />}</span>
                    <span className="min-w-0 flex-1 font-['Inter',sans-serif]">
                      <span className="block truncate text-[14px] font-semibold">{i.product?.name || 'Item'}</span>
                      <span className="text-[13px] text-[#111110]/55">Qty {i.quantity} × {formatPrice(i.price)}</span>
                    </span>
                    <span className="font-['Inter',sans-serif] text-[14px] font-bold">{formatPrice(i.price * i.quantity)}</span>
                  </>
                );
                return <li key={i.id}>{slug ? <Link to={`/products/${slug}`} className="flex items-center gap-3 text-[#111110] no-underline hover:text-[#FF3D8B]">{body}</Link> : <span className="flex items-center gap-3">{body}</span>}</li>;
              })}
            </ul>
            <dl className="m-0 mt-4 flex flex-col gap-1.5 border-t border-[#111110]/10 pt-3 font-['Inter',sans-serif] text-[14px]">
              <div className="flex justify-between"><dt className="text-[#111110]/60">Items</dt><dd className="m-0">{formatPrice(itemsTotal)}</dd></div>
              {discount > 0 && (
                <div className="flex justify-between"><dt className="text-[#111110]/60">Discount{order.couponCode && <span className="ml-1.5 rounded-[6px] bg-[#FFF0B8] px-1.5 py-0.5 text-[12px] font-bold text-[#8A6A00]">{order.couponCode}</span>}</dt><dd className="m-0 text-[#1E8A4C]">−{formatPrice(discount)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-[#111110]/60">Delivery</dt><dd className={`m-0 ${fee ? '' : 'text-[#1E8A4C]'}`}>{fee ? formatPrice(fee) : 'Free'}</dd></div>
              {creditsUsed > 0 && (
                <div className="flex justify-between"><dt className="text-[#111110]/60">ZUNUZ Credits</dt><dd className="m-0 text-[#1E8A4C]">−{formatPrice(creditsUsed)}</dd></div>
              )}
              <div className="flex justify-between text-[16px] font-bold"><dt>Total</dt><dd className="m-0">{formatPrice(order.total)}</dd></div>
            </dl>
          </section>

          {order.address && (
            <section className={`p-5 ${cardCls}`}>
              <h3 className="m-0 mb-2 flex items-center gap-2 text-[17px] font-bold"><MapPin size={17} className="text-[#FF3D8B]" /> Delivery address</h3>
              <p className="m-0 font-['Inter',sans-serif] text-[14px] font-semibold">{order.address.name}{order.address.phone && ` · +91 ${order.address.phone}`}</p>
              <p className="m-0 mt-1 font-['Inter',sans-serif] text-[14px] leading-snug text-[#111110]/70">{addressLine(order.address)}</p>
            </section>
          )}

          <section className={`p-5 ${cardCls}`}>
            <h3 className="m-0 mb-2 flex items-center gap-2 text-[17px] font-bold"><CreditCard size={17} className="text-[#FF3D8B]" /> Payment</h3>
            <p className="m-0 font-['Inter',sans-serif] text-[14px] text-[#111110]/75">
              {paymentMethodLabel(order.paymentMethod)} · <b className={order.paymentStatus === 'PAID' ? 'text-[#1E8A4C]' : ''}>{order.paymentStatus === 'PAID' ? 'Paid' : order.paymentMethod === 'COD' ? 'Pay on delivery' : 'Pending'}</b>
            </p>
            {creditsUsed > 0 && order.paymentMethod !== 'CREDITS' && (
              <p className="m-0 mt-1 font-['Inter',sans-serif] text-[13px] text-[#111110]/60">{formatPrice(creditsUsed)} paid with ZUNUZ Credits.</p>
            )}
          </section>

          {order.status === 'DELIVERED' && (
            <section className={`p-5 ${cardCls}`}>
              <h3 className="m-0 mb-3 text-[17px] font-bold">{order.review ? 'Your rating' : 'How was this order?'}</h3>
              {order.review ? (
                <>
                  <Stars value={order.review.rating} size={20} />
                  {order.review.comment && <p className="m-0 mt-2 font-['Inter',sans-serif] text-[14px] text-[#111110]/75">{order.review.comment}</p>}
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  <StarInput value={rating} onChange={setRating} />
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={1000} placeholder="Tell us about the packaging, delivery… (optional)" className="w-full resize-none rounded-[14px] border-2 border-[#111110]/12 bg-white px-3.5 py-2.5 font-['Inter',sans-serif] text-[14px] outline-none focus:border-[#111110]" />
                  {err && <p role="alert" className="m-0 font-['Inter',sans-serif] text-[13px] text-[#E8304F]">{err}</p>}
                  <button type="button" onClick={submit} disabled={busy} className={`${primaryBtnCls} self-start`}><BtnSweep />{busy ? 'Sending…' : 'Submit rating'}</button>
                </div>
              )}
            </section>
          )}

          {canInvoice(order) ? (
            <button type="button" onClick={() => downloadInvoice(order)} className={`${ghostBtnCls} w-full`}><Download size={17} /> Download invoice</button>
          ) : order.status !== 'CANCELLED' && (
            <p className="m-0 flex items-center justify-center gap-2 rounded-full border-2 border-dashed border-[#111110]/15 px-5 py-3 text-center font-['Inter',sans-serif] text-[14px] text-[#111110]/55">
              <Download size={16} className="shrink-0" /> Your invoice will be ready once the order is delivered.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');
  const [params, setParams] = useSearchParams();
  const openId = Number(params.get('open')) || null;
  const listRef = useRef(null);
  const now = useNow();

  const [requests, setRequests] = useState([]); // my return / replacement requests

  useEffect(() => {
    api.get('/orders').then(setOrders).catch((e) => { setError(e.message || 'Could not load orders.'); setOrders([]); });
    api.get('/returns').then(setRequests).catch(() => { /* drawer just shows the report button */ });
  }, []);
  // Latest request per order (list is newest first).
  const requestFor = (id) => requests.find((r) => r.orderId === id) || null;
  const report = async (body) => {
    const created = await api.post('/returns', body);
    setRequests((list) => [created, ...list]);
  };

  const shown = (orders || []).filter(TABS.find((t) => t.key === tab).match);
  const detail = orders?.find((o) => o.id === openId) || null;

  // Cards rise in whenever the list changes (load / tab switch).
  useEffect(() => {
    const el = listRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = gsap.fromTo(el.children, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.06, ease: 'power3.out', clearProps: 'transform' });
    return () => t.kill();
  }, [tab, orders]);

  const open = (id) => setParams({ open: String(id) });
  const closeDrawer = () => setParams({}, { replace: true });

  return (
    <AccountLayout title="My orders" subtitle="Track, view details and download invoices.">
      <Seo title="My orders" path="/account/orders" noindex />
      <div className="ac-in -mx-1.5 -mt-1.5 flex gap-2 overflow-x-auto px-1.5 pt-1.5 pb-2 [scrollbar-width:none]" role="tablist" aria-label="Filter orders">
        {TABS.map((t) => {
          const on = tab === t.key;
          const n = (orders || []).filter(t.match).length;
          return (
            <button key={t.key} type="button" role="tab" aria-selected={on} onClick={() => setTab(t.key)} className={`shrink-0 cursor-pointer rounded-full border-2 px-4 py-2 font-['Inter',sans-serif] text-[14px] font-semibold transition-colors duration-300 ${on ? 'border-[#111110] bg-[#111110] text-white' : 'border-[#111110]/12 bg-white/70 text-[#111110] hover:border-[#111110]'}`}>
              {t.label}{orders && <span className={`ml-1.5 text-[12px] ${on ? 'text-white/65' : 'text-[#111110]/40'}`}>{n}</span>}
            </button>
          );
        })}
      </div>

      {error && <p role="alert" className="m-0 mt-4 rounded-[14px] bg-[#FFE0EA] px-4 py-3 font-['Inter',sans-serif] text-[14px] text-[#B4123E]">{error}</p>}

      {orders === null ? (
        <div className="mt-5 flex flex-col gap-3">{[0, 1, 2].map((i) => <div key={i} className="h-[120px] animate-pulse rounded-[24px] bg-white/60" />)}</div>
      ) : shown.length === 0 ? (
        <div className={`ac-in mt-5 flex flex-col items-center px-6 py-12 text-center ${cardCls}`}>
          <span aria-hidden="true" className="flex size-16 animate-cp-bob items-center justify-center rounded-full bg-[#FFE0EA] text-[30px]">📦</span>
          <p className="m-0 mt-4 text-[22px] font-bold">{tab === 'all' ? 'No orders yet' : 'Nothing here'}</p>
          <p className="m-0 mt-1 font-['Inter',sans-serif] text-[15px] text-[#111110]/60">{tab === 'all' ? 'When you order, it shows up here.' : 'No orders in this tab.'}</p>
          {tab === 'all' && <Link to="/jewellery" className={`${primaryBtnCls} mt-5`}><BtnSweep />Start shopping</Link>}
        </div>
      ) : (
        <ul ref={listRef} className="m-0 mt-5 flex list-none flex-col gap-3 p-0">
          {shown.map((o) => (
            <li key={o.id}>
              <button type="button" onClick={() => open(o.id)} className={`group/o flex w-full cursor-pointer flex-col gap-4 border-0 p-5 text-left text-[#111110] transition-[translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_44px_-26px_rgba(17,17,16,0.55)] ${cardCls}`}>
                <span className="flex w-full flex-wrap items-center justify-between gap-3">
                  <span>
                    <span className="block text-[18px] font-bold">Order #{o.id}</span>
                    <span className="font-['Inter',sans-serif] text-[13px] text-[#111110]/55">{fmtDate(o.createdAt)} · {o.items.length} item{o.items.length === 1 ? '' : 's'}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <RefundBadge order={o} />
                    <OrderStatusBadge status={o.status} />
                  </span>
                </span>
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="flex -space-x-3">
                    {o.items.slice(0, 4).map((i) => (
                      <span key={i.id} className="size-12 overflow-hidden rounded-[12px] border-2 border-white bg-[#EFE8DA] transition-transform duration-300 group-hover/o:translate-x-1">
                        {i.product?.image && <img src={thumbUrl(i.product.image, 400)} data-original={i.product.image} alt="" className="h-full w-full scale-110 object-cover" />}
                      </span>
                    ))}
                    {o.items.length > 4 && <span className="flex size-12 items-center justify-center rounded-[12px] border-2 border-white bg-[#111110] font-['Inter',sans-serif] text-[12px] font-bold text-white">+{o.items.length - 4}</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    {o.status === 'DELIVERED' && !o.review && <span className="font-['Inter',sans-serif] text-[12px] font-bold text-[#8A6A00]">Rate it ★</span>}
                    {(() => {
                      const until = cancelDeadline(o);
                      return until && now < until.getTime() && <span className="font-['Inter',sans-serif] text-[12px] font-semibold text-[#111110]/55 max-[480px]:hidden">Cancel by {until.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>;
                    })()}
                    <span className="text-[20px] font-bold">{formatPrice(o.total)}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {detail && (
        <OrderDrawer
          key={detail.id}
          order={detail}
          request={requestFor(detail.id)}
          onReported={report}
          onClose={closeDrawer}
          onCancelled={(updated) => setOrders((list) => list.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)))}
          onReviewed={(id, review) => setOrders((list) => list.map((o) => (o.id === id ? { ...o, review } : o)))}
        />
      )}
    </AccountLayout>
  );
}
