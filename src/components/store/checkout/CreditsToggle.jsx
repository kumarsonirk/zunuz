import { Coins } from 'lucide-react';
import { formatPrice } from '../../../store/catalogConfig';

// "Use ZUNUZ Credits" switch in the checkout order summary. Credits and a
// coupon can't be combined: with a coupon applied the switch is disabled
// (`lockedNote` says why). `applied` = how much the credits take off.
export default function CreditsToggle({ balance, on, onChange, applied = 0, disabled = false, lockedNote = '' }) {
  const off = disabled || !!lockedNote;
  return (
    <div className={`rounded-[16px] border-2 px-4 py-3 font-['Inter',sans-serif] transition-colors duration-300 ${on && !off ? 'border-[#1E8A4C]/40 bg-[#F3FBF6]' : 'border-[#111110]/8 bg-white/70'}`}>
      <label className={`flex items-center gap-3 ${off ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <span aria-hidden="true" className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors ${on && !off ? 'bg-[#1E8A4C] text-white' : 'bg-[#FFF0B8] text-[#8A6A00]'}`}><Coins size={17} /></span>
        <span className={`min-w-0 flex-1 ${off ? 'opacity-55' : ''}`}>
          <span className="block text-[14px] font-semibold text-[#111110]">Use ZUNUZ Credits</span>
          <span className="block text-[12px] text-[#111110]/60">
            {on && !off && applied > 0 ? <><b className="text-[#1E8A4C]">−{formatPrice(applied)}</b> applied · {formatPrice(balance)} available</> : `${formatPrice(balance)} available`}
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={on && !off}
          disabled={off}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span aria-hidden="true" className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#111110] ${on && !off ? 'bg-[#1E8A4C]' : 'bg-[#111110]/15'} ${off ? 'opacity-55' : ''}`}>
          <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform duration-300 ${on && !off ? 'translate-x-5' : ''}`} />
        </span>
      </label>
      {lockedNote && <p className="m-0 mt-2 text-[12px] font-semibold text-[#8A6A00]">{lockedNote}</p>}
    </div>
  );
}
