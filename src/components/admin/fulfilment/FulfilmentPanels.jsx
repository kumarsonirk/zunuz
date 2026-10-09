import { useState } from 'react';
import { Truck, RotateCcw, StickyNote, AlertTriangle, ExternalLink, RefreshCw, Check } from 'lucide-react';
import { api } from '../../../utils/api';
import { Button, Badge, Field, Select } from '../AdminUI';
import { inputCls, textareaCls } from '../adminStyles';
import {
  COURIERS, trackingUrlFor, inr, fmtDate, fmtDateTime, isOnlinePaid, tookMoney, refundableOf, paymentMismatch, breakdown, REFUND_STATUS,
} from './fulfilmentUtils';

// Admin order-modal sections for fulfilment: shipping/tracking, refunds,
// internal note, payment-mismatch warning, price breakdown, small badges.

function Panel({ icon: Icon, title, aside, children }) {
  return (
    <section className="rounded-[14px] border border-[var(--admin-border-2)] bg-[var(--admin-surface-2)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 flex items-center gap-2 text-[12px] font-semibold tracking-[0.08em] text-[var(--admin-text-muted)] uppercase">
          <Icon size={14} strokeWidth={1.8} /> {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Msg({ tone = 'red', children }) {
  if (!children) return null;
  return <p role={tone === 'red' ? 'alert' : 'status'} className="m-0 mt-3 text-[13px] font-semibold" style={{ color: `var(--tone-${tone})` }}>{children}</p>;
}

export function RefundBadge({ order, size }) {
  const s = REFUND_STATUS[order.refundStatus];
  if (!s) return null;
  const partial = order.refundStatus !== 'FAILED' && (order.refundAmount || 0) > 0 && order.refundAmount < order.total;
  return (
    <Badge tone={s.tone} className={size === 'sm' ? 'px-2! py-0.5! text-[11px]!' : ''}>
      {partial ? `Partly refunded · ${inr(order.refundAmount)}` : s.label}
    </Badge>
  );
}

export function MismatchWarning({ order, compact }) {
  if (!paymentMismatch(order)) return null;
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--tone-red)]" title="Payment not received — check before shipping">
        <AlertTriangle size={12} strokeWidth={2.4} /> Payment not received
      </span>
    );
  }
  return (
    <p role="alert" className="m-0 flex items-start gap-2.5 rounded-[12px] border border-[var(--tone-red)]/35 bg-[var(--tone-red)]/10 px-4 py-3 text-[14px] font-semibold text-[var(--tone-red)]">
      <AlertTriangle size={18} strokeWidth={2.2} className="mt-px shrink-0" />
      <span>Payment not received — check before shipping. This is an online order whose Razorpay payment is {String(order.paymentStatus || 'pending').toLowerCase()}, but it is marked {String(order.status).toLowerCase()}.</span>
    </p>
  );
}

// Items / Discount / Delivery / ZUNUZ Credits / Total.
export function PriceBreakdown({ order, big = true }) {
  const b = breakdown(order);
  const row = 'flex items-baseline justify-between text-[14px]';
  return (
    <dl className="m-0 mt-4 flex flex-col gap-1.5 border-t border-[var(--admin-border-2)] pt-3">
      <div className={row}><dt className="text-[var(--admin-text-muted)]">Items</dt><dd className="m-0 tabular-nums text-[var(--admin-text)]">{inr(b.items)}</dd></div>
      {b.discount > 0 && (
        <div className={row}>
          <dt className="text-[var(--admin-text-muted)]">Discount{order.couponCode && <span className="ml-1.5 rounded-[6px] bg-[var(--admin-hover-3)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--admin-text)]">{order.couponCode}</span>}</dt>
          <dd className="m-0 tabular-nums text-[var(--tone-green)]">−{inr(b.discount)}</dd>
        </div>
      )}
      <div className={row}><dt className="text-[var(--admin-text-muted)]">Delivery</dt><dd className="m-0 tabular-nums text-[var(--admin-text)]">{b.delivery ? inr(b.delivery) : 'Free'}</dd></div>
      {b.credits > 0 && (
        <div className={row}><dt className="text-[var(--admin-text-muted)]">ZUNUZ Credits</dt><dd className="m-0 tabular-nums text-[var(--tone-green)]">−{inr(b.credits)}</dd></div>
      )}
      <div className="mt-1 flex items-baseline justify-between">
        <dt className="text-[14px] text-[var(--admin-text-muted)]">Total</dt>
        <dd className={`m-0 font-bold tabular-nums text-[var(--admin-text)] font-['Bricolage_Grotesque','Inter',sans-serif] ${big ? 'text-[20px]' : 'text-[16px]'}`}>{inr(b.total)}</dd>
      </div>
      {(order.refundAmount || 0) > 0 && (
        <div className={row}><dt className="text-[var(--admin-text-muted)]">Refunded</dt><dd className="m-0 tabular-nums text-[var(--tone-red)]">−{inr(order.refundAmount)}</dd></div>
      )}
    </dl>
  );
}

