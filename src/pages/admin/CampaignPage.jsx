import { useEffect, useState, useCallback } from 'react';
import { Megaphone, Edit2, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../utils/api';
import {
  PageHeader, SectionTitle, Button, IconButton, Badge, Field, SearchInput, EmptyState, SkeletonRows, Modal, ConfirmDialog,
} from '../../components/admin/AdminUI';
import { inputCls, tableWrapCls, tableCls, thCls, tdCls, trCls } from '../../components/admin/adminStyles';

// Campaign (/admin/campaign): "Shine with Us" application submissions —
// searchable, paginated table with manual add / edit / delete.

const rise = 'animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]';

const InstagramIcon = ({ size = 14, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

function formatDobDisplay(dobStr) {
  if (!dobStr) return '—';
  const parts = dobStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    if (year >= 1920 && year <= 2100) {
      const d = new Date(year, parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    }
  }
  return dobStr;
}

function ErrorNote({ children }) {
  return (
    <span role="alert" className="block rounded-[12px] border border-[var(--tone-red)]/30 bg-[var(--tone-red)]/10 px-3.5 py-2.5 text-[13px] font-medium text-[var(--tone-red)]">
      {children}
    </span>
  );
}

function SubmissionModal({ submission, onClose, onSave }) {
  const isEdit = !!submission;
  const [form, setForm] = useState({
    name: submission?.name || '',
    dob: submission?.dob || '',
    email: submission?.email || '',
    phone: submission?.phone || '',
    insta_id: submission?.instaId || submission?.insta_id || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.dob || !form.email.trim() || !form.insta_id.trim()) {
      return setError('Name, DOB, Email, and Instagram ID are required.');
    }
    const year = parseInt(form.dob.split('-')[0], 10);
    if (isNaN(year) || year < 1920 || year > new Date().getFullYear()) {
      return setError('Please select a valid birth year (e.g. 2002).');
    }

    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save campaign submission.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      width={500}
      title={isEdit ? 'Edit campaign entry' : 'Add campaign entry'}
      subtitle={isEdit ? `Entry #${submission.id}` : 'Add a “Shine with Us” application manually.'}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="campaign-entry-form" loading={saving}>{isEdit ? 'Update entry' : 'Add entry'}</Button>
        </>
      )}
    >
      <form id="campaign-entry-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <ErrorNote>{error}</ErrorNote>}
        <Field label="Full name *">
          <input type="text" className={inputCls} value={form.name} onChange={set('name')} placeholder="Full Name" required autoFocus />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date of birth *">
            <input type="date" className={inputCls} min="1940-01-01" max="2026-12-31" value={form.dob} onChange={set('dob')} required />
          </Field>
          <Field label="Phone number" hint="Optional">
            <input type="tel" className={inputCls} value={form.phone} onChange={set('phone')} placeholder="Phone Number" />
          </Field>
        </div>
        <Field label="Email address *">
          <input type="email" className={inputCls} value={form.email} onChange={set('email')} placeholder="Email Address" required />
        </Field>
        <Field label="Instagram ID *">
          <input type="text" className={inputCls} value={form.insta_id} onChange={set('insta_id')} placeholder="@username" required />
        </Field>
      </form>
    </Modal>
  );
}

export default function CampaignPage() {
  const [submissions, setSubmissions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [modalItem, setModalItem] = useState(null); // null = off, {} = add, obj = edit
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page });
      if (search.trim()) params.set('search', search.trim());
      const data = await api.get(`/admin/campaign?${params}`, true);
      setSubmissions(data.submissions || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (e) {
      console.error('Failed to load campaign submissions:', e);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSubmissions();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadSubmissions]);

  const handleSave = async (formData) => {
    if (modalItem?.id) {
      await api.put(`/admin/campaign/${modalItem.id}`, formData, true);
    } else {
      await api.post('/admin/campaign', formData, true);
    }
    loadSubmissions();
  };

  const closeDelete = () => { setDeleteTarget(null); setDeleteError(''); };
  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/admin/campaign/${deleteTarget.id}`, true);
      closeDelete();
      loadSubmissions();
    } catch (e) {
      setDeleteError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1480px]">
      <PageHeader
        title="Campaign"
        subtitle={<>Responses from the “Shine with Us” application form · <span className="font-semibold text-[var(--admin-text)]">{total}</span> total {total === 1 ? 'submission' : 'submissions'}</>}
        actions={<Button icon={Plus} onClick={() => setModalItem({})}>Add entry manually</Button>}
      />

      <SectionTitle
        title="Submissions"
        hint={pages > 1 ? `Page ${page} of ${pages}` : undefined}
        actions={(
          <SearchInput
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, phone, instagram…"
            className="w-full sm:w-[380px]"
          />
        )}
      />

      <div className={tableWrapCls}>
        {loading ? (
          <SkeletonRows rows={6} />
        ) : submissions.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title={search ? 'No matches' : 'No submissions yet'}
            text={search ? 'No submissions match your search query.' : 'No campaign submissions yet.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead>
                <tr>
                  {['ID', 'Name', 'DOB', 'Email', 'Phone', 'Instagram ID', 'Submitted', ''].map((h, i) => (
                    <th key={h || i} className={`${thCls} ${h ? '' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissions.map((item, i) => (
                  <tr key={item.id} className={`${trCls} ${rise}`} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                    <td className={`${tdCls} font-semibold text-[var(--admin-text-muted)] tabular-nums`}>#{item.id}</td>
                    <td className={`${tdCls} font-semibold whitespace-nowrap text-[var(--admin-text)]`}>{item.name}</td>
                    <td className={`${tdCls} whitespace-nowrap text-[var(--admin-text-muted)]`}>{formatDobDisplay(item.dob)}</td>
                    <td className={`${tdCls} text-[var(--admin-text)]`}><span className="block max-w-[240px] truncate">{item.email}</span></td>
                    <td className={`${tdCls} whitespace-nowrap text-[var(--admin-text-muted)] tabular-nums`}>{item.phone || '—'}</td>
                    <td className={tdCls}>
                      <a
                        href={`https://instagram.com/${item.instaId.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-semibold whitespace-nowrap text-[var(--admin-accent)] no-underline hover:underline"
                      >
                        <InstagramIcon size={14} />
                        {item.instaId}
                      </a>
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      <Badge tone="muted">{new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Badge>
                    </td>
                    <td className={tdCls}>
                      <div className="flex justify-end gap-2">
                        <IconButton label="Edit submission" icon={Edit2} onClick={() => setModalItem(item)} />
                        <IconButton label="Delete submission" icon={Trash2} tone="danger" onClick={() => setDeleteTarget(item)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
          <IconButton label="Previous page" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage((p) => p - 1)} />
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              aria-current={page === p ? 'page' : undefined}
              className={`size-9 cursor-pointer rounded-[10px] border-0 text-[13px] font-semibold tabular-nums transition-colors ${page === p ? 'bg-[var(--admin-accent)] text-white' : 'bg-[var(--admin-hover-3)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'}`}
            >
              {p}
            </button>
          ))}
          <IconButton label="Next page" icon={ChevronRight} disabled={page >= pages} onClick={() => setPage((p) => p + 1)} />
        </div>
      )}

      {modalItem && (
        <SubmissionModal
          key={modalItem.id ?? 'new'}
          submission={modalItem.id ? modalItem : null}
          onClose={() => setModalItem(null)}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete campaign entry"
        message={(
          <>
            Are you sure you want to delete the entry for <strong className="text-[var(--admin-text)]">{deleteTarget?.name}</strong> ({deleteTarget?.instaId})? This action cannot be undone.
            {deleteError && <span className="mt-3 block"><ErrorNote>{deleteError}</ErrorNote></span>}
          </>
        )}
        busy={deleting}
        onConfirm={handleDelete}
        onClose={closeDelete}
      />
    </div>
  );
}
