import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  IndianRupee, ShoppingBag, Receipt, Package, TicketPercent, Undo2, TrendingUp, Download, FileUp,
  Users, Boxes, CreditCard, Tag, Mail, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { api } from '../../utils/api';
import { PageHeader, SectionTitle, Card, StatRow, Button, Badge, Tabs, EmptyState, Field } from '../../components/admin/AdminUI';
import { DISPLAY, inputCls, tableCls, thCls, tdCls, trCls } from '../../components/admin/adminStyles';
import ProductImportModal from '../../components/admin/growth/ProductImportModal';
import { downloadAdminFile } from '../../components/admin/growth/csv';

// Reports & Exports (/admin/reports): sales report for a date range (real
// orders only; revenue excludes cancelled), CSV exports, bulk product import
// and the low-stock list. Data: /api/admin/reports/*.
const RANGES = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: 'month', label: 'This month' },
  { key: 'lastmonth', label: 'Last month' },
  { key: 'year', label: 'This year' },
  { key: 'custom', label: 'Custom' },
];
const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const num = (n) => Math.round(n || 0).toLocaleString('en-IN');
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const todayYmd = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const daysAgoYmd = (n) => new Date(Date.now() + 330 * 60000 - n * 864e5).toISOString().slice(0, 10);
const readRange = () => { try { return localStorage.getItem('zunuz_admin_report_range') || '30d'; } catch { return '30d'; } };

function Panel({ title, icon: Icon, hint, children, className = '', actions }) {
  return (
    <Card className={`p-[clamp(18px,2vw,26px)] animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both] ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={`m-0 flex items-center gap-2 text-[17px] font-bold text-[var(--admin-text)] ${DISPLAY}`}>{Icon && <Icon size={18} strokeWidth={1.8} />}{title}</h3>
          {hint && <p className="m-0 mt-1 text-[13px] text-[var(--admin-text-muted)]">{hint}</p>}
        </div>
        {actions}
      </div>
      {children}
    </Card>
  );
}

const Empty = ({ children = 'No sales in this period.' }) => <p className="m-0 py-6 text-center text-[14px] text-[var(--admin-text-muted)]">{children}</p>;

function ShareBar({ value, max, color = 'linear-gradient(90deg,#FF3D8B,#F6C915)' }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[var(--admin-hover-3)]" aria-hidden="true">
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%`, background: color }} />
    </div>
  );
}

