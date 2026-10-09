import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, UserPlus, UserMinus, Download, Trash2, RotateCcw, MailX } from 'lucide-react';
import { api } from '../../utils/api';
import { PageHeader, StatRow, Button, IconButton, Badge, Tabs, SearchInput, EmptyState, SkeletonRows, ConfirmDialog } from '../../components/admin/AdminUI';
import { tableWrapCls, tableCls, thCls, tdCls, trCls } from '../../components/admin/adminStyles';
import { downloadAdminFile } from '../../components/admin/growth/csv';

// Newsletter subscribers (/admin/subscribers): everyone who joined from the
// home page "Be first in line for the good stuff." form. Export the list as
// CSV for a mailing tool, unsubscribe / resubscribe by hand, or delete a row
// (e.g. on a data request). API: /api/admin/subscribers.
const TABS = [
  { key: 'SUBSCRIBED', label: 'Subscribed' },
  { key: 'UNSUBSCRIBED', label: 'Unsubscribed' },
  { key: '', label: 'All' },
];
const fullDate = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const shortDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function SubscribersPage() {
  const [status, setStatus] = useState('SUBSCRIBED');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [res, setRes] = useState({ key: null, data: null, error: '' });
  const [busyId, setBusyId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState(null); // { tone, text }

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const query = useMemo(() => {
    const p = new URLSearchParams({ page });
    if (status) p.set('status', status);
    if (search) p.set('search', search);
    return p.toString();
  }, [status, search, page]);
  const key = `${query}|${version}`;
  const loading = res.key !== key;

  useEffect(() => {
    let alive = true;
    api.get(`/admin/subscribers?${query}`, true)
      .then((data) => { if (alive) setRes({ key, data, error: '' }); })
      .catch((e) => { if (alive) setRes((r) => ({ ...r, key, error: e.message || 'Could not load subscribers.' })); });
    return () => { alive = false; };
  }, [query, key]);

  const d = res.data;
  const st = d?.stats;

  const setSub = async (s, next) => {
    setBusyId(s.id); setNotice(null);
    try {
      await api.put(`/admin/subscribers/${s.id}`, { status: next }, true);
      setNotice({ tone: 'green', text: `${s.email} ${next === 'UNSUBSCRIBED' ? 'was unsubscribed' : 'is subscribed again'}.` });
      setVersion((v) => v + 1);
    } catch (e) { setNotice({ tone: 'red', text: e.message || 'Could not update.' }); }
    finally { setBusyId(null); }
  };
  const confirmDelete = async () => {
    const s = deleting;
    setBusyId(s.id);
    try {
      await api.delete(`/admin/subscribers/${s.id}`, true);
      setNotice({ tone: 'green', text: `${s.email} was deleted.` });
      setDeleting(null);
      setVersion((v) => v + 1);
    } catch (e) { setNotice({ tone: 'red', text: e.message || 'Could not delete.' }); setDeleting(null); }
    finally { setBusyId(null); }
  };
  const exportCsv = async () => {
    setExporting(true); setNotice(null);
    try { await downloadAdminFile(`/admin/subscribers/export.csv?status=${status || 'SUBSCRIBED'}`, 'zunuz-subscribers.csv'); }
    catch (e) { setNotice({ tone: 'red', text: e.message || 'Export failed.' }); }
    finally { setExporting(false); }
  };

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        title="Subscribers"
        subtitle="People who joined the newsletter from the home page. Export the list for your mailing tool."
        actions={<Button icon={Download} loading={exporting} disabled={!st || (status !== 'UNSUBSCRIBED' && !st.subscribed)} onClick={exportCsv}>Export {status === 'UNSUBSCRIBED' ? 'unsubscribed' : 'subscribers'} (CSV)</Button>}
      >
        {st ? (
          <StatRow
            items={[
              { label: 'Subscribed', icon: Mail, value: st.subscribed.toLocaleString('en-IN'), tone: st.subscribed ? 'green' : 'muted', sub: 'Will get newsletter emails' },
              { label: 'New this month', icon: UserPlus, value: st.last30.toLocaleString('en-IN'), tone: 'blue', sub: 'Joined in the last 30 days' },
              { label: 'Unsubscribed', icon: UserMinus, value: st.unsubscribed.toLocaleString('en-IN'), tone: st.unsubscribed ? 'pink' : 'muted', sub: 'Never email these addresses' },
            ]}
          />
        ) : !res.error && (
          <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-[104px] animate-pulse rounded-[18px] bg-[var(--admin-hover-3)]" />)}</div>
        )}
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs items={TABS} value={status} onChange={(k) => { setStatus(k); setPage(1); }} />
        <SearchInput value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search email…" aria-label="Search subscribers" className="min-w-[240px] flex-1 max-w-[420px]" />
      </div>

      {notice && (
        <p role="status" className="m-0 mb-4 rounded-[12px] border px-4 py-3 text-[14px] font-medium" style={{ color: `var(--tone-${notice.tone})`, borderColor: `color-mix(in srgb, var(--tone-${notice.tone}) 30%, transparent)`, background: `color-mix(in srgb, var(--tone-${notice.tone}) 10%, transparent)` }}>{notice.text}</p>
      )}
      {res.error && <p role="alert" className="m-0 mb-4 rounded-[12px] border border-[var(--tone-red)]/30 bg-[var(--tone-red)]/10 px-4 py-3 text-[14px] text-[var(--tone-red)]">{res.error}</p>}

      <div className={`${tableWrapCls} animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]`}>
        {!d ? (
          res.error ? null : <SkeletonRows rows={6} />
        ) : !d.items.length ? (
          <EmptyState icon={Mail} title={search ? 'No matches' : status === 'UNSUBSCRIBED' ? 'Nobody has unsubscribed' : 'No subscribers yet'} text={search ? `Nothing matches “${search}”.` : status === 'UNSUBSCRIBED' ? 'Everyone who joined is still on the list.' : 'Sign-ups from the home page newsletter form show up here.'} />
        ) : (
          <div className={`overflow-x-auto transition-opacity duration-300 ${loading ? 'opacity-60' : 'opacity-100'}`}>
            <table className={`${tableCls} min-w-[760px]`}>
              <thead>
                <tr>{['Email', 'Customer', 'Joined', 'Status', ''].map((h, i) => <th key={h || i} className={thCls}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {d.items.map((s) => (
                  <tr key={s.id} className={trCls}>
                    <td className={tdCls}>
                      <span className="block max-w-[320px] truncate font-semibold text-[var(--admin-text)]">{s.email}</span>
                      {s.source && <span className="text-[12px] text-[var(--admin-text-muted)]">From the {s.source} page{s.welcomeSentAt ? ' · welcome email sent' : ''}</span>}
                    </td>
                    <td className={tdCls}>
                      {s.customer ? <Link to={`/admin/customers/${s.customer.id}`} className="font-medium text-[var(--admin-text)] no-underline hover:text-[var(--admin-accent)]">{s.customer.name || 'View customer'}</Link> : <span className="text-[13px] text-[var(--admin-text-dim)]">Not a customer yet</span>}
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`} title={fullDate(s.createdAt)}>{shortDate(s.createdAt)}</td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      {s.status === 'SUBSCRIBED'
                        ? <Badge tone="green" dot>Subscribed</Badge>
                        : <><Badge tone="pink" dot>Unsubscribed</Badge>{s.unsubscribedAt && <span className="mt-1 block text-[12px] text-[var(--admin-text-muted)]">{shortDate(s.unsubscribedAt)}</span>}</>}
                    </td>
                    <td className={`${tdCls} text-right whitespace-nowrap`}>
                      <div className="inline-flex items-center gap-2">
                        {s.status === 'SUBSCRIBED'
                          ? <IconButton label={`Unsubscribe ${s.email}`} icon={MailX} disabled={busyId === s.id} onClick={() => setSub(s, 'UNSUBSCRIBED')} />
                          : <IconButton label={`Resubscribe ${s.email}`} icon={RotateCcw} disabled={busyId === s.id} onClick={() => setSub(s, 'SUBSCRIBED')} />}
                        <IconButton label={`Delete ${s.email}`} icon={Trash2} tone="danger" disabled={busyId === s.id} onClick={() => setDeleting(s)} />
                      </div>
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

      <p className="m-0 mt-5 text-[13px] text-[var(--admin-text-muted)]">
        Every newsletter email must include the subscriber's unsubscribe link. The welcome email does this automatically; if you send campaigns from a mailing tool, use its own unsubscribe link and don't re-import unsubscribed addresses.
      </p>

      <ConfirmDialog
        open={!!deleting}
        title="Delete subscriber?"
        message={deleting ? `${deleting.email} will be removed completely. To just stop emailing them, unsubscribe them instead — that keeps the record so they're never added back by mistake.` : ''}
        confirmLabel="Delete"
        busy={busyId === deleting?.id}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
