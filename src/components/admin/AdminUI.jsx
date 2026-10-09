import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Search, ChevronDown, Loader2 } from 'lucide-react';
import { DISPLAY, cardCls, inputCls, selectCls } from './adminStyles';
import { uploadAdminImage } from '../../utils/adminUpload';

// Shared admin building blocks, styled like the Statistics page: Bricolage
// headings, rounded surface cards, ZUNUZ pink as the action colour, and
// coloured "tone" text from the --tone-* tokens. Everything follows the
// admin dark / light theme through CSS variables.

const TONES = {
  green: 'var(--tone-green)', yellow: 'var(--tone-yellow)', blue: 'var(--tone-blue)', red: 'var(--tone-red)',
  pink: 'var(--tone-pink)', purple: 'var(--tone-purple)', muted: 'var(--admin-text-muted)',
};

// ── Page header: big title, sub-line, actions on the right ──
export function PageHeader({ title, subtitle, actions, children }) {
  return (
    <div className="mb-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={`m-0 text-[length:clamp(28px,3vw,40px)] leading-tight font-bold tracking-[-0.01em] text-[var(--admin-text)] ${DISPLAY}`}>{title}</h1>
          {subtitle && <p className="m-0 mt-1.5 text-[15px] text-[var(--admin-text-muted)]">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

// Section heading inside a page ("Main categories", …).
export function SectionTitle({ title, hint, actions }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className={`m-0 text-[19px] font-bold text-[var(--admin-text)] ${DISPLAY}`}>{title}</h2>
        {hint && <p className="m-0 mt-1 text-[14px] text-[var(--admin-text-muted)]">{hint}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Card({ className = '', children, ...rest }) {
  return <div className={`${cardCls} ${className}`} {...rest}>{children}</div>;
}

// Small stat tiles in a row under a page header (like the dashboard cards, compact).
export function StatRow({ items }) {
  return (
    <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
      {items.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className={`${cardCls} px-5 py-4 animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]`} style={{ animationDelay: `${i * 50}ms` }}>
            <span className="flex items-center gap-2 text-[14px] font-medium text-[var(--admin-text-muted)]">{Icon && <Icon size={17} strokeWidth={1.6} />}{s.label}</span>
            <span className={`mt-2 block text-[28px] leading-none font-bold tabular-nums text-[var(--admin-text)] ${DISPLAY}`}>{s.value}</span>
            {s.sub && <span className="mt-2 block text-[13px] font-medium" style={{ color: TONES[s.tone || 'muted'] }}>{s.sub}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── Buttons ──
const BTN = {
  primary: 'border-transparent bg-[var(--admin-accent)] text-white hover:brightness-110 shadow-[0_10px_24px_-14px_rgba(255,61,139,0.9)]',
  secondary: 'border-[var(--admin-border-4)] bg-[var(--admin-surface)] text-[var(--admin-text)] hover:border-[var(--admin-border-5)] hover:bg-[var(--admin-hover-3)]',
  ghost: 'border-transparent bg-transparent text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover-3)] hover:text-[var(--admin-text)]',
  danger: 'border-transparent bg-[var(--tone-red)] text-white hover:brightness-110',
  'danger-soft': 'border-transparent bg-[var(--tone-red)]/12 text-[var(--tone-red)] hover:bg-[var(--tone-red)]/20',
};
export function Button({ variant = 'primary', size = 'md', icon: Icon, loading, className = '', children, ...rest }) {
  const sz = size === 'sm' ? 'h-9 px-3.5 text-[13px] gap-1.5 rounded-[10px]' : 'h-11 px-5 text-[15px] gap-2 rounded-[12px]';
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center border font-semibold whitespace-nowrap transition-[background-color,border-color,color,filter,translate] duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${sz} ${BTN[variant]} ${className}`}
    >
      {loading ? <Loader2 size={size === 'sm' ? 15 : 17} className="animate-spin" /> : Icon && <Icon size={size === 'sm' ? 15 : 17} strokeWidth={2} />}
      {children}
    </button>
  );
}

// Square icon button (edit / delete / close in rows and cards).
export function IconButton({ label, icon: Icon, tone = 'default', className = '', ...rest }) {
  const toneCls = tone === 'danger'
    ? 'text-[var(--tone-red)] bg-[var(--tone-red)]/10 hover:bg-[var(--tone-red)]/20'
    : tone === 'accent'
      ? 'text-[var(--admin-accent)] bg-[var(--admin-accent-soft)] hover:brightness-110'
      : 'text-[var(--admin-text-muted)] bg-[var(--admin-hover-3)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-border-3)]';
  return (
    <button type="button" aria-label={label} title={label} {...rest} className={`inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border-0 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${toneCls} ${className}`}>
      <Icon size={16} strokeWidth={1.8} />
    </button>
  );
}

// ── Badges / pills ──
export function Badge({ tone = 'muted', dot = false, className = '', children }) {
  const c = TONES[tone] || TONES.muted;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap ${className}`} style={{ color: c, background: `color-mix(in srgb, ${c} 14%, transparent)` }}>
      {dot && <span className="size-1.5 rounded-full" style={{ background: c }} />}
      {children}
    </span>
  );
}

// ── Form fields ──
export function Field({ label, hint, error, htmlFor, className = '', children }) {
  return (
    <label htmlFor={htmlFor} className={`flex flex-col gap-1.5 ${className}`}>
      {label && <span className="text-[13px] font-semibold text-[var(--admin-text-muted)]">{label}</span>}
      {children}
      {error ? <span className="text-[12px] font-semibold text-[var(--tone-red)]">{error}</span> : hint && <span className="text-[12px] text-[var(--admin-text-dim)]">{hint}</span>}
    </label>
  );
}

export function Select({ className = '', children, ...rest }) {
  return (
    <span className={`relative block ${className}`}>
      <select {...rest} className={selectCls}>{children}</select>
      <ChevronDown size={17} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[var(--admin-text-muted)]" />
    </span>
  );
}

export function SearchInput({ className = '', ...rest }) {
  return (
    <span className={`relative block ${className}`}>
      <Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--admin-text-muted)]" />
      <input type="search" {...rest} className={`${inputCls} pl-10`} />
    </span>
  );
}

// Pill tabs (order status filters etc.). items: [{ key, label, count? }]
export function Tabs({ items, value, onChange, className = '' }) {
  return (
    <div role="tablist" className={`flex gap-1.5 overflow-x-auto rounded-[14px] border border-[var(--admin-border-2)] bg-[var(--admin-surface)] p-1.5 [scrollbar-width:none] ${className}`}>
      {items.map((t) => {
        const on = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-[10px] border-0 px-3.5 py-2 text-[14px] font-semibold transition-colors ${on ? 'bg-[var(--admin-active-bg)] text-[var(--admin-active-text)]' : 'bg-transparent text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover-3)] hover:text-[var(--admin-text)]'}`}
          >
            {t.label}
            {t.count != null && <span className={`rounded-full px-1.5 text-[12px] tabular-nums ${on ? 'opacity-80' : 'text-[var(--admin-text-dim)]'}`}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── Empty / loading states ──
export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && <span className="flex size-14 items-center justify-center rounded-full bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]"><Icon size={24} strokeWidth={1.6} /></span>}
      <p className={`m-0 mt-4 text-[18px] font-bold text-[var(--admin-text)] ${DISPLAY}`}>{title}</p>
      {text && <p className="m-0 mt-1 max-w-[380px] text-[14px] text-[var(--admin-text-muted)]">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-[14px] text-[var(--admin-text-muted)]">
      <Loader2 size={20} className="animate-spin text-[var(--admin-accent)]" /> {label}
    </div>
  );
}

export function SkeletonRows({ rows = 5 }) {
  return (
    <div className="flex flex-col gap-2 p-4">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="h-12 animate-pulse rounded-[10px] bg-[var(--admin-hover-3)]" />)}
    </div>
  );
}

// ── Modal (centered dialog; becomes a bottom sheet on phones) ──
export function Modal({ open, onClose, title, subtitle, width = 560, footer, children }) {
  const panelRef = useRef(null);
  // Latest onClose, so an inline handler doesn't re-run the open effect
  // (which would steal focus from the field being typed in).
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onCloseRef.current?.(); };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  if (!open) return null;
  // Rendered into <body> so no page wrapper (transforms, stacking contexts)
  // or the top bar can clip it; it copies the admin theme from the layout.
  const theme = document.querySelector('[data-theme]')?.getAttribute('data-theme') || 'dark';
  return createPortal(
    <div data-theme={theme} className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-['Inter',sans-serif] max-[640px]:items-end max-[640px]:p-0" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-[admin-fade_0.2s_ease-out_both]" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative flex max-h-[min(88dvh,900px)] w-full flex-col overflow-hidden rounded-[22px] border border-[var(--admin-border-3)] bg-[var(--admin-surface)] text-[var(--admin-text)] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] outline-none animate-[admin-pop_0.3s_cubic-bezier(0.16,1,0.3,1)_both] max-[640px]:rounded-b-none"
        style={{ maxWidth: width }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--admin-border-2)] px-6 py-5">
          <div className="min-w-0">
            <h2 className={`m-0 text-[21px] font-bold ${DISPLAY}`}>{title}</h2>
            {subtitle && <p className="m-0 mt-1 text-[14px] text-[var(--admin-text-muted)]">{subtitle}</p>}
          </div>
          <IconButton label="Close" icon={X} onClick={onClose} className="transition-transform hover:rotate-90" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2.5 border-t border-[var(--admin-border-2)] bg-[var(--admin-surface-2)]/40 px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// "Are you sure?" dialog.
export function ConfirmDialog({ open, title = 'Are you sure?', message, confirmLabel = 'Delete', danger = true, busy, onConfirm, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={440}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      )}
    >
      <p className="m-0 text-[15px] leading-relaxed text-[var(--admin-text-muted)]">{message}</p>
    </Modal>
  );
}

// ── Image upload (drag & drop) — used by products, categories, campaign ──
export function ImageUpload({ value, onChange, label = 'Upload or drag & drop', compact = false }) {
  const [uploading, setUploading] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const handle = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true); setError('');
    try { onChange(await uploadAdminImage(file)); } catch (e) { setError(e.message || 'Upload failed'); } finally { setUploading(false); }
  };
  const size = compact ? 'size-[76px]' : 'size-[96px]';
  return (
    <div>
      <div className="flex items-stretch gap-3">
        {value && (
          <div className={`group/img relative shrink-0 ${size}`}>
            <img src={value} alt="" className="h-full w-full rounded-[12px] border border-[var(--admin-border-4)] bg-[var(--admin-bg)] object-cover" />
            <button type="button" aria-label="Remove image" onClick={() => onChange('')} className="absolute -top-2 -right-2 flex size-6 cursor-pointer items-center justify-center rounded-full border-2 border-[var(--admin-surface)] bg-[var(--tone-red)] text-white opacity-90 transition-transform hover:scale-110"><X size={12} strokeWidth={3} /></button>
          </div>
        )}
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files[0]); }}
          className={`flex min-h-[76px] flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] border-[1.5px] border-dashed px-3 py-3 transition-colors ${over ? 'border-[var(--admin-accent)] bg-[var(--admin-accent-soft)]' : 'border-[var(--admin-border-5)] bg-[var(--admin-hover-1)] hover:border-[var(--admin-accent)]'}`}
        >
          {uploading ? <Loader2 size={18} className="animate-spin text-[var(--admin-accent)]" /> : <Upload size={18} className="text-[var(--admin-text-muted)]" />}
          <span className="text-[13px] font-medium text-[var(--admin-text-muted)]">{uploading ? 'Uploading…' : value ? 'Replace image' : label}</span>
          {!uploading && <span className="text-[11px] text-[var(--admin-text-dim)]">PNG, JPG, WEBP up to 8 MB</span>}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { handle(e.target.files[0]); e.target.value = ''; }} />
      </div>
      {error && <p className="m-0 mt-1.5 text-[12px] font-semibold text-[var(--tone-red)]">{error}</p>}
    </div>
  );
}

// Small toggle switch (active / hidden etc.).
export function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 text-[14px] font-medium text-[var(--admin-text)]">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full border-0 transition-colors duration-300 ${checked ? 'bg-[var(--tone-green)]' : 'bg-[var(--admin-border-5)]'}`}
      >
        <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${checked ? 'translate-x-5' : ''}`} />
      </button>
      {label}
    </label>
  );
}