function RevenueChart({ series, total }) {
  const pts = series?.points || [];
  const max = Math.max(1, ...pts.map((p) => p.revenue));
  const every = Math.max(1, Math.ceil(pts.length / 8));
  return (
    <Panel title={`Revenue by ${series?.granularity === 'month' ? 'month' : 'day'}`} icon={TrendingUp} actions={<span className={`text-[22px] font-bold text-[var(--admin-text)] ${DISPLAY}`}>{inr(total)}</span>}>
      <div className="flex h-[200px] items-end gap-[3px]" role="img" aria-label={`Revenue chart, total ${inr(total)}`}>
        {pts.map((p, i) => (
          <div key={p.key} className="group/b relative flex h-full min-w-0 flex-1 flex-col justify-end">
            <div
              className="w-full origin-bottom rounded-t-[5px] opacity-85 transition-opacity duration-200 group-hover/b:opacity-100 animate-[admin-grow_0.8s_cubic-bezier(0.16,1,0.3,1)_both]"
              style={{ height: `${Math.max(p.revenue ? 4 : 1.5, (p.revenue / max) * 100)}%`, animationDelay: `${Math.min(i, 40) * 14}ms`, background: p.revenue ? 'linear-gradient(180deg,#FF3D8B,#F6C915)' : 'var(--admin-border-3)' }}
            />
            <div className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-10 -translate-x-1/2 rounded-[10px] bg-[var(--admin-text)] px-2.5 py-1.5 text-center text-[12px] whitespace-nowrap text-[var(--admin-bg)] opacity-0 transition-opacity group-hover/b:opacity-100">
              <b>{inr(p.revenue)}</b><br />{p.orders} order{p.orders === 1 ? '' : 's'} · {p.label}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-[3px] text-[11px] text-[var(--admin-text-muted)]">
        {pts.map((p, i) => <span key={p.key} className="min-w-0 flex-1 text-center whitespace-nowrap">{i % every === 0 ? p.label : ''}</span>)}
      </div>
    </Panel>
  );
}

function ProductsTable({ products, itemsValue }) {
  const [all, setAll] = useState(false);
  const shown = all ? products : products.slice(0, 10);
  const max = Math.max(1, ...products.map((p) => p.revenue));
  return (
    <Panel title="Sales by product" icon={Package} hint="Item value before order discounts" className="overflow-hidden" actions={products.length > 10 && <Button size="sm" variant="ghost" onClick={() => setAll((a) => !a)}>{all ? 'Show top 10' : `Show all ${products.length}`}</Button>}>
      {products.length ? (
        <div className="-mx-[clamp(18px,2vw,26px)] -mb-[clamp(18px,2vw,26px)] overflow-x-auto">
          <table className={`${tableCls} min-w-[560px]`}>
            <thead><tr>{['Product', 'Qty', 'Revenue', 'Share'].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} className={trCls}>
                  <td className={tdCls}>
                    <div className="flex items-center gap-3">
                      <span className="size-10 shrink-0 overflow-hidden rounded-[10px] bg-[var(--admin-surface-2)]">{p.image && <img src={p.image} alt="" className="h-full w-full object-cover" loading="lazy" />}</span>
                      <span className="min-w-0">
                        <span className="block max-w-[260px] truncate font-medium text-[var(--admin-text)]">{p.name}</span>
                        <span className="block text-[12px] text-[var(--admin-text-muted)]">{p.category || '—'} · {p.orders} order{p.orders === 1 ? '' : 's'}</span>
                      </span>
                    </div>
                  </td>
                  <td className={`${tdCls} font-semibold tabular-nums`}>{num(p.qty)}</td>
                  <td className={`${tdCls} font-semibold whitespace-nowrap text-[var(--tone-green)] tabular-nums`}>{inr(p.revenue)}</td>
                  <td className={`${tdCls} w-[30%] min-w-[140px]`}>
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1"><ShareBar value={p.revenue} max={max} /></div>
                      <span className="w-10 text-right text-[12px] text-[var(--admin-text-muted)] tabular-nums">{pct(p.revenue, itemsValue)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty />}
    </Panel>
  );
}

function Exports({ range, from, to, onImport, onError }) {
  const [busy, setBusy] = useState('');
  const qs = new URLSearchParams({ range, ...(range === 'custom' ? { from, to } : {}) });
  const go = (key, path, name) => {
    setBusy(key);
    downloadAdminFile(path, name).catch((e) => onError(e.message)).finally(() => setBusy(''));
  };
  const items = [
    { key: 'orders', icon: ShoppingBag, title: 'Orders', text: 'Every real order in the selected range — items, discounts, payment, tracking, refunds and address.', action: () => go('orders', `/admin/reports/export/orders.csv?${qs}`, 'zunuz-orders.csv') },
    { key: 'customers', icon: Users, title: 'Customers', text: 'All customer accounts with order count, total spent and tags.', action: () => go('customers', '/admin/reports/export/customers.csv', 'zunuz-customers.csv') },
    { key: 'products', icon: Boxes, title: 'Products', text: 'The full catalogue. Same columns as the import, so you can edit and re-import it.', action: () => go('products', '/admin/reports/export/products.csv', 'zunuz-products.csv') },
  ];
  return (
    <section id="exports" className="mt-9 scroll-mt-6">
      <SectionTitle title="Exports & import" hint="CSV files open in Excel and Google Sheets (UTF-8, ₹ shows correctly)." />
      <div className="grid grid-cols-4 gap-[clamp(12px,1.4vw,20px)] max-[1200px]:grid-cols-2 max-[640px]:grid-cols-1">
        {items.map((it) => (
          <Card key={it.key} className="flex flex-col p-5">
            <span className="flex items-center gap-2 text-[15px] font-semibold text-[var(--admin-text)]"><it.icon size={18} strokeWidth={1.7} />{it.title}</span>
            <p className="m-0 mt-1.5 flex-1 text-[13px] leading-relaxed text-[var(--admin-text-muted)]">{it.text}</p>
            <Button size="sm" variant="secondary" icon={Download} loading={busy === it.key} onClick={it.action} className="mt-4 self-start">Download CSV</Button>
          </Card>
        ))}
        <Card id="import" className="flex scroll-mt-6 flex-col border-[var(--admin-accent)]/30 p-5">
          <span className="flex items-center gap-2 text-[15px] font-semibold text-[var(--admin-text)]"><FileUp size={18} strokeWidth={1.7} />Bulk product import</span>
          <p className="m-0 mt-1.5 flex-1 text-[13px] leading-relaxed text-[var(--admin-text-muted)]">Add or update many products from a CSV. You'll see a checked preview before anything is saved.</p>
          <Button size="sm" icon={FileUp} onClick={onImport} className="mt-4 self-start">Import products</Button>
        </Card>
      </div>
    </section>
  );
}

function Inventory() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    let alive = true;
    api.get('/admin/reports/inventory', true).then((d) => { if (alive) setData(d); }).catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, []);
  const send = async () => {
    setSending(true); setMsg(null);
    try {
      const r = await api.post('/admin/notifications/send-low-stock', {}, true);
      setMsg({ tone: r.sent ? 'green' : 'muted', text: r.message });
    } catch (e) { setMsg({ tone: 'red', text: e.message }); } finally { setSending(false); }
  };
  const recipients = data?.alerts.recipients || [];
  const out = data?.products.filter((p) => p.stock <= 0).length || 0;
  return (
    <section id="inventory" className="mt-9 scroll-mt-6">
      <SectionTitle
        title="Inventory alerts"
        hint={data ? `Active products with ${data.threshold} or fewer left. ${data.alerts.enabled && recipients.length ? `A daily email goes to ${recipients.join(', ')} after 9 AM.` : 'Daily low-stock emails are off or no alert email is set (Settings).'}` : 'Products running low.'}
        actions={<Button size="sm" variant="secondary" icon={Mail} loading={sending} disabled={!data?.products.length} onClick={send}>Email this list now</Button>}
      />
      {msg && <p role="status" className="m-0 mb-3 text-[14px] font-medium" style={{ color: `var(--tone-${msg.tone}, var(--admin-text-muted))` }}>{msg.text}</p>}
      {data && !recipients.length && data.products.length > 0 && <p className="m-0 mb-3 text-[13px] text-[var(--admin-text-muted)]">No alert email is set, so “Email this list now” sends it to you ({data.alerts.fallback}).</p>}
      <Card className="overflow-hidden">
        {error ? <Empty>{error}</Empty> : !data ? <div className="h-[120px] animate-pulse" /> : !data.products.length ? (
          <EmptyState icon={Boxes} title="Stock looks healthy" text={`No active product has ${data.threshold} or fewer left.`} />
        ) : (
          <div className="overflow-x-auto">
            <table className={`${tableCls} min-w-[520px]`}>
              <thead><tr>{['Product', 'Category', 'Price', 'Stock', ''].map((h, i) => <th key={h || i} className={thCls}>{h}</th>)}</tr></thead>
              <tbody>
                {data.products.map((p) => (
                  <tr key={p.id} className={trCls}>
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <span className="size-10 shrink-0 overflow-hidden rounded-[10px] bg-[var(--admin-surface-2)]">{p.image && <img src={p.image} alt="" className="h-full w-full object-cover" loading="lazy" />}</span>
                        <span className="max-w-[280px] truncate font-medium text-[var(--admin-text)]">{p.name}</span>
                      </div>
                    </td>
                    <td className={`${tdCls} text-[var(--admin-text-muted)]`}>{p.category?.name || '—'}</td>
                    <td className={`${tdCls} tabular-nums`}>{inr(p.price)}</td>
                    <td className={tdCls}><Badge tone={p.stock <= 0 ? 'red' : 'yellow'} dot>{p.stock <= 0 ? 'Out of stock' : `${p.stock} left`}</Badge></td>
                    <td className={`${tdCls} text-right`}><Link to={`/admin/products?search=${encodeURIComponent(p.name)}`} className="text-[13px] font-semibold text-[var(--admin-accent)] no-underline hover:underline">Restock →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="m-0 border-t border-[var(--admin-border-1)] px-5 py-3 text-[13px] text-[var(--admin-text-muted)]">{out} out of stock · {data.products.length - out} running low</p>
          </div>
        )}
      </Card>
    </section>
  );
}

export default function ReportsPage() {
  const { hash } = useLocation();
  const [range, setRange] = useState(readRange);
  const [from, setFrom] = useState(daysAgoYmd(29));
  const [to, setTo] = useState(todayYmd());
  const [res, setRes] = useState({ key: null, data: null, error: '' });
  const [importOpen, setImportOpen] = useState(hash === '#import');
  const [banner, setBanner] = useState('');

  const query = useMemo(() => {
    const p = new URLSearchParams({ range });
    if (range === 'custom') { p.set('from', from); p.set('to', to); }
    return p.toString();
  }, [range, from, to]);
  const customInvalid = range === 'custom' && (!from || !to || from > to);
  const loading = res.key !== query;

  useEffect(() => { try { localStorage.setItem('zunuz_admin_report_range', range); } catch { /* ignore */ } }, [range]);
  useEffect(() => {
    if (customInvalid) return undefined;
    let alive = true;
    api.get(`/admin/reports/summary?${query}`, true)
      .then((d) => { if (alive) setRes({ key: query, data: d, error: '' }); })
      .catch((e) => { if (alive) setRes((r) => ({ ...r, key: query, error: e.message || 'Could not load the report.' })); });
    return () => { alive = false; };
  }, [query, customInvalid]);
  useEffect(() => {
    if (hash === '#exports' || hash === '#inventory') setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 300);
  }, [hash]);

  const d = res.data;
  const s = d?.summary;
  const delta = s && s.previous.revenue ? Math.round(((s.revenue - s.previous.revenue) / s.previous.revenue) * 100) : null;
  const maxCat = Math.max(1, ...(d?.categories || []).map((c) => c.revenue));
  const payTotal = (d?.payments || []).reduce((t, p) => t + p.revenue, 0);
  const maxCust = Math.max(1, ...(d?.topCustomers || []).map((c) => c.revenue));

  return (
    <div className="mx-auto max-w-[1480px]">
      <PageHeader
        title="Reports & Exports"
        subtitle={d ? `${d.range.label} · real orders only, revenue excludes cancelled orders` : 'Sales reports, CSV exports and bulk product import.'}
        actions={(
          <>
            <Button variant="secondary" icon={Download} onClick={() => document.getElementById('exports')?.scrollIntoView({ behavior: 'smooth' })}>Exports</Button>
            <Button icon={FileUp} onClick={() => setImportOpen(true)}>Import products</Button>
          </>
        )}
      />

      <div className="flex flex-wrap items-end gap-3">
        <Tabs items={RANGES} value={range} onChange={setRange} className="max-w-full" />
        {range === 'custom' && (
          <div className="flex flex-wrap items-end gap-2.5 animate-[jw-rise_0.4s_cubic-bezier(0.16,1,0.3,1)_both]">
            <Field label="From" htmlFor="rep-from"><input id="rep-from" type="date" value={from} max={to || todayYmd()} onChange={(e) => setFrom(e.target.value)} className={`${inputCls} w-[170px]`} /></Field>
            <Field label="To" htmlFor="rep-to"><input id="rep-to" type="date" value={to} min={from} max={todayYmd()} onChange={(e) => setTo(e.target.value)} className={`${inputCls} w-[170px]`} /></Field>
          </div>
        )}
      </div>
      {customInvalid && <p role="alert" className="m-0 mt-3 text-[14px] text-[var(--tone-red)]">Pick a start date on or before the end date.</p>}
      {(res.error || banner) && (
        <p role="alert" className="m-0 mt-4 rounded-[12px] border border-[var(--tone-red)]/30 bg-[var(--tone-red)]/10 px-4 py-3 text-[14px] text-[var(--tone-red)]">{res.error || banner}</p>
      )}

      {!d ? (
        res.error ? null : (
          <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-[104px] animate-pulse rounded-[18px] bg-[var(--admin-hover-3)]" />)}
          </div>
        )
      ) : (
        <div className={`transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`} aria-busy={loading}>
          {/* Six tiles: fit them on one row on wide screens (3 + 3 / 2 + 2 + 2 below). */}
          <div className="[&>div]:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] max-[1100px]:[&>div]:grid-cols-3 max-[640px]:[&>div]:grid-cols-2">
          <StatRow
            items={[
              { label: 'Revenue', icon: IndianRupee, value: inr(s.revenue), tone: delta == null ? 'muted' : delta >= 0 ? 'green' : 'red', sub: delta == null ? 'No sales in the previous period' : <span className="inline-flex items-center gap-1">{delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(delta)}% vs previous period</span> },
              { label: 'Orders', icon: ShoppingBag, value: num(s.orders), tone: s.cancelled ? 'red' : 'muted', sub: `${s.cancelled} cancelled · ${s.customers} customer${s.customers === 1 ? '' : 's'}` },
              { label: 'Avg order', icon: Receipt, value: inr(s.avgOrder), tone: 'purple', sub: 'Revenue ÷ orders' },
              { label: 'Items sold', icon: Package, value: num(s.itemsSold), tone: 'blue', sub: `${d.products.length} different product${d.products.length === 1 ? '' : 's'}` },
              { label: 'Discounts given', icon: TicketPercent, value: inr(s.discounts), tone: s.discounts ? 'pink' : 'muted', sub: `On ${s.discountedOrders} order${s.discountedOrders === 1 ? '' : 's'}` },
              { label: 'Refunded', icon: Undo2, value: inr(s.refunded), tone: s.refunded ? 'yellow' : 'muted', sub: `${s.refundedOrders} refund${s.refundedOrders === 1 ? '' : 's'} processed` },
            ]}
          />
          </div>

          <div className="mt-7"><RevenueChart series={d.series} total={s.revenue} /></div>

          <div className="mt-[clamp(14px,1.6vw,24px)] grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] items-start gap-[clamp(14px,1.6vw,24px)] max-[1100px]:grid-cols-1">
            <ProductsTable products={d.products} itemsValue={d.itemsValue} />
            <div className="flex flex-col gap-[clamp(14px,1.6vw,24px)]">
              <Panel title="Sales by category" icon={Tag}>
                {d.categories.length ? (
                  <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
                    {d.categories.map((c) => (
                      <li key={c.id}>
                        <div className="flex justify-between gap-3 text-[14px]"><span className="text-[var(--admin-text)]">{c.name} <span className="text-[var(--admin-text-muted)]">· {num(c.qty)} pcs</span></span><span className="font-semibold tabular-nums">{inr(c.revenue)}</span></div>
                        <div className="mt-1.5"><ShareBar value={c.revenue} max={maxCat} /></div>
                      </li>
                    ))}
                  </ul>
                ) : <Empty />}
              </Panel>
              <Panel title="Payment methods" icon={CreditCard}>
                {payTotal ? (
                  <>
                    <div className="flex h-3.5 overflow-hidden rounded-full bg-[var(--admin-hover-3)]">
                      {d.payments.map((p, i) => p.revenue > 0 && <div key={p.method} title={`${p.label}: ${inr(p.revenue)}`} className="h-full transition-[width] duration-700" style={{ width: `${(p.revenue / payTotal) * 100}%`, background: i ? 'var(--tone-blue)' : 'var(--tone-yellow)' }} />)}
                    </div>
                    <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
                      {d.payments.map((p, i) => (
                        <li key={p.method} className="flex items-center gap-3 text-[14px]">
                          <span className="size-2.5 rounded-full" style={{ background: i ? 'var(--tone-blue)' : 'var(--tone-yellow)' }} />
                          <span className="flex-1 text-[var(--admin-text-muted)]">{p.label}</span>
                          <span className="text-[var(--admin-text-muted)] tabular-nums">{p.orders} order{p.orders === 1 ? '' : 's'}</span>
                          <span className="w-24 text-right font-semibold tabular-nums">{inr(p.revenue)}</span>
                          <span className="w-10 text-right text-[12px] text-[var(--admin-text-muted)] tabular-nums">{pct(p.revenue, payTotal)}%</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : <Empty />}
              </Panel>
            </div>
          </div>

          <div className="mt-[clamp(14px,1.6vw,24px)] grid grid-cols-2 items-start gap-[clamp(14px,1.6vw,24px)] max-[1100px]:grid-cols-1">
            <Panel title="Top customers" icon={Users} hint="By revenue in this period">
              {d.topCustomers.length ? (
                <ol className="m-0 flex list-none flex-col gap-3 p-0">
                  {d.topCustomers.map((c, i) => (
                    <li key={c.id}>
                      <Link to={`/admin/customers/${c.id}`} className="group/c flex items-center gap-3 text-[var(--admin-text)] no-underline">
                        <span className="w-5 text-[13px] font-bold text-[var(--admin-text-muted)]">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold group-hover/c:text-[var(--admin-accent)]">{c.name || c.email || `Customer #${c.id}`}</span>
                          <span className="mt-1 block"><ShareBar value={c.revenue} max={maxCust} color="var(--tone-green)" /></span>
                        </span>
                        <span className="text-right">
                          <span className="block text-[14px] font-bold text-[var(--tone-green)] tabular-nums">{inr(c.revenue)}</span>
                          <span className="block text-[12px] text-[var(--admin-text-muted)]">{c.orders} order{c.orders === 1 ? '' : 's'}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : <Empty />}
            </Panel>
            <Panel title="Coupon usage" icon={TicketPercent} hint="Orders that used a discount code">
              {d.coupons.length ? (
                <div className="-mx-[clamp(18px,2vw,26px)] -mb-[clamp(18px,2vw,26px)] overflow-x-auto">
                  <table className={tableCls}>
                    <thead><tr>{['Code', 'Uses', 'Discount', 'Order value'].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
                    <tbody>
                      {d.coupons.map((c) => (
                        <tr key={c.code} className={trCls}>
                          <td className={tdCls}><span className="rounded-[8px] bg-[var(--admin-accent-soft)] px-2 py-1 font-mono text-[13px] font-bold text-[var(--tone-pink)]">{c.code}</span></td>
                          <td className={`${tdCls} font-semibold tabular-nums`}>{c.uses}</td>
                          <td className={`${tdCls} whitespace-nowrap tabular-nums`}>−{inr(c.discount)}</td>
                          <td className={`${tdCls} font-semibold whitespace-nowrap tabular-nums`}>{inr(c.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Empty>No coupons were used in this period.</Empty>}
            </Panel>
          </div>
        </div>
      )}

      {!d && !res.error && !customInvalid && <p className="sr-only" role="status">Loading report…</p>}

      <Exports range={range} from={from} to={to} onImport={() => setImportOpen(true)} onError={setBanner} />
      <Inventory />

      <ProductImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
