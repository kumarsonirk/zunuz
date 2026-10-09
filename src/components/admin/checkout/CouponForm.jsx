import { useState } from 'react';
import { Percent, IndianRupee, Wand2 } from 'lucide-react';
import { Modal, Button, Field, Toggle } from '../AdminUI';
import { inputCls } from '../adminStyles';
import { api } from '../../../utils/api';
import { describeRule, discountFor, toDateInput, fromDateInput } from './couponUtils';

// Create / edit a coupon (admin Coupons page).
const blank = { code: '', description: '', type: 'PERCENT', value: '', minOrder: '', maxDiscount: '', startsAt: '', expiresAt: '', usageLimit: '', perCustomerLimit: '1', isActive: true, isPublic: true };
const str = (v) => (v == null ? '' : String(v));

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'ZUNUZ';
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function CouponForm({ initial, onSaved, onClose }) {
  const [f, setF] = useState(() => (initial ? {
    code: initial.code, description: str(initial.description), type: initial.type, value: str(initial.value),
    minOrder: initial.minOrder ? str(initial.minOrder) : '', maxDiscount: str(initial.maxDiscount),
    startsAt: toDateInput(initial.startsAt), expiresAt: toDateInput(initial.expiresAt),
    usageLimit: str(initial.usageLimit), perCustomerLimit: str(initial.perCustomerLimit), isActive: initial.isActive, isPublic: initial.isPublic !== false,
  } : blank));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = !!initial?.redemptions; // used coupons keep their code
  const pct = f.type === 'PERCENT';

  const set = (k) => (e) => {
    let v = e?.target ? e.target.value : e;
    if (k === 'code') v = v.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 20);
    if (['value', 'minOrder', 'maxDiscount', 'usageLimit', 'perCustomerLimit'].includes(k)) v = v.replace(/\D/g, '').slice(0, 8);
    setF((s) => ({ ...s, [k]: v }));
    setErrors((s) => ({ ...s, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!/^[A-Z0-9_-]{3,20}$/.test(f.code)) e.code = '3–20 characters: A–Z, 0–9, "-" or "_".';
    const value = Number(f.value);
    if (!f.value || value < 1) e.value = pct ? 'Enter 1–100.' : 'Enter an amount.';
    else if (pct && value > 100) e.value = "Can't be more than 100%.";
    if (pct && f.maxDiscount !== '' && Number(f.maxDiscount) < 1) e.maxDiscount = 'At least ₹1 (or leave empty).';
    if (f.usageLimit !== '' && Number(f.usageLimit) < 1) e.usageLimit = 'At least 1 (or leave empty).';
    if (initial && f.usageLimit !== '' && Number(f.usageLimit) < initial.usedCount) e.usageLimit = `Already used ${initial.usedCount} times.`;
    if (f.perCustomerLimit !== '' && Number(f.perCustomerLimit) < 1) e.perCustomerLimit = 'At least 1 (or leave empty).';
    if (f.startsAt && f.expiresAt && f.expiresAt < f.startsAt) e.expiresAt = 'Must be on or after the start date.';
    return e;
  };

  const save = async (ev) => {
    ev?.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setError('');
    const num = (v) => (v === '' ? null : Number(v));
    const body = {
      code: f.code, description: f.description.trim(), type: f.type, value: Number(f.value),
      minOrder: num(f.minOrder) || 0, maxDiscount: pct ? num(f.maxDiscount) : null,
      startsAt: fromDateInput(f.startsAt), expiresAt: fromDateInput(f.expiresAt, true),
      usageLimit: num(f.usageLimit), perCustomerLimit: num(f.perCustomerLimit), isActive: f.isActive, isPublic: f.isPublic,
    };
    try {
      const saved = initial ? await api.put(`/admin/coupons/${initial.id}`, body, true) : await api.post('/admin/coupons', body, true);
      onSaved(saved);
    } catch (err) {
      setError(err.message || 'Could not save the coupon.');
    } finally {
      setBusy(false);
    }
  };

  // Live preview of what the customer gets.
  const preview = Number(f.value) > 0 ? {
    type: f.type, value: Number(f.value), minOrder: Number(f.minOrder) || 0, maxDiscount: pct && f.maxDiscount !== '' ? Number(f.maxDiscount) : null,
  } : null;
  const sample = preview ? Math.max(999, preview.minOrder) : 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? `Edit ${initial.code}` : 'New coupon'}
      subtitle={initial ? `Used ${initial.usedCount} time${initial.usedCount === 1 ? '' : 's'} so far.` : 'Customers enter the code at checkout.'}
      width={620}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={busy}>{initial ? 'Save changes' : 'Create coupon'}</Button>
        </>
      )}
    >
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_auto] items-end gap-2">
          <Field label="Code" htmlFor="cp-code" error={errors.code} hint={locked ? "Already used on orders, so the code can't change." : 'Shown to customers — uppercase letters and numbers.'}>
            <input id="cp-code" value={f.code} onChange={set('code')} disabled={locked} placeholder="e.g. WELCOME10" autoComplete="off" spellCheck={false} className={`${inputCls} font-mono font-bold tracking-wider`} />
          </Field>
          {!locked && <Button variant="secondary" icon={Wand2} onClick={() => set('code')(randomCode())} className="mb-[22px]">Generate</Button>}
        </div>
        <Field label="Description (optional)" htmlFor="cp-desc" hint="For your team, e.g. “Instagram launch offer”.">
          <input id="cp-desc" value={f.description} onChange={set('description')} maxLength={255} className={inputCls} />
        </Field>

        <div>
          <span className="mb-1.5 block text-[13px] font-semibold text-[var(--admin-text-muted)]">Discount type</span>
          <div role="radiogroup" aria-label="Discount type" className="grid grid-cols-2 gap-2">
            {[['PERCENT', Percent, 'Percent off', 'e.g. 10% off'], ['FLAT', IndianRupee, 'Flat amount', 'e.g. ₹100 off']].map(([t, Icon, label, sub]) => {
              const on = f.type === t;
              return (
                <button key={t} type="button" role="radio" aria-checked={on} onClick={() => set('type')(t)} className={`flex cursor-pointer items-center gap-3 rounded-[12px] border px-3.5 py-3 text-left transition-colors ${on ? 'border-[var(--admin-accent)] bg-[var(--admin-accent-soft)]' : 'border-[var(--admin-border-4)] bg-[var(--admin-bg)] hover:border-[var(--admin-border-5)]'}`}>
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${on ? 'bg-[var(--admin-accent)] text-white' : 'bg-[var(--admin-hover-3)] text-[var(--admin-text-muted)]'}`}><Icon size={15} /></span>
                  <span>
                    <span className="block text-[14px] font-semibold text-[var(--admin-text)]">{label}</span>
                    <span className="block text-[12px] text-[var(--admin-text-muted)]">{sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 max-[560px]:grid-cols-1">
          <Field label={pct ? 'Percent off' : 'Amount off (₹)'} htmlFor="cp-value" error={errors.value}>
            <input id="cp-value" inputMode="numeric" value={f.value} onChange={set('value')} placeholder={pct ? '10' : '100'} className={inputCls} />
          </Field>
          <Field label="Min order (₹)" htmlFor="cp-min" hint="Items total, before discount.">
            <input id="cp-min" inputMode="numeric" value={f.minOrder} onChange={set('minOrder')} placeholder="No minimum" className={inputCls} />
          </Field>
          {pct && (
            <Field label="Max discount (₹)" htmlFor="cp-max" error={errors.maxDiscount} hint="Optional cap.">
              <input id="cp-max" inputMode="numeric" value={f.maxDiscount} onChange={set('maxDiscount')} placeholder="No cap" className={inputCls} />
            </Field>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <Field label="Starts (optional)" htmlFor="cp-start" hint="Leave empty to start now.">
            <input id="cp-start" type="date" value={f.startsAt} onChange={set('startsAt')} className={inputCls} />
          </Field>
          <Field label="Ends (optional)" htmlFor="cp-end" error={errors.expiresAt} hint="Valid until the end of this day.">
            <input id="cp-end" type="date" value={f.expiresAt} min={f.startsAt || undefined} onChange={set('expiresAt')} className={inputCls} />
          </Field>
          <Field label="Total uses" htmlFor="cp-limit" error={errors.usageLimit} hint="Across all customers. Empty = unlimited.">
            <input id="cp-limit" inputMode="numeric" value={f.usageLimit} onChange={set('usageLimit')} placeholder="Unlimited" className={inputCls} />
          </Field>
          <Field label="Uses per customer" htmlFor="cp-per" error={errors.perCustomerLimit} hint="Empty = unlimited.">
            <input id="cp-per" inputMode="numeric" value={f.perCustomerLimit} onChange={set('perCustomerLimit')} placeholder="Unlimited" className={inputCls} />
          </Field>
        </div>

        <Toggle checked={f.isActive} onChange={(v) => setF((s) => ({ ...s, isActive: v }))} label={f.isActive ? 'Active — customers can use it' : 'Off — customers can’t use it'} />
        <Toggle checked={f.isPublic} onChange={(v) => setF((s) => ({ ...s, isPublic: v }))} label={f.isPublic ? 'Shown on the bag page — listed under “Offers for you”' : 'Private — only people who know the code can use it'} />

        {preview && (
          <div className="rounded-[12px] border border-dashed border-[var(--admin-border-5)] bg-[var(--admin-hover-1)] px-4 py-3 text-[14px]">
            <span className="font-semibold text-[var(--admin-text)]">{describeRule(preview)}</span>
            <span className="block text-[13px] text-[var(--admin-text-muted)]">On a ₹{sample.toLocaleString('en-IN')} order the customer saves ₹{discountFor(preview, sample).toLocaleString('en-IN')}.</span>
          </div>
        )}

        {error && <p role="alert" className="m-0 rounded-[12px] bg-[var(--tone-red)]/10 px-4 py-3 text-[14px] font-medium text-[var(--tone-red)]">{error}</p>}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
