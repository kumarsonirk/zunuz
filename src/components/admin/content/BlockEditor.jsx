import { useState } from 'react';
import { Check, ChevronDown, RotateCcw, Save } from 'lucide-react';
import { api } from '../../../utils/api';
import { refreshContentCache } from '../../../store/content';
import { Card, Button, Badge, Field, ImageUpload, ConfirmDialog } from '../AdminUI';
import { DISPLAY, inputCls, textareaCls } from '../adminStyles';
import ContentPreview from './ContentPreview';

// One editable storefront block (admin → Homepage & Banners): its fields on
// the left, a live preview on the right, per-block Save and Reset to default.
// The field schema (types, limits, defaults) comes from the API
// (server/src/routes/content.js); the checks here mirror the server's so
// mistakes show before saving.

const URL_OK = /^(\/(?!\/)|https?:\/\/)[^\s"'()<>\\`]*$/i;
const toEdit = (f, v) => (f.type === 'lines' ? (Array.isArray(v) ? v.join('\n') : String(v ?? '')) : String(v ?? ''));
const toValue = (f, s) => (f.type === 'lines' ? s.split('\n').map((l) => l.trim()).filter(Boolean) : s.replace(/\s+/g, ' ').trim());
// Collapsed/expanded per block, remembered in this browser (admin convenience).
const OPEN_KEY = 'zunuz_admin_content_open';
const readOpen = () => { try { return JSON.parse(localStorage.getItem(OPEN_KEY) || '{}'); } catch { return {}; } };
const writeOpen = (key, on) => { try { localStorage.setItem(OPEN_KEY, JSON.stringify({ ...readOpen(), [key]: on })); } catch { /* ignore */ } };
const fmtWhen = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function validate(f, raw) {
  if (f.type === 'lines') {
    const lines = toValue(f, raw);
    if (!lines.length) return 'Add at least one line';
    if (lines.length > f.maxLines) return `At most ${f.maxLines} lines`;
    if (lines.some((l) => l.length > f.max)) return `Each line can be at most ${f.max} characters`;
    return '';
  }
  const s = toValue(f, raw);
  if (!s && f.required) return 'Required';
  if (s.length > f.max) return `At most ${f.max} characters`;
  if ((f.type === 'link' || f.type === 'image') && s && !URL_OK.test(s)) {
    return f.type === 'image' ? 'Upload an image, or use a site path like /banner1.jpg or an https:// link' : 'Start with / (a page on this site) or https://';
  }
  return '';
}

function Counter({ n, max }) {
  return <span className={`tabular-nums ${n > max ? 'text-[var(--tone-red)]' : ''}`}>{n}/{max}</span>;
}

function FieldInput({ f, id, value, onChange, error, isDefault, onUseDefault }) {
  if (f.type === 'image') {
    return (
      <Field label={f.label} htmlFor={id} error={error} hint={f.hint || 'Upload a photo, or paste a site path (/poster2.png) or an https:// link.'}>
        <ImageUpload value={value} onChange={(url) => onChange(url || '')} compact />
        <div className="flex gap-2">
          <input id={id} className={`${inputCls} h-10 text-[13px]`} value={value} maxLength={f.max} onChange={(e) => onChange(e.target.value)} placeholder={f.default} aria-invalid={!!error} />
          {!isDefault && <Button size="sm" variant="ghost" icon={RotateCcw} onClick={onUseDefault} className="h-10">Default photo</Button>}
        </div>
      </Field>
    );
  }
  if (f.type === 'lines') {
    const lines = value.split('\n');
    return (
      <Field label={<span className="flex justify-between gap-2"><span>{f.label}</span><Counter n={lines.filter((l) => l.trim()).length} max={f.maxLines} /></span>} htmlFor={id} error={error} hint={f.hint}>
        <textarea id={id} rows={Math.min(f.maxLines, Math.max(2, lines.length))} className={`${textareaCls} resize-y font-semibold`} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} />
      </Field>
    );
  }
  const len = value.trim().length;
  const label = <span className="flex justify-between gap-2"><span>{f.label}</span>{f.type !== 'link' && <Counter n={len} max={f.max} />}</span>;
  if (f.type === 'textarea') {
    return (
      <Field label={label} htmlFor={id} error={error} hint={f.hint}>
        <textarea id={id} rows={2} maxLength={f.max + 20} className={`${textareaCls} resize-y`} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} />
      </Field>
    );
  }
  return (
    <Field label={label} htmlFor={id} error={error} hint={f.hint || (f.type === 'link' ? 'A page on this site (/shop?tier=199-plus) or a full https:// link.' : '')}>
      <input id={id} className={inputCls} value={value} maxLength={f.max + 20} onChange={(e) => onChange(e.target.value)} placeholder={f.type === 'link' ? '/shop' : f.default} aria-invalid={!!error} />
    </Field>
  );
}

