import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, ShoppingBag, Mail, Phone, CalendarDays, IndianRupee, Receipt, Clock, UserX } from 'lucide-react';
import { api } from '../../utils/api';
import { Button, Card, StatRow, Badge, SectionTitle, EmptyState, Loading } from '../../components/admin/AdminUI';
import { DISPLAY, ORDER_STATUS } from '../../components/admin/adminStyles';
import CustomerNotesCard, { TagChip } from '../../components/admin/growth/CustomerTags';
import CustomerCreditsCard from '../../components/admin/CustomerCreditsCard';

const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ id: null, customer: null, error: '' });
  const loading = state.id !== id;
  const { customer, error } = state;

  useEffect(() => {
    let alive = true;
    api.get(`/admin/customers/${id}`, true)
      .then((c) => { if (alive) setState({ id, customer: c, error: '' }); })
      .catch((e) => { if (alive) setState({ id, customer: null, error: e.message }); });
    return () => { alive = false; };
  }, [id]);

  const orders = customer?.orders || [];
  const addresses = customer?.addresses || [];
  const totalSpent = orders.reduce((s, o) => s + o.total, 0);
  const lastOrder = orders.reduce((latest, o) => (!latest || new Date(o.createdAt) > new Date(latest.createdAt) ? o : latest), null);

  return (
    <div className="mx-auto max-w-[1480px]">
      <Button variant="ghost" size="sm" icon={ChevronLeft} onClick={() => navigate('/admin/customers')} className="-ml-2 mb-4">
        Back to Customers
      </Button>

      {loading ? (
        <Loading label="Loading customer…" />
      ) : error || !customer ? (
        <Card>
          <EmptyState icon={UserX} title="Customer not found" text={error || 'This customer may have been removed.'} />
        </Card>
      ) : (
        <>
          <Card className="flex flex-wrap items-center gap-5 p-[clamp(20px,2vw,28px)] animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
            <span className={`flex size-[72px] shrink-0 items-center justify-center rounded-full bg-[var(--admin-accent-soft)] text-[30px] font-bold text-[var(--admin-accent)] ${DISPLAY}`}>
              {customer.name?.[0]?.toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className={`m-0 text-[length:clamp(26px,2.6vw,36px)] leading-tight font-bold tracking-[-0.01em] text-[var(--admin-text)] ${DISPLAY}`}>{customer.name}</h1>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[14px] text-[var(--admin-text-muted)]">
                <span className="inline-flex items-center gap-1.5"><Phone size={15} strokeWidth={1.7} />{customer.phone ? `+91 ${customer.phone}` : 'No phone'}</span>
                {customer.email && <span className="inline-flex min-w-0 items-center gap-1.5 break-all"><Mail size={15} strokeWidth={1.7} />{customer.email}</span>}
                {customer.createdAt && <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} strokeWidth={1.7} />Joined {fmtDate(customer.createdAt)}</span>}
              </div>
              {customer.tags?.length > 0 && <div className="mt-2.5 flex flex-wrap gap-1.5">{customer.tags.map((t) => <TagChip key={t} tag={t} />)}</div>}
            </div>
          </Card>

          <StatRow
            items={[
              { label: 'Orders', icon: ShoppingBag, value: orders.length, tone: 'blue', sub: `${addresses.length} saved address${addresses.length === 1 ? '' : 'es'}` },
              { label: 'Total spent', icon: IndianRupee, value: inr(totalSpent), tone: 'green', sub: 'Across all orders' },
              { label: 'Avg order', icon: Receipt, value: orders.length ? inr(totalSpent / orders.length) : '—', tone: 'purple', sub: 'Per order' },
              { label: 'Last order', icon: Clock, value: lastOrder ? fmtDate(lastOrder.createdAt) : '—', tone: lastOrder ? 'pink' : 'muted', sub: lastOrder ? `Order #${lastOrder.id}` : 'No orders yet' },
            ]}
          />

          <div className="mt-7 grid grid-cols-[minmax(0,360px)_minmax(0,1fr)] items-start gap-[clamp(14px,1.6vw,24px)] max-[1000px]:grid-cols-1">
            <div className="flex flex-col gap-[clamp(14px,1.6vw,24px)]">
            {/* Addresses */}
            <Card className="p-5 animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]" style={{ animationDelay: '200ms' }}>
              <SectionTitle title={<span className="inline-flex items-center gap-2"><MapPin size={18} strokeWidth={1.8} /> Saved addresses <span className="text-[var(--admin-text-muted)]">({addresses.length})</span></span>} />
              {addresses.length === 0 ? (
                <p className="m-0 text-[14px] text-[var(--admin-text-muted)]">No addresses saved.</p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {addresses.map((addr) => (
                    <li
                      key={addr.id}
                      className={`rounded-[14px] border bg-[var(--admin-surface-2)] px-4 py-3 ${addr.isDefault ? 'border-[var(--admin-accent)]/40' : 'border-[var(--admin-border-2)]'}`}
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-[var(--admin-text-muted)]">{addr.label}</span>
                        {addr.isDefault && <Badge tone="pink">Default</Badge>}
                      </div>
                      {addr.name && (
                        <p className="m-0 text-[14px] font-semibold text-[var(--admin-text)]">
                          {addr.name}{addr.phone && ` · +91 ${addr.phone}`}
                        </p>
                      )}
                      <p className="m-0 text-[14px] leading-relaxed text-[var(--admin-text)]">
                        {addr.houseNo ? `${addr.houseNo}, ` : ''}{addr.street}{addr.landmark ? ` (Near ${addr.landmark})` : ''}, {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <CustomerNotesCard key={customer.id} customer={customer} onTagsChange={(tags) => setState((st) => ({ ...st, customer: { ...st.customer, tags } }))} style={{ animationDelay: '230ms' }} />
            <CustomerCreditsCard key={`credits-${customer.id}`} customerId={customer.id} style={{ animationDelay: '245ms' }} />
            </div>

            {/* Orders */}
            <Card className="p-5 animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]" style={{ animationDelay: '260ms' }}>
              <SectionTitle title={<span className="inline-flex items-center gap-2"><ShoppingBag size={18} strokeWidth={1.8} /> Orders <span className="text-[var(--admin-text-muted)]">({orders.length})</span></span>} />
              {orders.length === 0 ? (
                <p className="m-0 text-[14px] text-[var(--admin-text-muted)]">No confirmed orders yet.</p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {orders.map((order) => {
                    const s = ORDER_STATUS[order.status] || ORDER_STATUS.PENDING;
                    return (
                      <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--admin-border-2)] bg-[var(--admin-surface-2)] px-4 py-3.5 transition-colors hover:border-[var(--admin-border-4)]">
                        <div className="min-w-0">
                          <p className="m-0 text-[14px] font-semibold text-[var(--admin-text)]">Order #{order.id}</p>
                          <p className="m-0 mt-0.5 text-[13px] text-[var(--admin-text-muted)]">
                            {order.items?.length} item{order.items?.length !== 1 ? 's' : ''} · {fmtDate(order.createdAt)} · {order.paymentMethod === 'COD' ? 'COD' : order.paymentMethod === 'CREDITS' ? 'ZUNUZ Credits' : 'Razorpay'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge tone={s.tone} dot>{s.label}</Badge>
                          <span className="min-w-[80px] text-right text-[15px] font-bold text-[var(--admin-text)] tabular-nums">{inr(order.total)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
