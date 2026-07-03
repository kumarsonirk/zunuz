import React, { useEffect, useState, useRef } from 'react';
import { Edit2, Trash2, X, Tag, Plus, Upload } from 'lucide-react';
import { api } from '../../utils/api';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace('/api', '');

async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  const token = localStorage.getItem('zunuz_admin_token');
  const res = await fetch(`${API_BASE}/api/admin/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
  if (!res.ok) throw new Error('Upload failed');
  return (await res.json()).url;
}

function ImageUpload({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handle = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    try { onChange(await uploadImage(file)); }
    catch (e) { alert('Upload failed: ' + e.message); }
    finally { setUploading(false); }
  };

  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      {value ? (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img src={value} alt="background" style={{ width: '90px', height: '90px', objectFit: 'cover', background: 'var(--admin-bg)', borderRadius: '10px', border: '1px solid var(--admin-border-4)', display: 'block' }} />
          <button onClick={() => onChange('')} style={{ position: 'absolute', top: '-7px', right: '-7px', width: '20px', height: '20px', borderRadius: '50%', background: '#EF4444', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      ) : null}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handle(e.dataTransfer.files[0]); }}
        style={{ flex: 1, minHeight: '90px', border: `1.5px dashed ${dragOver ? '#FC4B4E' : 'var(--admin-border-5)'}`, borderRadius: '10px', background: dragOver ? 'rgba(252,75,78,0.04)' : 'var(--admin-hover-1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: uploading ? 'not-allowed' : 'pointer', transition: 'border-color 0.2s, background 0.2s' }}
      >
        {uploading
          ? <span style={{ color: 'var(--admin-text-muted)', fontSize: '13px' }}>Uploading…</span>
          : <>
              <Upload size={18} style={{ color: 'var(--admin-text-dim)' }} />
              <span style={{ color: 'var(--admin-text-muted)', fontSize: '12px' }}>{value ? 'Replace image' : 'Upload or drag & drop'}</span>
              <span style={{ color: 'var(--admin-text-faint)', fontSize: '11px' }}>PNG, JPG, WEBP up to 8 MB</span>
            </>
        }
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handle(e.target.files[0])} />
    </div>
  );
}

function FormModal({ item, type, onClose, onSave }) {
  const isEdit = !!item;
  const [form, setForm] = useState(
    type === 'category'
      ? { name: item?.name || '', subtitle: item?.subtitle || '', image: item?.image || '' }
      : { name: item?.name || '' }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-3)', borderRadius: '20px', width: '100%', maxWidth: '420px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--admin-border-2)' }}>
          <h2 style={{ color: 'var(--admin-text)', fontSize: '16px', fontWeight: 500 }}>{isEdit ? 'Edit' : 'Add'} {type === 'category' ? 'Category' : 'Subcategory'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{ background: 'rgba(252,75,78,0.1)', border: '1px solid rgba(252,75,78,0.3)', borderRadius: '10px', padding: '10px 14px', color: '#FC4B4E', fontSize: '13px' }}>{error}</div>
          )}
          <div>
            <label style={{ display: 'block', color: 'var(--admin-text-muted)', fontSize: '12px', letterSpacing: '0.08em', marginBottom: '8px' }}>NAME</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Necklaces"
              style={{ width: '100%', background: 'var(--admin-bg)', border: '1px solid var(--admin-border-3)', borderRadius: '10px', padding: '10px 14px', color: 'var(--admin-text)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {type === 'category' && (
            <>
              <div>
                <label style={{ display: 'block', color: 'var(--admin-text-muted)', fontSize: '12px', letterSpacing: '0.08em', marginBottom: '8px' }}>SUBTITLE</label>
                <input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="e.g. Best For College, Office & Everyday Wear"
                  style={{ width: '100%', background: 'var(--admin-bg)', border: '1px solid var(--admin-border-3)', borderRadius: '10px', padding: '10px 14px', color: 'var(--admin-text)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--admin-text-muted)', fontSize: '12px', letterSpacing: '0.08em', marginBottom: '8px' }}>BACKGROUND IMAGE</label>
                <ImageUpload value={form.image} onChange={url => setForm(f => ({ ...f, image: url }))} />
              </div> 
            </>
          )}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button onClick={onClose} style={{ flex: 1, background: 'var(--admin-border-1)', border: 'none', borderRadius: '10px', padding: '12px', color: 'var(--admin-text-muted)', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: '#FC4B4E', border: 'none', borderRadius: '10px', padding: '12px', color: 'white', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add'}
            </button>
          </div>
        </div>
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
    try { await onConfirm(); onClose(); }
    catch (e) { setError(e.message); }
    finally { setDeleting(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-3)', borderRadius: '20px', width: '100%', maxWidth: '380px', padding: '24px' }}>
        <h3 style={{ color: 'var(--admin-text)', fontSize: '16px', fontWeight: 500, marginBottom: '10px' }}>Delete {target.type === 'category' ? 'Category' : 'Subcategory'}</h3>
        <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px', marginBottom: error ? '12px' : '20px' }}>
          Are you sure you want to delete "{target.name}"? This cannot be undone.
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

export default function CategoriesPage() {
  const [data, setData] = useState({ categories: [], subcategories: [] });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { item: obj|null, type: 'category'|'subcategory' }
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, type, name }

  const load = async () => {
    setLoading(true);
    try {
      const d = await api.get('/admin/categories', true);
      setData(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    const { item, type } = modal;
    const base = type === 'category' ? '/admin/categories/categories' : '/admin/categories/subcategories';
    if (item) await api.put(`${base}/${item.id}`, form, true);
    else await api.post(base, form, true);
    load();
  };

  const handleDelete = async () => {
    const { id, type } = deleteTarget;
    const base = type === 'category' ? '/admin/categories/categories' : '/admin/categories/subcategories';
    await api.delete(`${base}/${id}`, true);
    load();
  };

  if (loading) return <div style={{ color: 'var(--admin-text-muted)', padding: '40px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ color: 'var(--admin-text)', fontSize: '24px', fontWeight: 600 }}>Categories</h1>
        <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px', marginTop: '4px' }}>Manage your product categories and types.</p>
      </div>

      {/* Main Categories */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ color: 'var(--admin-text-muted)', fontSize: '12px', letterSpacing: '0.1em' }}>MAIN CATEGORIES</h2>
          <button onClick={() => setModal({ item: null, type: 'category' })}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(252,75,78,0.1)', border: 'none', borderRadius: '8px', padding: '6px 12px', color: '#FC4B4E', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={14} /> Add Category
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data.categories.length === 0 ? (
            <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px' }}>No categories yet.</p>
          ) : data.categories.map(cat => (
            <div key={cat.id} style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-2)', borderRadius: '14px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: 'var(--admin-bg)' }}>
                <img src={cat.image} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h3 style={{ color: 'var(--admin-text)', fontSize: '15px', fontWeight: 600 }}>{cat.name}</h3>
                  <span style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', borderRadius: '5px', padding: '2px 8px', fontSize: '10px', fontWeight: 600 }}>{cat._count?.products || 0} products</span>
                </div>
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.subtitle}</p>
                <p style={{ color: 'var(--admin-text-dim)', fontSize: '11px', marginTop: '2px', fontFamily: 'monospace' }}>slug: {cat.slug}</p>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button onClick={() => setModal({ item: cat, type: 'category' })}
                  style={{ background: 'var(--admin-border-1)', border: 'none', borderRadius: '8px', padding: '8px', color: 'var(--admin-text-muted)', cursor: 'pointer', display: 'flex' }}>
                  <Edit2 size={15} />
                </button>
                <button onClick={() => setDeleteTarget({ id: cat.id, type: 'category', name: cat.name })}
                  style={{ background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: '8px', padding: '8px', color: '#EF4444', cursor: 'pointer', display: 'flex' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subcategories */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <h2 style={{ color: 'var(--admin-text-muted)', fontSize: '12px', letterSpacing: '0.1em' }}>PRODUCT TYPES (SUBCATEGORIES)</h2>
          <button onClick={() => setModal({ item: null, type: 'subcategory' })}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(252,75,78,0.1)', border: 'none', borderRadius: '8px', padding: '6px 12px', color: '#FC4B4E', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={14} /> Add Subcategory
          </button>
        </div>
        <p style={{ color: 'var(--admin-text-dim)', fontSize: '12px', marginBottom: '12px' }}>These types are shared across all main categories.</p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {data.subcategories.length === 0 ? (
            <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px' }}>No subcategories yet.</p>
          ) : data.subcategories.map(sub => (
            <div key={sub.id} style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-2)', borderRadius: '14px', padding: '18px 20px', flex: '1', minWidth: '200px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(252,75,78,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Tag size={18} style={{ color: '#FC4B4E' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ color: 'var(--admin-text)', fontSize: '14px', fontWeight: 600 }}>{sub.name}</h3>
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '12px', marginTop: '2px' }}>{sub._count?.products || 0} products total</p>
                <p style={{ color: 'var(--admin-text-dim)', fontSize: '11px', fontFamily: 'monospace', marginTop: '2px' }}>/{sub.slug}</p>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button onClick={() => setModal({ item: sub, type: 'subcategory' })}
                  style={{ background: 'var(--admin-border-1)', border: 'none', borderRadius: '8px', padding: '7px', color: 'var(--admin-text-muted)', cursor: 'pointer', display: 'flex' }}>
                  <Edit2 size={14} />
                </button>
                <button onClick={() => setDeleteTarget({ id: sub.id, type: 'subcategory', name: sub.name })}
                  style={{ background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: '8px', padding: '7px', color: '#EF4444', cursor: 'pointer', display: 'flex' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <FormModal item={modal.item} type={modal.type} onClose={() => setModal(null)} onSave={handleSave} />
      )}

      {deleteTarget && (
        <DeleteConfirmModal target={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />
      )}
    </div>
  );
}
