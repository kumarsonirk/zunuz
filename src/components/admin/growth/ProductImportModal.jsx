import { useEffect, useRef, useState } from 'react';
import { FileUp, Download, CheckCircle2, AlertCircle, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { api } from '../../../utils/api';
import { Modal, Button, Badge } from '../AdminUI';
import { tableCls, thCls, tdCls, trCls } from '../adminStyles';
import { parseCsv, rowsToProducts, batches, downloadAdminFile } from './csv';

// Bulk product import: pick a CSV → parsed in the browser → checked by the
// server (dry run, per-row validation) → preview → import the valid rows.
// Products are matched by slug: a known slug updates that product (blank
// cells keep the current value), anything else creates a new product.
const ACTION = {
  create: { label: 'New', tone: 'green' },
  update: { label: 'Update', tone: 'blue' },
  unchanged: { label: 'No change', tone: 'muted' },
  error: { label: 'Error', tone: 'red' },
};

async function runImport(rows, dryRun) {
  const out = { created: 0, updated: 0, failed: 0, unchanged: 0, results: [] };
  for (const chunk of batches(rows)) {
    const r = await api.post('/admin/reports/import/products', { rows: chunk, dryRun }, true);
    out.created += r.created; out.updated += r.updated; out.failed += r.failed; out.unchanged += r.unchanged;
    out.results.push(...r.results);
  }
  return out;
}

export default function ProductImportModal({ open, onClose, onImported }) {
  const [step, setStep] = useState('pick'); // pick | checking | preview | importing | done
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [check, setCheck] = useState(null);
  const [done, setDone] = useState(null);
  const [error, setError] = useState('');
  const [warn, setWarn] = useState('');
  const [over, setOver] = useState(false);
  const [meta, setMeta] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    api.get('/admin/reports/import/meta', true).then((m) => { if (alive) setMeta(m); }).catch(() => {});
    return () => { alive = false; };
  }, [open]);

  const reset = () => { setStep('pick'); setFile(null); setRows([]); setCheck(null); setDone(null); setError(''); setWarn(''); };
  const close = () => { if (step === 'importing' || step === 'checking') return; reset(); onClose(); };

  const handleFile = async (f) => {
    if (!f) return;
    setError(''); setWarn('');
    if (!/\.csv$/i.test(f.name) && f.type !== 'text/csv') { setError('Please choose a .csv file (in Excel: File → Save As → CSV UTF-8).'); return; }
    if (f.size > 5 * 1024 * 1024) { setError('That file is larger than 5 MB.'); return; }
    try {
      const text = await f.text();
      const { rows: parsed, unknown, missing } = rowsToProducts(parseCsv(text));
      if (missing.length) { setError('The first row must be a header row with at least a “name” column. Download the template to see the format.'); return; }
      if (!parsed.length) { setError('No product rows found under the header.'); return; }
      if (parsed.length > 2000) { setError('Import at most 2,000 products at a time.'); return; }
      if (unknown.length) setWarn(`Ignored column${unknown.length === 1 ? '' : 's'}: ${unknown.join(', ')}`);
      setFile(f); setRows(parsed); setStep('checking');
      const result = await runImport(parsed, true);
      setCheck(result); setStep('preview');
    } catch (e) {
      setError(e.message || 'Could not read that file.');
      setStep('pick');
    }
  };

  const doImport = async () => {
    const ok = new Set(check.results.filter((r) => r.action === 'create' || r.action === 'update').map((r) => r.row));
    setStep('importing'); setError('');
    try {
      const result = await runImport(rows.filter((r) => ok.has(r.__row)), false);
      setDone(result); setStep('done');
      onImported?.(result);
    } catch (e) {
      setError(e.message || 'Import failed.');
      setStep('preview');
    }
  };

  const importable = check ? check.created + check.updated : 0;
  const list = (done || check)?.results || [];

  const footer = step === 'preview' ? (
    <>
      <Button variant="secondary" onClick={reset}>Choose another file</Button>
      <Button icon={FileUp} disabled={!importable} onClick={doImport}>
        Import {importable} product{importable === 1 ? '' : 's'}
      </Button>
    </>
  ) : step === 'importing' ? <Button loading>Importing…</Button>
    : step === 'done' ? (
      <>
        <Button variant="secondary" icon={RefreshCw} onClick={reset}>Import another file</Button>
        <Button onClick={close}>Done</Button>
      </>
    ) : <Button variant="secondary" onClick={close} disabled={step === 'checking'}>Cancel</Button>;

  return (
    <Modal open={open} onClose={close} title="Import products from CSV" subtitle="Create new products or update existing ones (matched by slug)." width={860} footer={footer}>
      {meta && !meta.canImport && (
        <p role="alert" className="m-0 mb-4 rounded-[12px] border border-[var(--tone-yellow)]/30 bg-[var(--tone-yellow)]/10 px-4 py-3 text-[14px] text-[var(--tone-yellow)]">Importing also needs the Products permission — ask a Super Admin.</p>
      )}
      {error && <p role="alert" className="m-0 mb-4 flex items-start gap-2 rounded-[12px] border border-[var(--tone-red)]/30 bg-[var(--tone-red)]/10 px-4 py-3 text-[14px] text-[var(--tone-red)]"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</p>}

      {(step === 'pick' || step === 'checking') && (
        <>
          <button
            type="button"
            disabled={step === 'checking'}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); handleFile(e.dataTransfer.files[0]); }}
            className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-dashed px-6 py-10 text-center transition-colors disabled:cursor-wait ${over ? 'border-[var(--admin-accent)] bg-[var(--admin-accent-soft)]' : 'border-[var(--admin-border-5)] bg-[var(--admin-hover-1)] hover:border-[var(--admin-accent)]'}`}
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]">
              {step === 'checking' ? <RefreshCw size={22} className="animate-spin" /> : <FileSpreadsheet size={22} />}
            </span>
            <span className="text-[15px] font-semibold text-[var(--admin-text)]">{step === 'checking' ? `Checking ${rows.length} row${rows.length === 1 ? '' : 's'}…` : 'Choose a CSV file or drop it here'}</span>
            <span className="text-[13px] text-[var(--admin-text-muted)]">Nothing is saved until you confirm on the next step.</span>
          </button>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ''; }} />

          <div className="mt-5 rounded-[14px] border border-[var(--admin-border-2)] bg-[var(--admin-surface-2)] px-4 py-3.5 text-[13px] leading-relaxed text-[var(--admin-text-muted)]">
            <p className="m-0 mb-1.5 font-semibold text-[var(--admin-text)]">Columns</p>
            <p className="m-0"><b>name</b>, <b>category</b>, <b>type</b>, <b>price</b> and <b>image</b> are required for new products. Optional: slug, stock, active (yes/no), images (separate with |), tagline, description, materials, product_details, why_worth_it, care_instructions.</p>
            <p className="m-0 mt-1.5">Rows whose <b>slug</b> matches an existing product update it — empty cells keep the current value. Images are full https:// links or paths like /uploads/photo.webp.</p>
            {meta && (
              <p className="m-0 mt-1.5">Categories: {meta.categories.map((c) => c.slug).join(', ') || '—'} · Types: {meta.subcategories.map((s) => s.slug).join(', ') || '—'}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" icon={Download} onClick={() => downloadAdminFile('/admin/reports/import/template.csv', 'zunuz-product-import-template.csv').catch((e) => setError(e.message))}>Template</Button>
              <Button size="sm" variant="ghost" icon={Download} onClick={() => downloadAdminFile('/admin/reports/export/products.csv', 'zunuz-products.csv').catch((e) => setError(e.message))}>Current products (edit & re-import)</Button>
            </div>
          </div>
        </>
      )}

      {(step === 'preview' || step === 'importing' || step === 'done') && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[14px]">
            {done ? (
              <span className="inline-flex items-center gap-2 font-semibold text-[var(--tone-green)]"><CheckCircle2 size={18} />Imported: {done.created} created, {done.updated} updated{done.failed ? `, ${done.failed} failed` : ''}.</span>
            ) : (
              <>
                <span className="font-semibold text-[var(--admin-text)]">{file?.name}</span>
                <span className="text-[var(--admin-text-muted)]">· {rows.length} row{rows.length === 1 ? '' : 's'}</span>
                <Badge tone="green">{check.created} new</Badge>
                <Badge tone="blue">{check.updated} update{check.updated === 1 ? '' : 's'}</Badge>
                {check.unchanged > 0 && <Badge tone="muted">{check.unchanged} unchanged</Badge>}
                {check.failed > 0 && <Badge tone="red">{check.failed} with errors (skipped)</Badge>}
              </>
            )}
          </div>
          {warn && !done && <p className="m-0 mb-3 text-[13px] text-[var(--tone-yellow)]">{warn}</p>}
          <div className="max-h-[48vh] overflow-auto rounded-[14px] border border-[var(--admin-border-2)]">
            <table className={tableCls}>
              <thead className="sticky top-0 bg-[var(--admin-surface)]">
                <tr>{['Row', 'Product', 'Result', 'Details'].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const a = ACTION[r.action] || ACTION.error;
                  return (
                    <tr key={`${r.row}-${r.action}`} className={trCls}>
                      <td className={`${tdCls} text-[var(--admin-text-muted)] tabular-nums`}>{r.row}</td>
                      <td className={tdCls}>
                        <span className="block max-w-[260px] truncate font-medium text-[var(--admin-text)]">{r.name || '—'}</span>
                        {r.slug && <span className="block max-w-[260px] truncate font-mono text-[12px] text-[var(--admin-text-dim)]">{r.slug}</span>}
                      </td>
                      <td className={tdCls}><Badge tone={a.tone} dot>{a.label}</Badge></td>
                      <td className={`${tdCls} text-[13px]`}>
                        {r.errors?.length
                          ? <ul className="m-0 list-none p-0 text-[var(--tone-red)]">{r.errors.map((e) => <li key={e}>{e}</li>)}</ul>
                          : r.action === 'update'
                            ? <span className="text-[var(--admin-text-muted)]">Changes: {r.changes.join(', ')}</span>
                            : r.action === 'create' ? <span className="text-[var(--admin-text-muted)]">{done && r.id ? `Created #${r.id}` : 'Will be created'}</span>
                              : <span className="text-[var(--admin-text-dim)]">Same as the current product</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
