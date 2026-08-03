import React from 'react';

export default function MaintenancePage() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1F2024',
        color: '#F5F2EB',
        padding: '32px',
        textAlign: 'center',
        fontFamily: "'Grift', sans-serif",
      }}
    >
      <img
        src="/logo_white.png"
        alt="ZUNUZ"
        style={{ width: '160px', height: 'auto', marginBottom: '32px' }}
      />
      <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '12px', letterSpacing: '0.02em' }}>
        We'll be right back
      </h1>
      <p style={{ fontSize: '15px', color: '#A1A1AA', lineHeight: 1.6, maxWidth: '380px' }}>
        ZUNUZ is currently undergoing scheduled maintenance. We're working hard to improve your experience and will be back online shortly.
      </p>
      <p style={{ fontSize: '13px', color: '#71717A', marginTop: '24px' }}>
        Thank you for your patience.
      </p>
    </div>
  );
}
