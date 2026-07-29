import React from 'react';
import { Wallet, Truck } from 'lucide-react';

// TEMPORARY: online payments are hidden while the Razorpay Live mode website
// review is pending (24-48h, per Razorpay) — only Cash on Delivery is offered
// in the meantime. Set this back to true once Live mode is approved and the
// keys are swapped in, and CartPage.jsx / BillSummaryDrawer.jsx's default
// paymentMethod state should go back to 'RAZORPAY' at the same time.
const ONLINE_PAYMENTS_ENABLED = false;

const ALL_OPTIONS = [
  { id: 'RAZORPAY', label: 'Pay Online', sub: 'UPI, Cards, Netbanking', Icon: Wallet },
  { id: 'COD', label: 'Cash on Delivery', sub: 'Pay when it arrives', Icon: Truck },
];
const OPTIONS = ONLINE_PAYMENTS_ENABLED ? ALL_OPTIONS : ALL_OPTIONS.filter(o => o.id !== 'RAZORPAY');

export default function PaymentMethodPicker({ value, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] uppercase tracking-wider text-zinc-300 font-semibold" style={{ fontFamily: "'Grift', sans-serif" }}>
        Payment Method
      </span>
      <div className="flex gap-3">
        {OPTIONS.map(({ id, label, sub, Icon }) => {
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className="flex-1 flex items-center gap-2.5 rounded-xl border cursor-pointer transition-colors"
              style={{
                padding: '10px 12px',
                background: active ? 'rgba(252,75,78,0.08)' : 'rgba(255,255,255,0.02)',
                borderColor: active ? '#FC4B4E' : 'rgba(255,255,255,0.08)',
              }}
            >
              <Icon size={18} strokeWidth={1.5} style={{ color: active ? '#FC4B4E' : '#71717A', flexShrink: 0 }} />
              <div className="text-left min-w-0">
                <div className="text-[13px] font-medium truncate" style={{ color: active ? '#F5F2EB' : '#A1A1AA', fontFamily: "'Grift', sans-serif" }}>{label}</div>
                <div className="text-[10.5px] text-zinc-500 truncate">{sub}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
