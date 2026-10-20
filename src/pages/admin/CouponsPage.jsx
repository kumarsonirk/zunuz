import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Copy, Check, TicketPercent, Repeat, IndianRupee, CalendarClock } from 'lucide-react';
import { PageHeader, StatRow, Button, IconButton, Badge, SearchInput, Tabs, EmptyState, SkeletonRows, ConfirmDialog, Toggle } from '../../components/admin/AdminUI';
import { tableWrapCls, tableCls, thCls, tdCls, trCls } from '../../components/admin/adminStyles';
import CouponForm from '../../components/admin/checkout/CouponForm';
import { COUPON_STATUS, fmtDate } from '../../components/admin/checkout/couponUtils';
import { api } from '../../utils/api';

// Coupons (/admin/coupons): discount codes customers enter at checkout.
// A coupon counts as used when its order is placed (COD) or paid (online).
// Used coupons can't be deleted (that would erase their history) — they're
// switched off instead.
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function CopyCode({ code }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setDone(true); setTimeout(() => setDone(false), 1400); } catch { /* clipboard blocked */ }
  };
  return <IconButton label={done ? 'Copied' : `Copy ${code}`} icon={done ? Check : Copy} tone={done ? 'accent' : 'default'} onClick={copy} className="size-7" />;
}

function Validity({ c }) {
  if (!c.startsAt && !c.expiresAt) return <span className="text-[var(--admin-text-dim)]">Always</span>;
  return (
    <span className="whitespace-nowrap">
      {c.startsAt ? fmtDate(c.startsAt) : 'Now'} – {c.expiresAt ? fmtDate(c.expiresAt) : 'No end'}
    </span>
  );
}

function Usage({ c }) {
  const pct = c.usageLimit ? Math.min(100, (c.usedCount / c.usageLimit) * 100) : null;
  return (
    <span className="block min-w-[92px]">
      <span className="tabular-nums font-semibold text-[var(--admin-text)]">{c.usedCount}</span>
      <span className="text-[var(--admin-text-muted)]"> / {c.usageLimit ?? '∞'}</span>
      {pct != null && (
        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[var(--admin-hover-3)]">
          <span className="block h-full rounded-full bg-[var(--admin-accent)]" style={{ width: `${pct}%` }} />
        </span>
      )}
      <span className="mt-1 block text-[12px] text-[var(--admin-text-dim)]">{c.perCustomerLimit ? `${c.perCustomerLimit} per customer` : 'No per-customer limit'}</span>
    </span>
  );
}

// Edit / Delete stay pinned to the right edge, so they're visible even when
// the table is wider than the screen and scrolls sideways.
const STICKY_RIGHT = 'sticky right-0 z-[1] bg-[var(--admin-surface)] shadow-[-10px_0_14px_-12px_rgba(0,0,0,0.5)]';

