import { useEffect, useMemo, useState } from 'react';
import { History, Plus, Pencil, Trash2, LogIn, ShieldAlert, Download, ChevronLeft, ChevronRight, Activity, CalendarDays, Users } from 'lucide-react';
import { PageHeader, StatRow, Badge, Select, SearchInput, Tabs, EmptyState, SkeletonRows, Button } from '../../components/admin/AdminUI';
import { DISPLAY, cardCls } from '../../components/admin/adminStyles';
import { api } from '../../utils/api';

// Activity log (/admin/activity): every admin write (create / update /
// delete) and sign-in, newest first, grouped by day. Recorded server-side
// (lib/adminPermissions.js activityLogger + auth route).
const ACTIONS = [
  { key: '', label: 'All' },
  { key: 'CREATE', label: 'Created' },
  { key: 'UPDATE', label: 'Updated' },
  { key: 'DELETE', label: 'Deleted' },
  { key: 'LOGIN', label: 'Sign-ins' },
  { key: 'LOGIN_FAILED', label: 'Failed sign-ins' },
  { key: 'EXPORT', label: 'Exports' },
];
const SECTIONS = [
  ['', 'All sections'], ['products', 'Products'], ['categories', 'Categories'], ['reviews', 'Reviews'], ['orders', 'Orders'],
  ['customers', 'Customers'], ['campaign', 'Campaign'], ['team', 'Users & roles'], ['auth', 'Sign-ins'],
  ['returns', 'Returns'], ['coupons', 'Coupons'], ['pincodes', 'Pincodes'], ['content', 'Homepage & banners'], ['reports', 'Reports & exports'],
  ['abandoned', 'Abandoned checkouts'], ['notes', 'Customer notes'], ['subscribers', 'Subscribers'], ['referrals', 'Referrals'], ['credits', 'Credits'], ['settings', 'Settings'],
];
const LOOK = {
  CREATE: { icon: Plus, tone: 'green' },
  UPDATE: { icon: Pencil, tone: 'blue' },
  DELETE: { icon: Trash2, tone: 'red' },
  LOGIN: { icon: LogIn, tone: 'purple' },
  LOGIN_FAILED: { icon: ShieldAlert, tone: 'yellow' },
  EXPORT: { icon: Download, tone: 'purple' },
};
const TONE_VAR = { green: 'var(--tone-green)', blue: 'var(--tone-blue)', red: 'var(--tone-red)', purple: 'var(--tone-purple)', yellow: 'var(--tone-yellow)' };
const dayLabel = (d) => {
  const date = new Date(d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const that = new Date(date); that.setHours(0, 0, 0, 0);
  const diff = Math.round((today - that) / 864e5);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
};

export default function ActivityPage() {
  const [filters, setFilters] = useState({ action: '', section: '', adminId: '', search: '' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [res, setRes] = useState({ key: null, data: null, error: '' });

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => { setFilters((f) => (f.search === search ? f : { ...f, search })); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const query = useMemo(() => {
    const p = new URLSearchParams({ page, limit: 30 });
    Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v); });
    return p.toString();
  }, [filters, page]);

  useEffect(() => {
    let alive = true;
    api.get(`/admin/activity?${query}`, true)
      .then((data) => { if (alive) setRes({ key: query, data, error: '' }); })
      .catch((e) => { if (alive) setRes((r) => ({ ...r, key: query, error: e.message || 'Could not load activity.' })); });
    return () => { alive = false; };
  }, [query]);

  const data = res.data;
  const loading = res.key !== query;
  const setFilter = (k) => (v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };

  const groups = useMemo(() => {
    const out = [];
    (data?.entries || []).forEach((e) => {
      const label = dayLabel(e.createdAt);
      if (!out.length || out[out.length - 1].label !== label) out.push({ label, items: [] });
      out[out.length - 1].items.push(e);
    });
    return out;
  }, [data]);

  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader title="Activity Log" subtitle="Who changed what in the admin panel, and when.">
        <StatRow items={[
          { label: 'Matching entries', value: data?.total ?? '—', icon: Activity, tone: 'blue', sub: 'For the current filters' },
          { label: 'Today', value: data?.today ?? '—', icon: CalendarDays, tone: 'green', sub: 'Actions since midnight' },
          { label: 'Admins seen', value: data?.admins?.length ?? '—', icon: Users, tone: 'purple', sub: 'With logged activity' },
        ]} />
      </PageHeader>

      <div className="mb-5 flex flex-col gap-3">
        <Tabs items={ACTIONS} value={filters.action} onChange={setFilter('action')} />
        <div className="grid grid-cols-[minmax(0,1fr)_220px_220px] gap-3 max-[860px]:grid-cols-1">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search activity, admin name or email…" />
          <Select value={filters.section} onChange={(e) => setFilter('section')(e.target.value)} aria-label="Section">
            {SECTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
          <Select value={filters.adminId} onChange={(e) => setFilter('adminId')(e.target.value)} aria-label="Admin">
            <option value="">All admins</option>
            {(data?.admins || []).map((a) => <option key={a.id} value={a.id}>{a.name} ({a.count})</option>)}
          </Select>
        </div>
      </div>

      {res.error && <p role="alert" className="m-0 mb-4 rounded-[12px] bg-[var(--tone-red)]/10 px-4 py-3 text-[14px] font-medium text-[var(--tone-red)]">{res.error}</p>}

      <div className={`${cardCls} transition-opacity duration-300 ${loading && data ? 'opacity-60' : ''}`}>
        {!data ? <SkeletonRows rows={6} /> : !data.entries.length ? (
          <EmptyState icon={History} title="Nothing logged yet" text="Changes made in the admin panel — and sign-ins — show up here as they happen." />
        ) : (
          <div className="px-[clamp(16px,2vw,28px)] py-2">
            {groups.map((g) => (
              <section key={g.label} className="py-4">
                <h2 className={`m-0 mb-3 text-[15px] font-bold text-[var(--admin-text-muted)] ${DISPLAY}`}>{g.label}</h2>
                <ol className="m-0 list-none p-0">
                  {g.items.map((e, i) => {
                    const look = LOOK[e.action] || LOOK.UPDATE;
                    const Icon = look.icon;
                    const color = TONE_VAR[look.tone];
                    return (
                      <li key={e.id} className="relative flex gap-4 pb-5 last:pb-1 animate-[jw-rise_0.4s_cubic-bezier(0.16,1,0.3,1)_both]" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                        {i < g.items.length - 1 && <span aria-hidden="true" className="absolute top-10 bottom-0 left-[19px] w-px bg-[var(--admin-border-3)]" />}
                        <span className="relative z-[1] flex size-10 shrink-0 items-center justify-center rounded-full" style={{ color, background: `color-mix(in srgb, ${color} 15%, var(--admin-surface))` }}><Icon size={17} strokeWidth={2} /></span>
                        <div className="min-w-0 flex-1 pt-1">
                          <p className="m-0 text-[15px] font-semibold text-[var(--admin-text)]">{e.summary}</p>
                          <p className="m-0 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--admin-text-muted)]">
                            <span className="font-medium text-[var(--admin-text)]">{e.adminName}</span>
                            <span>·</span>
                            <span>{new Date(e.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
                            <Badge tone={look.tone}>{SECTIONS.find(([k]) => k === e.section)?.[1] || e.section}</Badge>
                            {e.ip && <span className="text-[var(--admin-text-dim)]">IP {e.ip.replace('::ffff:', '')}</span>}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Newer</Button>
          <span className="text-[14px] text-[var(--admin-text-muted)]">Page {page} of {data.pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Older <ChevronRight size={15} /></Button>
        </div>
      )}
    </div>
  );
}
