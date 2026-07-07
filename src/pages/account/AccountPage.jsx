import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, ShoppingBag, ChevronRight, LogOut, FileText, Shield, Headphones, Phone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ROW = ({ icon: Icon, label, sublabel, onClick, danger }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '16px 20px', background: 'none', border: 'none',
      width: '100%', textAlign: 'left', cursor: 'pointer',
      color: danger ? '#EF4444' : '#F5F2EB',
      fontFamily: "'Grift', sans-serif",
    }}
    onTouchStart={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
    onTouchEnd={e => e.currentTarget.style.background = 'none'}
  >
    <div style={{
      width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
      background: danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={17} strokeWidth={1.5} color={danger ? '#EF4444' : '#A1A1AA'} />
    </div>
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: '14px', fontWeight: 500, color: danger ? '#EF4444' : '#F5F2EB', lineHeight: 1 }}>{label}</p>
      {sublabel && <p style={{ fontSize: '12px', color: '#A1A1AA', marginTop: '3px' }}>{sublabel}</p>}
    </div>
    {!danger && <ChevronRight size={16} strokeWidth={1.5} color="#52525B" />}
  </button>
);

const Divider = () => (
  <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 20px' }} />
);

export default function AccountPage() {
  const { customer, loading, logout } = useAuth();
  const navigate = useNavigate();

  const initials = customer?.name
    ? customer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Wait for the initial /customers/me check before deciding logged-in vs logged-out —
  // otherwise a refresh briefly renders the "not logged in" view before flipping to
  // the real account, since `customer` starts as null until that fetch resolves.
  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-[#1F2024] text-[#F5F2EB] overflow-y-auto scrollbar-none" style={{ fontFamily: "'Grift', sans-serif" }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 500 }}>Account</h2>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex-1 flex flex-col bg-[#1F2024] text-[#F5F2EB] overflow-y-auto scrollbar-none" style={{ fontFamily: "'Grift', sans-serif" }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 500 }}>Account</h2>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', gap: '12px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
            <User size={28} strokeWidth={1} color="#52525B" />
          </div>
          <h3 style={{ fontSize: '17px', fontWeight: 500, textAlign: 'center' }}>You're not logged in</h3>
          <p style={{ fontSize: '13px', color: '#71717A', textAlign: 'center', lineHeight: 1.5 }}>Sign in to view your profile, orders & saved addresses.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '12px' }}>
            <button onClick={() => navigate('/login')} className="btn-buy-now" style={{ height: '48px', borderRadius: '12px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              Sign In
            </button>
            <button onClick={() => navigate('/signup')} style={{ height: '48px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#F5F2EB', fontSize: '14px', cursor: 'pointer', fontFamily: "'Grift', sans-serif", fontWeight: 500 }}>
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#1F2024] text-[#F5F2EB] overflow-y-auto scrollbar-none" style={{ fontFamily: "'Grift', sans-serif" }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 500 }}>Account</h2>
      </div>

      {/* Profile Summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px 24px 20px' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #FC4B4E 0%, #c0392b 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', fontWeight: 700, color: 'white', letterSpacing: '0.05em',
          fontFamily: "'Grift', sans-serif",
        }}>
          {initials}
        </div>
        <div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#F5F2EB', lineHeight: 1.2 }}>{customer.name}</p>
          <p style={{ fontSize: '13px', color: '#A1A1AA', marginTop: '3px' }}>{customer.email}</p>
          {customer.phone && <p style={{ fontSize: '12px', color: '#A1A1AA', marginTop: '2px' }}>{customer.phone}</p>}
        </div>
      </div>

      {/* Main Menu */}
      <div style={{ margin: '0 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
        <ROW icon={User} label="Edit Profile" sublabel="Update name, phone & password" onClick={() => navigate('/account/profile')} />
        <Divider />
        <ROW icon={MapPin} label="Saved Addresses" sublabel="Manage delivery addresses" onClick={() => navigate('/account/addresses')} />
        <Divider />
        <ROW icon={ShoppingBag} label="My Orders" sublabel="View order history & tracking" onClick={() => navigate('/account/orders')} />
      </div>

      {/* Legal */}
      <div style={{ margin: '12px 16px 0', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
        <ROW icon={Headphones} label="Customer Care" onClick={() => navigate('/customer-care')} />
        <Divider />
        <ROW icon={FileText} label="Terms & Conditions" onClick={() => navigate('/terms')} />
        <Divider />
        <ROW icon={Shield} label="Privacy Policy" onClick={() => navigate('/privacy')} />
        <Divider />
        <ROW icon={Phone} label="Help Center" onClick={() => navigate('/account/help-center')} />
      </div>

      {/* Logout */}
      <div style={{ margin: '12px 16px 24px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '16px', overflow: 'hidden' }}>
        <ROW icon={LogOut} label="Sign Out" onClick={handleLogout} danger />
      </div>
    </div>
  );
}
