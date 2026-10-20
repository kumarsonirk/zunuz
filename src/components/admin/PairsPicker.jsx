import { useEffect, useMemo, useState } from 'react';
import { X, Search } from 'lucide-react';
import { api } from '../../utils/api';
import { inputCls } from './adminStyles';

// Admin → Products → edit: "Best paired with" — up to 3 pieces shown first in
// the product page's "Best paired with" box. Empty = picked automatically
// (src/store/pairing.js: same finish, colour / stone, motif, close price).
// `value` = array of product ids; `selfId` = the product being edited.
const MAX = 3;

export default function PairsPicker({ value = [], onChange, selfId }) {
  const [all, setAll] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    api.get('/admin/products', true).then((list) => { if (alive) setAll(Array.isArray(list) ? list : []); }).catch(() => { if (alive) setAll([]); });
    return () => { alive = false; };
  }, []);

  const byId = useMemo(() => new Map((all || []).map((p) => [Number(p.id), p])), [all]);
  const ids = value.map(Number);
  const chosen = ids.map((id) => byId.get(id)).filter(Boolean);
  const term = q.trim().toLowerCase();
  const results = term && all
    ? all.filter((p) => p.id !== selfId && !ids.includes(p.id) && p.isActive && p.name.toLowerCase().includes(term)).slice(0, 8)
    : [];
  const add = (id) => { if (ids.length < MAX) onChange([...ids, id]); setQ(''); };
  const remove = (id) => onChange(ids.filter((x) => x !== id));

  return (
    <div>
      {chosen.length > 0 && (
        <ul className="m-0 mb-2.5 flex list-none flex-wrap gap-2 p-0">
          {chosen.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-full border border-[var(--admin-border-3)] bg-[var(--admin-surface-2)] py-1 pr-1 pl-1">
              {p.image && <img src={p.image} alt="" className="size-7 rounded-full object-cover" />}
              <span className="max-w-[220px] truncate text-[13px] font-semibold text-[var(--admin-text)]">{p.name}</span>
              <span className="text-[12px] text-[var(--admin-text-muted)]">{p.category?.name}</span>
              <button type="button" onClick={() => remove(p.id)} aria-label={`Remove ${p.name}`} className="flex size-6 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover-2)] hover:text-[var(--admin-text)]">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {ids.length < MAX ? (
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--admin-text-muted)]" />
          <input className={`${inputCls} pl-10`} value={q} onChange={(e) => setQ(e.target.value)} placeholder={all === null ? 'Loading products…' : 'Search a necklace, bracelet or earrings to pair…'} disabled={all === null} />
          {results.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-20 m-0 mt-1 max-h-[260px] list-none overflow-y-auto rounded-[12px] border border-[var(--admin-border-3)] bg-[var(--admin-surface)] p-1 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.6)]">
              {results.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => add(p.id)} className="flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] border-0 bg-transparent px-2.5 py-2 text-left hover:bg-[var(--admin-hover-2)]">
                    {p.image && <img src={p.image} alt="" className="size-8 shrink-0 rounded-[8px] object-cover" />}
                    <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--admin-text)]">{p.name}</span>
                    <span className="shrink-0 text-[12px] text-[var(--admin-text-muted)]">{p.category?.name} · ₹{p.price}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="m-0 text-[13px] text-[var(--admin-text-muted)]">That's the maximum of {MAX}. Remove one to pick another.</p>
      )}
    </div>
  );
}
