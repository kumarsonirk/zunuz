import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, Package, Upload, ImagePlus } from 'lucide-react';
import { api } from '../../utils/api';

const EMPTY_FORM = { name: '', price: '', stock: '', image: '', images: [], categoryId: '', subcategoryId: '', isActive: true, description: '', materials: '' };

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

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-3)', borderRadius: '20px', width: '100%', maxWidth: '760px', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--admin-border-2)' }}>
          <h2 style={{ color: 'var(--admin-text)', fontSize: '16px', fontWeight: 500 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--admin-text-muted)', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', color: 'var(--admin-text-muted)', fontSize: '12px', letterSpacing: '0.08em', marginBottom: '8px' }}>{label}</label>
      {children}
    </div>
  );
}

function MainImageUpload({ value, onChange }) {
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
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', color: 'var(--admin-text-muted)', fontSize: '12px', letterSpacing: '0.08em', marginBottom: '8px' }}>MAIN IMAGE</label>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {value ? (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img src={value} alt="main" style={{ width: '90px', height: '90px', objectFit: 'contain', background: '#fff', borderRadius: '10px', border: '1px solid var(--admin-border-4)', display: 'block' }} />
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
                <Upload size={18} style={{ color: 'var(--admin-text-muted)' }} />
                <span style={{ color: 'var(--admin-text-muted)', fontSize: '12px' }}>{value ? 'Replace image' : 'Upload or drag & drop'}</span>
                <span style={{ color: 'var(--admin-text-faint)', fontSize: '11px' }}>PNG, JPG, WEBP up to 8 MB</span>
              </>
          }
        </div>
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handle(e.target.files[0])} />
      </div>
    </div>
  );
}

