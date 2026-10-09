import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  RotateCcw, Eye, Check, X, CheckCircle2, Clock, PackageCheck, ExternalLink, Play, User, Package, Image as ImageIcon, MessageSquare, Undo2,
} from 'lucide-react';
import { api } from '../../utils/api';
import {
  PageHeader, StatRow, Button, IconButton, Badge, Tabs, EmptyState, SkeletonRows, Modal, Field,
} from '../../components/admin/AdminUI';
import { tableWrapCls, tableCls, thCls, tdCls, trCls, textareaCls, ORDER_STATUS } from '../../components/admin/adminStyles';
import { RefundPanel, PriceBreakdown } from '../../components/admin/fulfilment/FulfilmentPanels';
import { RETURN_STATUS, RETURN_TYPE, inr, fmtDate, fmtDateTime } from '../../components/admin/fulfilment/fulfilmentUtils';

// Returns & replacements: customers report damaged / defective / wrong /
// missing items within 24h of delivery with photos + an unboxing video.
const TABS = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'ALL'];
const tabLabel = (k) => (k === 'ALL' ? 'All' : RETURN_STATUS[k].label);

function StatusBadge({ status }) {
  const s = RETURN_STATUS[status] || RETURN_STATUS.PENDING;
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}

function Thumbs({ media, max = 4 }) {
  if (!media?.length) return <span className="text-[12px] text-[var(--admin-text-dim)]">—</span>;
  const shown = media.slice(0, max);
  return (
    <span className="flex items-center gap-1.5">
      {shown.map((m) => (
        <span key={m.url} className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-[var(--admin-border-2)] bg-[var(--admin-bg)]">
          {m.kind === 'video'
            ? <Play size={15} className="text-[var(--admin-text-muted)]" aria-label="Video" />
            : <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />}
        </span>
      ))}
      {media.length > max && <span className="text-[12px] font-semibold text-[var(--admin-text-muted)]">+{media.length - max}</span>}
    </span>
  );
}

// Big viewer: main image / video + thumbnail strip.
function MediaViewer({ media }) {
  const [i, setI] = useState(0);
  if (!media?.length) return <p className="m-0 text-[14px] text-[var(--admin-text-muted)]">No attachments.</p>;
  const cur = media[Math.min(i, media.length - 1)];
  return (
    <div>
      <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[12px] border border-[var(--admin-border-2)] bg-black">
        {cur.kind === 'video'
          ? <video key={cur.url} src={cur.url} controls playsInline preload="metadata" className="h-full w-full object-contain" />
          : <img src={cur.url} alt={`Attachment ${i + 1}`} className="h-full w-full object-contain" />}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {media.map((m, idx) => (
          <button
            key={m.url}
            type="button"
            onClick={() => setI(idx)}
            aria-label={`Show ${m.kind === 'video' ? 'video' : 'photo'} ${idx + 1}`}
            aria-pressed={idx === i}
            className={`relative flex size-14 cursor-pointer items-center justify-center overflow-hidden rounded-[10px] border-2 bg-[var(--admin-bg)] p-0 transition-colors ${idx === i ? 'border-[var(--admin-accent)]' : 'border-transparent hover:border-[var(--admin-border-5)]'}`}
          >
            {m.kind === 'video' ? <Play size={18} className="text-[var(--admin-text)]" /> : <img src={m.url} alt="" className="h-full w-full object-cover" />}
          </button>
        ))}
        <a href={cur.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--admin-accent)] no-underline hover:underline">
          Open original <ExternalLink size={13} />
        </a>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="rounded-[14px] border border-[var(--admin-border-2)] bg-[var(--admin-surface-2)] p-4">
      <h3 className="m-0 mb-3 flex items-center gap-2 text-[12px] font-semibold tracking-[0.08em] text-[var(--admin-text-muted)] uppercase">
        <Icon size={14} strokeWidth={1.8} /> {title}
      </h3>
      {children}
    </section>
  );
}

