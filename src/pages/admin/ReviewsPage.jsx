import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, MessageSquare, Trash2, Camera, Sparkles, Check, X, Clock, ShieldCheck } from 'lucide-react';
import { api } from '../../utils/api';
import {
  PageHeader, StatRow, Button, IconButton, Tabs, SearchInput, Select, Badge, EmptyState, SkeletonRows, Modal, ConfirmDialog, Field,
} from '../../components/admin/AdminUI';
import { DISPLAY, textareaCls, tableWrapCls, tableCls, thCls, tdCls, trCls } from '../../components/admin/adminStyles';

// Reviews (/admin/reviews): stat tiles, status tabs (Pending / Approved /
// All — Pending first while anything waits), a rating filter and search, and
// a table of reviews. Pending reviews (review moderation, admin Settings)
// can be approved one by one or in bulk, or rejected (deleted). Clicking a
// row opens the review to edit rating / comment, approve or delete it.

const rise = 'animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]';
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const isPending = (r) => r.isApproved === false;
// Ask the sidebar to refresh its badge counts (AdminLayout may listen for it).
const pingBadges = () => { try { window.dispatchEvent(new Event('zunuz:admin-badges')); } catch { /* ignore */ } };

function StarRating({ value, onChange, size = 16 }) {
  const interactive = !!onChange;
  return (
    <div className="flex gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={interactive ? () => onChange(n) : undefined}
          disabled={!interactive}
          aria-label={interactive ? `${n} star${n > 1 ? 's' : ''}` : undefined}
          className={`flex border-0 bg-transparent p-0 ${interactive ? 'cursor-pointer transition-transform hover:scale-115' : 'cursor-default'}`}
        >
          <Star
            size={size}
            strokeWidth={1.5}
            className={n <= value ? 'text-[var(--tone-yellow)]' : 'text-[var(--admin-border-4)]'}
            fill={n <= value ? 'currentColor' : 'none'}
          />
        </button>
      ))}
    </div>
  );
}

function ProductThumb({ src, size = 'size-10' }) {
  // Product shots are cut out on white, so the tile stays white in both themes.
  return (
    <span className={`flex ${size} shrink-0 overflow-hidden rounded-[10px] border border-[var(--admin-border-2)] bg-white`}>
      {src && <img src={src} alt="" className="h-full w-full object-contain" />}
    </span>
  );
}

function InfoBlock({ label, children }) {
  return (
    <div className="rounded-[14px] border border-[var(--admin-border-2)] bg-[var(--admin-surface-2)] p-4">
      <p className="m-0 mb-2.5 text-[12px] font-semibold tracking-[0.08em] text-[var(--admin-text-muted)] uppercase">{label}</p>
      {children}
    </div>
  );
}

function Checkbox({ checked, indeterminate = false, onChange, label }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      ref={(el) => { if (el) el.indeterminate = indeterminate; }}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      className="size-[18px] cursor-pointer accent-[var(--admin-accent)]"
    />
  );
}

const STATUS = {
  pending: { label: 'Pending', test: isPending },
  approved: { label: 'Approved', test: (r) => !isPending(r) },
  all: { label: 'All', test: () => true },
};

