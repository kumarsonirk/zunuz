import { useEffect, useId, useState } from 'react';
import { Truck, CircleCheck, MapPinOff, Banknote, CircleAlert } from 'lucide-react';
import { fetchPincode, etaDate, PIN_RE } from './checkout/usePincode';
import { SETTINGS } from '../../store/settings';

// "Check delivery" pincode box on the product page — a real lookup against
// GET /api/pincodes/:pin (same rules checkout and the server use). The last
// pincode checked is remembered on this device and re-checked on the next
// product page.
const KEY = 'zunuz_pincode';
const remembered = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };

export default function PincodeCheck({ className = '' }) {
  const uid = useId();
  const inputId = `pd-pin-${uid}`;
  const [pin, setPin] = useState(remembered);
  const [state, setState] = useState({ status: 'idle', info: null, msg: '' });

  const run = (value) => {
    const p = value.trim();
    if (!PIN_RE.test(p)) { setState({ status: 'invalid', info: null, msg: 'Enter a valid 6-digit pincode.' }); return; }
    setState({ status: 'loading', info: null, msg: '' });
    fetchPincode(p)
      .then((info) => {
        setState({ status: 'ready', info, msg: '' });
        try { localStorage.setItem(KEY, p); } catch { /* ignore */ }
      })
      .catch(() => setState({ status: 'error', info: null, msg: "Couldn't check right now — please try again." }));
  };

  // Re-check a remembered pincode once on mount.
  useEffect(() => {
    const p = remembered();
    if (!PIN_RE.test(p)) return undefined;
    let alive = true;
    fetchPincode(p).then((info) => { if (alive) setState({ status: 'ready', info, msg: '' }); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const submit = (e) => { e.preventDefault(); run(pin); };
  const { status, info } = state;
  const by = info?.etaDays ? etaDate(info.etaDays) : null;

  return (
    <form onSubmit={submit} noValidate className={`rounded-[18px] bg-white/80 p-4 shadow-[0_10px_26px_-20px_rgba(17,17,16,0.45)] ${className}`}>
      <label htmlFor={inputId} className="flex items-center gap-2 font-['Inter',sans-serif] text-[14px] font-semibold"><Truck size={17} /> Check delivery</label>
      <div className="mt-2.5 flex gap-2">
        <input
          id={inputId}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          placeholder="Enter pincode"
          value={pin}
          aria-invalid={status === 'invalid' || undefined}
          aria-describedby={`${inputId}-res`}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 6)); if (status !== 'idle') setState({ status: 'idle', info: null, msg: '' }); }}
          className="min-w-0 flex-1 rounded-full border-2 border-[#111110]/12 bg-white px-4 py-2.5 font-['Inter',sans-serif] text-[14px] outline-none focus:border-[#111110] aria-[invalid=true]:border-[#E8304F]"
        />
        <button type="submit" disabled={status === 'loading'} className="flex min-w-[78px] cursor-pointer items-center justify-center rounded-full border-0 bg-[#111110] px-5 font-['Inter',sans-serif] text-[14px] font-semibold text-white transition-colors hover:bg-[#FF3D8B] disabled:cursor-wait">
          {status === 'loading' ? <span aria-label="Checking" className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : 'Check'}
        </button>
      </div>

      <div id={`${inputId}-res`} role="status" aria-live="polite" className="font-['Inter',sans-serif]">
        {(status === 'invalid' || status === 'error') && (
          <p className="m-0 mt-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-[#E8304F]"><CircleAlert size={15} /> {state.msg}</p>
        )}
        {status === 'ready' && info && !info.serviceable && (
          <div className="mt-3 flex items-start gap-2.5 rounded-[14px] bg-[#FFE0EA] px-3.5 py-2.5 text-[13px] text-[#B4123E] animate-[jw-rise_0.4s_cubic-bezier(0.16,1,0.3,1)_both]">
            <MapPinOff size={17} className="mt-px shrink-0" />
            <span><b>Sorry, we don't deliver to {info.pincode} yet.</b> We're adding new areas regularly.</span>
          </div>
        )}
        {status === 'ready' && info?.serviceable && (
          <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0 text-[13px] animate-[jw-rise_0.4s_cubic-bezier(0.16,1,0.3,1)_both]">
            <li className="flex items-start gap-2 font-semibold text-[#1E8A4C]">
              <CircleCheck size={16} className="mt-px shrink-0" />
              <span>
                Delivers to {info.city ? `${info.city}, ${info.pincode}` : info.pincode}
                {info.etaDays
                  ? <> within {info.etaDays}{by && <span className="font-normal text-[#111110]/60"> · get it by {by}</span>}</>
                  : <span className="font-normal text-[#111110]/60"> · usually 2–7 business days</span>}
              </span>
            </li>
            {SETTINGS.codEnabled && (
              <li className={`flex items-center gap-2 ${info.codAvailable ? 'text-[#111110]/75' : 'text-[#8A6A00]'}`}>
                <Banknote size={16} className="shrink-0" />
                {info.codAvailable ? 'Cash on delivery available' : 'Cash on delivery not available here — pay online'}
              </li>
            )}
          </ul>
        )}
      </div>
    </form>
  );
}