function DetailModal({ request, onClose, onChanged }) {
  const r = request;
  const [note, setNote] = useState(r?.adminNote || '');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const act = async (status) => {
    setBusy(status || 'note'); setErr(''); setOk('');
    try {
      const body = { adminNote: note };
      if (status) body.status = status;
      const updated = await api.put(`/admin/returns/${r.id}`, body, true);
      onChanged(updated);
      setOk(status ? `Marked as ${RETURN_STATUS[status].label.toLowerCase()} — the customer has been emailed.` : 'Note saved.');
    } catch (e) { setErr(e.message || 'Could not update the request.'); }
    finally { setBusy(''); }
  };

  if (!r) return null;
  const o = r.order || {};
  const noteDirty = note.trim() !== (r.adminNote || '');
  const canRefund = r.type === 'REFUND' && ['APPROVED', 'COMPLETED'].includes(r.status);

  return (
    <Modal
      open
      onClose={onClose}
      width={720}
      title={`${RETURN_TYPE[r.type] || r.type} request #${r.id}`}
      subtitle={(
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge status={r.status} />
          {fmtDateTime(r.createdAt)} · {r.reason}
        </span>
      )}
      footer={(
        <>
          <Link to={`/admin/orders?open=${r.orderId}`} className="mr-auto inline-flex h-11 items-center gap-2 rounded-[12px] px-3 text-[15px] font-semibold text-[var(--admin-accent)] no-underline hover:underline">
            Open order #{r.orderId} <ExternalLink size={15} />
          </Link>
          {r.status === 'PENDING' && (
            <>
              <Button variant="danger-soft" icon={X} loading={busy === 'REJECTED'} disabled={!!busy} onClick={() => act('REJECTED')}>Reject</Button>
              <Button icon={Check} loading={busy === 'APPROVED'} disabled={!!busy} onClick={() => act('APPROVED')} className="bg-[var(--tone-green)]! shadow-none!">Approve</Button>
            </>
          )}
          {r.status === 'APPROVED' && (
            <>
              <Button variant="danger-soft" icon={X} loading={busy === 'REJECTED'} disabled={!!busy} onClick={() => act('REJECTED')}>Reject</Button>
              <Button icon={CheckCircle2} loading={busy === 'COMPLETED'} disabled={!!busy} onClick={() => act('COMPLETED')}>Mark completed</Button>
            </>
          )}
          {r.status === 'REJECTED' && (
            <Button variant="secondary" icon={Undo2} loading={busy === 'PENDING'} disabled={!!busy} onClick={() => act('PENDING')}>Reopen</Button>
          )}
        </>
      )}
    >
      <div className="flex flex-col gap-4">
        {err && <p role="alert" className="m-0 rounded-[12px] border border-[var(--tone-red)]/30 bg-[var(--tone-red)]/10 px-4 py-3 text-[14px] text-[var(--tone-red)]">{err}</p>}
        {ok && <p role="status" className="m-0 rounded-[12px] border border-[var(--tone-green)]/30 bg-[var(--tone-green)]/10 px-4 py-3 text-[14px] text-[var(--tone-green)]">{ok}</p>}

        <Section icon={ImageIcon} title={`Photos & video (${r.media?.length || 0})`}>
          <MediaViewer media={r.media} />
        </Section>

        <Section icon={MessageSquare} title="What the customer said">
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge tone={r.type === 'REFUND' ? 'pink' : 'blue'}>Wants a {(RETURN_TYPE[r.type] || r.type).toLowerCase()}</Badge>
            <Badge tone="muted">{r.reason}</Badge>
          </div>
          <p className="m-0 text-[14px] leading-relaxed whitespace-pre-wrap text-[var(--admin-text)]">{r.description || <span className="text-[var(--admin-text-muted)]">No description.</span>}</p>
        </Section>

        <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
          <Section icon={User} title="Customer">
            <p className="m-0 text-[14px] font-semibold text-[var(--admin-text)]">{r.customer?.name || o.address?.name || 'Customer'}</p>
            {r.customer?.email && <p className="m-0 text-[13px] break-all text-[var(--admin-text-muted)]">{r.customer.email}</p>}
            {(r.customer?.phone || o.address?.phone) && <p className="m-0 text-[13px] text-[var(--admin-text-muted)]">{r.customer?.phone || o.address?.phone}</p>}
            {r.customer?.id && <Link to={`/admin/customers/${r.customer.id}`} className="mt-2 inline-block text-[13px] font-semibold text-[var(--admin-accent)] no-underline hover:underline">View customer</Link>}
          </Section>
          <Section icon={Clock} title="Order timing">
            <p className="m-0 text-[14px] text-[var(--admin-text)]">Order #{o.id} · <Badge tone={ORDER_STATUS[o.status]?.tone}>{ORDER_STATUS[o.status]?.label || o.status}</Badge></p>
            <p className="m-0 mt-1.5 text-[13px] text-[var(--admin-text-muted)]">Delivered {fmtDateTime(o.deliveredAt || o.updatedAt)}</p>
            <p className="m-0 text-[13px] text-[var(--admin-text-muted)]">Reported {fmtDateTime(r.createdAt)}</p>
            <p className="m-0 text-[13px] text-[var(--admin-text-muted)]">Paid via {o.paymentMethod === 'RAZORPAY' ? `Razorpay (${String(o.paymentStatus).toLowerCase()})` : o.paymentMethod === 'CREDITS' ? 'ZUNUZ Credits' : 'cash on delivery'}{o.paymentMethod !== 'CREDITS' && (o.creditsUsed || 0) > 0 ? ` + ₹${o.creditsUsed} credits` : ''}</p>
          </Section>
        </div>

        <Section icon={Package} title={`Order items (${o.items?.length || 0})`}>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {o.items?.map((it) => (
              <li key={it.id} className="flex items-center gap-3">
                <span className="size-11 shrink-0 overflow-hidden rounded-[10px] border border-[var(--admin-border-2)] bg-white">
                  {it.product?.image && <img src={it.product.image} alt="" className="h-full w-full object-contain" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-[var(--admin-text)]">{it.product?.name}</span>
                  <span className="text-[13px] text-[var(--admin-text-muted)]">Qty {it.quantity} × {inr(it.price)}</span>
                </span>
                <span className="text-[14px] font-semibold text-[var(--admin-text)] tabular-nums">{inr(it.quantity * it.price)}</span>
              </li>
            ))}
          </ul>
          <PriceBreakdown order={o} big={false} />
        </Section>

        {canRefund && (
          <RefundPanel
            key={`rf-${r.id}`}
            order={o}
            title="Refund this return"
            submit={(body) => api.post(`/admin/returns/${r.id}/refund`, body, true)}
            onDone={(updated) => {
              if (updated) onChanged(updated);
              else api.get(`/admin/returns/${r.id}`, true).then(onChanged).catch(() => { /* keep */ });
            }}
          />
        )}

        <Section icon={MessageSquare} title="Note to the customer">
          <Field hint="Shown to the customer in My Orders and included in the status email.">
            <textarea className={`${textareaCls} min-h-[80px] resize-y text-[14px]`} value={note} maxLength={2000} aria-label="Note to the customer" placeholder="e.g. We'll ship a replacement within 3 days. No need to return the damaged piece." onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="secondary" icon={Check} loading={busy === 'note'} disabled={!noteDirty || !!busy} onClick={() => act(null)}>Save note</Button>
          </div>
        </Section>
      </div>
    </Modal>
  );
}

export default function ReturnsPage() {
  const [tab, setTab] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [res, setRes] = useState({ key: null, requests: [], total: 0, pages: 1 });
  const [counts, setCounts] = useState({});
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [params, setParams] = useSearchParams();
  const openParam = Number(params.get('open')) || null;

  const key = `${tab}:${page}:${tick}`;
  const loading = res.key == null || !res.key.startsWith(`${tab}:${page}:`);

  useEffect(() => {
    let alive = true;
    const q = new URLSearchParams({ page });
    if (tab !== 'ALL') q.set('status', tab);
    api.get(`/admin/returns?${q}`, true)
      .then((d) => { if (alive) { setRes({ key, requests: d.requests || [], total: d.total || 0, pages: d.pages || 1 }); setError(''); } })
      .catch((e) => { if (alive) { setRes((r) => ({ ...r, key })); setError(e.message || 'Could not load return requests.'); } });
    api.get('/admin/returns/counts', true).then((c) => { if (alive) setCounts(c); }).catch(() => { /* tabs show no counts */ });
    return () => { alive = false; };
  }, [tab, page, key]);

  useEffect(() => {
    if (!openParam) return undefined;
    let alive = true;
    api.get(`/admin/returns/${openParam}`, true)
      .then((r) => { if (alive) setDetail(r); })
      .catch((e) => { if (alive) setError(e.message || `Could not open request #${openParam}.`); });
    return () => { alive = false; };
  }, [openParam]);

  const close = () => { setDetail(null); if (openParam) setParams({}, { replace: true }); };
  const changed = useCallback((r) => {
    setDetail(r);
    setRes((s) => ({ ...s, requests: s.requests.map((x) => (x.id === r.id ? r : x)) }));
    setTick((t) => t + 1);
  }, []);

  const c = (k) => counts[k] ?? '—';
  const stats = [
    { label: 'Pending review', icon: Clock, value: c('PENDING'), tone: counts.PENDING ? 'pink' : 'muted', sub: 'Waiting for a decision' },
    { label: 'Approved', icon: Check, value: c('APPROVED'), tone: 'blue', sub: 'Replacement / refund to send' },
    { label: 'Completed', icon: PackageCheck, value: c('COMPLETED'), tone: 'green', sub: 'Resolved' },
    { label: 'Rejected', icon: X, value: c('REJECTED'), tone: 'muted', sub: 'Not eligible' },
  ];
  const { requests, total, pages } = res;

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader title="Returns" subtitle={`Damaged, defective, wrong or missing items — reported within 24 hours of delivery. ${total} ${tab === 'ALL' ? 'total' : tabLabel(tab).toLowerCase()}.`}>
        <StatRow items={stats} />
      </PageHeader>

      <Tabs items={TABS.map((k) => ({ key: k, label: tabLabel(k), count: counts[k] }))} value={tab} onChange={(k) => { setTab(k); setPage(1); }} className="mb-5" />

      {error && <p role="alert" className="m-0 mb-4 rounded-[12px] border border-[var(--tone-red)]/30 bg-[var(--tone-red)]/10 px-4 py-3 text-[14px] text-[var(--tone-red)]">{error}</p>}

      <div className={`${tableWrapCls} animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]`} style={{ animationDelay: '120ms' }}>
        {loading ? (
          <SkeletonRows rows={5} />
        ) : requests.length === 0 ? (
          <EmptyState icon={RotateCcw} title={tab === 'PENDING' ? 'Nothing to review' : 'No requests here'} text={tab === 'PENDING' ? 'New return and replacement requests from customers will show up here.' : `There are no ${tab === 'ALL' ? '' : `${tabLabel(tab).toLowerCase()} `}requests.`} />
        ) : (
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead>
                <tr>{['Request', 'Order', 'Customer', 'Type', 'Reason', 'Media', 'Date', 'Status', ''].map((h) => <th key={h || 'actions'} className={thCls}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className={`${trCls} cursor-pointer`} onClick={() => setDetail(r)}>
                    <td className={`${tdCls} font-semibold text-[var(--admin-text)]`}>#{r.id}</td>
                    <td className={tdCls} onClick={(e) => e.stopPropagation()}>
                      <Link to={`/admin/orders?open=${r.orderId}`} className="font-medium text-[var(--admin-text)] no-underline hover:text-[var(--admin-accent)] hover:underline">#{r.orderId}</Link>
                    </td>
                    <td className={tdCls}>
                      <span className="block max-w-[180px] truncate font-medium text-[var(--admin-text)]">{r.customer?.name || r.order?.address?.name || 'Customer'}</span>
                      <span className="block max-w-[180px] truncate text-[12px] text-[var(--admin-text-muted)]">{r.customer?.email || r.customer?.phone}</span>
                    </td>
                    <td className={tdCls}><Badge tone={r.type === 'REFUND' ? 'pink' : 'blue'}>{RETURN_TYPE[r.type] || r.type}</Badge></td>
                    <td className={`${tdCls} whitespace-nowrap text-[var(--admin-text)]`}>{r.reason}</td>
                    <td className={tdCls}><Thumbs media={r.media} /></td>
                    <td className={`${tdCls} whitespace-nowrap text-[13px] text-[var(--admin-text-muted)]`}>{fmtDate(r.createdAt)}</td>
                    <td className={tdCls}><StatusBadge status={r.status} /></td>
                    <td className={tdCls} onClick={(e) => e.stopPropagation()}>
                      <IconButton label={`View request #${r.id}`} icon={Eye} tone="accent" onClick={() => setDetail(r)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-5 flex flex-wrap justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button key={p} type="button" aria-current={page === p ? 'page' : undefined} onClick={() => setPage(p)} className={`size-9 cursor-pointer rounded-[10px] border-0 text-[13px] font-semibold tabular-nums transition-colors ${page === p ? 'bg-[var(--admin-accent)] text-white' : 'bg-[var(--admin-hover-3)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'}`}>{p}</button>
          ))}
        </nav>
      )}

      {detail && <DetailModal key={detail.id} request={detail} onClose={close} onChanged={changed} />}
    </div>
  );
}
