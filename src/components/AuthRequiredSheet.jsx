import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock } from 'lucide-react';

export default function AuthRequiredSheet({ isOpen, onClose, onNavigate }) {
  const navigate = useNavigate();

  const go = (path) => { onClose(); onNavigate?.(); navigate(path); };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)',
          transition: 'opacity 0.25s',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      />
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          maxWidth: '512px', margin: '0 auto',
          zIndex: 61,
          background: '#1F2024',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '24px 24px 0 0',
          padding: '12px 24px 40px',
          transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.25s',
          transform: isOpen ? 'translateY(0)' : 'translateY(110%)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          fontFamily: "'Grift', sans-serif",
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '20px', background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', display: 'flex' }}
        >
          <X size={18} strokeWidth={1.5} />
        </button>

        {/* Icon */}
        <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(252,75,78,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          <Lock size={22} strokeWidth={1.5} color="#FC4B4E" />
        </div>

        <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#F5F2EB', marginBottom: '8px', fontFamily: "'Qrokinex', sans-serif" }}>
          Login to continue
        </h3>
        <p style={{ fontSize: '13px', color: '#71717A', lineHeight: 1.6, marginBottom: '24px' }}>
          You need to be signed in to place your order. It only takes a few seconds.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => go('/login')}
            className="btn-buy-now"
            style={{ height: '52px', borderRadius: '14px', border: 'none', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
          >
            Sign In
          </button>
          <button
            onClick={() => go('/signup')}
            style={{ height: '48px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#F5F2EB', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: "'Grift', sans-serif" }}
          >
            Create Account
          </button>
        </div>
      </div>
    </>
  );
}
