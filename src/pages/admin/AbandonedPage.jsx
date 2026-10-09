import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ShoppingCart, IndianRupee, MailCheck, HeartHandshake, Send, CheckCircle2, MailX, Info } from 'lucide-react';
import { api } from '../../utils/api';
import { PageHeader, StatRow, Button, Badge, Tabs, SearchInput, EmptyState, SkeletonRows, ConfirmDialog } from '../../components/admin/AdminUI';
import { tableWrapCls, tableCls, thCls, tdCls, trCls } from '../../components/admin/adminStyles';

// Abandoned checkouts (/admin/abandoned): online (Razorpay) checkouts that
// were never paid. Send a friendly reminder email (once per 24h per
// customer) and see which ones came back and ordered. API: /api/admin/abandoned.
const RANGES = [
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
  { key: '90', label: 'Last 90 days' },
  { key: 'all', label: 'All time' },
];
const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
function ago(d) {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
const fullDate = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function AbandonedPage() {
  const outlet = useOutletContext() || {};
  const [range, setRange] = useState('30');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [res, setRes] = useState({ key: null, data: null, error: '' });
  const [sending, setSending] = useState(null); // order id
  const [confirmAll, setConfirmAll] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [notice, setNotice] = useState(null); // { tone, text }

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const query = useMemo(() => {
    const p = new URLSearchParams({ range, page });
    if (search) p.set('search', search);
    return p.toString();
  }, [range, search, page]);
  const key = `${query}|${version}`;
  const loading = res.key !== key;

  useEffect(() => {
    let alive = true;
    api.get(`/admin/abandoned?${query}`, true)
      .then((data) => { if (alive) setRes({ key, data, error: '' }); })
      .catch((e) => { if (alive) setRes((r) => ({ ...r, key, error: e.message || 'Could not load abandoned checkouts.' })); });
    return () => { alive = false; };
  }, [query, key]);

  const d = res.data;
  const st = d?.stats;

  const remind = async (o) => {
    setSending(o.id); setNotice(null);
    try {
      await api.post(`/admin/abandoned/${o.id}/remind`, {}, true);
      setNotice({ tone: 'green', text: `Reminder sent to ${o.customer.email}.` });
      setVersion((v) => v + 1);
    } catch (e) { setNotice({ tone: 'red', text: e.message }); } finally { setSending(null); }
  };
  const remindAll = async () => {
    setBulkBusy(true); setNotice(null);
    try {
      const r = await api.post('/admin/abandoned/remind-all', { range, search }, true);
      const parts = [`${r.sent} reminder${r.sent === 1 ? '' : 's'} sent`];
      if (r.failed) parts.push(`${r.failed} failed`);
      if (r.noEmail) parts.push(`${r.noEmail} skipped (no email)`);
      setNotice({ tone: r.failed ? 'yellow' : 'green', text: `${parts.join(' · ')}.` });
      setConfirmAll(false);
      setVersion((v) => v + 1);
      outlet.refreshBadges?.();
    } catch (e) { setNotice({ tone: 'red', text: e.message }); setConfirmAll(false); } finally { setBulkBusy(false); }
  };

  return (
    <div className="mx-auto max-w-[1480px]">
      <PageHeader
        title="Abandoned Checkouts"
        subtitle="Online checkouts that were never paid. Nudge customers with a one-time reminder email."
        actions={<Button icon={Send} disabled={!st?.remindable} onClick={() => setConfirmAll(true)}>Remind all{st?.remindable ? ` (${st.remindable})` : ''}</Button>}
      >
        {st ? (
          <StatRow
            items={[
              { label: 'Abandoned', icon: ShoppingCart, value: st.count.toLocaleString('en-IN'), tone: st.count ? 'yellow' : 'muted', sub: RANGES.find((r) => r.key === range)?.label },
              { label: 'Value left behind', icon: IndianRupee, value: inr(st.value), tone: 'pink', sub: st.count ? `Avg ${inr(st.value / st.count)} per checkout` : 'Nothing abandoned' },
              { label: 'Reminders sent', icon: MailCheck, value: st.reminded.toLocaleString('en-IN'), tone: 'blue', sub: `${st.remindable} customer${st.remindable === 1 ? '' : 's'} not yet reminded` },
              { label: 'Recovered', icon: HeartHandshake, value: st.recoveredCount.toLocaleString('en-IN'), tone: st.recoveredCount ? 'green' : 'muted', sub: st.recoveredCount ? `${inr(st.recoveredValue)} ordered afterwards` : 'No recoveries yet' },
            ]}
          />
        ) : !res.error && (
          <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-[104px] animate-pulse rounded-[18px] bg-[var(--admin-hover-3)]" />)}</div>
        )}
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs items={RANGES} value={range} onChange={(k) => { setRange(k); setPage(1); }} />
        <SearchInput value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search name, email, phone or #id…" aria-label="Search abandoned checkouts" className="min-w-[240px] flex-1 max-w-[420px]" />
      </div>

      {notice && (
        <p role="status" className="m-0 mb-4 rounded-[12px] border px-4 py-3 text-[14px] font-medium" style={{ color: `var(--tone-${notice.tone})`, borderColor: `color-mix(in srgb, var(--tone-${notice.tone}) 30%, transparent)`, background: `color-mix(in srgb, var(--tone-${notice.tone}) 10%, transparent)` }}>{notice.text}</p>
      )}
      {res.error && <p role="alert" className="m-0 mb-4 rounded-[12px] border border-[var(--tone-red)]/30 bg-[var(--tone-red)]/10 px-4 py-3 text-[14px] text-[var(--tone-red)]">{res.error}</p>}

      <div className={`${tableWrapCls} animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]`}>
        {!d ? (
          res.error ? null : <SkeletonRows rows={6} />
        ) : !d.items.length ? (
          <EmptyState icon={ShoppingCart} title="No abandoned checkouts" text={search ? `Nothing matches “${search}”.` : 'Every online checkout in this period was paid. 🎉'} />
        ) : (
          <div className={`overflow-x-auto transition-opacity duration-300 ${loading ? 'opacity-60' : 'opacity-100'}`}>
            <table className={`${tableCls} min-w-[980px]`}>
              <thead>
                <tr>{['Customer', 'Items', 'Value', 'When', 'Reminder', ''].map((h, i) => <th key={h || i} className={thCls}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {d.items.map((o) => (
                  <tr key={o.id} className={trCls}>
                    <td className={tdCls}>
                      <div className="flex min-w-0 flex-col">
                        {o.customer.id ? (
                          <Link to={`/admin/customers/${o.customer.id}`} className="max-w-[240px] truncate font-semibold text-[var(--admin-text)] no-underline hover:text-[var(--admin-accent)]">{o.customer.name || 'Unnamed customer'}</Link>
                        ) : <span className="font-semibold">{o.customer.name || 'Unnamed customer'}</span>}
                        <span className="max-w-[240px] truncate text-[12px] text-[var(--admin-text-muted)]">{o.customer.email || 'No email'}</span>
                        {o.customer.phone && <span className="text-[12px] text-[var(--admin-text-muted)]">+91 {o.customer.phone}</span>}
                      </div>
                    </td>
                    <td className={tdCls}>
                      <div className="flex items-center gap-1.5">
                        {o.items.slice(0, 4).map((it) => (
                          <span key={it.id} title={`${it.product?.name || 'Product'} × ${it.quantity}`} className="relative size-10 shrink-0 overflow-hidden rounded-[10px] border border-[var(--admin-border-2)] bg-[var(--admin-surface-2)]">
                            {it.product?.image && <img src={it.product.image} alt={it.product.name} className="h-full w-full object-cover" loading="lazy" />}
                            {it.quantity > 1 && <span className="absolute right-0 bottom-0 rounded-tl-[6px] bg-black/70 px-1 text-[10px] font-bold text-white">×{it.quantity}</span>}
                          </span>
                        ))}
                        {o.items.length > 4 && <span className="text-[12px] font-semibold text-[var(--admin-text-muted)]">+{o.items.length - 4}</span>}
                      </div>
                      <span className="mt-1 block max-w-[260px] truncate text-[12px] text-[var(--admin-text-muted)]">{o.items.map((it) => it.product?.name).filter(Boolean).join(', ')}</span>
                    </td>
                    <td className={tdCls}>
                      <span className="block font-semibold whitespace-nowrap tabular-nums">{inr(o.total)}</span>
                      <Badge tone={o.paymentStatus === 'FAILED' ? 'red' : 'yellow'} className="mt-1">{o.paymentStatus === 'FAILED' ? 'Payment failed' : 'Not paid'}</Badge>
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      <span className="block text-[var(--admin-text)]" title={fullDate(o.createdAt)}>{ago(o.createdAt)}</span>
                      <span className="text-[12px] text-[var(--admin-text-muted)]">#{o.id}</span>
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      {o.recovered ? (
                        <Badge tone="green" dot>Recovered · #{o.recovered.id}</Badge>
                      ) : o.reminderSentAt ? (
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--tone-blue)]" title={fullDate(o.reminderSentAt)}><MailCheck size={15} />Sent {ago(o.reminderSentAt)}</span>
                      ) : <span className="text-[13px] text-[var(--admin-text-dim)]">Not sent</span>}
                      {o.recovered && o.reminderSentAt && <span className="mt-1 block text-[12px] text-[var(--admin-text-muted)]">Reminded {ago(o.reminderSentAt)}</span>}
                    </td>
                    <td className={`${tdCls} text-right`}>
                      {o.recovered ? (
                        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--tone-green)]"><CheckCircle2 size={15} />Ordered {inr(o.recovered.total)}</span>
                      ) : o.blockedReason ? (
                        <span className="inline-flex max-w-[220px] items-center gap-1.5 text-left text-[12px] text-[var(--admin-text-muted)]">
                          {o.customer.email ? <Info size={14} className="shrink-0" /> : <MailX size={14} className="shrink-0 text-[var(--tone-red)]" />}{o.blockedReason}
                        </span>
                      ) : (
                        <Button size="sm" variant="secondary" icon={Send} loading={sending === o.id} disabled={sending != null && sending !== o.id} onClick={() => remind(o)}>Send reminder</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {d?.pages > 1 && (
        <nav aria-label="Pagination" className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="px-2 text-[13px] text-[var(--admin-text-muted)] tabular-nums">Page {page} of {d.pages}</span>
          <Button size="sm" variant="secondary" disabled={page >= d.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </nav>
      )}

      <ConfirmDialog
        open={confirmAll}
        title="Send reminders?"
        message={`This emails ${st?.remindable || 0} customer${st?.remindable === 1 ? '' : 's'} who haven't been reminded yet (one email each, for their latest checkout). Customers without an email, those who already ordered, and anyone reminded in the last 24 hours are skipped.`}
        confirmLabel="Send reminders"
        danger={false}
        busy={bulkBusy}
        onConfirm={remindAll}
        onClose={() => !bulkBusy && setConfirmAll(false)}
      />
    </div>
  );
}
