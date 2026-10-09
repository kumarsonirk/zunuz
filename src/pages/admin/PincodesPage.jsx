import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ClipboardPaste, Pencil, Trash2, MapPin, MapPinCheck, Banknote, ShieldCheck, Globe } from 'lucide-react';
import { PageHeader, StatRow, Button, IconButton, Badge, SearchInput, EmptyState, SkeletonRows, ConfirmDialog, Toggle } from '../../components/admin/AdminUI';
import { DISPLAY, cardCls, tableWrapCls, tableCls, thCls, tdCls, trCls } from '../../components/admin/adminStyles';
import PincodeForm from '../../components/admin/checkout/PincodeForm';
import BulkPincodes from '../../components/admin/checkout/BulkPincodes';
import { api } from '../../utils/api';

// Delivery pincodes (/admin/pincodes, "settings" permission). The list sets
// COD availability + delivery time per pincode; with the Settings switch
// "Only deliver to listed pincodes" on, it's also the full list of places
// we deliver to (checkout and the server block everything else).
const PAGE = 100;

function RestrictionCallout({ restricted }) {
  if (restricted == null) return <div className={`${cardCls} mb-5 h-[92px] animate-pulse`} />;
  const Icon = restricted ? ShieldCheck : Globe;
  return (
    <div className={`${cardCls} mb-5 flex flex-wrap items-start gap-4 px-5 py-4`} style={{ borderColor: `color-mix(in srgb, var(--tone-${restricted ? 'blue' : 'yellow'}) 35%, transparent)` }}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full" style={{ color: `var(--tone-${restricted ? 'blue' : 'yellow'})`, background: `color-mix(in srgb, var(--tone-${restricted ? 'blue' : 'yellow'}) 14%, transparent)` }}><Icon size={19} /></span>
      <div className="min-w-0 flex-1">
        <p className={`m-0 flex flex-wrap items-center gap-2 text-[16px] font-bold text-[var(--admin-text)] ${DISPLAY}`}>
          “Only deliver to listed pincodes” is {restricted ? <Badge tone="blue" dot>On</Badge> : <Badge tone="yellow" dot>Off</Badge>}
        </p>
        <p className="m-0 mt-1 text-[14px] leading-relaxed text-[var(--admin-text-muted)]">
          {restricted
            ? 'Shoppers can only order to active pincodes on this list — every other pincode is told “we don’t deliver here yet”.'
            : 'Every valid Indian pincode can order. This list only adds details: whether COD is available and the delivery time shown to shoppers.'}
        </p>
      </div>
      <Link to="/admin/settings" className="self-center text-[14px] font-semibold whitespace-nowrap text-[var(--admin-accent)] no-underline hover:underline">Change in Settings →</Link>
    </div>
  );
}

