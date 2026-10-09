import { useMemo, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { Modal, Button, Badge } from '../AdminUI';
import { textareaCls, tableCls, thCls } from '../adminStyles';
import { api } from '../../../utils/api';
import { parsePincodeLines } from './parsePincodes';

// Bulk add: paste lines → live preview (parsed rows + problem lines) → save.
const EXAMPLE = `560001, Bengaluru, Karnataka, cod, 2-4 days
560002, Bengaluru, Karnataka, no cod, 3 days
400001, Mumbai, Maharashtra`;
const PREVIEW_MAX = 200;

export default function BulkPincodes({ onSaved, onClose }) {
  const [text, setText] = useState('');
  const [overwrite, setOverwrite] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const parsed = useMemo(() => parsePincodeLines(text), [text]);
  const { rows, errors, duplicates } = parsed;

  const save = async () => {
    if (!rows.length) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/admin/pincodes/bulk', { rows: rows.map((r) => ({ pincode: r.pincode, city: r.city, state: r.state, codAvailable: r.codAvailable, etaDays: r.etaDays, isActive: r.isActive })), overwrite }, true);
      onSaved(res);
    } catch (e) {
      setError(e.message || 'Could not save the pincodes.');
    } finally {
      setBusy(false);
    }
  };

  const td = 'px-3 py-2 align-top';
  return (
    <Modal
      open
      onClose={onClose}
      title="Bulk add pincodes"
      subtitle="Paste one pincode per line — from a spreadsheet or a courier's list."
      width={760}
      footer={(
        <>
          <span className="mr-auto self-center text-[13px] text-[var(--admin-text-muted)]">
            {rows.length ? `${rows.length} ready` : 'Nothing to add yet'}{errors.length ? ` · ${errors.length} line${errors.length === 1 ? '' : 's'} skipped` : ''}
          </span>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={busy} disabled={!rows.length}>Save {rows.length || ''} pincode{rows.length === 1 ? '' : 's'}</Button>
        </>
      )}
    >
      <div className="flex flex-col gap-4">
        <label htmlFor="bulk-pins" className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-[var(--admin-text-muted)]">Pincodes</span>
          <textarea
            id="bulk-pins"
            rows={7}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={EXAMPLE}
            spellCheck={false}
            className={`${textareaCls} font-mono text-[14px]`}
          />
          <span className="text-[12px] text-[var(--admin-text-dim)]">
            Format: <code>pincode, city, state, cod / no cod, delivery time</code> — only the pincode is required. Commas, tabs or “;” all work. Missing COD = available.
          </span>
        </label>

        <label className="inline-flex cursor-pointer items-center gap-2.5 text-[14px] text-[var(--admin-text)]">
          <input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} className="size-4 accent-[var(--admin-accent)]" />
          Update pincodes that are already on the list
        </label>

        {errors.length > 0 && (
          <div role="alert" className="rounded-[12px] border border-[var(--tone-red)]/30 bg-[var(--tone-red)]/8 px-4 py-3">
            <p className="m-0 flex items-center gap-2 text-[14px] font-semibold text-[var(--tone-red)]"><CircleAlert size={16} /> {errors.length} line{errors.length === 1 ? '' : 's'} will be skipped</p>
            <ul className="m-0 mt-2 flex max-h-[120px] list-none flex-col gap-1 overflow-y-auto p-0 text-[13px] text-[var(--admin-text-muted)]">
              {errors.slice(0, 50).map((e) => <li key={e.line}><b className="text-[var(--admin-text)]">Line {e.line}:</b> {e.error} <span className="text-[var(--admin-text-dim)]">“{e.text.slice(0, 60)}”</span></li>)}
            </ul>
          </div>
        )}
        {duplicates > 0 && <p className="m-0 text-[13px] text-[var(--tone-yellow)]">{duplicates} repeated pincode{duplicates === 1 ? '' : 's'} — the last line for each is used.</p>}

        {rows.length > 0 && (
          <div className="overflow-hidden rounded-[12px] border border-[var(--admin-border-2)]">
            <div className="max-h-[280px] overflow-auto">
              <table className={tableCls}>
                <thead className="sticky top-0 bg-[var(--admin-surface)]"><tr>{['Pincode', 'City', 'State', 'COD', 'Delivery', 'Status'].map((h) => <th key={h} className={`${thCls} py-2.5`}>{h}</th>)}</tr></thead>
                <tbody>
                  {rows.slice(0, PREVIEW_MAX).map((r) => (
                    <tr key={r.pincode} className="border-t border-[var(--admin-border-1)]">
                      <td className={`${td} font-mono font-semibold`}>{r.pincode}</td>
                      <td className={td}>{r.city || <span className="text-[var(--admin-text-dim)]">—</span>}{r.note && <span className="block text-[11px] text-[var(--tone-yellow)]">{r.note}</span>}</td>
                      <td className={td}>{r.state || <span className="text-[var(--admin-text-dim)]">—</span>}</td>
                      <td className={td}>{r.codAvailable ? <Badge tone="green">COD</Badge> : <Badge tone="muted">Prepaid</Badge>}</td>
                      <td className={`${td} whitespace-nowrap`}>{r.etaDays || <span className="text-[var(--admin-text-dim)]">Default</span>}</td>
                      <td className={td}>{r.isActive ? <Badge tone="green" dot>Active</Badge> : <Badge tone="muted" dot>Inactive</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > PREVIEW_MAX && <p className="m-0 border-t border-[var(--admin-border-1)] px-3 py-2 text-[12px] text-[var(--admin-text-muted)]">…and {rows.length - PREVIEW_MAX} more.</p>}
          </div>
        )}

        {error && <p role="alert" className="m-0 rounded-[12px] bg-[var(--tone-red)]/10 px-4 py-3 text-[14px] font-medium text-[var(--tone-red)]">{error}</p>}
      </div>
    </Modal>
  );
}