const RATING_FILTERS = [
  { key: 'any', label: 'Any rating', test: () => true },
  { key: 'photos', label: 'With photos', test: (r) => !!r.image },
  { key: '5', label: '5 ★', test: (r) => r.rating === 5 },
  { key: '4', label: '4 ★', test: (r) => r.rating === 4 },
  { key: 'low', label: '3 ★ or less', test: (r) => r.rating <= 3 },
];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [detail, setDetail] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [confirm, setConfirm] = useState(null); // { id, pending }
  const [deleteError, setDeleteError] = useState('');
  const [approvingIds, setApprovingIds] = useState([]);
  const [actionError, setActionError] = useState('');
  const [photo, setPhoto] = useState(null);
  const [status, setStatus] = useState(null); // null until loaded → pending first if any
  const [ratingFilter, setRatingFilter] = useState('any');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => new Set());

  useEffect(() => {
    let alive = true;
    api.get('/admin/reviews', true)
      .then((data) => {
        if (!alive) return;
        const list = data || [];
        setReviews(list);
        setStatus((s) => s || (list.some(isPending) ? 'pending' : 'all'));
      })
      .catch((e) => { if (alive) { setLoadError(e.message || 'Could not load reviews'); setStatus('all'); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const openDetail = (review) => {
    setDetail(review);
    setEditRating(review.rating);
    setEditComment(review.comment || '');
    setSaveError('');
  };

  const replace = (updated) => {
    setReviews((list) => list.map((r) => (r.id === updated.id ? updated : r)));
    setDetail((d) => (d?.id === updated.id ? updated : d));
  };

  const saveEdit = async () => {
    setSaving(true);
    setSaveError('');
    try {
      replace(await api.put(`/admin/reviews/${detail.id}`, { rating: editRating, comment: editComment }, true));
    } catch (e) { setSaveError(e.message); } finally { setSaving(false); }
  };

  const approve = async (ids) => {
    if (!ids.length) return;
    setApprovingIds(ids);
    setActionError('');
    try {
      if (ids.length === 1) {
        replace(await api.put(`/admin/reviews/${ids[0]}`, { isApproved: true }, true));
      } else {
        await api.post('/admin/reviews/approve', { ids }, true);
        const set = new Set(ids);
        setReviews((list) => list.map((r) => (set.has(r.id) ? { ...r, isApproved: true } : r)));
      }
      setSelected((s) => { const n = new Set(s); ids.forEach((id) => n.delete(id)); return n; });
      pingBadges();
    } catch (e) { setActionError(e.message || 'Could not approve'); } finally { setApprovingIds([]); }
  };

  const askDelete = (r) => { setConfirm({ id: r.id, pending: isPending(r) }); setDeleteError(''); };
  const deleteReview = async () => {
    const { id } = confirm;
    setDeletingId(id);
    setDeleteError('');
    try {
      await api.delete(`/admin/reviews/${id}`, true);
      setReviews((list) => list.filter((r) => r.id !== id));
      setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
      if (detail?.id === id) setDetail(null);
      setConfirm(null);
      pingBadges();
    } catch (e) { setDeleteError(e.message); } finally { setDeletingId(null); }
  };

  const approvedList = useMemo(() => reviews.filter((r) => !isPending(r)), [reviews]);
  const pendingCount = reviews.length - approvedList.length;
  const stats = useMemo(() => {
    const list = approvedList;
    const n = list.length;
    const avg = n ? list.reduce((s, r) => s + (r.rating || 0), 0) / n : 0;
    const photos = list.filter((r) => r.image).length;
    const fives = list.filter((r) => r.rating === 5).length;
    const low = list.filter((r) => r.rating <= 2).length;
    return { n, avg, photos, fives, low };
  }, [approvedList]);

  const tabKeys = pendingCount ? ['pending', 'approved', 'all'] : ['all', 'approved', 'pending'];
  const tabs = tabKeys.map((k) => ({ key: k, label: STATUS[k].label, count: reviews.filter(STATUS[k].test).length }));
  const activeStatus = status || 'all';
  const q = search.trim().toLowerCase();
  const shown = reviews
    .filter(STATUS[activeStatus].test)
    .filter(RATING_FILTERS.find((f) => f.key === ratingFilter).test)
    .filter((r) => !q || [r.product?.name, r.customer?.name, r.customer?.email, r.comment].some((v) => v?.toLowerCase().includes(q)));

  // Bulk selection works on the pending reviews currently shown.
  const shownPending = shown.filter(isPending);
  const selectedShown = shownPending.filter((r) => selected.has(r.id));
  const allSelected = shownPending.length > 0 && selectedShown.length === shownPending.length;
  const toggleAll = (on) => setSelected((s) => {
    const n = new Set(s);
    shownPending.forEach((r) => (on ? n.add(r.id) : n.delete(r.id)));
    return n;
  });
  const toggleOne = (id, on) => setSelected((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
  const showSelect = shownPending.length > 0;
  const busyApprove = (id) => approvingIds.includes(id);

  return (
    <div className="mx-auto max-w-[1480px]">
      <PageHeader
        title="Reviews"
        subtitle={`${reviews.length} product ${reviews.length === 1 ? 'review' : 'reviews'} total${pendingCount ? ` · ${pendingCount} awaiting approval` : ''}`}
        actions={<Link to="/admin/settings" className="text-[14px] font-semibold text-[var(--admin-accent)] no-underline hover:underline">Moderation settings →</Link>}
      >
        {!loading && reviews.length > 0 && (
          <StatRow
            items={[
              ...(pendingCount ? [{ label: 'Awaiting approval', value: pendingCount, icon: Clock, sub: 'Not visible to shoppers yet', tone: 'yellow' }] : []),
              { label: 'Published reviews', value: stats.n, icon: MessageSquare, sub: stats.low ? `${stats.low} rated 2★ or lower` : 'No low ratings', tone: stats.low ? 'red' : 'green' },
              { label: 'Average rating', value: stats.n ? `${stats.avg.toFixed(1)} ★` : '–', icon: Star, sub: 'published reviews, out of 5', tone: 'yellow' },
              { label: 'With photos', value: stats.photos, icon: Camera, sub: stats.n ? `${Math.round((stats.photos / stats.n) * 100)}% of reviews` : '—', tone: 'blue' },
              { label: '5★ share', value: stats.n ? `${Math.round((stats.fives / stats.n) * 100)}%` : '–', icon: Sparkles, sub: `${stats.fives} five-star ${stats.fives === 1 ? 'review' : 'reviews'}`, tone: 'pink' },
            ]}
          />
        )}
      </PageHeader>

      {!loading && reviews.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Tabs items={tabs} value={activeStatus} onChange={(k) => { setStatus(k); setActionError(''); }} className="max-w-full" />
          <Select aria-label="Filter by rating" value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} className="w-[170px]">
            {RATING_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </Select>
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, customer, comment…" className="min-w-[220px] flex-1 sm:max-w-[360px]" />
        </div>
      )}

      {/* Bulk bar */}
      {selectedShown.length > 0 && (
        <div className={`mb-3 flex flex-wrap items-center gap-3 rounded-[14px] border border-[var(--admin-accent)]/40 bg-[var(--admin-accent-soft)] px-4 py-2.5 ${rise}`} role="region" aria-label="Bulk actions">
          <span className="text-[14px] font-semibold text-[var(--admin-text)]">{selectedShown.length} selected</span>
          <Button size="sm" icon={Check} loading={approvingIds.length > 1} onClick={() => approve(selectedShown.map((r) => r.id))}>Approve selected</Button>
          <Button size="sm" variant="ghost" onClick={() => toggleAll(false)}>Clear</Button>
        </div>
      )}
      {actionError && <p role="alert" className="m-0 mb-3 text-[13px] font-semibold text-[var(--tone-red)]">{actionError}</p>}

      <div className={tableWrapCls}>
        {loading ? (
          <SkeletonRows rows={6} />
        ) : loadError ? (
          <EmptyState icon={MessageSquare} title="Couldn't load reviews" text={loadError} action={<Button variant="secondary" onClick={() => window.location.reload()}>Try again</Button>} />
        ) : reviews.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No reviews yet" text="Customer reviews will appear here once they start rating products." />
        ) : shown.length === 0 ? (
          activeStatus === 'pending' && !q && ratingFilter === 'any'
            ? <EmptyState icon={ShieldCheck} title="All caught up" text="No reviews are waiting for approval." />
            : <EmptyState icon={MessageSquare} title="No matching reviews" text="Try a different filter or search." />
        ) : (
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead>
                <tr>
                  {showSelect && (
                    <th className={`${thCls} w-10`}>
                      <Checkbox label="Select all pending reviews" checked={allSelected} indeterminate={!allSelected && selectedShown.length > 0} onChange={toggleAll} />
                    </th>
                  )}
                  {['Product', 'Customer', 'Rating', 'Comment', 'Photo', 'Status', 'Date', ''].map((h, i) => (
                    <th key={h || i} className={`${thCls} ${h ? '' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => {
                  const pending = isPending(r);
                  return (
                    <tr key={r.id} className={`${trCls} cursor-pointer ${rise}`} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }} onClick={() => openDetail(r)}>
                      {showSelect && (
                        <td className={tdCls} onClick={(e) => e.stopPropagation()}>
                          {pending && <Checkbox label={`Select review #${r.id}`} checked={selected.has(r.id)} onChange={(on) => toggleOne(r.id, on)} />}
                        </td>
                      )}
                      <td className={tdCls}>
                        <div className="flex items-center gap-3">
                          <ProductThumb src={r.product?.image} />
                          <span className="block max-w-[180px] truncate font-semibold text-[var(--admin-text)]">{r.product?.name}</span>
                        </div>
                      </td>
                      <td className={tdCls}>
                        <span className="block max-w-[170px] truncate font-medium text-[var(--admin-text)]">{r.customer?.name}</span>
                        <span className="block max-w-[170px] truncate text-[12px] text-[var(--admin-text-muted)]">{r.customer?.email}</span>
                      </td>
                      <td className={tdCls}><StarRating value={r.rating} size={14} /></td>
                      <td className={`${tdCls} max-w-[200px] truncate text-[var(--admin-text-muted)]`}>{r.comment || '—'}</td>
                      <td className={tdCls} onClick={(e) => e.stopPropagation()}>
                        {r.image ? (
                          <button type="button" onClick={() => setPhoto(r.image)} aria-label="View photo" className="block size-10 cursor-zoom-in overflow-hidden rounded-[10px] border border-[var(--admin-border-2)] p-0 transition-transform hover:scale-105">
                            <img src={r.image} alt="" className="h-full w-full object-cover" />
                          </button>
                        ) : <span className="text-[var(--admin-text-dim)]">—</span>}
                      </td>
                      <td className={tdCls}>{pending ? <Badge tone="yellow" dot>Pending</Badge> : <Badge tone="green" dot>Published</Badge>}</td>
                      <td className={`${tdCls} text-[13px] whitespace-nowrap text-[var(--admin-text-muted)]`}>{fmtDate(r.createdAt)}</td>
                      <td className={`${tdCls} text-right`} onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          {pending && (
                            <>
                              <IconButton label="Approve review" icon={Check} tone="accent" disabled={busyApprove(r.id)} onClick={() => approve([r.id])} />
                              <IconButton label="Reject review" icon={X} tone="danger" disabled={deletingId === r.id} onClick={() => askDelete(r)} />
                            </>
                          )}
                          {!pending && <IconButton label="Delete review" icon={Trash2} tone="danger" disabled={deletingId === r.id} onClick={() => askDelete(r)} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review detail / edit */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        width={520}
        title={detail ? `Review #${detail.id}` : ''}
        subtitle={detail ? `${fmtDate(detail.createdAt)}${isPending(detail) ? ' · awaiting approval' : ''}` : ''}
        footer={detail && (
          <>
            <Button variant="danger-soft" icon={isPending(detail) ? X : Trash2} loading={deletingId === detail.id} onClick={() => askDelete(detail)} className="mr-auto">{isPending(detail) ? 'Reject' : 'Delete review'}</Button>
            {isPending(detail) && <Button variant="secondary" icon={Check} loading={busyApprove(detail.id)} onClick={() => approve([detail.id])}>Approve</Button>}
            <Button loading={saving} onClick={saveEdit}>Save changes</Button>
          </>
        )}
      >
        {detail && (
          <div className="flex flex-col gap-3.5">
            {isPending(detail) && (
              <div className="flex items-center gap-2.5 rounded-[12px] border border-[var(--tone-yellow)]/40 bg-[var(--tone-yellow)]/10 px-3.5 py-2.5 text-[13px] font-medium text-[var(--admin-text)]">
                <Clock size={16} className="shrink-0 text-[var(--tone-yellow)]" /> Shoppers can't see this review until you approve it.
              </div>
            )}
            <div className="grid gap-3.5 sm:grid-cols-2">
              <InfoBlock label="Product">
                <div className="flex items-center gap-3">
                  <ProductThumb src={detail.product?.image} size="size-11" />
                  <span className={`min-w-0 text-[15px] font-semibold text-[var(--admin-text)] ${DISPLAY}`}>{detail.product?.name}</span>
                </div>
              </InfoBlock>
              <InfoBlock label="Customer">
                <p className="m-0 font-semibold text-[var(--admin-text)]">{detail.customer?.name}</p>
                <p className="m-0 truncate text-[13px] text-[var(--admin-text-muted)]">{detail.customer?.email}</p>
              </InfoBlock>
            </div>

            {detail.image && (
              <InfoBlock label="Photo">
                <button type="button" onClick={() => setPhoto(detail.image)} className="block cursor-zoom-in overflow-hidden rounded-[12px] border-0 p-0">
                  <img src={detail.image} alt="Review" className="block max-h-[220px] w-auto max-w-full rounded-[12px] object-cover transition-transform duration-500 hover:scale-[1.03]" />
                </button>
              </InfoBlock>
            )}

            <InfoBlock label="Edit rating & comment">
              <div className="mb-3"><StarRating value={editRating} onChange={setEditRating} size={24} /></div>
              <Field>
                <textarea className={`${textareaCls} resize-y`} rows={4} maxLength={1000} value={editComment} onChange={(e) => setEditComment(e.target.value)} placeholder="Comment" />
              </Field>
              {saveError && <p className="m-0 mt-2 text-[13px] font-semibold text-[var(--tone-red)]">{saveError}</p>}
            </InfoBlock>
          </div>
        )}
      </Modal>

      {/* Photo viewer */}
      <Modal open={!!photo} onClose={() => setPhoto(null)} title="Review photo" width={720}>
        {photo && <img src={photo} alt="Review" className="mx-auto block max-h-[70dvh] w-auto max-w-full rounded-[14px] object-contain" />}
      </Modal>

      <ConfirmDialog
        open={confirm != null}
        title={confirm?.pending ? 'Reject review' : 'Delete review'}
        confirmLabel={confirm?.pending ? 'Reject' : 'Delete'}
        message={(
          <>
            {confirm?.pending
              ? 'Reject this review? It will be deleted and never shown on the store. This cannot be undone.'
              : 'Delete this review? This cannot be undone.'}
            {deleteError && <span className="mt-3 block font-semibold text-[var(--tone-red)]">{deleteError}</span>}
          </>
        )}
        busy={deletingId != null}
        onConfirm={deleteReview}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
