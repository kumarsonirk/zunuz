import { Star, Check } from 'lucide-react';

// Small shared pieces for order / review screens (account pages).
const STATUS = {
  PENDING: { label: 'Awaiting confirmation', cls: 'bg-[#FFF0B8] text-[#8A6A00]' },
  CONFIRMED: { label: 'Confirmed', cls: 'bg-[#D6E6FF] text-[#1A5BC4]' },
  SHIPPED: { label: 'Shipped', cls: 'bg-[#E6DCFA] text-[#5B33B5]' },
  DELIVERED: { label: 'Delivered', cls: 'bg-[#E8F7EE] text-[#1E8A4C]' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-[#FFE0EA] text-[#B4123E]' },
};

export function OrderStatusBadge({ status }) {
  const s = STATUS[status] || STATUS.PENDING;
  return <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 font-['Inter',sans-serif] text-[12px] font-bold ${s.cls}`}>{s.label}</span>;
}

// Placed → Confirmed → Shipped → Delivered progress (cancelled: its own note).
const STEPS = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];
const STEP_LABEL = { PENDING: 'Placed', CONFIRMED: 'Confirmed', SHIPPED: 'Shipped', DELIVERED: 'Delivered' };
const stepDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null);
// `order` (optional) adds the date under Placed / Shipped / Delivered.
export function OrderTimeline({ status, order }) {
  if (status === 'CANCELLED') {
    const refunded = order?.refundStatus === 'PROCESSED' && order.refundAmount;
    return (
      <p className="m-0 rounded-[14px] bg-[#FFE0EA] px-4 py-3 font-['Inter',sans-serif] text-[14px] font-semibold text-[#B4123E]">
        This order was cancelled. {refunded ? 'Your refund has been processed — see the details below.' : 'Any payment made is refunded in 5–7 business days.'}
      </p>
    );
  }
  const at = Math.max(0, STEPS.indexOf(status));
  const dates = { PENDING: stepDate(order?.createdAt), SHIPPED: stepDate(order?.shippedAt), DELIVERED: stepDate(order?.deliveredAt) };
  return (
    <ol className="m-0 grid list-none grid-cols-4 p-0" aria-label="Order progress">
      {STEPS.map((s, i) => {
        const done = i <= at;
        return (
          <li key={s} className="relative flex flex-col items-center gap-2 text-center">
            {i > 0 && (
              <span aria-hidden="true" className="absolute top-[13px] right-1/2 left-[-50%] h-[3px] rounded-full bg-[#111110]/10">
                <span className="block h-full rounded-full bg-[#1E8A4C] transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ width: done ? '100%' : '0%', transitionDelay: `${i * 150}ms` }} />
              </span>
            )}
            <span className={`relative z-[1] flex size-[29px] items-center justify-center rounded-full border-[3px] transition-colors duration-500 ${done ? 'border-[#1E8A4C] bg-[#1E8A4C] text-white' : 'border-[#111110]/15 bg-white text-transparent'}`} style={{ transitionDelay: `${i * 150}ms` }}>
              <Check size={14} strokeWidth={3.5} />
            </span>
            <span className={`font-['Inter',sans-serif] text-[12px] font-semibold ${done ? 'text-[#111110]' : 'text-[#111110]/45'}`}>
              {STEP_LABEL[s]}
              {done && dates[s] && <span className="block text-[11px] font-medium text-[#111110]/50">{dates[s]}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// Refund state pill (orders list + drawer).
const REFUND = {
  PROCESSED: { label: 'Refunded', cls: 'bg-[#E8F7EE] text-[#1E8A4C]' },
  PENDING: { label: 'Refund in progress', cls: 'bg-[#FFF0B8] text-[#8A6A00]' },
};
export function RefundBadge({ order }) {
  const s = REFUND[order?.refundStatus];
  if (!s) return null;
  const partial = order.refundAmount && order.refundAmount < order.total;
  return <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 font-['Inter',sans-serif] text-[12px] font-bold ${s.cls}`}>{partial && order.refundStatus === 'PROCESSED' ? 'Partly refunded' : s.label}</span>;
}

export function Stars({ value, size = 15 }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={size} strokeWidth={0} fill="currentColor" className={n <= value ? 'text-[#F2A900]' : 'text-[#111110]/15'} />)}
    </span>
  );
}

export function StarInput({ value, onChange, size = 28 }) {
  return (
    <span className="inline-flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className="cursor-pointer border-0 bg-transparent p-0.5 transition-transform duration-200 hover:scale-115 active:scale-90"
        >
          <Star size={size} strokeWidth={0} fill="currentColor" className={n <= value ? 'text-[#F2A900]' : 'text-[#111110]/15'} />
        </button>
      ))}
    </span>
  );
}
