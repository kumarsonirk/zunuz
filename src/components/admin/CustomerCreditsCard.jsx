import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins, Plus, Minus } from 'lucide-react';
import { api } from '../../utils/api';
import { Card, SectionTitle, Button } from './AdminUI';

// Admin customer page: the customer's ZUNUZ Credits (Refer & Earn rewards,
// welcome bonus, adjustments) — balance, recent history and a manual
// adjustment (+ adds, − removes; a reason is required and goes to the
// Activity Log). API: /api/admin/customers/:id/credits.
const inr = (n) => `₹${Math.abs(Math.round(n || 0)).toLocaleString('en-IN')}`;
const date = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fieldCls = 'h-10 w-full rounded-[10px] border border-[var(--admin-border-4)] bg-[var(--admin-surface)] px-3 text-[14px] text-[var(--admin-text)] outline-none transition-colors focus:border-[var(--admin-accent)]';

export default function CustomerCreditsCard({ customerId, style }) {
  const [data, setData] = useState(null); // { balance, history }
  const [error, setError] = useState('');
  const [mode, setMode] = useState(1); // +1 add, -1 remove
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let alive = true;
    api.get(`/admin/customers/${customerId}/credits`, true)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e.message || 'Could not load credits.'); });
    return () => { alive = false; };
  }, [customerId]);

  const submit = async (e) => {
    e.preventDefault();
    const n = Math.round(Number(amount));
    if (!Number.isInteger(n) || n <= 0) { setError('Enter a whole rupee amount.'); return; }
    if (!note.trim()) { setError('Add a short reason.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const d = await api.post(`/admin/customers/${customerId}/credits`, { amount: mode * n, note: note.trim() }, true);
      setData(d);
      setNotice(`${mode > 0 ? 'Added' : 'Removed'} ${inr(n)} ${mode > 0 ? 'to' : 'from'} their credits.`);
      setAmount(''); setNote('');
    } catch (err) { setError(err.message || 'Could not adjust credits.'); }
    finally { setBusy(false); }
  };

  return (
    <Card className="p-5 animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]" style={style}>
      <SectionTitle title={<span className="inline-flex items-center gap-2"><Coins size={18} strokeWidth={1.8} /> ZUNUZ Credits</span>} />
      {!data && !error ? (
        <div className="h-16 animate-pulse rounded-[12px] bg-[var(--admin-hover-3)]" />
      ) : data && (
        <>
          <p className="m-0 text-[30px] font-bold text-[var(--admin-text)] tabular-nums">{inr(data.balance)}</p>
          <p className="m-0 mb-4 text-[12px] text-[var(--admin-text-muted)]">Available to spend · can’t be withdrawn or transferred</p>

          {data.history.length > 0 ? (
            <ul className="m-0 mb-4 flex max-h-[220px] list-none flex-col gap-2 overflow-y-auto p-0">
              {data.history.slice(0, 20).map((h) => (
                <li key={h.id} className="flex items-start justify-between gap-3 border-b border-[var(--admin-border-2)] pb-2 text-[13px] last:border-0">
                  <span className="min-w-0">
                    <span className="block text-[var(--admin-text)]">
                      {h.orderId ? <Link to={`/admin/orders?open=${h.orderId}`} className="text-inherit no-underline hover:text-[var(--admin-accent)]">{h.label}</Link> : h.label}
                    </span>
                    <span className="text-[12px] text-[var(--admin-text-muted)]">{date(h.createdAt)}{h.expiresAt ? ` · expires ${date(h.expiresAt)}` : ''}</span>
                  </span>
                  <span className={`shrink-0 font-semibold tabular-nums ${h.amount > 0 ? 'text-[var(--tone-green)]' : 'text-[var(--admin-text-muted)]'}`}>{h.amount > 0 ? '+' : '−'}{inr(h.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 mb-4 text-[13px] text-[var(--admin-text-muted)]">No credit activity yet.</p>
          )}
        </>
      )}

      <form onSubmit={submit} className="flex flex-col gap-2.5 border-t border-[var(--admin-border-2)] pt-4">
        <span className="text-[13px] font-semibold text-[var(--admin-text)]">Adjust credits</span>
        <div className="flex gap-2">
          <div role="group" aria-label="Add or remove" className="flex shrink-0 rounded-[10px] border border-[var(--admin-border-4)] p-0.5">
            {[[1, Plus, 'Add'], [-1, Minus, 'Remove']].map(([m, Icon, label]) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`flex cursor-pointer items-center gap-1 rounded-[8px] border-0 px-2.5 text-[13px] font-semibold ${mode === m ? (m > 0 ? 'bg-[var(--tone-green)]/15 text-[var(--tone-green)]' : 'bg-[var(--tone-red)]/12 text-[var(--tone-red)]') : 'bg-transparent text-[var(--admin-text-muted)]'}`}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
          <input className={fieldCls} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} placeholder="Amount (₹)" aria-label="Amount in rupees" />
        </div>
        <input className={fieldCls} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (e.g. goodwill for a delayed order)" aria-label="Reason" />
        {error && <p role="alert" className="m-0 text-[13px] text-[var(--tone-red)]">{error}</p>}
        {notice && <p role="status" className="m-0 text-[13px] text-[var(--tone-green)]">{notice}</p>}
        <Button type="submit" size="sm" loading={busy} className="self-start">{mode > 0 ? 'Add credits' : 'Remove credits'}</Button>
      </form>
    </Card>
  );
}
