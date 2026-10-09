import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { BarChart3, Package, Tag, Star, ShoppingBag, Users, Megaphone, LogOut, Menu, X, ChevronUp, ChevronLeft, Search, Sun, Moon, ExternalLink, UserPlus, ShieldCheck, History, Lock, SlidersHorizontal, MapPin, RotateCcw, ShoppingCart, TicketPercent, LayoutTemplate, FileBarChart, MailPlus, Gift } from 'lucide-react';
import Seo from '../../components/Seo';
import { api } from '../../utils/api';
import NotificationBell from '../../components/admin/growth/NotificationBell';

// Admin shell: a full-width top bar (back, ZUNUZ wordmark, product search,
// theme, account menu) over a sidebar of collapsible groups with live count
// badges, and the page outlet. Dark by default; light mode is the
// storefront's cream. Colours come from the --admin-* tokens in index.css,
// so every admin page follows the theme.
const GROUPS = [
  {
    key: 'insights', title: 'Insights', items: [
      { to: '/admin/reports', label: 'Reports & Exports', icon: FileBarChart, perm: 'reports' },
    ],
  },
  {
    key: 'store', title: 'Store Management', items: [
      { to: '/admin/products', label: 'Products', icon: Package, badge: 'products', perm: 'products' },
      { to: '/admin/categories', label: 'Categories', icon: Tag, perm: 'categories' },
      { to: '/admin/reviews', label: 'Reviews', icon: Star, badge: 'reviewsPending', alert: true, perm: 'reviews' },
      { to: '/admin/pincodes', label: 'Delivery Pincodes', icon: MapPin, perm: 'settings' },
    ],
  },
  {
    key: 'sales', title: 'Sales & Customers', items: [
      { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, badge: 'toProcess', alert: true, perm: 'orders' },
      { to: '/admin/returns', label: 'Returns', icon: RotateCcw, badge: 'returnsPending', alert: true, perm: 'returns' },
      { to: '/admin/abandoned', label: 'Abandoned Checkouts', icon: ShoppingCart, badge: 'abandoned', perm: 'orders' },
      { to: '/admin/customers', label: 'Customers', icon: Users, badge: 'customers', perm: 'customers' },
    ],
  },
  {
    key: 'marketing', title: 'Marketing', items: [
      { to: '/admin/coupons', label: 'Coupons', icon: TicketPercent, badge: 'couponsExpiring', alert: true, perm: 'coupons' },
      { to: '/admin/referrals', label: 'Referrals & Credits', icon: Gift, perm: 'customers' },
      { to: '/admin/content', label: 'Homepage & Banners', icon: LayoutTemplate, perm: 'content' },
      { to: '/admin/campaign', label: 'Campaign', icon: Megaphone, perm: 'campaign' },
      { to: '/admin/subscribers', label: 'Subscribers', icon: MailPlus, perm: 'campaign' },
    ],
  },
  {
    key: 'controls', title: 'Admin Controls', items: [
      { to: '/admin/users', label: 'Users', icon: UserPlus, perm: 'team' },
      { to: '/admin/roles', label: 'Roles', icon: ShieldCheck, perm: 'team' },
      { to: '/admin/activity', label: 'Activity Log', icon: History, perm: 'activity' },
    ],
  },
];

// Which permission each admin page needs (the server enforces the same).
const PAGE_PERMS = [
  ['/admin/products', 'products'], ['/admin/categories', 'categories'], ['/admin/reviews', 'reviews'],
  ['/admin/orders', 'orders'], ['/admin/customers', 'customers'], ['/admin/referrals', 'customers'], ['/admin/campaign', 'campaign'],
  ['/admin/users', 'team'], ['/admin/roles', 'team'], ['/admin/activity', 'activity'], ['/admin/settings', 'settings'],
  ['/admin/returns', 'returns'], ['/admin/coupons', 'coupons'], ['/admin/pincodes', 'settings'], ['/admin/reports', 'reports'],
  ['/admin/abandoned', 'orders'], ['/admin/content', 'content'], ['/admin/subscribers', 'campaign'],
];
const permFor = (path) => (path === '/admin' || path === '/admin/' ? 'stats' : PAGE_PERMS.find(([p]) => path.startsWith(p))?.[1]);

