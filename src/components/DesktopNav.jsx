import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Shop', path: '/jewellery' },
  { label: 'Festive Glow', path: '/festive-glow' },
  { label: 'Navratri Offers', path: '/navratri-offers' },
  { label: 'Contact us', path: '/customer-care' },
];

// The frosted-glass background as its own layer, so its opacity can follow
// the scroll position (0 = clear, 1 = full glass) with no timed animation.
// Fading this layer (not a parent) keeps the backdrop blur working mid-fade.
export function GlassLayer({ opacity = 1 }) {
  return (
    <span
      aria-hidden="true"
      data-glass=""
      style={{ opacity }}
      className="pointer-events-none absolute inset-x-0 top-0 -bottom-px -z-10 border-b border-white/70 bg-[#FFF8EE]/65 shadow-[0_10px_30px_-20px_rgba(17,17,16,0.35),inset_0_-1px_0_rgba(17,17,16,0.06)] backdrop-blur-xl backdrop-saturate-[1.6]"
    />
  );
}

// Storefront header (≥ 1024px).
//   default       dark logo and text for light pages. `glass` is the opacity
//                 of the frosted bar (number or CSS value) — LandingHeader
//                 passes var(--hdr-p), which follows the scroll position.
//                 `ink` fades the logo / links / buttons the same way.
//   transparent   no background, white logo/text, for floating over a hero
//                 photo (home / jewellery page tops).
// `customer` (optional): when signed in, Log in / Sign up become an account
// avatar (initials) that opens /account.
// darkInk: transparent bar (no glass) but dark logo/text — for light hero photos.
export default function DesktopNav({ cartItems = [], onLogoClick, onCartClick, transparent = false, glass = 1, ink: inkOpacity = 1, customer = null, darkInk = false }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const solid = !transparent; // glass bar
  const light = solid || darkInk; // dark logo + text
  const ink = light ? 'text-[#111110]' : 'text-[#F5F2EB]';

  return (
    <header
      style={{ '--ink-o': inkOpacity }}
      className={`relative isolate flex items-center justify-between px-16 [&>:not([data-glass])]:opacity-(--ink-o) ${solid
        ? 'border-b border-transparent py-[18px]'
        : 'bg-transparent py-6'}`}
    >
      {solid && <GlassLayer opacity={glass} />}
      <img
        src={light ? '/logo_dark.png' : '/logo_white.png'}
        alt="Zunuz"
        onClick={onLogoClick}
        className="h-7 w-auto cursor-pointer object-contain transition-opacity hover:opacity-70"
      />

      <nav aria-label="Main" className="flex items-center gap-10">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.path || (link.path === '/navratri-offers' && pathname === '/navratri-offer');
          return (
            <button
              key={link.path}
              type="button"
              onClick={() => navigate(link.path)}
              aria-current={active ? 'page' : undefined}
              className={`group/nl relative cursor-pointer border-0 bg-transparent px-0 py-1 font-['Grift',sans-serif] text-[16px] tracking-[0.04em] transition-colors duration-300 ${ink} ${light ? 'font-medium hover:text-[#FF3D8B]' : 'font-semibold hover:text-white'}`}
            >
              {link.label}
              {/* underline: grows on hover, stays for the current page */}
              <span aria-hidden="true" className={`absolute -bottom-0.5 left-1/2 h-[2px] -translate-x-1/2 rounded-full transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${light ? 'bg-[#FF3D8B]' : 'bg-white'} ${active ? 'w-1/2' : 'w-0 group-hover/nl:w-2/5'}`} />
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-7">
        <button
          type="button"
          onClick={onCartClick}
          className="btn-nav-item btn-nav-bag relative"
          // inline: the global .btn-nav-item rule (index.css) sets a light colour
          style={{ color: light ? '#111110' : '#F5F2EB' }}
          aria-label={`Shopping bag${totalItems ? `, ${totalItems} items` : ''}`}
        >
          <ShoppingBag size={20} strokeWidth={1.6} />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#FC4B4E] text-[9px] font-bold text-white">
              {totalItems}
            </span>
          )}
        </button>
        {customer ? (
          <button
            type="button"
            onClick={() => navigate('/account')}
            aria-label="My account"
            title={customer.name || 'My account'}
            className="size-[38px] cursor-pointer rounded-full border-0 bg-[#FF3D8B] font-['Grift',sans-serif] text-[14px] font-bold text-white shadow-[0_6px_16px_-6px_rgba(255,61,139,0.7)] transition-transform duration-300 hover:-translate-y-px"
          >
            {(customer.name || customer.email || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
          </button>
        ) : (<>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className={`cursor-pointer border-0 bg-transparent font-['Grift',sans-serif] text-[16px] transition-colors duration-300 ${ink} ${light ? 'font-medium hover:text-[#FF3D8B]' : 'font-semibold'}`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className={`cursor-pointer rounded-full border-0 px-[22px] py-[9px] font-['Grift',sans-serif] text-[14px] font-semibold transition-[translate,background-color] duration-300 hover:-translate-y-px ${light ? 'bg-[#111110] text-white hover:bg-[#FF3D8B]' : 'bg-[#F5F2EB] text-[#1F2024]'}`}
          >
            Sign up
          </button>
        </>)}
      </div>
    </header>
  );
}
