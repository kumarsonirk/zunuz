import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search } from 'lucide-react';
import { api } from '../../utils/api';
import Price from '../../components/Price';

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page });
      if (search) params.set('search', search);
      const data = await api.get(`/admin/customers?${params}`, true);
      setCustomers(data.customers || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ maxWidth: '1200px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: 'var(--admin-text)', fontSize: '24px', fontWeight: 600 }}>Customers</h1>
        <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px', marginTop: '4px' }}>{total} registered customers</p>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or email..."
            style={{ width: '100%', background: 'var(--admin-surface)', border: '1px solid var(--admin-border-2)', borderRadius: '10px', padding: '10px 14px 10px 36px', color: 'var(--admin-text)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-2)', borderRadius: '16px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>Loading...</div>
        ) : customers.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Users size={40} style={{ color: 'var(--admin-text-faint)', marginBottom: '12px' }} />
            <p style={{ color: 'var(--admin-text-muted)', fontSize: '14px' }}>No customers found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border-1)' }}>
                  {['Customer', 'Phone', 'Orders', 'Total Spent', 'Addresses', 'Joined'].map(h => (
                    <th key={h} style={{ padding: '12px 20px', textAlign: 'left', color: 'var(--admin-text-muted)', fontSize: '12px', letterSpacing: '0.08em', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => {
                  const spent = (c.orders || []).filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0);
                  return (
                    <tr key={c.id} style={{ borderBottom: i < customers.length - 1 ? '1px solid var(--admin-hover-2)' : 'none', cursor: 'pointer' }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--admin-hover-1)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => navigate(`/admin/customers/${c.id}`)}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #FC4B4E22, #3B82F622)', border: '1px solid var(--admin-border-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-text-muted)', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}>
                            {c.name[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ color: 'var(--admin-text)', fontSize: '13px', fontWeight: 500 }}>{c.name}</div>
                            <div style={{ color: 'var(--admin-text-muted)', fontSize: '12px' }}>{c.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', color: 'var(--admin-text-muted)', fontSize: '13px' }}>{c.phone || '—'}</td>
                      <td style={{ padding: '14px 20px', color: 'var(--admin-text)', fontSize: '13px', fontWeight: 500 }}>{c._count?.orders || 0}</td>
                      <td style={{ padding: '14px 20px', color: '#22C55E', fontSize: '13px', fontWeight: 600 }}><Price value={`₹${spent.toLocaleString()}`} /></td>
                      <td style={{ padding: '14px 20px', color: 'var(--admin-text-muted)', fontSize: '13px' }}>{c._count?.addresses || 0}</td>
                      <td style={{ padding: '14px 20px', color: 'var(--admin-text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: 'none', background: page === p ? '#FC4B4E' : 'var(--admin-border-2)', color: page === p ? 'white' : 'var(--admin-text-muted)', cursor: 'pointer', fontSize: '13px' }}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}
