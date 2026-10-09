import { useEffect, useRef, useState } from 'react';
import { StickyNote, Plus, X, Check, Loader2 } from 'lucide-react';
import { api } from '../../../utils/api';
import { Card, SectionTitle, Button } from '../AdminUI';
import { textareaCls } from '../adminStyles';
import { SUGGESTED_TAGS, tagTone } from './tags';

// Admin-only customer notes + tags (PUT /api/admin/notes/customers/:id).

export function TagChip({ tag, onRemove, size = 'md' }) {
  const c = `var(--tone-${tagTone(tag)})`;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold whitespace-nowrap ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]'}`}
      style={{ color: c, background: `color-mix(in srgb, ${c} 14%, transparent)` }}
    >
      {tag}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove tag ${tag}`} className="-mr-1 flex size-4 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-current opacity-70 hover:opacity-100">
          <X size={12} strokeWidth={2.5} />
        </button>
      )}
    </span>
  );
}

const MAX_NOTE = 5000;

export default function CustomerNotesCard({ customer, onTagsChange, style }) {
  const [note, setNote] = useState(customer.adminNote || '');
  const [savedNote, setSavedNote] = useState(customer.adminNote || '');
  const [tags, setTags] = useState(customer.tags || []);
  const [custom, setCustom] = useState('');
  const [status, setStatus] = useState({ state: 'idle', error: '' }); // idle | saving | saved | error
  const savedTimer = useRef(null);
  useEffect(() => () => clearTimeout(savedTimer.current), []);

  const save = async (patch) => {
    setStatus({ state: 'saving', error: '' });
    try {
      const r = await api.put(`/admin/notes/customers/${customer.id}`, patch, true);
      if (patch.adminNote !== undefined) { setSavedNote(r.adminNote); setNote(r.adminNote); }
      setTags(r.tags);
      onTagsChange?.(r.tags);
      setStatus({ state: 'saved', error: '' });
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setStatus((s) => (s.state === 'saved' ? { state: 'idle', error: '' } : s)), 2500);
      return true;
    } catch (e) {
      setStatus({ state: 'error', error: e.message || 'Could not save.' });
      return false;
    }
  };

  const has = (t) => tags.some((x) => x.toLowerCase() === t.toLowerCase());
  const toggle = (t) => {
    const prev = tags;
    const next = has(t) ? tags.filter((x) => x.toLowerCase() !== t.toLowerCase()) : [...tags, t];
    setTags(next);
    save({ tags: next }).then((ok) => { if (!ok) setTags(prev); });
  };
  const addCustom = (e) => {
    e.preventDefault();
    const t = custom.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return;
    if (t.length > 30) { setStatus({ state: 'error', error: 'Tags can be at most 30 characters.' }); return; }
    setCustom('');
    if (!has(t)) toggle(t);
  };

  const dirty = note.trim() !== (savedNote || '').trim();
  const extra = tags.filter((t) => !SUGGESTED_TAGS.some((s) => s.toLowerCase() === t.toLowerCase()));

  return (
    <Card className="p-5 animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]" style={style}>
      <SectionTitle
        title={<span className="inline-flex items-center gap-2"><StickyNote size={18} strokeWidth={1.8} /> Internal notes</span>}
        hint="Only admins see these."
        actions={(
          <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5 text-[13px] font-medium">
            {status.state === 'saving' && <><Loader2 size={14} className="animate-spin text-[var(--admin-text-muted)]" /><span className="text-[var(--admin-text-muted)]">Saving…</span></>}
            {status.state === 'saved' && <><Check size={14} className="text-[var(--tone-green)]" /><span className="text-[var(--tone-green)]">Saved</span></>}
          </span>
        )}
      />

      <p className="m-0 mb-2 text-[13px] font-semibold text-[var(--admin-text-muted)]">Tags</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Customer tags">
        {SUGGESTED_TAGS.map((t) => {
          const on = has(t);
          const c = `var(--tone-${tagTone(t)})`;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(t)}
              disabled={status.state === 'saving'}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:cursor-wait"
              style={on
                ? { color: c, borderColor: `color-mix(in srgb, ${c} 45%, transparent)`, background: `color-mix(in srgb, ${c} 14%, transparent)` }
                : { color: 'var(--admin-text-muted)', borderColor: 'var(--admin-border-4)', background: 'transparent' }}
            >
              {on ? <Check size={13} strokeWidth={2.5} /> : <Plus size={13} strokeWidth={2.5} />}{t}
            </button>
          );
        })}
        {extra.map((t) => <TagChip key={t} tag={t} onRemove={() => toggle(t)} />)}
      </div>
      <form onSubmit={addCustom} className="mt-3 flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          maxLength={30}
          placeholder="Add a custom tag…"
          aria-label="Custom tag"
          className="h-9 min-w-0 flex-1 rounded-[10px] border border-[var(--admin-border-4)] bg-[var(--admin-bg)] px-3 text-[14px] text-[var(--admin-text)] outline-none placeholder:text-[var(--admin-text-dim)] focus:border-[var(--admin-accent)]"
        />
        <Button size="sm" variant="secondary" type="submit" icon={Plus} disabled={!custom.trim()}>Add</Button>
      </form>

      <label htmlFor={`note-${customer.id}`} className="mt-5 mb-2 block text-[13px] font-semibold text-[var(--admin-text-muted)]">Notes</label>
      <textarea
        id={`note-${customer.id}`}
        value={note}
        maxLength={MAX_NOTE}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => { if (dirty) save({ adminNote: note }); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && dirty) save({ adminNote: note }); }}
        placeholder="e.g. Prefers WhatsApp updates · asked about bulk pricing for a wedding in March"
        className={`${textareaCls} min-h-[120px] resize-y text-[14px]`}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] text-[var(--admin-text-dim)]">{note.length.toLocaleString('en-IN')} / {MAX_NOTE.toLocaleString('en-IN')} · saves when you click away (Ctrl+Enter)</span>
        <Button size="sm" disabled={!dirty} loading={status.state === 'saving' && dirty} onClick={() => save({ adminNote: note })}>Save notes</Button>
      </div>
      {status.state === 'error' && <p role="alert" className="m-0 mt-2 text-[13px] font-semibold text-[var(--tone-red)]">{status.error}</p>}
    </Card>
  );
}