export default function BlockEditor({ block, onSaved, style }) {
  const initial = () => Object.fromEntries(block.fields.map((f) => [f.name, toEdit(f, block.value[f.name])]));
  const [form, setForm] = useState(initial);
  const [base, setBase] = useState(block.updatedAt); // re-sync when the block changes from outside
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(null); // 'save' | 'reset'
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  // Blocks start collapsed (the page is long); a click opens one.
  const [open, setOpen] = useState(() => !!readOpen()[block.key] || window.location.hash === `#content-${block.key}`);
  const toggle = () => setOpen((o) => { writeOpen(block.key, !o); return !o; });

  if (base !== block.updatedAt) {
    setBase(block.updatedAt);
    setForm(initial());
    setTouched(false);
  }

  const errors = Object.fromEntries(block.fields.map((f) => [f.name, validate(f, form[f.name])]));
  const hasErrors = Object.values(errors).some(Boolean);
  const value = Object.fromEntries(block.fields.map((f) => [f.name, toValue(f, form[f.name])]));
  // Preview: fall back to the default while a required field is empty/invalid.
  const previewValue = Object.fromEntries(block.fields.map((f) => [f.name, errors[f.name] ? block.defaults[f.name] : value[f.name]]));
  const dirty = block.fields.some((f) => JSON.stringify(value[f.name]) !== JSON.stringify(block.value[f.name]));
  const customized = block.customized.length > 0;

  const set = (name) => (v) => { setForm((s) => ({ ...s, [name]: v })); setTouched(true); setError(''); };

  const save = async () => {
    if (hasErrors) { setTouched(true); setError('Fix the highlighted fields first.'); return; }
    setBusy('save'); setError('');
    try {
      const updated = await api.put(`/admin/content/${block.key}`, { value }, true);
      onSaved(updated);
      refreshContentCache();
      setSavedAt(Date.now());
    } catch (e) { setError(e.message || 'Could not save'); } finally { setBusy(null); }
  };

  const reset = async () => {
    setBusy('reset'); setError('');
    try {
      const updated = await api.delete(`/admin/content/${block.key}`, true);
      onSaved(updated);
      setForm(Object.fromEntries(block.fields.map((f) => [f.name, toEdit(f, updated.value[f.name])])));
      setTouched(false);
      refreshContentCache();
      setConfirmReset(false);
      setSavedAt(Date.now());
    } catch (e) { setError(e.message || 'Could not reset'); setConfirmReset(false); } finally { setBusy(null); }
  };

  // Group fields that share a `group` (e.g. the three budget cards).
  const rows = [];
  block.fields.forEach((f) => {
    const last = rows[rows.length - 1];
    if (f.group && last?.group === f.group) last.fields.push(f);
    else rows.push({ group: f.group || null, fields: [f] });
  });
  const justSaved = savedAt && !dirty;

  return (
    <Card id={`content-${block.key}`} className="scroll-mt-24 p-[clamp(16px,2vw,24px)] animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]" style={style}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`content-body-${block.key}`}
        className={`flex w-full cursor-pointer items-start justify-between gap-3 border-0 bg-transparent p-0 text-left ${open ? 'mb-4' : ''}`}
      >
        <span className="min-w-0">
          <span className={`flex flex-wrap items-center gap-2 text-[18px] font-bold text-[var(--admin-text)] ${DISPLAY}`}>
            {block.title}
            {customized ? <Badge tone="pink" dot>Customised</Badge> : <Badge tone="muted">Default</Badge>}
            {dirty && <Badge tone="yellow">Unsaved changes</Badge>}
          </span>
          <span className="mt-1 block max-w-[640px] text-[14px] text-[var(--admin-text-muted)]">{block.description}</span>
          {block.updatedAt && <span className="mt-1 block text-[12px] text-[var(--admin-text-dim)]">Last edited {fmtWhen(block.updatedAt)}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--admin-border-4)] px-3 py-1.5 text-[13px] font-semibold text-[var(--admin-text-muted)]">
          {open ? 'Collapse' : 'Edit'}
          <ChevronDown size={16} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (<div id={`content-body-${block.key}`}>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <div className="flex min-w-0 flex-col gap-4">
          {rows.map((row, ri) => {
            const fields = row.fields.map((f) => (
              <FieldInput
                key={f.name}
                f={f}
                id={`cf-${block.key}-${f.name}`}
                value={form[f.name]}
                onChange={set(f.name)}
                error={touched ? errors[f.name] : ''}
                isDefault={toValue(f, form[f.name]) === f.default}
                onUseDefault={() => set(f.name)(toEdit(f, f.default))}
              />
            ));
            return row.group ? (
              <fieldset key={ri} className="m-0 flex min-w-0 flex-col gap-3 rounded-[14px] border border-[var(--admin-border-2)] bg-[var(--admin-surface-2)] p-3.5">
                <legend className="px-1.5 text-[12px] font-semibold tracking-[0.08em] text-[var(--admin-text-muted)] uppercase">{row.group}</legend>
                {fields}
              </fieldset>
            ) : <div key={ri} className="flex min-w-0 flex-col gap-4">{fields}</div>;
          })}
        </div>

        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <p className="m-0 mb-2 text-[12px] font-semibold tracking-[0.08em] text-[var(--admin-text-muted)] uppercase">Live preview</p>
          <ContentPreview blockKey={block.key} value={previewValue} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5 border-t border-[var(--admin-border-1)] pt-4">
        {error && <p role="alert" className="m-0 mr-auto text-[13px] font-semibold text-[var(--tone-red)]">{error}</p>}
        {!error && justSaved ? (
          <p role="status" className="m-0 mr-auto flex items-center gap-1.5 text-[13px] font-semibold text-[var(--tone-green)]"><Check size={15} strokeWidth={3} /> Saved — shoppers see it on their next page load.</p>
        ) : null}
        {dirty && <Button variant="ghost" size="sm" onClick={() => { setForm(initial()); setTouched(false); setError(''); }}>Discard</Button>}
        <Button variant="secondary" icon={RotateCcw} disabled={!customized || busy != null} onClick={() => setConfirmReset(true)}>Reset to default</Button>
        <Button icon={Save} loading={busy === 'save'} disabled={!dirty || busy != null} onClick={save}>Save</Button>
      </div>
      </div>)}

      <ConfirmDialog
        open={confirmReset}
        title="Reset to default?"
        message={`“${block.title}” will go back to the built-in text and images. Your edits to this block will be lost.`}
        confirmLabel="Reset"
        busy={busy === 'reset'}
        onConfirm={reset}
        onClose={() => setConfirmReset(false)}
      />
    </Card>
  );
}
