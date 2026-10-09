import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { LayoutGrid, Package, MapPin, Star, User, Headphones, LogOut, Gift } from 'lucide-react';
import StoreShell from './StoreShell';
import { useAuth } from '../../contexts/AuthContext';

// Frame for the signed-in account pages: greeting header, a side menu
// (desktop) / scrollable chips (phones), and the page body. Signed-out
// visitors are sent to Log in and brought back here afterwards. The page
// title words rise in and `.ac-in` pieces stagger up on every page change.
const ACCOUNT_NAV = [
  { to: '/account', label: 'Overview', icon: LayoutGrid },
  { to: '/account/orders', label: 'Orders', icon: Package },
  { to: '/account/addresses', label: 'Addresses', icon: MapPin },
  { to: '/account/reviews', label: 'My reviews', icon: Star },
  { to: '/account/refer', label: 'Refer & Earn', icon: Gift },
  { to: '/account/profile', label: 'Profile', icon: User },
  { to: '/customer-care', label: 'Help', icon: Headphones },
];

const initialsOf = (name, email) => {
  const src = (name || email || '?').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : src.slice(0, 2)).toUpperCase();
};

export default function AccountLayout({ title, subtitle, action, children }) {
  const { customer, loading, logout } = useAuth();
  const { pathname } = useLocation();
  const rootRef = useRef(null);
  // Set together with logout() so the guard below sends you home, not to
  // Log in (router navigation is a low-priority update and would lose).
  const [signingOut, setSigningOut] = useState(false);

  const ready = !loading && !!customer;
  useEffect(() => {
    const root = rootRef.current;
    if (!ready || !root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(root.querySelectorAll('.ac-word'), { yPercent: 110, rotate: 3 }, { yPercent: 0, rotate: 0, duration: 0.8, stagger: 0.05 })
      .fromTo(root.querySelectorAll('.ac-nav'), { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.04, clearProps: 'transform' }, 0.1)
      .fromTo(root.querySelectorAll('.ac-in'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.65, stagger: 0.06, clearProps: 'transform' }, 0.2);
    return () => tl.kill();
  }, [ready, pathname]);

  if (loading) {
    return (
      <StoreShell footer={false}>
        <div className="flex justify-center py-40"><span aria-label="Loading" className="size-10 animate-spin rounded-full border-[3px] border-[#111110]/10 border-t-[#FF3D8B]" /></div>
      </StoreShell>
    );
  }
  if (!customer) return signingOut ? <Navigate to="/" replace /> : <Navigate to="/login" replace state={{ returnTo: pathname }} />;

  const signOut = () => { setSigningOut(true); logout(); };

  return (
    <StoreShell>
      <main ref={rootRef} className="mx-auto max-w-[1180px] px-5 pt-[clamp(20px,3.4vw,48px)] pb-[clamp(56px,7vw,96px)]">
        {/* Greeting strip */}
        <div className="ac-in flex items-center gap-4">
          <span className="flex size-[clamp(48px,5vw,60px)] shrink-0 items-center justify-center rounded-full bg-[#FF3D8B] text-[length:clamp(17px,1.8vw,21px)] font-bold text-white shadow-[0_12px_26px_-12px_rgba(255,61,139,0.9)]">
            {initialsOf(customer.name, customer.email)}
          </span>
          <span className="min-w-0">
            <span className="block font-['Inter',sans-serif] text-[13px] font-semibold text-[#111110]/50">My account</span>
            <span className="block truncate text-[18px] font-bold">{customer.name || customer.email}</span>
          </span>
        </div>

        <div className="mt-7 grid grid-cols-[230px_minmax(0,1fr)] items-start gap-[clamp(20px,3.4vw,48px)] max-[900px]:grid-cols-1">
          {/* Menu */}
          <nav aria-label="Account" className="sticky top-[calc(var(--store-header-h)+var(--announce-h,0px)+24px)] flex flex-col gap-1 max-[900px]:static max-[900px]:-mx-5 max-[900px]:flex-row max-[900px]:-mt-1.5 max-[900px]:overflow-x-auto max-[900px]:px-5 max-[900px]:pt-1.5 max-[900px]:pb-2 max-[900px]:[scrollbar-width:none]">
            {ACCOUNT_NAV.map(({ to, label, icon: Icon }) => {
              const on = to === '/account' ? pathname === '/account' : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={on ? 'page' : undefined}
                  className={`ac-nav group/n flex shrink-0 items-center gap-3 rounded-full px-4 py-2.5 font-['Inter',sans-serif] text-[15px] font-semibold no-underline transition-[background-color,color,translate] duration-300 ${on ? 'bg-[#111110] text-white' : 'text-[#111110]/70 hover:translate-x-1 hover:bg-white/80 hover:text-[#111110] max-[900px]:bg-white/70 max-[900px]:hover:translate-x-0'}`}
                >
                  <Icon size={18} className={on ? 'text-[#F6C915]' : 'text-[#111110]/45 group-hover/n:text-[#FF3D8B]'} />
                  {label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={signOut}
              className="ac-nav mt-3 flex shrink-0 cursor-pointer items-center gap-3 rounded-full border-0 bg-transparent px-4 py-2.5 text-left font-['Inter',sans-serif] text-[15px] font-semibold text-[#E8304F] transition-colors hover:bg-[#FFE0EA] max-[900px]:mt-0"
            >
              <LogOut size={18} /> Log out
            </button>
          </nav>

          <div className="min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="m-0 text-[length:clamp(34px,4.6vw,60px)] leading-[0.95] font-extrabold tracking-[-0.03em] text-[#111110]">
                  {title.split(' ').map((w, i) => (
                    <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-top"><span className="ac-word inline-block">{w}&nbsp;</span></span>
                  ))}
                </h1>
                {subtitle && <p className="ac-in m-0 mt-2 font-['Inter',sans-serif] text-[15px] text-[#111110]/60">{subtitle}</p>}
              </div>
              {action && <div className="ac-in">{action}</div>}
            </div>
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </main>
    </StoreShell>
  );
}
