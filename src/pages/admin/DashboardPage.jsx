import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IndianRupee, ShoppingBag, Users, Clock, Truck, CheckCircle2, XCircle, Wallet, Package,
  PackageCheck, PackageX, AlertTriangle, Star, Megaphone, ChevronDown, ArrowUpRight, TrendingUp,
  Globe, BarChart3, Eye, MailCheck, MailX, MailQuestion, Mail, TicketPercent, Sparkles, ExternalLink, Settings as SettingsIcon,
} from 'lucide-react';
import { api } from '../../utils/api';
import { SETTINGS } from '../../store/settings';

// Statistics (/admin): pick a period, then grouped stat cards (icon + label,
// big number, coloured sub-line), a revenue chart, order-status breakdown,
// catalogue health, top sellers and recent orders. Numbers come from
// GET /api/admin/stats (definitions live there).
const PERIODS = [
  { key: 'all', label: 'All time' },
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'year', label: 'This year' },
];
const DISPLAY = "font-['Bricolage_Grotesque','Inter',sans-serif]";
const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const STATUS = [
  { key: 'PENDING', label: 'Pending', color: 'var(--tone-yellow)' },
  { key: 'CONFIRMED', label: 'Confirmed', color: 'var(--tone-blue)' },
  { key: 'SHIPPED', label: 'Shipped', color: 'var(--tone-purple)' },
  { key: 'DELIVERED', label: 'Delivered', color: 'var(--tone-green)' },
  { key: 'CANCELLED', label: 'Cancelled', color: 'var(--tone-red)' },
];
const TONE = { green: 'text-[var(--tone-green)]', yellow: 'text-[var(--tone-yellow)]', blue: 'text-[var(--tone-blue)]', red: 'text-[var(--tone-red)]', pink: 'text-[var(--tone-pink)]', purple: 'text-[var(--tone-purple)]', muted: 'text-[var(--admin-text-muted)]' };
const card = 'rounded-[18px] border border-[var(--admin-border-2)] bg-[var(--admin-surface)]';

