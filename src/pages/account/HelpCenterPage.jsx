import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Mail, Phone, Clock } from 'lucide-react';

const CONTACT_ITEMS = [
  {
    icon: Mail,
    label: 'Email',
    value: 'zunuzofficial@gmail.com',
    href: 'mailto:zunuzofficial@gmail.com',
  },
  {
    icon: Phone,
    label: 'Call / WhatsApp',
    value: '+91 XXXXXXXXXX',
    href: null,
  },
  {
    icon: Clock,
    label: 'Support Hours',
    value: 'Mon–Sat, 10 AM – 6 PM IST',
    href: null,
  },
];

export default function HelpCenterPage() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col bg-[#1F2024] text-[#F5F2EB] overflow-y-auto scrollbar-none" style={{ fontFamily: "'Grift', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, background: '#1F2024', zIndex: 1 }}>
        <button onClick={() => navigate('/account')} style={{ background: 'none', border: 'none', color: '#F5F2EB', cursor: 'pointer', display: 'flex', padding: '4px' }}>
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>
        <h2 style={{ fontSize: '17px', fontWeight: 500, color: '#F5F2EB', letterSpacing: '0.02em' }}>Help Center</h2>
      </div>

      <div style={{ padding: '24px 20px 48px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#A1A1AA' }}>
          We're here to help. Reach out to us anytime — our team is always happy to assist.
        </p>

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
          {CONTACT_ITEMS.map((item, i) => {
            const Content = (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                  background: 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <item.icon size={17} strokeWidth={1.5} color="#A1A1AA" />
                </div>
                <div>
                  <p style={{ fontSize: '11px', color: '#71717A', letterSpacing: '0.04em', marginBottom: '3px' }}>{item.label.toUpperCase()}</p>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#F5F2EB' }}>{item.value}</p>
                </div>
              </div>
            );
            return (
              <React.Fragment key={item.label}>
                {item.href ? (
                  <a href={item.href} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>{Content}</a>
                ) : Content}
                {i < CONTACT_ITEMS.length - 1 && <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 20px' }} />}
              </React.Fragment>
            );
          })}
        </div>

        <p style={{ fontSize: '13px', lineHeight: 1.7, color: '#71717A' }}>
          Thank you for choosing ZUNUZ. We'll do our best to respond as quickly as possible.
        </p>
      </div>
    </div>
  );
}