function AdditionalImagesUpload({ values, onChange }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).map(uploadImage));
      onChange([...values, ...urls]);
    } catch (e) { alert('Upload failed: ' + e.message); }
    finally { setUploading(false); }
  };

  const remove = (i) => onChange(values.filter((_, idx) => idx !== i));

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', color: 'var(--admin-text-muted)', fontSize: '12px', letterSpacing: '0.08em', marginBottom: '8px' }}>
        ADDITIONAL IMAGES <span style={{ color: 'var(--admin-text-faint)', textTransform: 'none', letterSpacing: 'normal' }}>— shown in product gallery</span>
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {values.map((url, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <img src={url} alt={`img-${i}`} style={{ width: '76px', height: '76px', objectFit: 'contain', background: '#fff', borderRadius: '8px', border: '1px solid var(--admin-border-3)', display: 'block' }} />
            <button onClick={() => remove(i)} style={{ position: 'absolute', top: '-7px', right: '-7px', width: '18px', height: '18px', borderRadius: '50%', background: '#EF4444', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        ))}
        <button
          onClick={() => !uploading && inputRef.current?.click()}
          disabled={uploading}
          style={{ width: '76px', height: '76px', border: '1.5px dashed var(--admin-border-5)', borderRadius: '8px', background: 'var(--admin-hover-1)', color: 'var(--admin-text-muted)', cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
        >
          {uploading ? <span style={{ fontSize: '11px' }}>…</span> : <><ImagePlus size={18} /><span style={{ fontSize: '10px' }}>Add</span></>}
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', background: 'var(--admin-bg)', border: '1px solid var(--admin-border-3)', borderRadius: '10px', padding: '10px 14px', color: 'var(--admin-text)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };
const selectStyle = { ...inputStyle, cursor: 'pointer' };

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterSub, setFilterSub] = useState('');
  const [modal, setModal] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterCat) params.set('category', filterCat);
      if (filterSub) params.set('subcategory', filterSub);
      const [prods, cats] = await Promise.all([
        api.get(`/admin/products?${params}`, true),
        api.get('/admin/categories', true)
      ]);
      setProducts(prods);
      setCategories(cats.categories || []);
      setSubcategories(cats.subcategories || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, filterCat, filterSub]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY_FORM); setEditProduct(null); setModal('add'); };
  const openEdit = (p) => {
    setEditProduct(p);
    let parsedImages = [];
    try { parsedImages = JSON.parse(p.images || '[]'); } catch {}
    setForm({ name: p.name, price: p.price, stock: p.stock, image: p.image || '', images: parsedImages, categoryId: p.categoryId, subcategoryId: p.subcategoryId, isActive: p.isActive, description: p.description || '', materials: p.materials || '' });
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.categoryId || !form.subcategoryId) { alert('Please fill in all required fields.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price), stock: Number(form.stock), images: Array.isArray(form.images) ? form.images : [] };
      if (modal === 'edit') await api.put(`/admin/products/${editProduct.id}`, payload, true);
      else await api.post('/admin/products', payload, true);
      setModal(null);
      load();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/admin/products/${deleteId}`, true);
      setDeleteId(null);
      load();
    } catch (e) { alert(e.message); }
  };

  return (
    <div style={{ maxWidth: '1200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ color: 'var(--admin-text)', fontSize: '24px', fontWeight: 600 }}>Products</h1>
          <p style={{ color: 'var(--admin-text-muted)', fontSize: '13px', marginTop: '4px' }}>{products.length} products total</p>
        </div>
        <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FC4B4E', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--admin-text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." style={{ ...inputStyle, paddingLeft: '36px' }} />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...selectStyle, width: 'auto', minWidth: '140px' }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select value={filterSub} onChange={e => setFilterSub(e.target.value)} style={{ ...selectStyle, width: 'auto', minWidth: '140px' }}>
          <option value="">All Types</option>
          {subcategories.map(s => <option key={s.id} value={s.slug}>{s.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border-2)', borderRadius: '16px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>Loading...</div>
        ) : products.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Package size={40} style={{ color: 'var(--admin-text-faint)', marginBottom: '12px' }} />
            <p style={{ color: 'var(--admin-text-muted)', fontSize: '14px' }}>No products found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border-1)' }}>
                  {['Product', 'Category', 'Type', 'Price', 'Stock', 'Images', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 20px', textAlign: 'left', color: 'var(--admin-text-muted)', fontSize: '12px', letterSpacing: '0.08em', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => {
                  let additionalCount = 0;
                  try { additionalCount = JSON.parse(p.images || '[]').length; } catch {}
                  return (
                    <tr key={p.id} style={{ borderBottom: i < products.length - 1 ? '1px solid var(--admin-hover-2)' : 'none' }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--admin-hover-1)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                            {p.image
                              ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={16} style={{ color: 'var(--admin-text-muted)' }} /></div>
                            }
                          </div>
                          <span style={{ color: 'var(--admin-text)', fontSize: '13px', fontWeight: 500 }}>{p.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', color: 'var(--admin-text-muted)', fontSize: '13px' }}>{p.category?.name}</td>
                      <td style={{ padding: '14px 20px', color: 'var(--admin-text-muted)', fontSize: '13px' }}>{p.subcategory?.name}</td>
                      <td style={{ padding: '14px 20px', color: 'var(--admin-text)', fontSize: '13px', fontWeight: 600 }}>Rs {p.price?.toLocaleString()}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ color: p.stock === 0 ? '#EF4444' : p.stock <= 5 ? '#EF4444' : p.stock <= 15 ? '#F59E0B' : '#22C55E', fontSize: '13px', fontWeight: 500 }}>{p.stock}</span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ color: 'var(--admin-text-muted)', fontSize: '12px' }}>1 + {additionalCount}</span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ background: p.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(113,113,122,0.12)', color: p.isActive ? '#22C55E' : 'var(--admin-text-muted)', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 600 }}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => openEdit(p)} style={{ background: 'var(--admin-border-1)', border: 'none', borderRadius: '8px', padding: '7px', color: 'var(--admin-text-muted)', cursor: 'pointer', display: 'flex' }}><Edit2 size={14} /></button>
                          <button onClick={() => setDeleteId(p.id)} style={{ background: 'rgba(239,68,68,0.08)', border: 'none', borderRadius: '8px', padding: '7px', color: '#EF4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={14} /></button>
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

      {/* Add/Edit Modal */}
      {modal && (
        <Modal title={modal === 'edit' ? 'Edit Product' : 'Add Product'} onClose={() => setModal(null)}>
          <Field label="PRODUCT NAME">
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Core Chain I" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="PRICE (Rs)">
              <input style={inputStyle} type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="699" />
            </Field>
            <Field label="STOCK">
              <input style={inputStyle} type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} placeholder="50" />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="CATEGORY">
              <select style={selectStyle} value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                <option value="">Select…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="TYPE">
              <select style={selectStyle} value={form.subcategoryId} onChange={e => setForm(f => ({ ...f, subcategoryId: e.target.value }))}>
                <option value="">Select…</option>
                {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>

          <MainImageUpload
            value={form.image}
            onChange={url => setForm(f => ({ ...f, image: url }))}
          />
          <AdditionalImagesUpload
            values={form.images}
            onChange={imgs => setForm(f => ({ ...f, images: imgs }))}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="DESCRIPTION">
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '72px', fontFamily: 'inherit' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Exquisitely crafted, this piece features a high-polished finish..." />
            </Field>
            <Field label="MATERIALS">
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '72px', fontFamily: 'inherit' }} value={form.materials} onChange={e => setForm(f => ({ ...f, materials: e.target.value }))} placeholder="Made from premium 18K yellow gold plated sterling silver (925)..." />
            </Field>
          </div>

          <Field label="STATUS">
            <select style={selectStyle} value={form.isActive ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </Field>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button onClick={() => setModal(null)} style={{ flex: 1, background: 'var(--admin-border-1)', border: 'none', borderRadius: '10px', padding: '12px', color: 'var(--admin-text-muted)', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: '#FC4B4E', border: 'none', borderRadius: '10px', padding: '12px', color: 'white', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : modal === 'edit' ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <Modal title="Delete Product" onClose={() => setDeleteId(null)}>
          <p style={{ color: 'var(--admin-text-muted)', fontSize: '14px', marginBottom: '24px' }}>Are you sure you want to delete this product? This action cannot be undone.</p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setDeleteId(null)} style={{ flex: 1, background: 'var(--admin-border-1)', border: 'none', borderRadius: '10px', padding: '12px', color: 'var(--admin-text-muted)', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleDelete} style={{ flex: 1, background: '#EF4444', border: 'none', borderRadius: '10px', padding: '12px', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
