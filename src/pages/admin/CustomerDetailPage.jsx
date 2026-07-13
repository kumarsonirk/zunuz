import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, ShoppingBag } from 'lucide-react';
import { api } from '../../utils/api';
import Price from '../../components/Price';

const STATUS_STYLE = {
  PENDING:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  CONFIRMED: { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
  SHIPPED:   { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  DELIVERED: { color: '#22C55E', bg: 'rgba(34,197,94,0.12)'   },
  CANCELLED: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
};

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/customers/${id}`, true)
      .then(setCustomer)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const totalSpent = (customer?.orders || []).reduce((s, o) => s + o.total, 0);

  return (
    <div style={{ maxWidth: '1200px' }}>
      <button
        onClick={() => navigate('/admin/customers')}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--admin-text-muted)', fontSize: '13px', cursor: 'pointer', marginBottom: '16px', padding: 0 }}
      >
        <ArrowLeft size={16} /> Back to Customers
      </button>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>Loading...</div>
      ) : error || !customer ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>{error || 'Customer not found.'}</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #FC4B4E, #7f1d1e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 700, flexShrink: 0 }}>
              {customer.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 style={{ color: 'var(--admin-text)', fontSize: '24px', fontWeight: 600 }}>{customer.name}</h1>
              <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px', marginTop: '4px' }}>
                {customer.phone ? `+91 ${customer.phone}` : 'No phone'}{customer.email ? ` · ${customer.email}` : ''}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
            <StatCard label="Orders" value={customer.orders?.length || 0} />
            <StatCard label="Total Spent" value={<Price value={`₹${totalSpent.toLocaleString()}`} />} color="#22C55E" />
            <StatCard label="Saved Addresses" value={customer.addresses?.length || 0} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '20px', alignItems: 'start' }}>
            {/* Addresses */}
            <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-2)', borderRadius: '16px', padding: '20px' }}>
              <p style={{ color: 'var(--admin-text-muted)', fontSize: '12px', letterSpacing: '0.08em', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={12} /> SAVED ADDRESSES ({customer.addresses?.length || 0})
              </p>
              {(customer.addresses || []).length === 0 ? (
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px' }}>No addresses saved.</p>
              ) : (customer.addresses || []).map(addr => (
                <div key={addr.id} style={{ background: 'var(--admin-surface-2)', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px', border: addr.isDefault ? '1px solid rgba(252,75,78,0.2)' : '1px solid transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--admin-text-muted)', fontSize: '12px', fontWeight: 600 }}>{addr.label}</span>
                    {addr.isDefault && <span style={{ color: '#FC4B4E', fontSize: '10px', fontWeight: 600 }}>DEFAULT</span>}
                  </div>
                  {addr.name && (
                    <p style={{ color: 'var(--admin-text)', fontSize: '13px', fontWeight: 600 }}>
                      {addr.name}{addr.phone && ` · +91 ${addr.phone}`}
                    </p>
                  )}
                  <p style={{ color: 'var(--admin-text)', fontSize: '13px', lineHeight: '1.5' }}>
                    {addr.houseNo ? `${addr.houseNo}, ` : ''}{addr.street}{addr.landmark ? ` (Near ${addr.landmark})` : ''}, {addr.city}, {addr.state} - {addr.pincode}
                  </p>
                </div>
              ))}
            </div>

            {/* Orders */}
            <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-2)', borderRadius: '16px', padding: '20px' }}>
              <p style={{ color: 'var(--admin-text-muted)', fontSize: '12px', letterSpacing: '0.08em', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShoppingBag size={12} /> ORDERS ({customer.orders?.length || 0})
              </p>
              {(customer.orders || []).length === 0 ? (
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px' }}>No confirmed orders yet.</p>
              ) : (customer.orders || []).map(order => {
                const s = STATUS_STYLE[order.status] || STATUS_STYLE.PENDING;
                return (
                  <div key={order.id} style={{ background: 'var(--admin-surface-2)', borderRadius: '10px', padding: '14px 16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ color: 'var(--admin-text)', fontSize: '13px', fontWeight: 500 }}>Order #{order.id}</p>
                      <p style={{ color: 'var(--admin-text-muted)', fontSize: '12px', marginTop: '2px' }}>
                        {order.items?.length} item{order.items?.length !== 1 ? 's' : ''} · {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {order.paymentMethod === 'COD' ? 'COD' : 'Razorpay'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ color: 'var(--admin-text)', fontSize: '13px', fontWeight: 600 }}><Price value={`₹${order.total?.toLocaleString()}`} /></p>
                      <span style={{ background: s.bg, color: s.color, borderRadius: '5px', padding: '2px 8px', fontSize: '10px', fontWeight: 600 }}>{order.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color = 'var(--admin-text)' }) {
  return (
    <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-2)', borderRadius: '16px', padding: '18px 20px' }}>
      <p style={{ color: 'var(--admin-text-muted)', fontSize: '12px', letterSpacing: '0.08em', marginBottom: '8px' }}>{label.toUpperCase()}</p>
      <p style={{ color, fontSize: '22px', fontWeight: 700 }}>{value}</p>
    </div>
  );
}
