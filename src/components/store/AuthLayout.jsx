import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Eye, EyeOff } from 'lucide-react';
import StoreShell, { fieldCls } from './StoreShell';

// Shared frame for the auth pages (login, sign up, forgot / reset password):
// a photo panel (model shot, floating jewel stickers, spinning brand badge)
// beside the form on desktop; on phones the photo shrinks to a banner above
// it. Title words rise out of their masks, then the form pieces (.au-in)
// stagger up.
const STICKERS = ['/jewel1.webp', '/jewel3.webp', '/jewel2.webp'];

function SpinBadge() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className="size-full animate-[spin_16s_linear_infinite]">
      <defs><path id="au-circle" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" /></defs>
      <circle cx="60" cy="60" r="58" fill="#F6C915" />
      {/* textLength stretches/squeezes the words to exactly one lap. */}
      <text fontSize="11.5" fontWeight="800" fill="#111110" fontFamily="'Bricolage Grotesque', sans-serif">
        <textPath href="#au-circle" textLength="272" lengthAdjust="spacing">ZUNUZ · JEWELLERY FROM ₹199 ·</textPath>
      </text>
      <text x="60" y="68" textAnchor="middle" fontSize="24" fill="#FF3D8B">♥</text>
    </svg>
  );
}

export default function AuthLayout({ image, title, subtitle, accent = 'text-[#FF3D8B]', tagline = 'Cute pieces. Cuter prices.', children }) {
  const rootRef = useRef(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(root.querySelector('.au-photo'), { opacity: 0, scale: 0.94, rotate: -2 }, { opacity: 1, scale: 1, rotate: 0, duration: 1, ease: 'expo.out' })
      .fromTo(root.querySelectorAll('.au-sticker'), { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.7, stagger: 0.1, ease: 'back.out(2)' }, 0.35)
      .fromTo(root.querySelectorAll('.au-word'), { yPercent: 110, rotate: 4 }, { yPercent: 0, rotate: 0, duration: 0.8, stagger: 0.06 }, 0.1)
      .fromTo(root.querySelectorAll('.au-in'), { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, clearProps: 'transform' }, 0.3);
    return () => tl.kill();
  }, []);

  return (
    <StoreShell footer={false}>
      <main ref={rootRef} className="mx-auto grid min-h-[calc(100dvh-88px)] max-w-[1180px] grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-[clamp(24px,5vw,72px)] px-5 py-[clamp(20px,4vw,48px)] max-[860px]:grid-cols-1 max-[860px]:content-start">
        {/* Photo panel */}
        <div className="au-photo relative h-[min(640px,calc(100dvh-160px))] max-[860px]:h-[180px]">
          <div className="absolute inset-0 overflow-hidden rounded-[clamp(24px,3vw,40px)] bg-[#FF3D8B] shadow-[0_40px_80px_-50px_rgba(17,17,16,0.6)]">
            <img src={image} alt="" className="h-full w-full object-cover object-top" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(17,17,16,0.55))]" />
            <p className="absolute right-6 bottom-5 left-6 m-0 text-[length:clamp(26px,3vw,40px)] leading-[1.02] font-extrabold text-white [text-shadow:0_4px_18px_rgba(0,0,0,0.35)] max-[860px]:hidden">{tagline}</p>
          </div>
          {STICKERS.map((src, i) => (
            <span
              key={src}
              aria-hidden="true"
              className={`au-sticker absolute block overflow-hidden rounded-full border-2 sm:border-4 border-white bg-white shadow-[0_14px_30px_-12px_rgba(17,17,16,0.5)] ${[
                'top-[8%] -left-6 size-[86px] max-[860px]:-top-2.5 max-[860px]:left-3 max-[860px]:size-[50px]',
                'top-[38%] -right-7 size-[72px] max-[860px]:hidden',
                'bottom-[22%] -left-8 size-[64px] max-[860px]:-bottom-2.5 max-[860px]:right-4 max-[860px]:left-auto max-[860px]:size-[52px]',
              ][i]}`}
            >
              <img src={src} alt="" className={`h-full w-full scale-125 object-cover ${['animate-cp-bob', 'animate-[cp-bob_6s_ease-in-out_infinite_reverse]', 'animate-[cp-bob_4.5s_ease-in-out_infinite]'][i]}`} />
            </span>
          ))}
          <span className="au-sticker absolute -top-6 -right-5 size-[110px] max-[860px]:-top-3 max-[860px]:right-3 max-[860px]:size-[76px]"><SpinBadge /></span>
        </div>

        {/* Form side */}
        <div className="mx-auto w-full max-w-[440px]">
          <h1 className={`m-0 text-[length:clamp(40px,5vw,64px)] leading-[0.95] font-extrabold tracking-[-0.03em] ${accent}`}>
            {title.split(' ').map((w, i) => (
              <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-top"><span className="au-word inline-block">{w}&nbsp;</span></span>
            ))}
          </h1>
          {subtitle && <p className="au-in m-0 mt-3 font-['Inter',sans-serif] text-[16px] text-[#111110]/65">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>
      </main>
    </StoreShell>
  );
}

// Labelled input; type="password" gets a show / hide toggle.
export function AuthField({ id, label, type = 'text', error, hint, right, placeholder, showLabel = false, ...props }) {
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  const effectivePlaceholder = placeholder !== undefined ? placeholder : label;

  return (
    <div className="au-in flex flex-col gap-1.5">
      {(showLabel || right) && (
        <div className="flex items-baseline justify-between gap-3">
          {showLabel ? (
            <label htmlFor={id} className="font-['Inter',sans-serif] text-[13px] font-semibold text-[#111110]/70">{label}</label>
          ) : <span />}
          {right}
        </div>
      )}
      {!showLabel && <label htmlFor={id} className="sr-only">{label}</label>}
      <div className="relative">
        <input
          id={id}
          type={isPw && show ? 'text' : type}
          placeholder={effectivePlaceholder}
          aria-label={label}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          className={`${fieldCls} ${isPw ? 'pr-12' : ''}`}
          {...props}
        />
        {isPw && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[#111110]/50 hover:text-[#111110]"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <span id={`${id}-err`} className="font-['Inter',sans-serif] text-[12px] font-semibold text-[#E8304F]">{error}</span>}
      {!error && hint && <span id={`${id}-hint`} className="font-['Inter',sans-serif] text-[12px] text-[#111110]/50">{hint}</span>}
    </div>
  );
}

export function AuthAlert({ kind = 'error', children }) {
  if (!children) return null;
  return (
    <p role={kind === 'error' ? 'alert' : 'status'} className={`au-in m-0 rounded-[14px] px-4 py-3 font-['Inter',sans-serif] text-[14px] animate-[jw-rise_0.4s_cubic-bezier(0.16,1,0.3,1)_both] ${kind === 'error' ? 'bg-[#FFE0EA] text-[#B4123E]' : 'bg-[#E8F7EE] text-[#1E6B3E]'}`}>
      {children}
    </p>
  );
}

export function OrDivider() {
  return (
    <div className="au-in my-6 flex items-center gap-3 font-['Inter',sans-serif] text-[12px] font-semibold tracking-[0.12em] text-[#111110]/40">
      <span className="h-px flex-1 bg-[#111110]/12" />OR<span className="h-px flex-1 bg-[#111110]/12" />
    </div>
  );
}
