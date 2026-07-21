import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingBag, Users, Tag, Megaphone, LogOut, Menu, X, ChevronRight, Sun, Moon } from 'lucide-react';

const NAV = [
  { to: '/admin',            label: 'Dashboard',  icon: LayoutDashboard, exact: true },
  { to: '/admin/products',   label: 'Products',   icon: Package },
  { to: '/admin/orders',     label: 'Orders',     icon: ShoppingBag },
  { to: '/admin/customers',  label: 'Customers',  icon: Users },
  { to: '/admin/categories', label: 'Categories', icon: Tag },
  { to: '/admin/campaign',   label: 'Campaign',   icon: Megaphone },
];


export default function AdminLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('zunuz_admin_theme') || 'dark');
  const admin = (() => { try { return JSON.parse(localStorage.getItem('zunuz_admin_user') || '{}'); } catch { return {}; } })();

  useEffect(() => {
    localStorage.setItem('zunuz_admin_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  const handleLogout = () => {
    localStorage.removeItem('zunuz_admin_token');
    localStorage.removeItem('zunuz_admin_user');
    navigate('/admin/login');
  };

  const SidebarContent = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <div style={{ padding: '28px 24px 24px', borderBottom: '1px solid var(--admin-border-1)' }}>
        <img src="/logo_white.png" alt="Zunuz" style={{ height: '24px', filter: theme === 'light' ? 'invert(1)' : 'none' }} />
        <div style={{ color: 'var(--admin-text-faint)', fontSize: '10px', letterSpacing: '0.15em', marginTop: '6px' }}>ADMIN PANEL</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={() => setSidebarOpen(false)}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '11px 14px', borderRadius: '10px', textDecoration: 'none',
              fontSize: '14px', fontWeight: isActive ? 500 : 400, letterSpacing: '0.02em',
              color: isActive ? 'var(--admin-text)' : 'var(--admin-text-muted)',
              background: isActive ? 'rgba(252,75,78,0.12)' : 'transparent',
              transition: 'all 0.15s',
              position: 'relative'
            })}
          >
            {({ isActive }) => (
              <>
                {isActive && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: '3px', height: '20px', background: '#FC4B4E', borderRadius: '0 3px 3px 0' }} />}
                <Icon size={18} strokeWidth={isActive ? 2 : 1.5} style={{ color: isActive ? '#FC4B4E' : 'var(--admin-text-muted)', flexShrink: 0 }} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid var(--admin-border-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '10px', marginBottom: '4px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #FC4B4E, #7f1d1e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
            {(admin.name || 'A')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--admin-text)', fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{admin.name || 'Admin'}</div>
            <div style={{ color: 'var(--admin-text-muted)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{admin.email || ''}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'transparent', border: 'none', color: 'var(--admin-text-muted)', fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(252,75,78,0.08)'; e.currentTarget.style.color = '#FC4B4E'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--admin-text-muted)'; }}
        >
          <LogOut size={16} strokeWidth={1.5} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div data-theme={theme} style={{ display: 'flex', height: '100vh', background: 'var(--admin-bg)', fontFamily: "'Grift', sans-serif", overflow: 'hidden' }}>
      {/* Desktop Sidebar */}
      <aside style={{ width: '240px', background: 'var(--admin-sidebar)', borderRight: '1px solid var(--admin-border-1)', flexShrink: 0, display: 'flex', flexDirection: 'column' }} className="hidden-mobile">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40 }} />
          <aside style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '240px', background: 'var(--admin-sidebar)', borderRight: '1px solid var(--admin-border-1)', zIndex: 50, display: 'flex', flexDirection: 'column' }}>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{ height: '56px', background: 'var(--admin-sidebar)', borderBottom: '1px solid var(--admin-border-1)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '16px', flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }} className="show-mobile">
            <Menu size={20} />
          </button>
          <div style={{ flex: 1 }} />
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'var(--admin-hover-1)', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer' }}
          >
            {theme === 'dark' ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
          </button>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E' }} />
          <span style={{ color: 'var(--admin-text-muted)', fontSize: '12px' }}>Live</span>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto', padding: '24px', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px) + 24px)' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) { .hidden-mobile { display: none !important; } }
        @media (min-width: 769px) { .show-mobile { display: none !important; } }
      `}</style>
    </div>
  );
}