// ── Shipping & tracking ──
export function ShippingPanel({ order, onSaved }) {
  const [courier, setCourier] = useState(order.courier || '');
  const [number, setNumber] = useState(order.trackingNumber || '');
  const [url, setUrl] = useState(order.trackingUrl || '');
  // Auto-fill the URL until the admin types their own.
  const [urlTouched, setUrlTouched] = useState(!!order.trackingUrl && order.trackingUrl !== trackingUrlFor(order.courier, order.trackingNumber));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const auto = (c, n) => { if (!urlTouched) setUrl(trackingUrlFor(c, n)); };
  const dirty = courier !== (order.courier || '') || number !== (order.trackingNumber || '') || url !== (order.trackingUrl || '');

  const save = async () => {
    setBusy(true); setErr(''); setOk('');
    try {
      const updated = await api.put(`/admin/orders/${order.id}/tracking`, { courier, trackingNumber: number, trackingUrl: url }, true);
      onSaved(updated);
      setOk('Tracking saved.');
    } catch (e) { setErr(e.message || 'Could not save tracking.'); }
    finally { setBusy(false); }
  };

  const dates = [order.shippedAt && `Shipped ${fmtDateTime(order.shippedAt)}`, order.deliveredAt && `Delivered ${fmtDateTime(order.deliveredAt)}`].filter(Boolean);

  return (
    <Panel
      icon={Truck}
      title="Shipping"
      aside={order.trackingUrl && (
        <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--admin-accent)] no-underline hover:underline">
          Open tracking <ExternalLink size={13} />
        </a>
      )}
    >
      {dates.length > 0 && <p className="m-0 mb-3 text-[13px] text-[var(--admin-text-muted)]">{dates.join(' · ')}</p>}
      <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
        <Field label="Courier">
          <Select value={courier} onChange={(e) => { setCourier(e.target.value); auto(e.target.value, number); }} aria-label="Courier">
            <option value="">Select courier</option>
            {COURIERS.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Tracking number">
          <input className={inputCls} value={number} maxLength={120} placeholder="e.g. 1234567890" onChange={(e) => { setNumber(e.target.value); auto(courier, e.target.value); }} />
        </Field>
        <Field label="Tracking URL" hint={urlTouched ? 'Custom link' : 'Filled in automatically for known couriers — you can edit it.'} className="col-span-2 max-[520px]:col-span-1">
          <input className={inputCls} type="url" value={url} maxLength={500} placeholder="https://" onChange={(e) => { setUrl(e.target.value); setUrlTouched(true); }} />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {order.status !== 'SHIPPED' && order.status !== 'DELIVERED' && number && <span className="mr-auto text-[12px] text-[var(--admin-text-dim)]">Saved tracking is emailed when the order is marked Shipped.</span>}
        <Button size="sm" icon={Check} loading={busy} disabled={!dirty} onClick={save}>Save tracking</Button>
      </div>
      <Msg>{err}</Msg>
      <Msg tone="green">{!dirty && ok}</Msg>
    </Panel>
  );
}