export default function PincodesPage() {
  const [data, setData] = useState(null); // { items, total, stats }
  const [restricted, setRestricted] = useState(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | row
  const [bulk, setBulk] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const reqId = useRef(0);

  const load = useCallback((term, keep = 0) => {
    const id = ++reqId.current;
    const take = Math.max(PAGE, keep);
    return api.get(`/admin/pincodes?take=${take}${term ? `&q=${encodeURIComponent(term)}` : ''}`, true)
      .then((d) => { if (id === reqId.current) { setData(d); setError(''); } })
      .catch((e) => { if (id === reqId.current) { setError(e.message || 'Could not load pincodes.'); setData((cur) => cur || { items: [], total: 0, stats: null }); } });
  }, []);

  // Search (debounced).
  useEffect(() => {
    const t = setTimeout(() => load(q.trim()), q ? 250 : 0);
    return () => clearTimeout(t);
  }, [q, load]);

  useEffect(() => {
    api.get('/settings').then((s) => setRestricted(!!s.pincodeRestriction)).catch(() => setRestricted(false));
  }, []);

  const reload = () => load(q.trim(), data?.items.length || 0);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const d = await api.get(`/admin/pincodes?take=${PAGE}&skip=${data.items.length}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`, true);
      setData((cur) => ({ ...d, items: [...cur.items, ...d.items] }));
    } catch (e) { setError(e.message || 'Could not load more.'); }
    finally { setLoadingMore(false); }
  };

  const patch = async (row, change) => {
    setData((d) => ({ ...d, items: d.items.map((x) => (x.pincode === row.pincode ? { ...x, ...change } : x)) }));
    try { await api.put(`/admin/pincodes/${row.pincode}`, change, true); }
    catch (e) { setError(e.message || 'Could not update the pincode.'); }
    finally { reload(); }
  };

  const remove = async () => {
    setBusy(true);
    try { await api.delete(`/admin/pincodes/${deleting.pincode}`, true); setDeleting(null); reload(); }
    catch (e) { setError(e.message || 'Could not delete.'); setDeleting(null); }
    finally { setBusy(false); }
  };

  const s = data?.stats;
  const stats = [
    { label: 'Listed pincodes', value: s ? s.total.toLocaleString('en-IN') : '–', icon: MapPin, sub: s ? `${(s.total - s.active).toLocaleString('en-IN')} inactive` : ' ', tone: 'blue' },
    { label: 'Delivering', value: s ? s.active.toLocaleString('en-IN') : '–', icon: MapPinCheck, sub: 'Active pincodes', tone: 'green' },
    { label: 'COD available', value: s ? s.cod.toLocaleString('en-IN') : '–', icon: Banknote, sub: s ? `${(s.active - s.cod).toLocaleString('en-IN')} prepaid only` : ' ', tone: 'pink' },
  ];

  const items = data?.items || [];
  return (
    <div className="mx-auto max-w-[1480px]">
      <PageHeader
        title="Delivery pincodes"
        subtitle="Where we deliver, how long it takes, and where cash on delivery is offered."
        actions={(
          <>
            <Button variant="secondary" icon={ClipboardPaste} onClick={() => setBulk(true)}>Bulk add</Button>
            <Button icon={Plus} onClick={() => setEditing('new')}>Add pincode</Button>
          </>
        )}
      >
        <StatRow items={stats} />
      </PageHeader>

      <RestrictionCallout restricted={restricted} />

      {error && <p role="alert" className="m-0 mb-4 rounded-[12px] bg-[var(--tone-red)]/10 px-4 py-3 text-[14px] font-medium text-[var(--tone-red)]">{error}</p>}
      {notice && <p role="status" className="m-0 mb-4 rounded-[12px] bg-[var(--tone-green)]/10 px-4 py-3 text-[14px] font-medium text-[var(--tone-green)]">{notice}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pincode, city or state" aria-label="Search pincodes" className="w-full max-w-[360px] max-[640px]:max-w-none" />
        {data && <span className="text-[13px] text-[var(--admin-text-muted)]">{q.trim() ? `${data.total.toLocaleString('en-IN')} match${data.total === 1 ? '' : 'es'}` : `${data.total.toLocaleString('en-IN')} pincode${data.total === 1 ? '' : 's'}`}</span>}
      </div>

      <div className={tableWrapCls}>
        {data === null ? <SkeletonRows rows={5} /> : items.length === 0 ? (
          q.trim()
            ? <EmptyState icon={MapPin} title="No matching pincodes" text={`Nothing matches “${q.trim()}”.`} />
            : <EmptyState icon={MapPin} title="No pincodes listed yet" text="Add the pincodes you deliver to — one by one, or paste a whole list from a spreadsheet." action={<Button icon={ClipboardPaste} onClick={() => setBulk(true)}>Bulk add pincodes</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead><tr>{['Pincode', 'Area', 'Delivery time', 'COD', 'Active', ''].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr></thead>
              <tbody>
                {items.map((p, i) => (
                  <tr key={p.pincode} className={`${trCls} ${p.isActive ? '' : 'opacity-60'} animate-[jw-rise_0.4s_cubic-bezier(0.16,1,0.3,1)_both]`} style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
                    <td className={`${tdCls} font-mono text-[15px] font-bold tracking-wider text-[var(--admin-text)]`}>{p.pincode}</td>
                    <td className={tdCls}>
                      <span className="block font-semibold text-[var(--admin-text)]">{p.city || <span className="font-normal text-[var(--admin-text-dim)]">—</span>}</span>
                      {p.state && <span className="block text-[13px] text-[var(--admin-text-muted)]">{p.state}</span>}
                    </td>
                    <td className={`${tdCls} whitespace-nowrap text-[var(--admin-text-muted)]`}>{p.etaDays || <span className="text-[var(--admin-text-dim)]">2–7 business days</span>}</td>
                    <td className={tdCls}><Toggle checked={p.codAvailable} onChange={(v) => patch(p, { codAvailable: v })} label={<span className="sr-only">Cash on delivery for {p.pincode}</span>} /></td>
                    <td className={tdCls}><Toggle checked={p.isActive} onChange={(v) => patch(p, { isActive: v })} label={<span className="sr-only">Deliver to {p.pincode}</span>} /></td>
                    <td className={`${tdCls} text-right`}>
                      <span className="inline-flex gap-2">
                        <IconButton label={`Edit ${p.pincode}`} icon={Pencil} onClick={() => setEditing(p)} />
                        <IconButton label={`Delete ${p.pincode}`} icon={Trash2} tone="danger" onClick={() => setDeleting(p)} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length < data.total && (
              <div className="flex items-center justify-center gap-3 border-t border-[var(--admin-border-1)] px-4 py-3">
                <span className="text-[13px] text-[var(--admin-text-muted)]">Showing {items.length.toLocaleString('en-IN')} of {data.total.toLocaleString('en-IN')}</span>
                <Button variant="secondary" size="sm" loading={loadingMore} onClick={loadMore}>Load more</Button>
              </div>
            )}
          </div>
        )}
      </div>

      {editing && (
        <PincodeForm
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => { setEditing(null); setNotice(`Saved ${saved.pincode}.`); reload(); }}
        />
      )}
      {bulk && (
        <BulkPincodes
          onClose={() => setBulk(false)}
          onSaved={(r) => {
            setBulk(false);
            setNotice(`Added ${r.created} new pincode${r.created === 1 ? '' : 's'}${r.updated ? `, updated ${r.updated}` : ''}${r.skipped ? `, left ${r.skipped} unchanged` : ''}.`);
            reload();
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title={`Remove ${deleting?.pincode}?`}
        message={deleting && (restricted
          ? `Shoppers in ${deleting.city || deleting.pincode} won't be able to order any more (only listed pincodes are delivered to). Tip: switch it to inactive instead if it's temporary.`
          : `Its delivery time and COD setting will be forgotten — shoppers there will see the default delivery time, and COD will follow the store setting.`)}
        confirmLabel="Remove"
        busy={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
