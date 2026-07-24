import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import Price from './Price';

export default function OrderSuccessOverlay({ isOpen, order, onContinue }) {
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setAnimate(true), 80);
      return () => clearTimeout(t);
    } else {
      setAnimate(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleViewOrders = () => {
    onContinue?.();
    navigate('/account/orders');
  };

  const handleContinue = () => {
    onContinue?.();
    navigate('/');
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: '#1F2024',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '32px 28px',
        fontFamily: "'Grift', sans-serif",
        opacity: animate ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      {/* Animated checkmark */}
      <div style={{ position: 'relative', width: '100px', height: '100px', marginBottom: '32px' }}>
        <svg viewBox="0 0 100 100" width="100" height="100">
          {/* Circle */}
          <circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke="rgba(252,75,78,0.15)"
            strokeWidth="4"
          />
          <circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke="#FC4B4E"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="276.46"
            strokeDashoffset={animate ? 0 : 276.46}
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)' }}
          />
          {/* Checkmark */}
          <polyline
            points="28,52 43,67 72,36"
            fill="none"
            stroke="#FC4B4E"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="60"
            strokeDashoffset={animate ? 0 : 60}
            style={{ transition: 'stroke-dashoffset 0.4s cubic-bezier(0.4,0,0.2,1) 0.55s' }}
          />
        </svg>
      </div>

      {/* Heading */}
      <div
        style={{
          textAlign: 'center', marginBottom: '32px',
          opacity: animate ? 1 : 0,
          transform: animate ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.4s ease 0.8s, transform 0.4s ease 0.8s',
        }}
      >
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#F5F2EB', letterSpacing: '-0.02em', fontFamily: "'Qrokinex', sans-serif", marginBottom: '8px' }}>
          Order Placed!
        </h2>
        <p style={{ fontSize: '14px', color: '#71717A', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
          {order?.paymentMethod === 'COD' || order?.status === 'PENDING'
            ? 'Your order is pending admin approval.\nYou will receive an email once it is confirmed.'
            : 'Your order has been confirmed and\nwill be delivered soon.'}
        </p>
        {order?.id && (
          <p style={{ fontSize: '12px', color: '#52525B', marginTop: '6px', letterSpacing: '0.06em' }}>
            ORDER #{String(order.id).padStart(4, '0')}
          </p>
        )}
      </div>

      {/* Order summary card */}
      {order && (
        <div
          style={{
            width: '100%', maxWidth: '360px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '18px', padding: '16px',
            marginBottom: '32px',
            opacity: animate ? 1 : 0,
            transform: animate ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.4s ease 1s, transform 0.4s ease 1s',
          }}
        >
          {/* Items preview */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {order.items?.slice(0, 3).map(item => (
              <div key={item.id} style={{ width: '48px', height: '48px', background: '#fff', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
                <img src={item.product?.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
            ))}
            {order.items?.length > 3 && (
              <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717A', fontSize: '12px', fontWeight: 600 }}>
                +{order.items.length - 3}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#71717A' }}>{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</p>
              {order.address && (
                <p style={{ fontSize: '11px', color: '#52525B', marginTop: '2px' }}>
                  {order.address.city}, {order.address.state}
                </p>
              )}
            </div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#F5F2EB' }}>
              <Price value={`₹${order.total?.toLocaleString()}`} />
            </p>
          </div>

          {order.paymentMethod && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '12px', background: order.paymentMethod === 'RAZORPAY' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${order.paymentMethod === 'RAZORPAY' ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`, borderRadius: '20px', padding: '4px 10px' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: order.paymentMethod === 'RAZORPAY' ? '#22C55E' : '#F59E0B' }} />
              <span style={{ fontSize: '10px', fontWeight: 600, color: order.paymentMethod === 'RAZORPAY' ? '#22C55E' : '#F59E0B', letterSpacing: '0.05em' }}>
                {order.paymentMethod === 'RAZORPAY' ? 'Paid Online' : 'COD (Pending Approval)'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Buttons */}
      <div
        style={{
          display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '360px',
          opacity: animate ? 1 : 0,
          transition: 'opacity 0.4s ease 1.1s',
        }}
      >
        <button
          onClick={handleViewOrders}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '52px', borderRadius: '14px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Grift', sans-serif", background: 'linear-gradient(135deg, #FC4B4E 0%, #c0392b 100%)', color: 'white' }}
        >
          <ShoppingBag size={16} strokeWidth={1.5} /> View My Orders
        </button>
        <button
          onClick={handleContinue}
          style={{ height: '48px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#A1A1AA', fontSize: '14px', cursor: 'pointer', fontFamily: "'Grift', sans-serif" }}
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
}
