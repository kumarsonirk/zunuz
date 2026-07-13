import React, { useEffect, useState, useCallback } from 'react';
import { ShoppingBag, X, ChevronDown } from 'lucide-react';
import { api } from '../../utils/api';
import Price from '../../components/Price';

const STATUSES = ['ALL', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const STATUS_STYLE = {
  PENDING:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  CONFIRMED: { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)'  },
  SHIPPED:   { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  DELIVERED: { color: '#22C55E', bg: 'rgba(34,197,94,0.12)'   },
  CANCELLED: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.PENDING;
  return <span style={{ background: s.bg, color: s.color, borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{status}</span>;
}

const PAYMENT_STATUS_STYLE = {
  PAID:    { color: '#22C55E', bg: 'rgba(34,197,94,0.12)'  },
  PENDING: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  FAILED:  { color: '#EF4444', bg: 'rgba(239,68,68,0.12)'  },
};

function PaymentBadge({ order }) {
  const isCod = order.paymentMethod === 'COD';
  const s = PAYMENT_STATUS_STYLE[order.paymentStatus] || PAYMENT_STATUS_STYLE.PENDING;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <span style={{ color: 'var(--admin-text-muted)', fontSize: '11px', fontWeight: 500 }}>{isCod ? 'COD' : 'Razorpay'}</span>
      <span style={{ background: s.bg, color: s.color, borderRadius: '6px', padding: '2px 8px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em', whiteSpace: 'nowrap', width: 'fit-content' }}>
        {isCod && order.paymentStatus === 'PENDING' ? 'PAY ON DELIVERY' : order.paymentStatus}
      </span>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [detailOrder, setDetailOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page });
      if (activeStatus !== 'ALL') params.set('status', activeStatus);
      const data = await api.get(`/admin/orders?${params}`, true);
      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeStatus, page]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (orderId, status) => {
    setUpdatingId(orderId);
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status }, true);
      load();
      if (detailOrder?.id === orderId) setDetailOrder(prev => ({ ...prev, status }));
    } catch (e) { alert(e.message); }
    finally { setUpdatingId(null); }
  };

  return (
    <div style={{ maxWidth: '1200px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: 'var(--admin-text)', fontSize: '24px', fontWeight: 600 }}>Orders</h1>
        <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px', marginTop: '4px' }}>{total} orders total</p>
      </div>

      {/* Status Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--admin-surface)', borderRadius: '12px', padding: '4px', border: '1px solid var(--admin-border-2)', flexWrap: 'wrap' }}>
        {STATUSES.map(s => (
          <button key={s} onClick={() => { setActiveStatus(s); setPage(1); }}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: activeStatus === s ? 600 : 400, cursor: 'pointer', letterSpacing: '0.04em', background: activeStatus === s ? (STATUS_STYLE[s]?.bg || 'rgba(252,75,78,0.15)') : 'transparent', color: activeStatus === s ? (STATUS_STYLE[s]?.color || '#FC4B4E') : 'var(--admin-text-muted)', transition: 'all 0.15s' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-2)', borderRadius: '16px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>Loading...</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <ShoppingBag size={40} style={{ color: 'var(--admin-text-faint)', marginBottom: '12px' }} />
            <p style={{ color: 'var(--admin-text-muted)', fontSize: '14px' }}>No orders found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border-1)' }}>
                  {['ID', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date', 'Update Status'].map(h => (
                    <th key={h} style={{ padding: '12px 20px', textAlign: 'left', color: 'var(--admin-text-muted)', fontSize: '12px', letterSpacing: '0.08em', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order, i) => (
                  <tr key={order.id} style={{ borderBottom: i < orders.length - 1 ? '1px solid var(--admin-hover-2)' : 'none', cursor: 'pointer' }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--admin-hover-1)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => setDetailOrder(order)}>
                    <td style={{ padding: '14px 20px', color: 'var(--admin-text-muted)', fontSize: '13px' }}>#{order.id}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ color: 'var(--admin-text)', fontSize: '13px', fontWeight: 500 }}>{order.customer?.name}</div>
                      <div style={{ color: 'var(--admin-text-muted)', fontSize: '12px' }}>{order.customer?.phone || order.customer?.email}</div>
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--admin-text-muted)', fontSize: '13px' }}>{order.items?.length}</td>
                    <td style={{ padding: '14px 20px', color: 'var(--admin-text)', fontSize: '13px', fontWeight: 600 }}><Price value={`₹${order.total?.toLocaleString()}`} /></td>
                    <td style={{ padding: '14px 20px' }}><PaymentBadge order={order} /></td>
                    <td style={{ padding: '14px 20px' }}><StatusBadge status={order.status} /></td>
                    <td style={{ padding: '14px 20px', color: 'var(--admin-text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                    <td style={{ padding: '14px 20px' }} onClick={e => e.stopPropagation()}>
                      <select
                        value={order.status}
                        disabled={updatingId === order.id}
                        onChange={e => updateStatus(order.id, e.target.value)}
                        style={{ background: 'var(--admin-bg)', border: '1px solid var(--admin-border-3)', borderRadius: '8px', padding: '6px 10px', color: 'var(--admin-text)', fontSize: '12px', cursor: 'pointer', outline: 'none' }}>
                        {['PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: 'none', background: page === p ? '#FC4B4E' : 'var(--admin-border-2)', color: page === p ? 'white' : 'var(--admin-text-muted)', cursor: 'pointer', fontSize: '13px' }}>{p}</button>
          ))}
        </div>
      )}

      {/* Order Detail Drawer */}
      {detailOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setDetailOrder(null)}>
          <div style={{ width: '420px', maxWidth: '100vw', background: 'var(--admin-surface)', borderLeft: '1px solid var(--admin-border-2)', height: '100%', overflow: 'auto', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ color: 'var(--admin-text)', fontSize: '16px', fontWeight: 500 }}>Order #{detailOrder.id}</h2>
              <button onClick={() => setDetailOrder(null)} style={{ background: 'none', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: 'var(--admin-surface-2)', borderRadius: '12px', padding: '16px' }}>
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '12px', letterSpacing: '0.08em', marginBottom: '10px' }}>PAYMENT</p>
                <PaymentBadge order={detailOrder} />
                {detailOrder.razorpayPaymentId && (
                  <p style={{ color: 'var(--admin-text-muted)', fontSize: '12px', marginTop: '8px' }}>Payment ID: {detailOrder.razorpayPaymentId}</p>
                )}
              </div>
              <div style={{ background: 'var(--admin-surface-2)', borderRadius: '12px', padding: '16px' }}>
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '12px', letterSpacing: '0.08em', marginBottom: '10px' }}>CUSTOMER</p>
                <p style={{ color: 'var(--admin-text)', fontWeight: 500 }}>{detailOrder.customer?.name}</p>
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px' }}>{detailOrder.customer?.email}</p>
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px' }}>{detailOrder.customer?.phone}</p>
              </div>
              <div style={{ background: 'var(--admin-surface-2)', borderRadius: '12px', padding: '16px' }}>
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '12px', letterSpacing: '0.08em', marginBottom: '10px' }}>DELIVERY ADDRESS</p>
                {detailOrder.address?.name && (
                  <p style={{ color: 'var(--admin-text)', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                    {detailOrder.address.name}{detailOrder.address.phone && ` · +91 ${detailOrder.address.phone}`}
                  </p>
                )}
                <p style={{ color: 'var(--admin-text)', fontSize: '13px', lineHeight: '1.6' }}>
                  {detailOrder.address?.houseNo ? `${detailOrder.address.houseNo}, ` : ''}{detailOrder.address?.street}, {detailOrder.address?.city}<br />
                  {detailOrder.address?.landmark ? `Near ${detailOrder.address.landmark}, ` : ''}{detailOrder.address?.state} - {detailOrder.address?.pincode}
                </p>
              </div>
              <div style={{ background: 'var(--admin-surface-2)', borderRadius: '12px', padding: '16px' }}>
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '12px', letterSpacing: '0.08em', marginBottom: '12px' }}>ITEMS</p>
                {detailOrder.items?.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ width: '36px', height: '36px', background: '#fff', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={item.product?.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: 'var(--admin-text)', fontSize: '13px' }}>{item.product?.name}</p>
                      <p style={{ color: 'var(--admin-text-muted)', fontSize: '12px' }}>Qty: {item.quantity} × <Price value={`₹${item.price}`} /></p>
                    </div>
                    <p style={{ color: 'var(--admin-text)', fontSize: '13px', fontWeight: 600 }}><Price value={`₹${item.quantity * item.price}`} /></p>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--admin-border-2)', marginTop: '12px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--admin-text-muted)', fontSize: '14px' }}>Total</span>
                  <span style={{ color: 'var(--admin-text)', fontWeight: 700, fontSize: '15px' }}><Price value={`₹${detailOrder.total?.toLocaleString()}`} /></span>
                </div>
              </div>
              <div>
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '12px', letterSpacing: '0.08em', marginBottom: '8px' }}>UPDATE STATUS</p>
                <select value={detailOrder.status} onChange={e => updateStatus(detailOrder.id, e.target.value)}
                  style={{ width: '100%', background: 'var(--admin-bg)', border: '1px solid var(--admin-border-3)', borderRadius: '10px', padding: '10px 14px', color: 'var(--admin-text)', fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
                  {['PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
