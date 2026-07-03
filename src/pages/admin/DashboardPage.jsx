import React, { useEffect, useState } from 'react';
import { TrendingUp, ShoppingBag, Users, Package, Clock, CheckCircle, Truck, XCircle } from 'lucide-react';
import { api } from '../../utils/api';

const STATUS_STYLE = {
  PENDING:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  label: 'Pending'   },
  CONFIRMED: { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  label: 'Confirmed' },
  SHIPPED:   { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', label: 'Shipped'   },
  DELIVERED: { color: '#22C55E', bg: 'rgba(34,197,94,0.12)',   label: 'Delivered' },
  CANCELLED: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   label: 'Cancelled' },
};

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-2)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: 'var(--admin-text-muted)', fontSize: '12px', letterSpacing: '0.08em', marginBottom: '8px' }}>{label}</p>
          <p style={{ color: 'var(--admin-text)', fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em' }}>{value}</p>
        </div>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} style={{ color }} strokeWidth={1.5} />
        </div>
      </div>
      {sub && <p style={{ color: 'var(--admin-text-muted)', fontSize: '12px' }}>{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.PENDING;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/products/stats/summary', true)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: 'var(--admin-text-muted)', fontSize: '14px' }}>Loading dashboard...</div>
    </div>
  );

  return (
    <div style={{ maxWidth: '1200px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ color: 'var(--admin-text)', fontSize: '24px', fontWeight: 600 }}>Dashboard</h1>
        <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px', marginTop: '4px' }}>Welcome back — here's what's happening today.</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <StatCard icon={TrendingUp} label="TOTAL REVENUE"   value={`Rs ${(stats?.totalRevenue || 0).toLocaleString()}/-`} color="#FC4B4E" />
        <StatCard icon={ShoppingBag} label="TOTAL ORDERS"   value={stats?.totalOrders || 0}   color="#3B82F6" />
        <StatCard icon={Users}       label="CUSTOMERS"      value={stats?.totalCustomers || 0} color="#22C55E" />
        <StatCard icon={Package}     label="PRODUCTS"       value={stats?.totalProducts || 0}  color="#A78BFA" />
      </div>

      {/* Recent Orders */}
      <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-2)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--admin-border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: 'var(--admin-text)', fontSize: '15px', fontWeight: 500 }}>Recent Orders</h2>
          <a href="/admin/orders" style={{ color: '#FC4B4E', fontSize: '12px', textDecoration: 'none' }}>View all →</a>
        </div>

        {!stats?.recentOrders?.length ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '13px' }}>No orders yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border-1)' }}>
                  {['Order ID', 'Customer', 'Items', 'Total', 'Status', 'Date'].map(h => (
                    <th key={h} style={{ padding: '12px 24px', textAlign: 'left', color: 'var(--admin-text-muted)', fontSize: '12px', letterSpacing: '0.08em', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order, i) => (
                  <tr key={order.id} style={{ borderBottom: i < stats.recentOrders.length - 1 ? '1px solid var(--admin-hover-2)' : 'none' }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--admin-hover-1)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '14px 24px', color: 'var(--admin-text-muted)', fontSize: '13px' }}>#{order.id}</td>
                    <td style={{ padding: '14px 24px' }}>
                      <div style={{ color: 'var(--admin-text)', fontSize: '13px', fontWeight: 500 }}>{order.customer?.name}</div>
                      <div style={{ color: 'var(--admin-text-muted)', fontSize: '12px' }}>{order.customer?.email}</div>
                    </td>
                    <td style={{ padding: '14px 24px', color: 'var(--admin-text-muted)', fontSize: '13px' }}>{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}</td>
                    <td style={{ padding: '14px 24px', color: 'var(--admin-text)', fontSize: '13px', fontWeight: 600 }}>Rs {order.total?.toLocaleString()}/-</td>
                    <td style={{ padding: '14px 24px' }}><StatusBadge status={order.status} /></td>
                    <td style={{ padding: '14px 24px', color: 'var(--admin-text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
