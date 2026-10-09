import { useEffect, useState } from 'react';
import { Edit2, Trash2, Tag, Plus, ImageOff, Store } from 'lucide-react';
import { api } from '../../utils/api';
import {
  PageHeader, SectionTitle, Card, Button, IconButton, Badge, Field, EmptyState, Loading,
  Modal, ConfirmDialog, ImageUpload,
} from '../../components/admin/AdminUI';
import { DISPLAY, inputCls } from '../../components/admin/adminStyles';

// Categories (/admin/categories): main categories as image cards, product
// types (subcategories) as compact cards. Add / edit in a modal, delete via
// a confirm dialog. Data: GET /admin/categories → { categories, subcategories }.

// The live storefront only shows these three main categories.
const STOREFRONT_SLUGS = ['necklaces', 'bracelets', 'earrings'];
const rise = 'animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]';
const baseFor = (type) => (type === 'category' ? '/admin/categories/categories' : '/admin/categories/subcategories');

function SlugChip({ children }) {
  return (
    <span className="inline-block max-w-full truncate rounded-[7px] border border-[var(--admin-border-2)] bg-[var(--admin-hover-2)] px-2 py-0.5 font-mono text-[11.5px] text-[var(--admin-text-dim)]">
      {children}
    </span>
  );
}

function ErrorNote({ children }) {
  return (
    <span role="alert" className="block rounded-[12px] border border-[var(--tone-red)]/30 bg-[var(--tone-red)]/10 px-3.5 py-2.5 text-[13px] font-medium text-[var(--tone-red)]">
      {children}
    </span>
  );
}

function FormModal({ item, type, onClose, onSave }) {
  const isEdit = !!item;
  const isCategory = type === 'category';
  const [form, setForm] = useState(
    isCategory
      ? { name: item?.name || '', subtitle: item?.subtitle || '', image: item?.image || '' }
      : { name: item?.name || '' },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <Modal
      open
      onClose={onClose}
      width={480}
      title={`${isEdit ? 'Edit' : 'Add'} ${isCategory ? 'category' : 'product type'}`}
      subtitle={isCategory ? 'Name, tagline and the card background image.' : 'Product types are shared across all main categories.'}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={handleSave}>{isEdit ? 'Save changes' : 'Add'}</Button>
        </>
      )}
    >
      <div className="flex flex-col gap-4">
        {error && <ErrorNote>{error}</ErrorNote>}
        <Field label="Name">
          <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={isCategory ? 'e.g. Necklaces' : 'e.g. Chains'} autoFocus />
        </Field>
        {isCategory && (
          <>
            <Field label="Subtitle">
              <input className={inputCls} value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} placeholder="e.g. Best For College, Office & Everyday Wear" />
            </Field>
            <Field label="Background image">
              <ImageUpload value={form.image} onChange={(url) => setForm((f) => ({ ...f, image: url }))} />
            </Field>
          </>
        )}
      </div>
    </Modal>
  );
}

