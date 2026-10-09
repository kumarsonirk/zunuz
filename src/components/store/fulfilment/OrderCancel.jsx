import { useState } from 'react';
import { Link } from 'react-router-dom';
import { XCircle, Clock, RotateCcw, Loader2 } from 'lucide-react';
import { cardCls, fieldCls } from '../StoreShell';
import { formatPrice } from '../../../store/catalogConfig';
import { api } from '../../../utils/api';
import { cancelDeadline, useNow, CANCELLABLE } from './cancelUtils';

// Customer cancellation + "what about returns?" guidance for the My orders
// drawer. Rules match POST /api/orders/:id/cancel: not shipped yet
// (PENDING / CONFIRMED) and within SETTINGS.cancelWindowHours of ordering.

const REASONS = ['Ordered by mistake', 'Want to change items or size', 'Want to change the address', 'Found a better price', 'Delivery is taking too long', 'Other'];
const fmtTime = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const paidOnline = (o) => o.paymentMethod === 'RAZORPAY' && o.paymentStatus === 'PAID';

const Hint = ({ icon: Icon = Clock, children }) => (
  <p className="m-0 flex items-start gap-2 font-['Inter',sans-serif] text-[13px] leading-snug text-[#111110]/60">
    <Icon size={15} className="mt-0.5 shrink-0" /> <span>{children}</span>
  </p>
);

export function CancelSection({ order, onCancelled }) {
  const now = useNow();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null); // { refund } after cancelling here

  // Already cancelled.
  if (order.status === 'CANCELLED') {
    return (
      <section className={`p-5 ${cardCls}`}>
        <h3 className="m-0 mb-1 flex items-center gap-2 text-[17px] font-bold"><XCircle size={17} className="text-[#E8304F]" /> Order cancelled</h3>
        <p className="m-0 font-['Inter',sans-serif] text-[14px] text-[#111110]/70">
          {order.cancelledBy === 'CUSTOMER' ? 'You cancelled this order' : 'This order was cancelled'}
          {order.cancelledAt && ` on ${fmtTime(order.cancelledAt)}`}
          {order.cancelledBy === 'CUSTOMER' && order.cancelReason && <> · {order.cancelReason}</>}.
          {' '}{paidOnline(order)
            ? (done?.refund === 'MANUAL'
              ? 'Your refund is being arranged — we’ll email you as soon as it’s on its way.'
              : 'Your payment is refunded to your original payment method — it usually shows up within 5–7 business days.')
            : (order.creditsUsed || 0) > 0 ? '' : 'Nothing was charged.'}
          {(order.creditsUsed || 0) > 0 && <> The {formatPrice(order.creditsUsed)} of ZUNUZ Credits used goes back to your credits.</>}
        </p>
      </section>
    );
  }

  // Shipped / delivered: no cancelling — point to returns instead.
  if (order.status === 'SHIPPED') {
    return <Hint icon={RotateCcw}>It’s on its way, so it can no longer be cancelled. Once it arrives, you can report a damaged, wrong or missing item within 24 hours of delivery.</Hint>;
  }
  if (!CANCELLABLE.includes(order.status)) return null;

  const deadline = cancelDeadline(order);
  if (!deadline || now > deadline.getTime()) {
    return (
      <Hint>
        {deadline ? 'The cancellation window for this order has closed' : 'Orders can’t be cancelled online right now'} — we’re getting it ready. Need help?{' '}
        <Link to="/customer-care" className="font-semibold text-[#111110] underline underline-offset-2">Contact customer care</Link>. After delivery you can report a problem within 24 hours.
      </Hint>
    );
  }

  const submit = async () => {
    if (!reason) { setErr('Choose a reason.'); return; }
    setBusy(true); setErr('');
    try {
      const res = await api.post(`/orders/${order.id}/cancel`, { reason, note: reason === 'Other' ? note.trim() : '' });
      setDone({ refund: res.refund });
      onCancelled(res.order);
    } catch (e) {
      setErr(e.message || 'Could not cancel the order.');
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <section className={`p-5 ${cardCls}`}>
        <h3 className="m-0 mb-1 flex items-center gap-2 text-[17px] font-bold"><XCircle size={17} className="text-[#E8304F]" /> Need to cancel?</h3>
        <p className="m-0 mb-3 font-['Inter',sans-serif] text-[14px] text-[#111110]/70">
          You can cancel until <b className="text-[#111110]">{fmtTime(deadline)}</b>, as long as it hasn’t shipped.
        </p>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-[#E8304F] bg-transparent px-5 py-2.5 font-['Inter',sans-serif] text-[15px] font-bold text-[#E8304F] transition-colors duration-300 hover:bg-[#E8304F] hover:text-white">
          Cancel order
        </button>
        <p className="m-0 mt-3 font-['Inter',sans-serif] text-[12px] text-[#111110]/50">Returns: report a damaged, wrong or missing item within 24 hours of delivery.</p>
      </section>
    );
  }

  return (
    <section className={`p-5 ${cardCls} animate-[jw-rise_0.4s_cubic-bezier(0.16,1,0.3,1)_both]`} aria-labelledby="cancel-title">
      <h3 id="cancel-title" className="m-0 mb-1 text-[17px] font-bold">Cancel order #{order.id}?</h3>
      <p className="m-0 mb-3 font-['Inter',sans-serif] text-[14px] text-[#111110]/70">
        {paidOnline(order)
          ? <>We’ll refund <b className="text-[#111110]">{formatPrice(order.total)}</b> to your original payment method — it usually shows up within 5–7 business days.</>
          : order.paymentMethod === 'CREDITS' ? 'It was paid with ZUNUZ Credits — we just won’t send it.'
            : 'It’s cash on delivery, so there’s nothing to pay — we just won’t send it.'}
        {(order.creditsUsed || 0) > 0 && <> The {formatPrice(order.creditsUsed)} of ZUNUZ Credits used goes back to your credits.</>}
      </p>
      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-2 p-0 font-['Inter',sans-serif] text-[13px] font-semibold text-[#111110]/70">Why are you cancelling?</legend>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => {
            const on = reason === r;
            return (
              <button key={r} type="button" aria-pressed={on} onClick={() => { setReason(r); setErr(''); }} className={`cursor-pointer rounded-full border-2 px-3.5 py-1.5 font-['Inter',sans-serif] text-[13px] font-semibold transition-colors duration-200 ${on ? 'border-[#111110] bg-[#111110] text-white' : 'border-[#111110]/12 bg-white text-[#111110] hover:border-[#111110]'}`}>
                {r}
              </button>
            );
          })}
        </div>
      </fieldset>
      {reason === 'Other' && (
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={200} placeholder="Tell us a little more (optional)" className={`${fieldCls} mt-3 resize-none text-[14px]`} />
      )}
      {err && <p role="alert" className="m-0 mt-3 font-['Inter',sans-serif] text-[13px] text-[#E8304F]">{err}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={submit} disabled={busy} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-[#E8304F] px-5 py-2.5 font-['Inter',sans-serif] text-[15px] font-bold text-white transition-[opacity,translate] duration-300 enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
          {busy && <Loader2 size={16} className="animate-spin" />}{busy ? 'Cancelling…' : 'Yes, cancel order'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setErr(''); }} disabled={busy} className="inline-flex cursor-pointer items-center justify-center rounded-full border-2 border-[#111110]/15 bg-transparent px-5 py-2.5 font-['Inter',sans-serif] text-[15px] font-bold text-[#111110] transition-colors duration-300 hover:border-[#111110]">
          Keep my order
        </button>
      </div>
    </section>
  );
}
