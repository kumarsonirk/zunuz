import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Plus, Edit2, Trash2, X, Package, ImagePlus, Loader2, PackageCheck, PackageX, AlertTriangle, AlertCircle, Download, Upload } from 'lucide-react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { api } from '../../utils/api';
import { uploadAdminImage } from '../../utils/adminUpload';
import Price from '../../components/Price';
import RichContent from '../../components/RichContent';
import {
  PageHeader, StatRow, Button, IconButton, Badge, Field, Select, SearchInput,
  EmptyState, SkeletonRows, Modal, ConfirmDialog, ImageUpload, Toggle,
} from '../../components/admin/AdminUI';
import { DISPLAY, inputCls, textareaCls, tableWrapCls, tableCls, thCls, tdCls, trCls } from '../../components/admin/adminStyles';
import ProductImportModal from '../../components/admin/growth/ProductImportModal';
import { downloadAdminFile } from '../../components/admin/growth/csv';

const EMPTY_FORM = { name: '', slug: '', price: '', stock: '', image: '', images: [], categoryId: '', subcategoryId: '', isActive: true, tagline: '', description: '', materials: '', productDetails: '', whyWorthIt: '', careInstructions: '' };

const RICH_TEXT_HELP = 'Start a line with "## " for a bold heading, "> " for a plain paragraph, or just type plain text for a bullet point. Wrap *text* in single asterisks for italics.';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function parseImages(raw) {
  try {
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    // Malformed JSON in the images column: treat as no additional images.
    return [];
  }
}

function stockTone(stock) {
  if (stock === 0) return 'var(--tone-red)';
  if (stock <= 5) return 'var(--tone-yellow)';
  return 'var(--tone-green)';
}

// Block label for form groups that aren't a single input (avoids wrapping
// buttons/grids inside a <label>).
function GroupLabel({ children, hint }) {
  return (
    <p className="m-0 mb-1.5 text-[13px] font-semibold text-[var(--admin-text-muted)]">
      {children}
      {hint && <span className="ml-1.5 font-normal text-[var(--admin-text-dim)]">{hint}</span>}
    </p>
  );
}

