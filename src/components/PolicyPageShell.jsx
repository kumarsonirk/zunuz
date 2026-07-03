import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function PolicyPageShell({ title, backTo = '/customer-care', children }) {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col bg-[#1F2024] text-[#F5F2EB] overflow-y-auto scrollbar-none" style={{ fontFamily: "'Grift', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, background: '#1F2024', zIndex: 1 }}>
        <button onClick={() => navigate(backTo)} style={{ background: 'none', border: 'none', color: '#F5F2EB', cursor: 'pointer', display: 'flex', padding: '4px' }}>
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>
        <h2 style={{ fontSize: '17px', fontWeight: 500, color: '#F5F2EB', letterSpacing: '0.02em' }}>{title}</h2>
      </div>

      <div style={{ padding: '24px 20px 48px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {children || (
          <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#71717A' }}>Content coming soon.</p>
        )}
      </div>
    </div>
  );
}