// ── Refunds ──
// `submit(body)` posts the refund (defaults to the order endpoint) and
// resolves to the updated order (or anything; `onDone` gets it).
export function RefundPanel({ order, onDone, submit, title = 'Refund' }) {
  const refundable = refundableOf(order);
  const online = isOnlinePaid(order) && !!order.razorpayPaymentId;
  const [mode, setMode] = useState(online ? 'razorpay' : 'manual');
  const [amount, setAmount] = useState(String(refundable));
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  if (!tookMoney(order) && !order.refundStatus) return null;

  const amt = Number(amount);
  const valid = Number.isInteger(amt) && amt >= 1 && amt <= refundable;
  const post = submit || ((body) => api.post(`/admin/orders/${order.id}/refund`, body, true));

  const go = async () => {
    setBusy(true); setErr(''); setOk('');
    try {
      const body = mode === 'manual' ? { manual: true, amount: amt, note: reason } : { amount: amt, reason };
      const res = await post(body);
      onDone(res);
      setOk(mode === 'manual' ? `Recorded a manual refund of ${inr(amt)}. The customer has been emailed.` : `Refund of ${inr(amt)} sent to Razorpay. The customer has been emailed.`);
      setReason('');
      setAmount(String(Math.max(0, refundable - amt)));
    } catch (e) {
      setErr(e.message || 'Refund failed.');
      onDone(null); // let the parent reload (a failed attempt is stored on the order)
    } finally { setBusy(false); setConfirming(false); }
  };

  const refresh = async () => {
    setRefreshing(true); setErr('');
    try { onDone(await api.post(`/admin/orders/${order.id}/refund/refresh`, {}, true)); }
    catch (e) { setErr(e.message || 'Could not check the refund.'); }
    finally { setRefreshing(false); }
  };

  return (
    <Panel icon={RotateCcw} title={title} aside={<RefundBadge order={order} />}>
      {(order.refundStatus || order.refundError || (order.refundAmount || 0) > 0) && (
        <div className="mb-3 flex flex-col gap-1 rounded-[12px] bg-[var(--admin-hover-2)] px-3.5 py-3 text-[13px] text-[var(--admin-text-muted)]">
          {(order.refundAmount || 0) > 0 && <span>Refunded so far: <b className="text-[var(--admin-text)] tabular-nums">{inr(order.refundAmount)}</b> of {inr(order.total)}{order.refundedAt && ` · last on ${fmtDate(order.refundedAt)}`}</span>}
          {order.refundId && <span>Razorpay refund ID: <span className="font-mono text-[var(--admin-text)]">{order.refundId}</span></span>}
          {order.refundError && <span className="font-semibold text-[var(--tone-red)]">Last attempt failed: {order.refundError}</span>}
          {order.refundStatus === 'PENDING' && order.refundId && (
            <span className="mt-1"><Button size="sm" variant="secondary" icon={RefreshCw} loading={refreshing} onClick={refresh}>Check status with Razorpay</Button></span>
          )}
        </div>
      )}

      {refundable <= 0 ? (
        <p className="m-0 text-[14px] font-semibold text-[var(--tone-green)]">This order has been fully refunded.</p>
      ) : !tookMoney(order) ? null : (
        <>
          {online && (
            <div role="radiogroup" aria-label="Refund method" className="mb-3 flex gap-1.5 rounded-[12px] bg-[var(--admin-hover-2)] p-1">
              {[['razorpay', 'Refund via Razorpay'], ['manual', 'Record a manual refund']].map(([k, label]) => (
                <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => { setMode(k); setConfirming(false); }} className={`flex-1 cursor-pointer rounded-[9px] border-0 px-3 py-2 text-[13px] font-semibold transition-colors ${mode === k ? 'bg-[var(--admin-surface)] text-[var(--admin-text)] shadow-sm' : 'bg-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'}`}>{label}</button>
              ))}
            </div>
          )}
          <p className="m-0 mb-3 text-[13px] text-[var(--admin-text-muted)]">
            {mode === 'razorpay'
              ? 'Sends the money back to the customer\'s original payment method through Razorpay. Partial refunds are allowed.'
              : 'Use this when you returned the money outside Razorpay (UPI, bank transfer, cash). Nothing is charged — it only records the refund and emails the customer.'}
          </p>
          <div className="grid grid-cols-[160px_1fr] gap-3 max-[520px]:grid-cols-1">
            <Field label="Amount (₹)" error={amount && !valid ? `1 – ${refundable}` : ''} hint={`Up to ${inr(refundable)}`}>
              <input className={inputCls} inputMode="numeric" value={amount} onChange={(e) => { setAmount(e.target.value.replace(/[^\d]/g, '')); setConfirming(false); }} aria-label="Refund amount in rupees" />
            </Field>
            <Field label={mode === 'manual' ? 'Note' : 'Reason'}>
              <input className={inputCls} value={reason} maxLength={200} placeholder={mode === 'manual' ? 'e.g. Refunded via UPI, ref 1234' : 'e.g. Damaged item'} onChange={(e) => setReason(e.target.value)} />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            {confirming ? (
              <>
                <span className="mr-auto text-[13px] font-semibold text-[var(--admin-text)]">{mode === 'razorpay' ? `Refund ${inr(amt)} to the customer now?` : `Record ${inr(amt)} as refunded?`}</span>
                <Button size="sm" variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>Cancel</Button>
                <Button size="sm" variant="danger" loading={busy} onClick={go}>Yes, {mode === 'razorpay' ? 'refund' : 'record'}</Button>
              </>
            ) : (
              <Button size="sm" variant="danger-soft" icon={RotateCcw} disabled={!valid} onClick={() => setConfirming(true)}>
                {mode === 'razorpay' ? 'Refund via Razorpay' : 'Record manual refund'}
              </Button>
            )}
          </div>
        </>
      )}
      <Msg>{err}</Msg>
      <Msg tone="green">{ok}</Msg>
    </Panel>
  );
}

// ── Internal note (never shown to customers) ──
export function NotePanel({ order, onSaved }) {
  const [note, setNote] = useState(order.adminNote || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const dirty = note.trim() !== (order.adminNote || '');
  const save = async () => {
    setBusy(true); setErr(''); setOk(false);
    try { onSaved(await api.put(`/admin/orders/${order.id}/note`, { note }, true)); setOk(true); }
    catch (e) { setErr(e.message || 'Could not save the note.'); }
    finally { setBusy(false); }
  };
  return (
    <Panel icon={StickyNote} title="Internal note" aside={<span className="text-[12px] text-[var(--admin-text-dim)]">Only admins can see this</span>}>
      <textarea
        className={`${textareaCls} min-h-[84px] resize-y text-[14px]`}
        value={note}
        maxLength={5000}
        aria-label="Internal note"
        placeholder="e.g. Customer asked for gift wrap; called on 3 Oct to confirm address…"
        onChange={(e) => { setNote(e.target.value); setOk(false); }}
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        {ok && !dirty && <span className="mr-auto text-[13px] font-semibold text-[var(--tone-green)]">Note saved.</span>}
        <Button size="sm" variant="secondary" icon={Check} loading={busy} disabled={!dirty} onClick={save}>Save note</Button>
      </div>
      <Msg>{err}</Msg>
    </Panel>
  );
}