export default function CategoriesPage() {
  const [data, setData] = useState({ categories: [], subcategories: [] });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { item: obj|null, type: 'category'|'subcategory' }
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, type, name }
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = () => api.get('/admin/categories', true).then(setData).catch((e) => console.error(e));

  useEffect(() => {
    let alive = true;
    api.get('/admin/categories', true)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => console.error(e))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const handleSave = async (form) => {
    const { item, type } = modal;
    const base = baseFor(type);
    if (item) await api.put(`${base}/${item.id}`, form, true);
    else await api.post(base, form, true);
    load();
  };

  const closeDelete = () => { setDeleteTarget(null); setDeleteError(''); };
  const handleDelete = async () => {
    const { id, type } = deleteTarget;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`${baseFor(type)}/${id}`, true);
      closeDelete();
      load();
    } catch (e) { setDeleteError(e.message); } finally { setDeleting(false); }
  };

  if (loading) return <Loading label="Loading categories…" />;

  const { categories, subcategories } = data;

  return (
    <div className="mx-auto max-w-[1480px]">
      <PageHeader title="Categories" subtitle="Manage your main categories and the product types shared across them." />

      {/* Main categories */}
      <section className="mb-10">
        <SectionTitle
          title="Main categories"
          hint={`${categories.length} ${categories.length === 1 ? 'category' : 'categories'} · the storefront shows Necklaces, Bracelets and Earrings`}
          actions={<Button icon={Plus} onClick={() => setModal({ item: null, type: 'category' })}>Add category</Button>}
        />
        {categories.length === 0 ? (
          <Card><EmptyState icon={Tag} title="No categories yet" text="Add your first main category to start organising products." /></Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((cat, i) => {
              const live = STOREFRONT_SLUGS.includes(cat.slug);
              const count = cat._count?.products || 0;
              return (
                <Card key={cat.id} className={`group flex flex-col overflow-hidden p-0 transition-colors hover:border-[var(--admin-border-4)] ${rise}`} style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="relative aspect-[4/3] overflow-hidden bg-[var(--admin-bg)]">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[var(--admin-text-dim)]"><ImageOff size={30} strokeWidth={1.4} /></div>
                    )}
                    {live && (
                      <span className="absolute top-3 left-3 rounded-full bg-[var(--admin-surface)] shadow-sm">
                        <Badge tone="green" dot>Storefront</Badge>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className={`m-0 min-w-0 truncate text-[20px] leading-tight font-bold text-[var(--admin-text)] ${DISPLAY}`}>{cat.name}</h3>
                      <Badge tone={count ? 'pink' : 'muted'}>{count} {count === 1 ? 'product' : 'products'}</Badge>
                    </div>
                    <p className="m-0 line-clamp-2 text-[14px] text-[var(--admin-text-muted)]">{cat.subtitle || <span className="text-[var(--admin-text-dim)]">No subtitle</span>}</p>
                    <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                      <SlugChip>/{cat.slug}</SlugChip>
                      <div className="flex shrink-0 gap-2">
                        <IconButton label={`Edit ${cat.name}`} icon={Edit2} onClick={() => setModal({ item: cat, type: 'category' })} />
                        <IconButton label={`Delete ${cat.name}`} icon={Trash2} tone="danger" onClick={() => setDeleteTarget({ id: cat.id, type: 'category', name: cat.name })} />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Product types */}
      <section>
        <SectionTitle
          title="Product types (subcategories)"
          hint="Shared across all main categories."
          actions={<Button variant="secondary" icon={Plus} onClick={() => setModal({ item: null, type: 'subcategory' })}>Add product type</Button>}
        />
        {subcategories.length === 0 ? (
          <Card><EmptyState icon={Store} title="No product types yet" text="Product types like Chains or Studs can be used under any main category." /></Card>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
            {subcategories.map((sub, i) => {
              const count = sub._count?.products || 0;
              return (
                <Card key={sub.id} className={`flex items-center gap-3.5 p-4 transition-colors hover:border-[var(--admin-border-4)] ${rise}`} style={{ animationDelay: `${i * 40}ms` }}>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]">
                    <Tag size={18} strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className={`m-0 truncate text-[16px] font-bold text-[var(--admin-text)] ${DISPLAY}`}>{sub.name}</h3>
                    <p className="m-0 mt-0.5 text-[13px] whitespace-nowrap text-[var(--admin-text-muted)]">{count} {count === 1 ? 'product' : 'products'}</p>
                    <div className="mt-1.5 flex"><SlugChip>/{sub.slug}</SlugChip></div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <IconButton label={`Edit ${sub.name}`} icon={Edit2} onClick={() => setModal({ item: sub, type: 'subcategory' })} />
                    <IconButton label={`Delete ${sub.name}`} icon={Trash2} tone="danger" onClick={() => setDeleteTarget({ id: sub.id, type: 'subcategory', name: sub.name })} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {modal && (
        <FormModal key={`${modal.type}-${modal.item?.id ?? 'new'}`} item={modal.item} type={modal.type} onClose={() => setModal(null)} onSave={handleSave} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.type === 'category' ? 'category' : 'product type'}`}
        message={(
          <>
            Are you sure you want to delete <strong className="text-[var(--admin-text)]">“{deleteTarget?.name}”</strong>? This cannot be undone.
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
