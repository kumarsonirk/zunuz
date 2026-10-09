import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ShoppingBag, CreditCard, Star, RotateCcw, PackageX, AlertTriangle, CheckCheck, BellOff, XCircle, TicketPercent } from 'lucide-react';
import { api } from '../../../utils/api';

// Top-bar bell (AdminLayout). Polls GET /api/admin/notifications every 60s
// (only while the tab is visible). Unread = items newer than the last time
// this admin opened the panel (kept per admin in localStorage). Inventory
// items have no time and never count as unread.
const POLL_MS = 60 * 1000;
const GROUPS = ['Orders', 'Payments', 'Coupons', 'Returns', 'Reviews', 'Inventory'];
const ICON = { order: ShoppingBag, cancel: XCircle, payment: CreditCard, coupon: TicketPercent, review: Star, return: RotateCcw, 'out-of-stock': PackageX, 'low-stock': AlertTriangle };
const seenKey = (id) => `zunuz_admin_notif_seen_${id || 'me'}`;
const readSeen = (id) => { try { return Number(localStorage.getItem(seenKey(id))) || 0; } catch { return 0; } };
const writeSeen = (id, t) => { try { localStorage.setItem(seenKey(id), String(t)); } catch { /* ignore */ } };

const time = (it) => (it.createdAt ? new Date(it.createdAt).getTime() : 0);

function ago(d) {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function NotificationBell({ adminId }) {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  // Last-seen time, tied to the admin it was read for (re-read on account switch).
  const [seenState, setSeenState] = useState(() => ({ id: adminId, t: readSeen(adminId) }));
  const seen = seenState.id === adminId ? seenState.t : readSeen(adminId);
  // While the panel is open, highlight what was unread when it opened.
  const [highlightSince, setHighlightSince] = useState(0);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  const load = useCallback(() => {
    api.get('/admin/notifications', true)
      .then((d) => { setItems(d.items || []); setError(false); })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, POLL_MS);
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [load]);


  const unread = useMemo(() => (items || []).filter((it) => time(it) > seen).length, [items, seen]);

  const markSeen = useCallback(() => {
    const newest = Math.max(Date.now(), ...(items || []).map(time));
    writeSeen(adminId, newest);
    setSeenState({ id: adminId, t: newest });
  }, [items, adminId]);

  const toggle = () => {
    if (open) { setOpen(false); return; }
    setHighlightSince(seen);
    setOpen(true);
    load();
    markSeen();
  };
  const markAll = () => { markSeen(); setHighlightSince(Date.now() + 1); };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); } };
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); document.removeEventListener('touchstart', onDown); };
  }, [open]);

  const groups = GROUPS.map((g) => ({ g, list: (items || []).filter((it) => it.group === g) })).filter((x) => x.list.length);
  const go = (link) => { setOpen(false); navigate(link); };

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className={`relative flex size-11 cursor-pointer items-center justify-center rounded-[12px] border border-[var(--admin-border-3)] bg-transparent transition-colors hover:text-[var(--admin-text)] max-[768px]:size-10 ${open ? 'text-[var(--admin-text)]' : 'text-[var(--admin-text-muted)]'}`}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[var(--admin-sidebar)] bg-[var(--admin-accent)] px-1 text-[11px] leading-none font-bold text-white tabular-nums">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute top-[calc(100%+10px)] right-0 z-40 flex max-h-[min(560px,calc(100dvh-100px))] w-[380px] flex-col overflow-hidden rounded-[16px] border border-[var(--admin-border-3)] bg-[var(--admin-surface)] text-[var(--admin-text)] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.6)] animate-[jw-rise_0.25s_cubic-bezier(0.16,1,0.3,1)_both] max-[640px]:fixed max-[640px]:top-[72px] max-[640px]:right-3 max-[640px]:left-3 max-[640px]:w-auto"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--admin-border-2)] px-4 py-3">
            <p className="m-0 font-['Bricolage_Grotesque','Inter',sans-serif] text-[16px] font-bold">Notifications</p>
            <button
              type="button"
              onClick={markAll}
              disabled={!items?.some((it) => time(it) > highlightSince)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border-0 bg-transparent px-2 py-1 text-[13px] font-semibold text-[var(--admin-accent)] hover:bg-[var(--admin-hover-3)] disabled:cursor-default disabled:text-[var(--admin-text-dim)] disabled:hover:bg-transparent"
            >
              <CheckCheck size={15} /> Mark all as read
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
            {items === null ? (
              <div className="flex flex-col gap-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-[10px] bg-[var(--admin-hover-3)]" />)}</div>
            ) : error && !items.length ? (
              <p className="m-0 px-4 py-8 text-center text-[14px] text-[var(--admin-text-muted)]">Couldn't load notifications. We'll retry shortly.</p>
            ) : !groups.length ? (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]"><BellOff size={20} /></span>
                <p className="m-0 mt-3 text-[15px] font-semibold">You're all caught up</p>
                <p className="m-0 mt-1 text-[13px] text-[var(--admin-text-muted)]">New orders, reviews, returns and stock alerts show up here.</p>
              </div>
            ) : groups.map(({ g, list }) => (
              <section key={g} aria-label={g}>
                <p className="sticky top-0 z-[1] m-0 bg-[var(--admin-surface)] px-4 pt-3 pb-1.5 text-[11px] font-bold tracking-[0.12em] text-[var(--admin-text-muted)] uppercase">{g} <span className="font-semibold text-[var(--admin-text-dim)]">· {list.length}</span></p>
                <ul className="m-0 list-none p-0 pb-1">
                  {list.map((it) => {
                    const Icon = ICON[it.type] || Bell;
                    const c = `var(--tone-${it.tone || 'blue'})`;
                    const isNew = time(it) > highlightSince;
                    return (
                      <li key={it.id}>
                        <button
                          type="button"
                          onClick={() => go(it.link)}
                          className={`flex w-full cursor-pointer items-start gap-3 border-0 px-4 py-2.5 text-left transition-colors hover:bg-[var(--admin-hover-3)] ${isNew ? 'bg-[var(--admin-accent-soft)]' : 'bg-transparent'}`}
                        >
                          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full" style={{ color: c, background: `color-mix(in srgb, ${c} 14%, transparent)` }}><Icon size={15} strokeWidth={1.9} /></span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className={`truncate text-[14px] text-[var(--admin-text)] ${isNew || it.highlight ? 'font-bold' : 'font-semibold'}`}>{it.title}</span>
                              {it.createdAt && <span className="shrink-0 text-[11px] text-[var(--admin-text-dim)]">{ago(it.createdAt)}</span>}
                            </span>
                            <span className="mt-0.5 block truncate text-[12px] text-[var(--admin-text-muted)]">{it.detail}</span>
                          </span>
                          {isNew && <span className="mt-2 size-2 shrink-0 rounded-full bg-[var(--admin-accent)]" aria-label="New" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
