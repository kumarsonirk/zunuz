import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Tag, X, ChevronDown } from 'lucide-react';
import { formatPrice } from '../../../store/catalogConfig';

// Coupon box. `coupon` is the object from useCoupon(); the applied code is
// shared by the bag and checkout (kept for the tab).
// mode:
//   'entry'   — bag page, under "Offers for you": the "Have a coupon code?"
//               field only (the applied code shows in Offers for you).
//               Hidden while `lockedNote` applies (e.g. Navratri combo).
//   'summary' — checkout: no field (codes are added in the bag); shows the
//               applied code with a remove button, or why it was removed.
// `lockedNote` (e.g. ZUNUZ Credits are on — they can't be combined with a
// coupon) shows an applied code greyed out with that note.
export default function CouponBox({ coupon, disabled = false, lockedNote = '', mode = 'entry' }) {
  const { applied, error, needsVerification, busy, apply, remove, clearError } = coupon;
  const [open, setOpen] = useState(!!error);
  const [code, setCode] = useState('');

  if (mode === 'summary') {
    if (!applied) {
      return error ? <p role="alert" className="m-0 rounded-[14px] bg-[#FFE0EA] px-3.5 py-2.5 font-['Inter',sans-serif] text-[13px] font-semibold text-[#E8304F]">{error}</p> : null;
    }
  } else if (lockedNote) {
    return null;
  }

  // Locked wins: a coupon saved earlier is set aside while another offer applies.
  if (mode === 'summary' && applied && !lockedNote) {
    return (
      <div className="flex items-center gap-3 rounded-[16px] border-2 border-dashed border-[#FF3D8B]/50 bg-[#FFF3F7] px-3.5 py-3 animate-[jw-rise_0.4s_cubic-bezier(0.16,1,0.3,1)_both]">
        <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FF3D8B] text-white"><Tag size={16} /></span>
        <span className="min-w-0 flex-1 font-['Inter',sans-serif]">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[15px] font-extrabold tracking-wide text-[#FF3D8B]">{applied.code}</span>
            <span className="text-[14px] font-bold text-[#1E8A4C]">−{formatPrice(applied.discount)}</span>
          </span>
          <span className="block truncate text-[12px] text-[#111110]/60">{applied.rule || 'Coupon applied'}</span>
        </span>
        <button type="button" onClick={remove} disabled={disabled} aria-label={`Remove coupon ${applied.code}`} className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-white text-[#111110]/60 transition-colors hover:bg-[#FFE0EA] hover:text-[#E8304F] disabled:cursor-not-allowed disabled:opacity-40">
          <X size={16} />
        </button>
      </div>
    );
  }

  if (mode === 'summary' && lockedNote) {
    return (
      <div className="rounded-[16px] border-2 border-[#111110]/8 bg-white/50 px-4 py-3 font-['Inter',sans-serif]" aria-disabled="true">
        <span className="flex items-center gap-2 text-[14px] font-semibold text-[#111110]/45"><Tag size={16} /> Have a coupon code?</span>
        <p className="m-0 mt-1 text-[12px] font-semibold text-[#8A6A00]">{lockedNote}</p>
      </div>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    if (!busy) apply(code);
  };

  return (
    <div className="rounded-[16px] border-2 border-[#111110]/8 bg-white/70">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="co-coupon"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-[16px] border-0 bg-transparent px-4 py-3 text-left font-['Inter',sans-serif] text-[14px] font-semibold text-[#111110]"
      >
        <Tag size={16} className="text-[#FF3D8B]" />
        <span className="flex-1">Have a coupon code?</span>
        <ChevronDown size={17} className={`text-[#111110]/50 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <form id="co-coupon" onSubmit={submit} noValidate className="px-4 pb-4 animate-[jw-rise_0.35s_cubic-bezier(0.16,1,0.3,1)_both]">
          <div className="flex gap-2">
            <label htmlFor="co-coupon-code" className="sr-only">Coupon code</label>
            <input
              id="co-coupon-code"
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 20)); if (error) clearError(); }}
              placeholder="Enter code"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={!!error}
              aria-describedby={error ? 'co-coupon-err' : undefined}
              disabled={disabled}
              className="min-w-0 flex-1 rounded-full border-2 border-[#111110]/12 bg-white px-4 py-2.5 font-['Inter',sans-serif] text-[14px] font-semibold tracking-wide uppercase outline-none placeholder:font-normal placeholder:tracking-normal placeholder:normal-case placeholder:text-[#111110]/35 focus:border-[#111110] aria-[invalid=true]:border-[#E8304F]"
            />
            <button type="submit" disabled={busy || disabled || !code} className="flex min-w-[84px] cursor-pointer items-center justify-center rounded-full border-0 bg-[#111110] px-5 font-['Inter',sans-serif] text-[14px] font-semibold text-white transition-colors hover:bg-[#FF3D8B] disabled:cursor-not-allowed disabled:opacity-40">
              {busy ? <span aria-label="Checking" className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : 'Apply'}
            </button>
          </div>
        </form>
      )}
      {error && <p id="co-coupon-err" role="alert" className={`m-0 font-['Inter',sans-serif] text-[13px] font-semibold text-[#E8304F] ${open ? '-mt-1 px-4 pb-3' : 'px-4 pb-3'}`}>{error}{needsVerification && <> <Link to="/account" className="text-[#111110] underline underline-offset-2">Go to My account</Link></>}</p>}
    </div>
  );
}
