import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Truck, RotateCcw, XCircle, Sparkles, HelpCircle } from 'lucide-react';

const ROW = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '16px 20px', background: 'none', border: 'none',
      width: '100%', textAlign: 'left', cursor: 'pointer',
      color: '#F5F2EB', fontFamily: "'Grift', sans-serif",
    }}
    onTouchStart={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
    onTouchEnd={e => e.currentTarget.style.background = 'none'}
  >
    <div style={{
      width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
      background: 'rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={17} strokeWidth={1.5} color="#A1A1AA" />
    </div>
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: '14px', fontWeight: 500, color: '#F5F2EB', lineHeight: 1 }}>{label}</p>
    </div>
    <ChevronRight size={16} strokeWidth={1.5} color="#52525B" />
  </button>
);

const Divider = () => (
  <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 20px' }} />
);

const MENU = [
  { icon: Truck, label: 'Shipping Policy', path: '/customer-care/shipping-policy' },
  { icon: RotateCcw, label: 'Returns & Replacements', path: '/customer-care/returns-replacements' },
  { icon: XCircle, label: 'Cancellation Policy', path: '/customer-care/cancellation-policy' },
  { icon: Sparkles, label: 'Product Care', path: '/customer-care/product-care' },
  { icon: HelpCircle, label: 'FAQ', path: '/customer-care/faq' },
];

export default function CustomerCarePage() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col bg-[#1F2024] text-[#F5F2EB] overflow-y-auto scrollbar-none" style={{ fontFamily: "'Grift', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, background: '#1F2024', zIndex: 1 }}>
        <button onClick={() => navigate('/account')} style={{ background: 'none', border: 'none', color: '#F5F2EB', cursor: 'pointer', display: 'flex', padding: '4px' }}>
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>
        <h2 style={{ fontSize: '17px', fontWeight: 500, color: '#F5F2EB', letterSpacing: '0.02em' }}>Customer Care</h2>
      </div>

      <div style={{ margin: '20px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
        {MENU.map((item, i) => (
          <React.Fragment key={item.path}>
            <ROW icon={item.icon} label={item.label} onClick={() => navigate(item.path)} />
            {i < MENU.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
