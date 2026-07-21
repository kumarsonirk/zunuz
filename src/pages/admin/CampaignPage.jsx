import React, { useEffect, useState, useCallback } from 'react';
import { Megaphone, Search, Edit2, Trash2, X, Plus, Mail, Phone, Calendar, User } from 'lucide-react';
import { api } from '../../utils/api';

const InstagramIcon = ({ size = 14, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
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

function SubmissionModal({ submission, onClose, onSave }) {
  const isEdit = !!submission;
  const [form, setForm] = useState({
    name: submission?.name || '',
    dob: submission?.dob || '',
    email: submission?.email || '',
    phone: submission?.phone || '',
    insta_id: submission?.instaId || submission?.insta_id || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-3)', borderRadius: '20px', width: '100%', maxWidth: '460px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--admin-border-2)' }}>
          <h2 style={{ color: 'var(--admin-text)', fontSize: '16px', fontWeight: 600 }}>{isEdit ? 'Edit Campaign Entry' : 'Add Campaign Entry'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ background: 'rgba(252,75,78,0.1)', border: '1px solid rgba(252,75,78,0.3)', borderRadius: '10px', padding: '10px 14px', color: '#FC4B4E', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', color: 'var(--admin-text-muted)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '6px' }}>FULL NAME *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Full Name"
              required
              style={{ width: '100%', background: 'var(--admin-bg)', border: '1px solid var(--admin-border-3)', borderRadius: '10px', padding: '10px 14px', color: 'var(--admin-text)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--admin-text-muted)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '6px' }}>DATE OF BIRTH *</label>
            <input
              type="date"
              min="1940-01-01"
              max="2026-12-31"
              value={form.dob}
              onChange={e => setForm(f => ({ ...f, dob: e.target.value }))}
              required

              style={{ width: '100%', background: 'var(--admin-bg)', border: '1px solid var(--admin-border-3)', borderRadius: '10px', padding: '10px 14px', color: 'var(--admin-text)', fontSize: '14px', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--admin-text-muted)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '6px' }}>EMAIL ADDRESS *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="Email Address"
              required
              style={{ width: '100%', background: 'var(--admin-bg)', border: '1px solid var(--admin-border-3)', borderRadius: '10px', padding: '10px 14px', color: 'var(--admin-text)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--admin-text-muted)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '6px' }}>PHONE NUMBER (OPTIONAL)</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="Phone Number"
              style={{ width: '100%', background: 'var(--admin-bg)', border: '1px solid var(--admin-border-3)', borderRadius: '10px', padding: '10px 14px', color: 'var(--admin-text)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--admin-text-muted)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '6px' }}>INSTAGRAM ID *</label>
            <input
              type="text"
              value={form.insta_id}
              onChange={e => setForm(f => ({ ...f, insta_id: e.target.value }))}
              placeholder="@username"
              required
              style={{ width: '100%', background: 'var(--admin-bg)', border: '1px solid var(--admin-border-3)', borderRadius: '10px', padding: '10px 14px', color: 'var(--admin-text)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, background: 'var(--admin-border-1)', border: 'none', borderRadius: '10px', padding: '12px', color: 'var(--admin-text-muted)', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 1, background: '#FC4B4E', border: 'none', borderRadius: '10px', padding: '12px', color: 'white', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving...' : isEdit ? 'Update Entry' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ target, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-3)', borderRadius: '20px', width: '100%', maxWidth: '380px', padding: '24px' }}>
        <h3 style={{ color: 'var(--admin-text)', fontSize: '16px', fontWeight: 600, marginBottom: '10px' }}>Delete Campaign Entry</h3>
        <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px', marginBottom: error ? '12px' : '20px' }}>
          Are you sure you want to delete entry for <strong>{target.name}</strong> ({target.instaId})? This action cannot be undone.
        </p>
        {error && (
          <div style={{ background: 'rgba(252,75,78,0.1)', border: '1px solid rgba(252,75,78,0.3)', borderRadius: '10px', padding: '10px 14px', color: '#FC4B4E', fontSize: '13px', marginBottom: '20px' }}>{error}</div>
        )}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onClose} style={{ flex: 1, background: 'var(--admin-border-1)', border: 'none', borderRadius: '10px', padding: '12px', color: 'var(--admin-text-muted)', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, background: '#EF4444', border: 'none', borderRadius: '10px', padding: '12px', color: 'white', fontSize: '14px', fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer' }}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
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

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    await api.delete(`/admin/campaign/${deleteTarget.id}`, true);
    loadSubmissions();
  };

  return (
    <div style={{ maxWidth: '1200px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ color: 'var(--admin-text)', fontSize: '24px', fontWeight: 600 }}>Campaign Submissions</h1>
          <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Manage responses from the "Shine with Us" application form. Total submissions: {total}
          </p>
        </div>

        <button
          onClick={() => setModalItem({})}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#FC4B4E',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 18px',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(252, 75, 78, 0.25)'
          }}
        >
          <Plus size={16} /> Add Entry Manually
        </button>
      </div>

      {/* Controls Bar (Search) */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, phone, instagram..."
            style={{
              width: '100%',
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border-2)',
              borderRadius: '10px',
              padding: '10px 14px 10px 40px',
              color: 'var(--admin-text)',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Submissions Table */}
      <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-2)', borderRadius: '16px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>Loading submissions...</div>
        ) : submissions.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Megaphone size={40} style={{ color: 'var(--admin-text-faint)', marginBottom: '12px' }} />
            <p style={{ color: 'var(--admin-text-muted)', fontSize: '14px' }}>
              {search ? 'No submissions match your search query.' : 'No campaign submissions yet.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border-1)' }}>
                  {['ID', 'Name', 'DOB', 'Email', 'Phone', 'Instagram ID', 'Submitted Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '14px 20px', textAlign: 'left', color: 'var(--admin-text-muted)', fontSize: '11px', letterSpacing: '0.08em', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissions.map((item, i) => (
                  <tr
                    key={item.id}
                    style={{ borderBottom: i < submissions.length - 1 ? '1px solid var(--admin-hover-2)' : 'none' }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--admin-hover-1)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 20px', color: 'var(--admin-text-muted)', fontSize: '13px' }}>#{item.id}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ color: 'var(--admin-text)', fontSize: '14px', fontWeight: 500 }}>{item.name}</div>
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--admin-text-muted)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                      {formatDobDisplay(item.dob)}
                    </td>

                    <td style={{ padding: '14px 20px', color: 'var(--admin-text)', fontSize: '13px' }}>
                      {item.email}
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--admin-text-muted)', fontSize: '13px' }}>
                      {item.phone || '—'}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <a
                        href={`https://instagram.com/${item.instaId.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#FC4B4E', fontSize: '13px', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <InstagramIcon size={14} />
                        {item.instaId}
                      </a>
                    </td>

                    <td style={{ padding: '14px 20px', color: 'var(--admin-text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setModalItem(item)}
                          title="Edit submission"
                          style={{ background: 'var(--admin-border-1)', border: 'none', borderRadius: '8px', padding: '8px', color: 'var(--admin-text-muted)', cursor: 'pointer', display: 'flex' }}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          title="Delete submission"
                          style={{ background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: '8px', padding: '8px', color: '#EF4444', cursor: 'pointer', display: 'flex' }}
                        >
                          <Trash2 size={15} />
                        </button>
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
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: 'none',
                background: page === p ? '#FC4B4E' : 'var(--admin-border-2)',
                color: page === p ? 'white' : 'var(--admin-text-muted)',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Edit / Add Modal */}
      {modalItem && (
        <SubmissionModal
          submission={modalItem.id ? modalItem : null}
          onClose={() => setModalItem(null)}
          onSave={handleSave}
        />
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