// Counts up to `value` when it changes (numbers only).
function useCountUp(value, ms = 900) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (typeof value !== 'number') return undefined;
    const dur = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms;
    const start = performance.now();
    const a = typeof from.current === 'number' ? from.current : 0;
    let raf;
    const tick = (t) => {
      const k = dur ? Math.min(1, (t - start) / dur) : 1;
      const e = 1 - (1 - k) ** 3;
      setShown(a + (value - a) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

function Stat({ icon: Icon, label, value, format = (n) => Math.round(n).toLocaleString('en-IN'), sub, tone = 'muted', to, i = 0 }) {
  const n = useCountUp(value);
  const body = (
    <>
      <span className="flex items-center gap-2.5 text-[15px] font-medium text-[var(--admin-text-muted)]">
        <Icon size={19} strokeWidth={1.6} /> {label}
        {to && <ArrowUpRight size={16} className="ml-auto opacity-0 transition-[opacity,translate] duration-300 group-hover/s:translate-x-0.5 group-hover/s:-translate-y-0.5 group-hover/s:opacity-100" />}
      </span>
      <span className={`mt-3 block text-[length:clamp(30px,2.8vw,40px)] leading-none font-bold tracking-[-0.01em] tabular-nums ${DISPLAY}`}>{value == null ? '—' : format(n)}</span>
      {sub && <span className={`mt-3.5 block text-[15px] font-medium ${TONE[tone]}`}>{sub}</span>}
    </>
  );
  const cls = `group/s block p-[clamp(20px,2vw,30px)] text-[var(--admin-text)] no-underline animate-[jw-rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both] ${card}`;
  const style = { animationDelay: `${i * 60}ms` };
  return to
    ? <Link to={to} style={style} className={`${cls} transition-[border-color,translate] duration-300 hover:-translate-y-1 hover:border-[var(--admin-border-5)]`}>{body}</Link>
    : <div style={style} className={cls}>{body}</div>;
}

function Section({ title, period, children, cols = 3 }) {
  return (
    <section className="mt-9">
      <h2 className={`m-0 mb-4 text-[19px] font-bold ${DISPLAY}`}>{title}{period && <span className="text-[var(--admin-text-muted)]"> — {period}</span>}</h2>
      <div className={`grid gap-[clamp(14px,1.6vw,26px)] ${cols === 4 ? 'grid-cols-4 max-[1250px]:grid-cols-2 max-[640px]:grid-cols-1' : cols === 3 ? 'grid-cols-3 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1' : 'grid-cols-2 max-[1100px]:grid-cols-1'}`}>{children}</div>
    </section>
  );
}

const EMAIL_TYPES = { ORDER_CONFIRMATION: 'Order confirmations', ORDER_CANCELLATION: 'Cancellations', WELCOME: 'Welcome', PASSWORD_RESET: 'Password resets' };
const shortDate = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// Top pages (7 days) + recent failed emails, side by side.
function TrafficAndEmailDetails({ traffic, email }) {
  const maxViews = Math.max(1, ...traffic.topPages.map((p) => p.views));
  return (
    <section className="mt-[clamp(14px,1.6vw,26px)] grid grid-cols-2 gap-[clamp(14px,1.6vw,26px)] max-[1100px]:grid-cols-1">
      <div className={`p-[clamp(20px,2vw,30px)] ${card}`}>
        <span className="flex items-center gap-2.5 text-[15px] font-medium text-[var(--admin-text-muted)]"><Eye size={19} strokeWidth={1.6} /> Most visited pages — last 7 days</span>
        {traffic.topPages.length ? (
          <ul className="m-0 mt-5 flex list-none flex-col gap-3.5 p-0">
            {traffic.topPages.map((p) => (
              <li key={p.path}>
                <div className="flex justify-between gap-3 text-[15px]"><span className="truncate font-mono text-[14px]">{p.path}</span><span className="font-semibold tabular-nums">{p.views.toLocaleString('en-IN')}</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--admin-hover-3)]">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#4C9BFF,#FF3D8B)] transition-[width] duration-700" style={{ width: `${(p.views / maxViews) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="m-0 mt-5 text-[15px] text-[var(--admin-text-muted)]">No visits recorded yet.</p>}
      </div>
      <div className={`p-[clamp(20px,2vw,30px)] ${card}`}>
        <span className="flex items-center gap-2.5 text-[15px] font-medium text-[var(--admin-text-muted)]"><Mail size={19} strokeWidth={1.6} /> Emails by type — {email.recentFailures.length ? 'and recent failures' : 'this period'}</span>
        <ul className="m-0 mt-5 flex list-none flex-col gap-2.5 p-0">
          {Object.entries(EMAIL_TYPES).map(([k, lbl]) => (
            <li key={k} className="flex justify-between text-[15px]"><span className="text-[var(--admin-text-muted)]">{lbl}</span><span className="font-semibold tabular-nums">{email.byType[k] || 0}</span></li>
          ))}
        </ul>
        {email.recentFailures.length > 0 && (
          <ul className="m-0 mt-5 flex list-none flex-col gap-2 border-t border-[var(--admin-border-2)] p-0 pt-4">
            {email.recentFailures.map((f) => (
              <li key={f.id} className="text-[13px]">
                <span className="font-semibold text-[var(--tone-red)]">{EMAIL_TYPES[f.type] || f.type}</span>
                <span className="text-[var(--admin-text-muted)]"> → {f.to}{f.orderId ? ` · order #${f.orderId}` : ''} · {shortDate(f.createdAt)}</span>
                {f.error && <span className="block truncate text-[var(--admin-text-dim)]">{f.error}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function RevenueChart({ series }) {
  const pts = series?.points || [];
  const max = Math.max(1, ...pts.map((p) => p.revenue));
  const total = pts.reduce((s, p) => s + p.revenue, 0);
  const every = Math.ceil(pts.length / 8);
  return (
    <div className={`p-[clamp(20px,2vw,30px)] ${card}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="flex items-center gap-2.5 text-[15px] font-medium text-[var(--admin-text-muted)]"><TrendingUp size={19} strokeWidth={1.6} /> Revenue {series?.granularity === 'month' ? 'by month' : '— last 30 days'}</span>
        <span className={`text-[22px] font-bold ${DISPLAY}`}>{inr(total)}</span>
      </div>
      <div className="mt-6 flex h-[190px] items-end gap-[3px]" role="img" aria-label={`Revenue chart, total ${inr(total)}`}>
        {pts.map((p, i) => (
          <div key={i} className="group/b relative flex h-full flex-1 flex-col justify-end">
            <div
              className="w-full origin-bottom rounded-t-[6px] bg-[linear-gradient(180deg,#FF3D8B,#F6C915)] opacity-85 transition-opacity duration-200 group-hover/b:opacity-100 animate-[admin-grow_0.8s_cubic-bezier(0.16,1,0.3,1)_both]"
              style={{ height: `${Math.max(p.revenue ? 4 : 1.5, (p.revenue / max) * 100)}%`, animationDelay: `${i * 18}ms`, background: p.revenue ? undefined : 'var(--admin-border-3)' }}
            />
            <div className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-10 -translate-x-1/2 rounded-[10px] bg-[var(--admin-text)] px-2.5 py-1.5 text-center text-[12px] whitespace-nowrap text-[var(--admin-bg)] opacity-0 transition-opacity group-hover/b:opacity-100">
              <b>{inr(p.revenue)}</b><br />{p.orders} order{p.orders === 1 ? '' : 's'} · {p.label}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-[3px] text-[11px] text-[var(--admin-text-muted)]">
        {pts.map((p, i) => <span key={i} className="flex-1 truncate text-center">{i % every === 0 ? p.label : ''}</span>)}
      </div>
    </div>
  );
}

function StatusBreakdown({ status, orders }) {
  const total = Math.max(1, orders);
  return (
    <div className={`p-[clamp(20px,2vw,30px)] ${card}`}>
      <span className="flex items-center gap-2.5 text-[15px] font-medium text-[var(--admin-text-muted)]"><ShoppingBag size={19} strokeWidth={1.6} /> Orders by status</span>
      <div className="mt-6 flex h-3.5 overflow-hidden rounded-full bg-[var(--admin-hover-3)]">
        {STATUS.map((s) => (status?.[s.key] ? <div key={s.key} title={`${s.label}: ${status[s.key]}`} className="h-full transition-[width] duration-700" style={{ width: `${(status[s.key] / total) * 100}%`, background: s.color }} /> : null))}
      </div>
      <ul className="m-0 mt-6 flex list-none flex-col gap-3.5 p-0">
        {STATUS.map((s) => (
          <li key={s.key} className="flex items-center gap-3 text-[15px]">
            <span className="size-2.5 rounded-full" style={{ background: s.color }} />
            <span className="flex-1 text-[var(--admin-text-muted)]">{s.label}</span>
            <span className="font-semibold tabular-nums">{status?.[s.key] ?? 0}</span>
            <span className="w-12 text-right text-[13px] text-[var(--admin-text-muted)] tabular-nums">{orders ? Math.round(((status?.[s.key] || 0) / orders) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExpiringCouponsAlert({ coupons }) {
  if (!coupons || !coupons.length) return null;

  return (
    <div className="mt-7 overflow-hidden rounded-[18px] border border-[var(--tone-yellow)]/30 bg-[color-mix(in_srgb,var(--tone-yellow)_7%,var(--admin-surface))] p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--tone-yellow)]/20 pb-3.5">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-[var(--tone-yellow)]/15 text-[var(--tone-yellow)]">
            <TicketPercent size={19} strokeWidth={2} />
          </span>
          <div>
            <h3 className={`m-0 text-[16px] font-bold text-[var(--admin-text)] ${DISPLAY}`}>
              {coupons.length === 1 ? '1 Coupon Expiring Soon' : `${coupons.length} Coupons Expiring Soon`}
            </h3>
            <p className="m-0 text-[13px] text-[var(--admin-text-muted)]">
              Scheduled to expire in the next 12–24 hours. Review or adjust expiry dates in coupon management.
            </p>
          </div>
        </div>
        <Link
          to="/admin/coupons"
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-[var(--admin-border-3)] bg-[var(--admin-surface)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--admin-text)] no-underline transition-colors hover:border-[var(--admin-border-5)]"
        >
          Manage coupons <ArrowUpRight size={14} />
        </Link>
      </div>

      <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {coupons.map((c) => {
          const msLeft = new Date(c.expiresAt).getTime() - Date.now();
          const hoursLeft = Math.max(1, Math.round(msLeft / (3600 * 1000)));
          const urgent = hoursLeft <= 12;
          const expiryDate = new Date(c.expiresAt).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            day: 'numeric',
            month: 'short',
          });

          return (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-[12px] border border-[var(--admin-border-2)] bg-[var(--admin-surface)] px-3.5 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-[6px] bg-[var(--admin-hover-3)] px-2 py-0.5 font-mono text-[13px] font-bold tracking-wide text-[var(--admin-text)]">
                    {c.code}
                  </span>
                  <span className="text-[12px] font-semibold text-[var(--admin-text-muted)]">
                    {c.type === 'PERCENT' ? `${c.value}% off` : `₹${c.value} off`}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-[var(--admin-text-dim)]">
                  Expires {expiryDate} {c.usageLimit ? `· ${c.usedCount}/${c.usageLimit} used` : `· ${c.usedCount || 0} used`}
                </div>
              </div>

              <span
                className={`shrink-0 rounded-[8px] border px-2 py-1 text-[11px] font-bold ${
                  urgent
                    ? 'border-[var(--tone-red)]/40 bg-[var(--tone-red)]/10 text-[var(--tone-red)] animate-pulse'
                    : 'border-[var(--tone-yellow)]/40 bg-[var(--tone-yellow)]/10 text-[var(--tone-yellow)]'
                }`}
              >
                {hoursLeft}h left
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FestiveCampaignBanner() {
  const on = !!SETTINGS.navratriOfferEnabled;
  return (
    <div
      className={`mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[18px] border p-4 sm:p-5 transition-all ${
        on
          ? 'border-[var(--tone-yellow)]/50 bg-[linear-gradient(135deg,rgba(246,201,21,0.08)_0%,rgba(232,48,79,0.05)_100%)] shadow-sm'
          : 'border-[var(--admin-border-2)] bg-[var(--admin-surface)] opacity-75'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#F6C915]/20 text-[#C48C00]">
          <Sparkles size={22} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 text-[16px] font-bold text-[var(--admin-text)]">
              {SETTINGS.navratriOfferTitle || 'Pick Any 3 @ ₹999'} · Navratri Special Offer
            </h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide uppercase ${
                on ? 'bg-[var(--tone-green)]/15 text-[var(--tone-green)]' : 'bg-[var(--admin-border-3)] text-[var(--admin-text-muted)]'
              }`}
            >
              {on ? '● ACTIVE ON STORE' : 'OFF'}
            </span>
          </div>
          <p className="m-0 mt-0.5 text-[13px] text-[var(--admin-text-muted)]">
            Bundle rule: {SETTINGS.navratriBundleCount ?? 3} items between ₹{SETTINGS.navratriMinPrice ?? 499}–₹{SETTINGS.navratriMaxPrice ?? 699} for ₹{SETTINGS.navratriBundlePrice ?? 999}.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <a
          href="/navratri-offers"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-[12px] border border-[var(--admin-border-4)] bg-[var(--admin-surface)] px-3.5 py-2 text-[13px] font-semibold text-[var(--admin-text)] no-underline hover:bg-[var(--admin-hover-3)]"
        >
          <ExternalLink size={14} /> View Storefront Page
        </a>
        <Link
          to="/admin/settings#navratri-offer"
          className="inline-flex items-center gap-1.5 rounded-[12px] bg-[#111110] px-3.5 py-2 text-[13px] font-semibold text-white no-underline hover:bg-[#333]"
        >
          <SettingsIcon size={14} /> Configure Offer
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState(() => localStorage.getItem('zunuz_admin_period') || 'all');
  const [data, setData] = useState(null);
  const [loadedFor, setLoadedFor] = useState(null); // period the shown data is for
  const [error, setError] = useState('');
  const loading = loadedFor !== period;

  useEffect(() => {
    let alive = true;
    localStorage.setItem('zunuz_admin_period', period);
    api.get(`/admin/stats?period=${period}`, true)
      .then((d) => { if (alive) { setData(d); setError(''); } })
      .catch((e) => { if (alive) setError(e.message || 'Could not load statistics.'); })
      .finally(() => { if (alive) setLoadedFor(period); });
    return () => { alive = false; };
  }, [period]);

  const label = PERIODS.find((p) => p.key === period)?.label;
  const d = data;
  const toProcess = d ? d.status.PENDING + d.status.CONFIRMED : null;
  const storeCats = d?.categories.filter((c) => c.storefront) || [];
  const maxCat = Math.max(1, ...storeCats.map((c) => c.products));

  return (
    <div className="mx-auto max-w-[1480px]">
      {/* Title left, Period on the right (stacks on small screens). */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <h1 className={`m-0 text-[length:clamp(30px,3vw,40px)] font-bold tracking-[-0.01em] ${DISPLAY}`}>Statistics</h1>

      <label className="block w-[260px] max-[640px]:w-full">
        <span className="mb-2 block text-[14px] font-semibold text-[var(--admin-text-muted)]">Period</span>
        <span className="relative block">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-12 w-full cursor-pointer appearance-none rounded-[12px] border border-[var(--admin-border-4)] bg-[var(--admin-surface)] px-4 text-[16px] text-[var(--admin-text)] outline-none transition-colors hover:border-[var(--admin-border-5)] focus:border-[var(--admin-accent)]"
          >
            {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <ChevronDown size={18} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[var(--admin-text-muted)]" />
        </span>
      </label>
      </div>

      {error && <p role="alert" className="m-0 mt-6 rounded-[12px] border border-[var(--tone-red)]/30 bg-[var(--tone-red)]/10 px-4 py-3 text-[14px] text-[var(--tone-red)]">{error}</p>}

      {d?.expiringCoupons?.length > 0 && <ExpiringCouponsAlert coupons={d.expiringCoupons} />}

      <FestiveCampaignBanner />

      {!d && loading ? (
        <div className="mt-9 grid grid-cols-3 gap-6 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className={`h-[176px] animate-pulse ${card}`} />)}
        </div>
      ) : d && (
        <div key={period} className={`transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
          <Section title="Overview" period={label}>
            <Stat i={0} icon={IndianRupee} label="Total Revenue" value={d.revenue} format={inr} tone="green" sub={`From ${d.orders - d.status.CANCELLED} orders · avg ${inr(d.avgOrderValue)}`} />
            <Stat i={1} icon={ShoppingBag} label="Total Orders" value={d.orders} tone="yellow" to="/admin/orders" sub={`${d.byMethod.online.orders} paid online · ${d.byMethod.cod.orders} cash on delivery`} />
            <Stat i={2} icon={Users} label="Customers" value={d.customers.total} tone="blue" to="/admin/customers" sub={period === 'all' ? 'Registered accounts' : `${d.customers.new} new · ${label.toLowerCase()}`} />
          </Section>

          <Section title="Website Traffic" cols={period === 'today' || period === '7d' ? 2 : 3}>
            <Stat i={3} icon={Globe} label="Site Visits Today" value={d.traffic.today.views} tone="blue" sub={`Page loads since midnight · ${d.traffic.today.visitors.toLocaleString('en-IN')} visitor${d.traffic.today.visitors === 1 ? '' : 's'}`} />
            <Stat i={4} icon={BarChart3} label="Last 7 Days" value={d.traffic.last7Days.views} tone="yellow" sub={`Total page loads · ${d.traffic.last7Days.visitors.toLocaleString('en-IN')} unique visitor${d.traffic.last7Days.visitors === 1 ? '' : 's'}`} />
            {period !== 'today' && period !== '7d' && (
              <Stat i={5} icon={Eye} label={`Page Loads — ${label}`} value={d.traffic.period.views} tone="green" sub={d.traffic.trackingSince ? `${d.traffic.period.visitors.toLocaleString('en-IN')} unique visitor${d.traffic.period.visitors === 1 ? '' : 's'} · tracking since ${new Date(d.traffic.trackingSince).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Tracking starts with the next visit'} />
            )}
          </Section>

          <Section title="Orders" period={label}>
            <Stat i={3} icon={Clock} label="To Process" value={toProcess} tone={toProcess ? 'pink' : 'muted'} to="/admin/orders" sub={`${d.status.PENDING} pending · ${d.status.CONFIRMED} confirmed`} />
            <Stat i={4} icon={Truck} label="Shipped" value={d.status.SHIPPED} tone="purple" sub="On the way to customers" />
            <Stat i={5} icon={CheckCircle2} label="Delivered" value={d.status.DELIVERED} tone="green" sub="Completed orders" />
            <Stat i={6} icon={Package} label="Items Sold" value={d.itemsSold} tone="blue" sub="Pieces across all orders" />
            <Stat i={7} icon={Wallet} label="Awaiting Payment" value={d.awaitingPayment} tone={d.awaitingPayment ? 'red' : 'muted'} sub={`Online checkouts not completed · ${d.failedPayments} failed`} />
            <Stat i={8} icon={XCircle} label="Cancelled" value={d.status.CANCELLED} tone="red" sub="Refunded / not fulfilled" />
          </Section>

          <Section title="Email Delivery" period={label} cols={4}>
            <Stat i={9} icon={MailCheck} label="Emails Sent" value={d.email.sent} tone="green" sub={d.email.simulated ? `${d.email.simulated} only logged (no Resend key on this server)` : 'Delivered to the email provider'} />
            <Stat i={10} icon={MailX} label="Emails Failed" value={d.email.failed} tone={d.email.failed ? 'red' : 'muted'} sub={d.email.failed ? 'See recent failures below' : 'None right now'} />
            <Stat i={11} icon={MailQuestion} label="Awaiting Send" value={d.email.awaiting} tone={d.email.awaiting ? 'yellow' : 'muted'} to={d.email.awaiting ? '/admin/orders' : undefined} sub="Orders without a confirmation email" />
            <Stat i={12} icon={Mail} label="Order Confirmations" value={d.email.byType.ORDER_CONFIRMATION || 0} tone="blue" sub={d.email.trackingSince ? `Logged since ${new Date(d.email.trackingSince).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : 'Logging starts with the next email'} />
          </Section>
          <TrafficAndEmailDetails traffic={d.traffic} email={d.email} />

          <section className="mt-9 grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-[clamp(14px,1.6vw,26px)] max-[1100px]:grid-cols-1">
            <RevenueChart series={d.series} />
            <StatusBreakdown status={d.status} orders={d.orders} />
          </section>

          <Section title="Catalogue">
            <Stat i={9} icon={PackageCheck} label="Active Products" value={d.products.active} tone="green" to="/admin/products" sub={`${d.products.total} in the catalogue`} />
            <Stat i={10} icon={PackageX} label="Out of Stock" value={d.products.outOfStock} tone={d.products.outOfStock ? 'red' : 'muted'} to="/admin/products" sub={d.products.outOfStock ? 'Restock needed' : 'Everything in stock'} />
            <Stat i={11} icon={AlertTriangle} label="Low Stock" value={d.products.lowStock} tone={d.products.lowStock ? 'yellow' : 'muted'} to="/admin/products" sub={`${d.products.lowStockAt} or fewer left`} />
            <Stat i={12} icon={Star} label="Product Reviews" value={d.reviews.products} tone="purple" to="/admin/reviews" sub={d.reviews.productAvg ? `Average ${d.reviews.productAvg.toFixed(1)} ★ · ${d.reviews.orders} order ratings` : 'No reviews in this period'} />
            <Stat i={13} icon={Megaphone} label="Campaign Sign-ups" value={d.campaignSignups} tone="pink" to="/admin/campaign" sub="Form entries" />
            <div className={`p-[clamp(20px,2vw,30px)] animate-[jw-rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both] ${card}`} style={{ animationDelay: '840ms' }}>
              <span className="flex items-center gap-2.5 text-[15px] font-medium text-[var(--admin-text-muted)]"><Package size={19} strokeWidth={1.6} /> Storefront categories</span>
              <ul className="m-0 mt-5 flex list-none flex-col gap-3.5 p-0">
                {storeCats.map((c) => (
                  <li key={c.id}>
                    <div className="flex justify-between text-[15px]"><span>{c.name}</span><span className="font-semibold tabular-nums">{c.products}</span></div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--admin-hover-3)]">
                      <div className="h-full rounded-full bg-[linear-gradient(90deg,#FF3D8B,#F6C915)] transition-[width] duration-700" style={{ width: `${(c.products / maxCat) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          <section className="mt-9 grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-[clamp(14px,1.6vw,26px)] max-[1100px]:grid-cols-1">
            <div className={`p-[clamp(20px,2vw,30px)] ${card}`}>
              <h2 className={`m-0 text-[19px] font-bold ${DISPLAY}`}>Top sellers</h2>
              {d.topProducts.length ? (
                <ol className="m-0 mt-5 flex list-none flex-col gap-3.5 p-0">
                  {d.topProducts.map((p, i) => (
                    <li key={p.id} className="flex items-center gap-3">
                      <span className="w-5 text-[14px] font-bold text-[var(--admin-text-muted)]">{i + 1}</span>
                      <span className="size-11 shrink-0 overflow-hidden rounded-[10px] bg-[var(--admin-surface-2)]">{p.image && <img src={p.image} alt="" className="h-full w-full scale-110 object-cover" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">{p.name}</span>
                        <span className="text-[13px] text-[var(--admin-text-muted)]">{inr(p.price)} · {p.stock} in stock</span>
                      </span>
                      <span className="text-[15px] font-bold text-[var(--tone-green)] tabular-nums">{p.sold} sold</span>
                    </li>
                  ))}
                </ol>
              ) : <p className="m-0 mt-5 text-[15px] text-[var(--admin-text-muted)]">No sales in this period yet.</p>}
            </div>

            <div className={`overflow-hidden ${card}`}>
              <div className="flex items-center justify-between px-[clamp(20px,2vw,30px)] pt-[clamp(20px,2vw,26px)] pb-3">
                <h2 className={`m-0 text-[19px] font-bold ${DISPLAY}`}>Recent orders</h2>
                <Link to="/admin/orders" className="text-[14px] font-semibold text-[var(--admin-accent)] no-underline hover:underline">View all →</Link>
              </div>
              {d.recentOrders.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[14px]">
                    <thead>
                      <tr className="text-left text-[12px] tracking-[0.08em] text-[var(--admin-text-muted)] uppercase">
                        {['Order', 'Customer', 'Items', 'Total', 'Status', 'Date'].map((h) => <th key={h} className="px-[clamp(14px,1.6vw,24px)] py-3 font-semibold whitespace-nowrap">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {d.recentOrders.map((o) => {
                        const s = STATUS.find((x) => x.key === o.status) || STATUS[0];
                        return (
                          <tr key={o.id} className="border-t border-[var(--admin-border-1)] transition-colors hover:bg-[var(--admin-hover-2)]">
                            <td className="px-[clamp(14px,1.6vw,24px)] py-3.5 font-semibold">#{o.id}</td>
                            <td className="px-[clamp(14px,1.6vw,24px)] py-3.5">
                              <span className="block max-w-[200px] truncate font-medium">{o.customer?.name || '—'}</span>
                              <span className="block max-w-[200px] truncate text-[12px] text-[var(--admin-text-muted)]">{o.customer?.email}</span>
                            </td>
                            <td className="px-[clamp(14px,1.6vw,24px)] py-3.5 text-[var(--admin-text-muted)]">{o.items.reduce((n, it) => n + it.quantity, 0)}</td>
                            <td className="px-[clamp(14px,1.6vw,24px)] py-3.5 font-semibold tabular-nums">{inr(o.total)}</td>
                            <td className="px-[clamp(14px,1.6vw,24px)] py-3.5">
                              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold whitespace-nowrap" style={{ color: s.color, background: `color-mix(in srgb, ${s.color} 14%, transparent)` }}>
                                <span className="size-1.5 rounded-full" style={{ background: s.color }} />{s.label}
                              </span>
                            </td>
                            <td className="px-[clamp(14px,1.6vw,24px)] py-3.5 whitespace-nowrap text-[var(--admin-text-muted)]">{new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <p className="m-0 px-[clamp(20px,2vw,30px)] pb-6 text-[15px] text-[var(--admin-text-muted)]">No orders in this period.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