export default function CouponsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('ALL');
  const [editing, setEditing] = useState(null); // null | 'new' | coupon
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toggling, setToggling] = useState(null);

  const load = useCallback(() => api.get('/admin/coupons', true)
    .then((d) => { setData(d); setError(''); })
    .catch((e) => { setError(e.message || 'Could not load coupons.'); setData((cur) => cur || { coupons: [], stats: null }); }), []);
  useEffect(() => { load(); }, [load]);

  const coupons = useMemo(() => data?.coupons || [], [data]);
  const s = data?.stats;
  const stats = [
    { label: 'Active coupons', value: s ? s.active : '–', icon: TicketPercent, sub: s ? `${s.scheduled} scheduled · ${s.total} total` : ' ', tone: 'green' },
    { label: 'Redemptions', value: s ? s.redemptions.toLocaleString('en-IN') : '–', icon: Repeat, sub: 'Orders that used a coupon', tone: 'blue' },
    { label: 'Discount given', value: s ? inr(s.discountGiven) : '–', icon: IndianRupee, sub: 'Total saved by customers', tone: 'pink' },
  ];

  const counts = useMemo(() => coupons.reduce((m, c) => ({ ...m, [c.status]: (m[c.status] || 0) + 1 }), {}), [coupons]);
  const tabs = [
    { key: 'ALL', label: 'All', count: coupons.length },
    ...Object.entries(COUPON_STATUS).filter(([k]) => counts[k]).map(([k, v]) => ({ key: k, label: v.label, count: counts[k] })),
  ];
  const term = q.trim().toLowerCase();
  const shown = coupons.filter((c) => (tab === 'ALL' || c.status === tab) && (!term || c.code.toLowerCase().includes(term) || (c.description || '').toLowerCase().includes(term)));

  const toggle = async (c, isActive) => {
    setToggling(c.id);
    setData((d) => ({ ...d, coupons: d.coupons.map((x) => (x.id === c.id ? { ...x, isActive } : x)) }));
    try { await api.put(`/admin/coupons/${c.id}`, { isActive }, true); }
    catch (e) { setError(e.message || 'Could not update the coupon.'); }
    finally { setToggling(null); load(); }
  };

  const confirmDelete = async () => {
    const c = deleting;
    setBusy(true);
    try {
      if (c.redemptions > 0) await api.put(`/admin/coupons/${c.id}`, { isActive: false }, true);
      else await api.delete(`/admin/coupons/${c.id}`, true);
      setDeleting(null);
      load();
    } catch (e) {
      setError(e.message || 'Could not delete the coupon.');
      setDeleting(null);
    } finally { setBusy(false); }
  };

  const used = deleting?.redemptions > 0;

  return (
    <div className="mx-auto max-w-[1480px]">
      <PageHeader title="Coupons" subtitle="Discount codes customers can apply at checkout." actions={<Button icon={Plus} onClick={() => setEditing('new')}>New coupon</Button>}>
        <StatRow items={stats} />
      </PageHeader>

      {error && <p role="alert" className="m-0 mb-4 rounded-[12px] bg-[var(--tone-red)]/10 px-4 py-3 text-[14px] font-medium text-[var(--tone-red)]">{error}</p>}

      {coupons.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Tabs items={tabs} value={tabs.some((t) => t.key === tab) ? tab : 'ALL'} onChange={setTab} className="min-w-0 max-w-full" />
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code or description" aria-label="Search coupons" className="ml-auto w-full max-w-[320px] max-[640px]:max-w-none" />
        </div>
      )}

      <div className={tableWrapCls}>
        {data === null ? <SkeletonRows rows={4} /> : coupons.length === 0 ? (
          <EmptyState icon={TicketPercent} title="No coupons yet" text="Create a code like WELCOME10 and share it on Instagram or in your newsletter." action={<Button icon={Plus} onClick={() => setEditing('new')}>Create your first coupon</Button>} />
        ) : shown.length === 0 ? (
          <EmptyState icon={TicketPercent} title="No matching coupons" text="Try a different search or filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead><tr>{['Code', 'Discount', 'Valid', 'Used', 'Status', 'Active'].map((h) => <th key={h} className={thCls}>{h}</th>)}<th className={`${thCls} ${STICKY_RIGHT} text-right`}>Actions</th></tr></thead>
              <tbody>
                {shown.map((c, i) => {
                  const st = COUPON_STATUS[c.status] || COUPON_STATUS.OFF;
                  return (
                    <tr key={c.id} className={`${trCls} animate-[jw-rise_0.45s_cubic-bezier(0.16,1,0.3,1)_both]`} style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                      <td className={tdCls}>
                        <span className="flex items-center gap-2">
                          <span className="rounded-[8px] border border-dashed border-[var(--admin-accent)]/60 bg-[var(--admin-accent-soft)] px-2.5 py-1 font-mono text-[14px] font-bold tracking-wider text-[var(--tone-pink)]">{c.code}</span>
                          <CopyCode code={c.code} />
                        </span>
                        {c.description && <span className="mt-1.5 block max-w-[260px] truncate text-[13px] text-[var(--admin-text-muted)]" title={c.description}>{c.description}</span>}
                      </td>
                      <td className={tdCls}>
                        <span className="block font-semibold whitespace-nowrap text-[var(--admin-text)]">{c.rule}</span>
                        {c.discountGiven > 0 && <span className="block text-[12px] text-[var(--admin-text-muted)]">{inr(c.discountGiven)} given</span>}
                      </td>
                      <td className={`${tdCls} text-[var(--admin-text-muted)]`}><Validity c={c} /></td>
                      <td className={tdCls}><Usage c={c} /></td>
                      <td className={tdCls}>
                        <Badge tone={st.tone} dot>{st.label}</Badge>
                        {c.isPublic && <Badge tone="pink" className="ml-1.5">On bag page</Badge>}
                        {c.status === 'SCHEDULED' && <span className="mt-1 flex items-center gap-1 text-[12px] text-[var(--admin-text-dim)]"><CalendarClock size={12} /> from {fmtDate(c.startsAt)}</span>}
                      </td>
                      <td className={tdCls}>
                        <span className={toggling === c.id ? 'pointer-events-none opacity-60' : ''}>
                          <Toggle checked={c.isActive} onChange={(v) => toggle(c, v)} label={<span className="sr-only">{c.isActive ? `Switch off ${c.code}` : `Switch on ${c.code}`}</span>} />
                        </span>
                      </td>
                      <td className={`${tdCls} ${STICKY_RIGHT} text-right`}>
                        <span className="inline-flex gap-2">
                          <IconButton label={`Edit ${c.code}`} icon={Pencil} onClick={() => setEditing(c)} />
                          <IconButton label={`Delete ${c.code}`} icon={Trash2} tone="danger" onClick={() => setDeleting(c)} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="m-0 mt-4 text-[13px] text-[var(--admin-text-muted)]">
        A use is counted when the order is placed (cash on delivery) or paid (online). The discount comes off the items total — never the delivery fee — and free delivery is based on the total before the discount.
      </p>

      {editing && (
        <CouponForm
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title={used ? `${deleting?.code} has been used` : `Delete ${deleting?.code}?`}
        message={deleting && (used
          ? `It was used on ${deleting.redemptions} order${deleting.redemptions === 1 ? '' : 's'}. Deleting it would erase that history, so switch it off instead — customers won't be able to use it any more, and your reports keep the record.${deleting.isActive ? '' : ' It is already switched off.'}`
          : 'It has never been used. Customers will no longer be able to apply it. This can’t be undone.')}
        confirmLabel={used ? (deleting?.isActive ? 'Switch it off' : 'OK') : 'Delete'}
        danger={!used}
        busy={busy}
        onConfirm={used && !deleting?.isActive ? () => setDeleting(null) : confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