function NoAccess({ firstAllowed }) {
  return (
    <div className="mx-auto mt-16 flex max-w-[460px] flex-col items-center rounded-[18px] border border-[var(--admin-border-2)] bg-[var(--admin-surface)] px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]"><Lock size={24} /></span>
      <p className="m-0 mt-4 font-['Bricolage_Grotesque','Inter',sans-serif] text-[20px] font-bold">No access to this page</p>
      <p className="m-0 mt-1 text-[14px] text-[var(--admin-text-muted)]">Your role doesn't include it. Ask a Super Admin if you need access.</p>
      {firstAllowed && <NavLink to={firstAllowed} className="mt-5 rounded-[12px] bg-[var(--admin-accent)] px-5 py-2.5 text-[15px] font-semibold text-white no-underline">Go to {GROUPS.flatMap((g) => g.items).find((i) => i.to === firstAllowed)?.label || 'dashboard'}</NavLink>}
    </div>
  );
}

const readJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };

function NavItem({ to, label, icon: Icon, end, count, alert, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) => `group/nav relative flex items-center gap-3.5 rounded-[12px] px-3.5 py-[11px] text-[15px] font-semibold no-underline transition-[background-color,color] duration-200 ${isActive ? 'bg-[var(--admin-active-bg)] text-[var(--admin-active-text)]' : 'text-[var(--admin-text)] hover:bg-[var(--admin-hover-3)]'}`}
    >
      {({ isActive }) => (
        <>
          <Icon size={20} strokeWidth={1.7} className={`shrink-0 transition-transform duration-300 group-hover/nav:scale-110 ${isActive ? 'text-[var(--admin-active-icon)]' : 'text-[var(--admin-text-muted)]'}`} />
          <span className="flex-1 truncate">{label}</span>
          {count != null && count > 0 && (
            <span className={`rounded-[8px] border px-2 py-0.5 text-[12px] font-bold tabular-nums ${alert ? 'border-[var(--admin-accent)]/40 bg-[var(--admin-accent-soft)] text-[var(--tone-pink)]' : 'border-[var(--tone-green)]/35 bg-[var(--tone-green)]/10 text-[var(--tone-green)]'}`}>
              {count}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const { pathname, search: query } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('zunuz_admin_theme') || 'dark');
  const [collapsed, setCollapsed] = useState(() => readJSON('zunuz_admin_groups', {}));
  const [badges, setBadges] = useState({});
  const [q, setQ] = useState('');
  const searchRef = useRef(null);
  const [me, setMe] = useState(() => readJSON('zunuz_admin_user', {}));
  const admin = me;
  // Permissions from the last login until /me answers (then always fresh).
  const perms = Array.isArray(me.permissions) ? me.permissions : null;
  const can = (key) => !key || !perms || perms.includes(key);

  useEffect(() => { localStorage.setItem('zunuz_admin_theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('zunuz_admin_groups', JSON.stringify(collapsed)); }, [collapsed]);

  // Who am I / what may I do — refreshed on every page change so role edits apply quickly.
  useEffect(() => {
    api.get('/admin/auth/me', true).then((m) => {
      setMe(m);
      try { localStorage.setItem('zunuz_admin_user', JSON.stringify({ id: m.id, name: m.name, email: m.email, role: m.role, permissions: m.permissions })); } catch { /* ignore */ }
    }).catch(() => { /* 401 → api.js sends to login */ });
  }, [pathname]);

  // Badge counts — refreshed on every page change (cheap counts).
  const loadBadges = useCallback(() => { api.get('/admin/stats/badges', true).then(setBadges).catch(() => {}); }, []);
  useEffect(() => { loadBadges(); }, [pathname, loadBadges]);
  // Pages fire this after approving / resolving things so counts update at once.
  useEffect(() => {
    window.addEventListener('zunuz:admin-badges', loadBadges);
    return () => window.removeEventListener('zunuz:admin-badges', loadBadges);
  }, [loadBadges]);

  // Ctrl/⌘+K focuses search.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('zunuz_admin_token');
    localStorage.removeItem('zunuz_admin_user');
    navigate('/admin/login');
  };
  const submitSearch = (e) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/admin/products?search=${encodeURIComponent(term)}` : '/admin/products');
  };
  const close = () => setSidebarOpen(false);

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col overflow-y-auto px-4 py-6 [scrollbar-width:thin]">
      {can('stats') && <NavItem to="/admin" end label="Statistics" icon={BarChart3} onClick={close} />}
      {GROUPS.map((g) => ({ ...g, items: g.items.filter((it) => can(it.perm)) })).filter((g) => g.items.length).map((g) => {
        const isCollapsed = !!collapsed[g.key];
        return (
          <div key={g.key} className="mt-7">
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [g.key]: !c[g.key] }))}
              aria-expanded={!isCollapsed}
              className="mb-2 flex w-full cursor-pointer items-center justify-between rounded-[8px] border-0 bg-transparent px-2.5 py-1 text-left text-[15px] font-medium text-[var(--admin-text-muted)] transition-colors hover:text-[var(--admin-text)]"
            >
              {g.title}
              <ChevronUp size={17} className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
            </button>
            <div className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
              <div className="flex flex-col gap-1 overflow-hidden">
                {g.items.map((it) => (
                  <NavItem key={it.to} {...it} count={it.badge ? badges[it.badge] : null} onClick={close} />
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <div className="mt-auto pt-8">
        {can('settings') && <div className="mb-2"><NavItem to="/admin/settings" label="Settings" icon={SlidersHorizontal} onClick={close} /></div>}
        <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3.5 rounded-[12px] px-3.5 py-[11px] text-[15px] font-semibold text-[var(--admin-text-muted)] no-underline transition-colors hover:bg-[var(--admin-hover-3)] hover:text-[var(--admin-text)]">
          <ExternalLink size={19} strokeWidth={1.7} /> View store
        </a>
        <button type="button" onClick={handleLogout} className="flex w-full cursor-pointer items-center gap-3.5 rounded-[12px] border-0 bg-transparent px-3.5 py-[11px] text-left text-[15px] font-semibold text-[var(--tone-red)] transition-colors hover:bg-[var(--tone-red)]/10">
          <LogOut size={19} strokeWidth={1.7} /> Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div data-theme={theme} className="flex h-dvh flex-col overflow-hidden bg-[var(--admin-bg)] font-['Inter',sans-serif] text-[var(--admin-text)]">
      <Seo title="Admin" path="/admin" noindex />

      {/* ── Top bar ── */}
      <header className="relative z-30 flex h-[76px] shrink-0 items-center gap-3 border-b border-[var(--admin-border-2)] bg-[var(--admin-sidebar)] px-5 max-[768px]:h-16 max-[768px]:px-3">
        <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="hidden size-10 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-transparent text-[var(--admin-text-muted)] max-[768px]:flex">
          <Menu size={22} />
        </button>
        <button type="button" onClick={() => navigate(-1)} aria-label="Go back" className="flex size-10 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-transparent text-[var(--admin-text-muted)] transition-colors hover:bg-[var(--admin-hover-3)] hover:text-[var(--admin-text)] max-[768px]:hidden">
          <ChevronLeft size={22} />
        </button>
        <NavLink to="/admin" className="flex flex-col no-underline">
          <span className="bg-[linear-gradient(90deg,#FF3D8B,#F6C915)] bg-clip-text font-['Qrokinex','Syncopate',sans-serif] text-[30px] leading-none text-transparent max-[768px]:text-[24px]">ZUNUZ</span>
          <span className="mt-1 text-[10px] font-bold tracking-[0.22em] text-[var(--admin-text-muted)]">ADMIN PANEL</span>
        </NavLink>

        <div className="flex-1" />

        {can('products') && <form onSubmit={submitSearch} role="search" className="relative w-[min(320px,32vw)] max-[640px]:hidden">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--admin-text-muted)]" />
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products"
            aria-label="Search products"
            className="h-11 w-full rounded-[12px] border border-[var(--admin-border-4)] bg-transparent pr-14 pl-11 text-[15px] text-[var(--admin-text)] outline-none transition-colors placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)]"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-[6px] border border-[var(--admin-border-3)] px-1.5 py-0.5 font-['Inter',sans-serif] text-[11px] text-[var(--admin-text-muted)]">Ctrl K</kbd>
        </form>}

        <NotificationBell adminId={admin.id} />

        <button
          type="button"
          onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex size-11 cursor-pointer items-center justify-center rounded-[12px] border border-[var(--admin-border-3)] bg-transparent text-[var(--admin-text-muted)] transition-[color,rotate] duration-500 hover:rotate-45 hover:text-[var(--admin-text)]"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account"
            className="flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--admin-text)] text-[17px] font-bold text-[var(--admin-bg)] transition-transform hover:scale-105"
          >
            {(admin.name || admin.email || 'A')[0].toUpperCase()}
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div role="menu" className="absolute top-[calc(100%+10px)] right-0 z-20 w-64 overflow-hidden rounded-[16px] border border-[var(--admin-border-3)] bg-[var(--admin-surface)] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.6)] animate-[jw-rise_0.25s_cubic-bezier(0.16,1,0.3,1)_both]">
                <div className="border-b border-[var(--admin-border-2)] px-4 py-3.5">
                  <p className="m-0 truncate text-[15px] font-semibold">{admin.name || 'Admin'}</p>
                  <p className="m-0 truncate text-[13px] text-[var(--admin-text-muted)]">{admin.email || ''}</p>
                  {admin.role?.name && <span className="mt-2 inline-flex rounded-full bg-[var(--admin-accent-soft)] px-2.5 py-0.5 text-[12px] font-bold text-[var(--tone-pink)]">{admin.role.name}</span>}
                </div>
                <button type="button" role="menuitem" onClick={handleLogout} className="flex w-full cursor-pointer items-center gap-2.5 border-0 bg-transparent px-4 py-3 text-left text-[14px] font-semibold text-[var(--tone-red)] hover:bg-[var(--admin-hover-3)]">
                  <LogOut size={17} /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Sidebar (desktop) ── */}
        <aside className="w-[290px] shrink-0 border-r border-[var(--admin-border-2)] bg-[var(--admin-sidebar)] max-[768px]:hidden">{sidebar}</aside>

        {/* ── Sidebar (mobile drawer) ── */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 min-[769px]:hidden">
            <div onClick={close} className="absolute inset-0 bg-black/60 animate-[jw-rise_0.2s_ease-out_both]" />
            <aside className="absolute top-0 bottom-0 left-0 flex w-[290px] max-w-[85vw] flex-col bg-[var(--admin-sidebar)] shadow-2xl animate-[admin-slide_0.35s_cubic-bezier(0.16,1,0.3,1)_both]">
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--admin-border-2)] px-5">
                <span className="bg-[linear-gradient(90deg,#FF3D8B,#F6C915)] bg-clip-text font-['Qrokinex','Syncopate',sans-serif] text-[22px] leading-none text-transparent">ZUNUZ</span>
                <button type="button" onClick={close} aria-label="Close menu" className="flex size-9 cursor-pointer items-center justify-center rounded-full border-0 bg-[var(--admin-hover-3)] text-[var(--admin-text)]"><X size={18} /></button>
              </div>
              <div className="min-h-0 flex-1">{sidebar}</div>
            </aside>
          </div>
        )}

        {/* ── Page ── */}
        <main className="min-w-0 flex-1 overflow-auto px-[clamp(16px,3vw,40px)] pt-[clamp(20px,3vw,36px)] pb-12">
          {/* Opacity-only page fade: a transform animation here would make
              it the containing block for the pages' fixed-position modals. */}
          <div key={pathname + query} className="animate-[admin-fade_0.35s_ease-out_both]">
            {can(permFor(pathname))
              ? <Outlet context={{ refreshBadges: loadBadges, me }} />
              : <NoAccess firstAllowed={[...(can('stats') ? ['/admin'] : []), ...GROUPS.flatMap((g) => g.items).filter((i) => can(i.perm)).map((i) => i.to)][0]} />}
          </div>
        </main>
      </div>
    </div>
  );
}
