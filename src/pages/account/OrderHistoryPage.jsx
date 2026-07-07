import React, { useEffect, useState } from 'react';
import { X, Package } from 'lucide-react';
import { api } from '../../utils/api';

const STATUS_STYLE = {
  PENDING:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  label: 'Pending'   },
  CONFIRMED: { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  label: 'Confirmed' },
  SHIPPED:   { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', label: 'Shipped'   },
  DELIVERED: { color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   label: 'Delivered' },
  CANCELLED: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   label: 'Cancelled' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.PENDING;
  return <span style={{ background: s.bg, color: s.color, borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em' }}>{s.label}</span>;
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    api.get('/orders').then(setOrders).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-[#1F2024] text-[#F5F2EB] overflow-y-auto scrollbar-none" style={{ fontFamily: "'Grift', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 500, color: '#F5F2EB' }}>My Orders</h2>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {loading ? (
          <p style={{ color: '#71717A', fontSize: '14px' }}>Loading...</p>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#71717A' }}>
            <Package size={36} strokeWidth={1} style={{ marginBottom: '12px', color: '#3F3F46' }} />
            <p style={{ fontSize: '14px' }}>No orders placed yet.</p>
          </div>
        ) : orders.map(order => (
          <div key={order.id}
            onClick={() => setDetail(order)}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px', cursor: 'pointer' }}
            onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
            onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <p style={{ color: '#F5F2EB', fontSize: '14px', fontWeight: 500 }}>Order #{order.id}</p>
                <p style={{ color: '#A1A1AA', fontSize: '12px', marginTop: '2px' }}>
                  {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            {/* Items preview */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {order.items?.slice(0, 3).map(item => (
                <div key={item.id} style={{ width: '44px', height: '44px', background: '#fff', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                  <img src={item.product?.image} alt={item.product?.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              ))}
              {(order.items?.length || 0) > 3 && (
                <div style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717A', fontSize: '11px', fontWeight: 600 }}>
                  +{order.items.length - 3}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: '#A1A1AA', fontSize: '12px' }}>{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</span>
              <span style={{ color: '#F5F2EB', fontSize: '14px', fontWeight: 600 }}>Rs {order.total?.toLocaleString()}/-</span>
            </div>
          </div>
        ))}
      </div>

      {/* Order Detail Modal */}
      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '512px', margin: '0 auto', background: '#1F2024', borderTop: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px 24px 0 0', padding: '24px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ color: '#F5F2EB', fontSize: '16px', fontWeight: 500 }}>Order #{detail.id}</h3>
                <p style={{ color: '#A1A1AA', fontSize: '12px', marginTop: '3px' }}>
                  {new Date(detail.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <StatusBadge status={detail.status} />
                <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer' }}><X size={18} /></button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Items */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px' }}>
                <p style={{ color: '#71717A', fontSize: '11px', letterSpacing: '0.06em', marginBottom: '12px' }}>ITEMS</p>
                {detail.items?.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ width: '40px', height: '40px', background: '#fff', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={item.product?.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: '#F5F2EB', fontSize: '13px' }}>{item.product?.name}</p>
                      <p style={{ color: '#71717A', fontSize: '11px' }}>Qty: {item.quantity} × Rs {item.price}</p>
                    </div>
                    <p style={{ color: '#F5F2EB', fontSize: '13px', fontWeight: 600 }}>Rs {item.quantity * item.price}</p>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '12px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#A1A1AA', fontSize: '14px' }}>Total</span>
                  <span style={{ color: '#F5F2EB', fontWeight: 700, fontSize: '15px' }}>Rs {detail.total?.toLocaleString()}/-</span>
                </div>
              </div>

              {/* Delivery */}
              {detail.address && (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px' }}>
                  <p style={{ color: '#71717A', fontSize: '11px', letterSpacing: '0.06em', marginBottom: '8px' }}>DELIVERY ADDRESS</p>
                  {detail.address.name && (
                    <p style={{ color: '#F5F2EB', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                      {detail.address.name}{detail.address.phone && ` · +91 ${detail.address.phone}`}
                    </p>
                  )}
                  <p style={{ color: '#F5F2EB', fontSize: '13px', lineHeight: '1.6' }}>
                    {detail.address.houseNo ? `${detail.address.houseNo}, ` : ''}{detail.address.street}<br />
                    {detail.address.landmark ? `Near ${detail.address.landmark}, ` : ''}{detail.address.city}, {detail.address.state} — {detail.address.pincode}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