function FormSection({ title, children, delay = 0 }) {
  return (
    <section className="border-b border-[var(--admin-border-2)] py-5 first:pt-0 last:border-b-0 last:pb-0 animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]" style={{ animationDelay: `${delay}ms` }}>
      <h3 className={`m-0 mb-4 text-[15px] font-bold tracking-[0.02em] text-[var(--admin-text)] ${DISPLAY}`}>{title}</h3>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

// Textarea + live preview for the rich content fields (Description, Product
// Details, Why It's Worth It, Product Care). There's no rich-text editor in
// this app, so admins author plain text with a small line-prefix syntax (see
// RICH_TEXT_HELP above) that RichContent parses — the preview renders through
// that exact same component the storefront uses, so it's a true "what you see
// is what ships" preview, not an approximation.
function RichTextField({ label, value, onChange, placeholder }) {
  const [showPreview, setShowPreview] = useState(false);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold text-[var(--admin-text-muted)]">{label}</span>
        <button
          type="button"
          onClick={() => setShowPreview(s => !s)}
          className="cursor-pointer rounded-[8px] border-0 bg-[var(--admin-accent-soft)] px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap text-[var(--admin-accent)] transition-[filter] hover:brightness-110"
        >
          {showPreview ? 'Hide preview' : 'Preview'}
        </button>
      </div>
      <textarea
        className={`${textareaCls} min-h-[110px] resize-y`}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <p className="m-0 mt-1.5 text-[12px] leading-normal text-[var(--admin-text-dim)]">{RICH_TEXT_HELP}</p>
      {showPreview && (
        <div className="mt-2 rounded-[12px] border border-[var(--admin-border-3)] bg-[var(--admin-surface-2)] px-4 py-3.5 font-['Inter',sans-serif] text-[14px] leading-relaxed text-[var(--admin-text-muted)] animate-[admin-fade_0.2s_ease-out_both]">
          {value ? <RichContent text={value} /> : <span className="text-[var(--admin-text-dim)]">Nothing to preview yet.</span>}
        </div>
      )}
    </div>
  );
}

// Gallery images: multi-select upload through the shared admin upload helper.
function AdditionalImagesUpload({ values, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleFiles = async (files) => {
    if (!files || !files.length) return;
    setUploading(true); setError('');
    try {
      const urls = await Promise.all(Array.from(files).map(uploadAdminImage));
      onChange([...values, ...urls]);
    } catch (e) { setError('Upload failed: ' + (e.message || 'unknown error')); }
    finally { setUploading(false); }
  };

  const remove = (i) => onChange(values.filter((_, idx) => idx !== i));

  return (
    <div>
      <GroupLabel hint="— shown in product gallery">Additional images</GroupLabel>
      <div className="flex flex-wrap gap-3">
        {values.map((url, i) => (
          <div key={`${url}-${i}`} className="relative size-[76px] shrink-0 animate-[admin-pop_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
            <img src={url} alt={`Gallery image ${i + 1}`} className="h-full w-full rounded-[12px] border border-[var(--admin-border-4)] bg-[var(--admin-bg)] object-cover" />
            <button type="button" aria-label="Remove image" onClick={() => remove(i)} className="absolute -top-2 -right-2 flex size-6 cursor-pointer items-center justify-center rounded-full border-2 border-[var(--admin-surface)] bg-[var(--tone-red)] text-white opacity-90 transition-transform hover:scale-110"><X size={12} strokeWidth={3} /></button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          disabled={uploading}
          className="flex size-[76px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] border-[1.5px] border-dashed border-[var(--admin-border-5)] bg-[var(--admin-hover-1)] text-[var(--admin-text-muted)] transition-colors hover:border-[var(--admin-accent)] hover:text-[var(--admin-accent)] disabled:cursor-not-allowed"
        >
          {uploading ? <Loader2 size={18} className="animate-spin text-[var(--admin-accent)]" /> : <><ImagePlus size={18} /><span className="text-[11px] font-medium">Add</span></>}
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
      </div>
      {error && <p className="m-0 mt-1.5 text-[12px] font-semibold text-[var(--tone-red)]">{error}</p>}
    </div>
  );
}

// Mirrors the backend's slugify() purely for the live "Add Product" preview
// below — the real slug is always generated server-side on save (including
// de-duplication for repeated names), this is just a preview of the shape.
function slugifyPreview(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  // Top-bar search lands here as ?search=… (the layout remounts the page
  // when the query changes).
  const [params] = useSearchParams();
  // Import / export live under Reports (needs the 'reports' permission).
  const { me } = useOutletContext() || {};
  const canReports = !Array.isArray(me?.permissions) || me.permissions.includes('reports');
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState(() => params.get('search') || '');
  const [filterCat, setFilterCat] = useState('');
  const [filterSub, setFilterSub] = useState('');
  const [modal, setModal] = useState(null);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  // Bumped to re-fetch after a save / delete.
  const [version, setVersion] = useState(0);
  // Key of the query whose results are currently shown; loading is derived
  // from it so no state is set synchronously inside the effect.
  const queryKey = `${search}|${filterCat}|${filterSub}|${version}`;
  const [loadedKey, setLoadedKey] = useState(null);
  const loading = loadedKey !== queryKey;

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams();
    if (search) qs.set('search', search);
    if (filterCat) qs.set('category', filterCat);
    if (filterSub) qs.set('subcategory', filterSub);
    Promise.all([
      api.get(`/admin/products?${qs}`, true),
      api.get('/admin/categories', true)
    ])
      .then(([prods, cats]) => {
        if (cancelled) return;
        setProducts(prods);
        setCategories(cats.categories || []);
        setSubcategories(cats.subcategories || []);
      })
      .catch(e => { console.error(e); })
      .finally(() => { if (!cancelled) setLoadedKey(queryKey); });
    return () => { cancelled = true; };
  }, [search, filterCat, filterSub, queryKey]);

  const reload = () => setVersion(v => v + 1);

  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter(p => p.isActive).length;
    const out = products.filter(p => p.stock === 0).length;
    const low = products.filter(p => p.stock > 0 && p.stock <= 5).length;
    return [
      { label: 'Total', value: total.toLocaleString('en-IN'), icon: Package, sub: `${total - active} hidden`, tone: 'muted' },
      { label: 'Active', value: active.toLocaleString('en-IN'), icon: PackageCheck, sub: 'Visible in store', tone: 'green' },
      { label: 'Out of stock', value: out.toLocaleString('en-IN'), icon: PackageX, sub: out ? 'Needs restock' : 'All in stock', tone: out ? 'red' : 'muted' },
      { label: 'Low stock', value: low.toLocaleString('en-IN'), icon: AlertTriangle, sub: '5 or fewer left', tone: low ? 'yellow' : 'muted' },
    ];
  }, [products]);

  const hasFilters = Boolean(search || filterCat || filterSub);

  const openAdd = () => { setForm(EMPTY_FORM); setEditProduct(null); setFormError(''); setModal('add'); };
  const openEdit = (p) => {
    setEditProduct(p);
    const parsedImages = parseImages(p.images);
    setForm({ name: p.name, slug: p.slug || '', price: p.price, stock: p.stock, image: p.image || '', images: parsedImages, categoryId: p.categoryId, subcategoryId: p.subcategoryId, isActive: p.isActive, tagline: p.tagline || '', description: p.description || '', materials: p.materials || '', productDetails: p.productDetails || '', whyWorthIt: p.whyWorthIt || '', careInstructions: p.careInstructions || '' });
    setFormError('');
    setModal('edit');
  };
  // Stable so the shared Modal doesn't re-run its focus effect every keystroke.
  const closeModal = useCallback(() => setModal(null), []);
  const closeDelete = useCallback(() => setDeleteId(null), []);

  const setField = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.name || !form.price || !form.categoryId || !form.subcategoryId) { setFormError('Please fill in all required fields.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form, price: Number(form.price), stock: Number(form.stock), images: Array.isArray(form.images) ? form.images : [] };
      if (modal === 'edit') await api.put(`/admin/products/${editProduct.id}`, payload, true);
      else await api.post('/admin/products', payload, true);
      setModal(null);
      reload();
    } catch (e) { setFormError(e.message || 'Could not save the product.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/admin/products/${deleteId}`, true);
      setDeleteId(null);
      reload();
    } catch (e) { alert(e.message); }
    finally { setDeleting(false); }
  };

  const addButton = <Button icon={Plus} onClick={openAdd}>Add product</Button>;
  const exportProducts = () => {
    setExporting(true);
    downloadAdminFile('/admin/reports/export/products.csv', 'zunuz-products.csv').catch((e) => alert(e.message)).finally(() => setExporting(false));
  };
  const headerActions = (
    <>
      {canReports && <Button variant="secondary" size="sm" icon={Download} loading={exporting} onClick={exportProducts}>Export CSV</Button>}
      {canReports && <Button variant="secondary" size="sm" icon={Upload} onClick={() => setImportOpen(true)}>Import CSV</Button>}
      {addButton}
    </>
  );

  return (
    <div className="max-w-[1200px]">
      <PageHeader
        title="Products"
        subtitle={loading && !products.length ? 'Loading catalogue…' : `${products.length} product${products.length === 1 ? '' : 's'}${hasFilters ? ' matching filters' : ' total'}`}
        actions={headerActions}
      >
        <StatRow items={stats} />
      </PageHeader>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3 animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]" style={{ animationDelay: '200ms' }}>
        <SearchInput className="min-w-[220px] flex-1" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" aria-label="Search products" />
        <Select className="min-w-[170px] max-[640px]:flex-1" value={filterCat} onChange={e => setFilterCat(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </Select>
        <Select className="min-w-[170px] max-[640px]:flex-1" value={filterSub} onChange={e => setFilterSub(e.target.value)} aria-label="Filter by type">
          <option value="">All types</option>
          {subcategories.map(s => <option key={s.id} value={s.slug}>{s.name}</option>)}
        </Select>
      </div>

      {/* Table */}
      <div className={`${tableWrapCls} animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]`} style={{ animationDelay: '260ms' }}>
        {loading ? (
          <SkeletonRows rows={6} />
        ) : products.length === 0 ? (
          hasFilters
            ? <EmptyState icon={Package} title="No products match" text="Try a different search term or clear the category and type filters." />
            : <EmptyState icon={Package} title="No products yet" text="Add your first product to start building the catalogue." action={addButton} />
        ) : (
          <div className="overflow-x-auto">
            <table className={`${tableCls} min-w-[880px]`}>
              <thead>
                <tr>
                  {['Product', 'Category', 'Type', 'Price', 'Stock', 'Images', 'Status', ''].map((h, i) => (
                    <th key={h || i} className={`${thCls} ${i === 7 ? 'text-right' : ''}`}>{h || <span className="sr-only">Actions</span>}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => {
                  const additionalCount = parseImages(p.images).length;
                  return (
                    <tr key={p.id} className={`${trCls} animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]`} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                      <td className={tdCls}>
                        <div className="flex items-center gap-3">
                          <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-[var(--admin-border-2)] bg-[var(--admin-surface-2)]">
                            {p.image
                              ? <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                              : <Package size={17} className="text-[var(--admin-text-dim)]" />
                            }
                          </div>
                          <div className="min-w-0">
                            <span className="block max-w-[260px] truncate font-semibold text-[var(--admin-text)]">{p.name}</span>
                            {p.slug && <span className="block max-w-[260px] truncate text-[12px] text-[var(--admin-text-dim)]">/{p.slug}</span>}
                          </div>
                        </div>
                      </td>
                      <td className={`${tdCls} whitespace-nowrap text-[var(--admin-text-muted)]`}>{p.category?.name}</td>
                      <td className={`${tdCls} whitespace-nowrap text-[var(--admin-text-muted)]`}>{p.subcategory?.name}</td>
                      <td className={`${tdCls} whitespace-nowrap font-semibold tabular-nums text-[var(--admin-text)]`}><Price value={inr(p.price)} /></td>
                      <td className={tdCls}>
                        <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums" style={{ color: stockTone(p.stock) }}>
                          <span className="size-1.5 rounded-full" style={{ background: stockTone(p.stock) }} />
                          {p.stock}
                        </span>
                      </td>
                      <td className={`${tdCls} whitespace-nowrap text-[13px] tabular-nums text-[var(--admin-text-muted)]`}>1 + {additionalCount}</td>
                      <td className={tdCls}>
                        <Badge tone={p.isActive ? 'green' : 'muted'} dot>{p.isActive ? 'Active' : 'Hidden'}</Badge>
                      </td>
                      <td className={tdCls}>
                        <div className="flex justify-end gap-2">
                          <IconButton label={`Edit ${p.name}`} icon={Edit2} onClick={() => openEdit(p)} />
                          <IconButton label={`Delete ${p.name}`} icon={Trash2} tone="danger" onClick={() => setDeleteId(p.id)} />
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
      <Modal
        open={Boolean(modal)}
        onClose={closeModal}
        width={760}
        title={modal === 'edit' ? 'Edit product' : 'Add product'}
        subtitle={modal === 'edit' ? editProduct?.name : 'Fields marked * are required.'}
        footer={(
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>
              {saving ? 'Saving…' : modal === 'edit' ? 'Save changes' : 'Add product'}
            </Button>
          </>
        )}
      >
        {formError && (
          <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-[12px] border border-[var(--tone-red)]/30 bg-[var(--tone-red)]/10 px-4 py-3 text-[14px] font-medium text-[var(--tone-red)] animate-[admin-fade_0.2s_ease-out_both]">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <FormSection title="Basics">
          <Field label="Product name *">
            <input className={inputCls} value={form.name} onChange={setField('name')} placeholder="e.g. Core Chain I" />
          </Field>
          {modal === 'edit' ? (
            <Field label="URL slug" hint="Auto-generated from the name when the product was created; stays fixed afterwards so existing links keep working.">
              <input className={`${inputCls} cursor-not-allowed text-[var(--admin-text-muted)]`} value={form.slug || '(none yet — run the slug backfill script)'} disabled readOnly />
            </Field>
          ) : (
            <Field label="URL slug" hint="Preview only — generated for real when you save (a repeated name gets -2, -3, etc. appended).">
              <input className={`${inputCls} cursor-not-allowed text-[var(--admin-text-muted)]`} value={form.name ? slugifyPreview(form.name) : ''} placeholder="auto-generated from the name" disabled readOnly />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
            <Field label="Price (₹) *">
              <input className={inputCls} type="number" value={form.price} onChange={setField('price')} placeholder="699" />
            </Field>
            <Field label="Stock">
              <input className={inputCls} type="number" value={form.stock} onChange={setField('stock')} placeholder="50" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
            <Field label="Category *">
              <Select value={form.categoryId} onChange={setField('categoryId')}>
                <option value="">Select…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Type *">
              <Select value={form.subcategoryId} onChange={setField('subcategoryId')}>
                <option value="">Select…</option>
                {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[var(--admin-border-2)] bg-[var(--admin-surface-2)]/50 px-4 py-3">
            <div>
              <p className="m-0 text-[14px] font-semibold text-[var(--admin-text)]">Visible in store</p>
              <p className="m-0 mt-0.5 text-[12px] text-[var(--admin-text-dim)]">Hidden products stay in the catalogue but aren't shown to shoppers.</p>
            </div>
            <Toggle checked={form.isActive} onChange={v => setForm(f => ({ ...f, isActive: v }))} label={form.isActive ? 'Active' : 'Hidden'} />
          </div>
        </FormSection>

        <FormSection title="Images" delay={60}>
          <div>
            <GroupLabel>Main image</GroupLabel>
            <ImageUpload value={form.image} onChange={url => setForm(f => ({ ...f, image: url }))} />
          </div>
          <AdditionalImagesUpload
            values={form.images}
            onChange={imgs => setForm(f => ({ ...f, images: imgs }))}
          />
        </FormSection>

        <FormSection title="Content" delay={120}>
          <Field label="Tagline">
            <input className={inputCls} value={form.tagline} onChange={setField('tagline')} placeholder="e.g. The everyday shine." />
          </Field>
          <RichTextField
            label="Description"
            value={form.description}
            onChange={v => setForm(f => ({ ...f, description: v }))}
            placeholder={'> Exquisitely crafted, this piece features a high-polished finish designed to capture the light from every angle.'}
          />
          <Field label="Materials">
            <textarea className={`${textareaCls} min-h-[80px] resize-y`} value={form.materials} onChange={setField('materials')} placeholder="e.g. 18K gold plated sterling silver (925)" />
          </Field>
          <RichTextField
            label="Product details"
            value={form.productDetails}
            onChange={v => setForm(f => ({ ...f, productDetails: v }))}
            placeholder={'> Made from premium 18K yellow gold plated sterling silver (925).\nHypoallergenic\nDesigned for everyday wear'}
          />
          <RichTextField
            label="Why it's worth it"
            value={form.whyWorthIt}
            onChange={v => setForm(f => ({ ...f, whyWorthIt: v }))}
            placeholder={'## Built to last\nEach piece is quality-checked by hand before it ships.'}
          />
          <RichTextField
            label="Product care"
            value={form.careInstructions}
            onChange={v => setForm(f => ({ ...f, careInstructions: v }))}
            placeholder={'Wipe gently with a soft, dry cloth after each wear.\nAvoid direct contact with perfumes and harsh chemicals.'}
          />
        </FormSection>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={closeDelete}
        onConfirm={handleDelete}
        busy={deleting}
        title="Delete product?"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete"
      />
      {canReports && <ProductImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={(r) => { if (r.created || r.updated) reload(); }} />}
    </div>
  );
}
