import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronRight, StickyNote } from 'lucide-react';
import { api } from '../../utils/api';
import { PageHeader, SearchInput, Select, EmptyState, SkeletonRows } from '../../components/admin/AdminUI';
import { TagChip } from '../../components/admin/growth/CustomerTags';
import { tableWrapCls, tableCls, thCls, tdCls, trCls } from '../../components/admin/adminStyles';

const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

export default function CustomersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [tag, setTag] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [res, setRes] = useState({ key: null, customers: [], total: 0, pages: 1 });

  const queryKey = `${search}\u0000${page}\u0000${tag}`;
  const loading = res.key !== queryKey;
  const { customers, total, pages } = res;

  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams({ page });
    if (search) params.set('search', search);
    if (tag) params.set('tag', tag);
    api.get(`/admin/customers?${params}`, true)
      .then((data) => {
        if (alive) setRes({ key: queryKey, customers: data.customers || [], total: data.total || 0, pages: data.pages || 1 });
      })
      .catch((e) => {
        console.error(e);
        if (alive) setRes((r) => ({ ...r, key: queryKey }));
      });
    return () => { alive = false; };
  }, [search, page, tag, queryKey]);

  useEffect(() => {
    let alive = true;
    api.get('/admin/customers/tags', true).then((t) => { if (alive) setAllTags(Array.isArray(t) ? t : []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // First load shows skeletons; later searches keep the old rows dimmed.
  const firstLoad = loading && res.key === null;

  return (
    <div className="mx-auto max-w-[1480px]">
      <PageHeader title="Customers" subtitle={`${total} registered customer${total === 1 ? '' : 's'}`} />

      <div className="mb-5 flex flex-wrap gap-3">
        <SearchInput
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, email or phone..."
          aria-label="Search customers"
          className="min-w-[220px] flex-1 max-w-[420px]"
        />
        {(allTags.length > 0 || tag) && (
          <Select value={tag} onChange={(e) => { setTag(e.target.value); setPage(1); }} aria-label="Filter by tag" className="min-w-[190px] max-[640px]:flex-1">
            <option value="">All tags</option>
            {allTags.map((t) => <option key={t.tag} value={t.tag}>{t.tag} ({t.count})</option>)}
          </Select>
        )}
      </div>

      <div className={`${tableWrapCls} animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]`}>
        {firstLoad ? (
          <SkeletonRows rows={6} />
        ) : customers.length === 0 ? (
          loading ? <SkeletonRows rows={6} /> : (
            <EmptyState icon={Users} title="No customers found" text={search || tag ? `Nothing matches${search ? ` “${search}”` : ''}${tag ? ` with the tag “${tag}”` : ''}.` : 'Customers appear here after they sign up.'} />
          )
        ) : (
          <div className={`overflow-x-auto transition-opacity duration-300 ${loading ? 'opacity-60' : 'opacity-100'}`}>
            <table className={tableCls}>
              <thead>
                <tr>
                  {['Customer', 'Phone', 'Orders', 'Total Spent', 'Addresses', 'Joined', ''].map((h, i) => <th key={h || i} className={thCls}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const spent = (c.orders || []).filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0);
                  return (
                    <tr key={c.id} className={`${trCls} group/row cursor-pointer`} onClick={() => navigate(`/admin/customers/${c.id}`)}>
                      <td className={tdCls}>
                        <div className="flex items-center gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--admin-accent-soft)] text-[15px] font-bold text-[var(--admin-accent)]">
                            {c.name?.[0]?.toUpperCase()}
                          </span>
                          <span className="min-w-0">
                            <span className="block max-w-[240px] truncate font-medium text-[var(--admin-text)]">{c.name}</span>
                            <span className="block max-w-[240px] truncate text-[12px] text-[var(--admin-text-muted)]">{c.email}</span>
                            {(c.tags?.length > 0 || c.adminNote) && (
                              <span className="mt-1 flex max-w-[280px] flex-wrap items-center gap-1">
                                {c.tags?.map((t) => <TagChip key={t} tag={t} size="sm" />)}
                                {c.adminNote && <span title={c.adminNote} aria-label="Has internal notes" className="inline-flex text-[var(--admin-text-dim)]"><StickyNote size={13} /></span>}
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className={`${tdCls} whitespace-nowrap text-[var(--admin-text-muted)]`}>{c.phone || '—'}</td>
                      <td className={`${tdCls} font-semibold text-[var(--admin-text)] tabular-nums`}>{c._count?.orders || 0}</td>
                      <td className={`${tdCls} font-semibold whitespace-nowrap text-[var(--tone-green)] tabular-nums`}>{inr(spent)}</td>
                      <td className={`${tdCls} text-[var(--admin-text-muted)] tabular-nums`}>{c._count?.addresses || 0}</td>
                      <td className={`${tdCls} whitespace-nowrap text-[13px] text-[var(--admin-text-muted)]`}>
                        {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className={`${tdCls} w-10 text-right`}>
                        <ChevronRight size={18} className="inline-block text-[var(--admin-text-dim)] transition-[color,translate] duration-200 group-hover/row:translate-x-0.5 group-hover/row:text-[var(--admin-accent)]" />
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
        <nav aria-label="Pagination" className="mt-5 flex flex-wrap justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              aria-current={page === p ? 'page' : undefined}
              onClick={() => setPage(p)}
              className={`size-9 cursor-pointer rounded-[10px] border-0 text-[13px] font-semibold tabular-nums transition-colors ${page === p ? 'bg-[var(--admin-accent)] text-white' : 'bg-[var(--admin-hover-3)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'}`}
            >
              {p}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
