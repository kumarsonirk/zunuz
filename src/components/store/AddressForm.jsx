import { useState } from 'react';
import { api } from '../../utils/api';
import { fieldCls, primaryBtnCls, BtnSweep } from './StoreShell';
import { INDIAN_STATES } from '../../utils/address';
import usePincode, { fetchPincode, PIN_RE } from './checkout/usePincode';

// Inline delivery hint under the pincode field (optional — it never blocks
// saving; checkout is what stops orders to areas we don't deliver to).
function PincodeHint({ pincode }) {
  const { status, info } = usePincode(pincode);
  if (status === 'loading') return <span className="font-['Inter',sans-serif] text-[12px] text-[#111110]/50">Checking delivery…</span>;
  if (status !== 'ready' || !info) return null;
  if (!info.serviceable) return <span role="status" className="font-['Inter',sans-serif] text-[12px] font-semibold text-[#B4123E]">We don't deliver to this pincode yet.</span>;
  return (
    <span role="status" className="font-['Inter',sans-serif] text-[12px] font-semibold text-[#1E8A4C]">
      ✓ We deliver here{info.etaDays ? ` · ${info.etaDays}` : ''}{info.codAvailable ? ' · COD available' : ''}
    </span>
  );
}

// Add / edit a delivery address (storefront look). Same fields + rules as
// the server (POST/PUT /customers/addresses — every field is required).
// `initial` = existing address to edit, else a blank one prefilled from
// `customer`. Calls onSaved(address) with the server's copy.
const LABELS = ['Home', 'Work', 'Other'];

function validate(f) {
  const e = {};
  if (!f.name.trim()) e.name = 'Enter the full name';
  if (!/^\d{10}$/.test(f.phone.trim())) e.phone = 'Enter a 10-digit mobile number';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email';
  if (!f.houseNo.trim()) e.houseNo = 'Required';
  if (!f.street.trim()) e.street = 'Required';
  if (!f.landmark.trim()) e.landmark = 'Required';
  if (!f.city.trim()) e.city = 'Required';
  if (!f.state.trim()) e.state = 'Pick a state';
  if (!/^[1-9]\d{5}$/.test(f.pincode.trim())) e.pincode = 'Enter a 6-digit pincode';
  return e;
}

function Field({ id, label, error, className = '', children }) {
  return (
    <label htmlFor={id} className={`flex flex-col gap-1.5 ${className}`}>
      <span className="font-['Inter',sans-serif] text-[13px] font-semibold text-[#111110]/70">{label}</span>
      {children}
      {error && <span id={`${id}-err`} className="font-['Inter',sans-serif] text-[12px] font-semibold text-[#E8304F]">{error}</span>}
    </label>
  );
}

export default function AddressForm({ initial = null, customer = null, onSaved, onCancel, submitLabel = 'Save address', makeDefault = false }) {
  const [f, setF] = useState(() => ({
    label: initial?.label || 'Home',
    name: initial?.name || customer?.name || '',
    phone: (initial?.phone || customer?.phone || '').replace(/\D/g, '').slice(-10),
    email: initial?.email || customer?.email || '',
    houseNo: initial?.houseNo || '',
    street: initial?.street || '',
    landmark: initial?.landmark || '',
    city: initial?.city || '',
    state: initial?.state || '',
    pincode: initial?.pincode || '',
    isDefault: initial ? !!initial.isDefault : makeDefault,
  }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');

  const set = (k) => (e) => {
    let v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (k === 'phone') v = v.replace(/\D/g, '').slice(0, 10);
    if (k === 'pincode') {
      v = v.replace(/\D/g, '').slice(0, 6);
      // Listed pincodes know their city/state — fill them in if still empty.
      if (PIN_RE.test(v)) {
        fetchPincode(v).then((info) => {
          if (!info?.listed) return;
          setF((s) => (s.pincode !== v ? s : {
            ...s,
            city: s.city || info.city || '',
            state: s.state || (INDIAN_STATES.includes(info.state) ? info.state : ''),
          }));
        }).catch(() => {});
      }
    }
    setF((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((s) => ({ ...s, [k]: undefined }));
  };
  const input = (k, label, props = {}, className = '') => (
    <Field id={`af-${k}`} label={label} error={errors[k]} className={className}>
      <input
        id={`af-${k}`}
        value={f[k]}
        onChange={set(k)}
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `af-${k}-err` : undefined}
        className={fieldCls}
        {...props}
      />
    </Field>
  );

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(f);
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(`af-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    setServerError('');
    try {
      const body = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));
      const saved = initial?.id ? await api.put(`/customers/addresses/${initial.id}`, body) : await api.post('/customers/addresses', body);
      onSaved?.(saved);
    } catch (err) {
      setServerError(err.message || 'Could not save the address.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Address type">
        {LABELS.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={f.label === l}
            onClick={() => setF((s) => ({ ...s, label: l }))}
            className={`cursor-pointer rounded-full border-2 px-4 py-1.5 font-['Inter',sans-serif] text-[14px] font-semibold transition-colors ${f.label === l ? 'border-[#111110] bg-[#111110] text-white' : 'border-[#111110]/15 bg-white text-[#111110] hover:border-[#111110]'}`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
        {input('name', 'Full name', { autoComplete: 'name' })}
        {input('phone', 'Mobile number', { inputMode: 'numeric', autoComplete: 'tel-national', placeholder: '10 digits' })}
        {input('email', 'Email', { type: 'email', autoComplete: 'email' }, 'col-span-2 max-[560px]:col-span-1')}
        {input('houseNo', 'Flat / house no.', { autoComplete: 'address-line1' })}
        {input('street', 'Street / area', { autoComplete: 'address-line2' })}
        {input('landmark', 'Landmark', {}, 'col-span-2 max-[560px]:col-span-1')}
        {input('city', 'City', { autoComplete: 'address-level2' })}
        <div className="flex flex-col gap-1">
          {input('pincode', 'Pincode', { inputMode: 'numeric', autoComplete: 'postal-code' })}
          {!errors.pincode && <PincodeHint pincode={f.pincode} />}
        </div>
        <Field id="af-state" label="State" error={errors.state} className="col-span-2 max-[560px]:col-span-1">
          <select id="af-state" value={f.state} onChange={set('state')} aria-invalid={!!errors.state} className={`${fieldCls} cursor-pointer`}>
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <label className="flex cursor-pointer items-center gap-2.5 font-['Inter',sans-serif] text-[14px] font-medium">
        <input type="checkbox" checked={f.isDefault} onChange={set('isDefault')} className="size-4 accent-[#FF3D8B]" />
        Make this my default address
      </label>
      {serverError && <p role="alert" className="m-0 rounded-[12px] bg-[#FFE0EA] px-4 py-2.5 font-['Inter',sans-serif] text-[14px] text-[#B4123E]">{serverError}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className={primaryBtnCls}><BtnSweep />{busy ? 'Saving…' : submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel} className="cursor-pointer rounded-full border-0 bg-transparent px-5 py-3 font-['Inter',sans-serif] text-[15px] font-semibold text-[#111110]/65 hover:text-[#111110]">Cancel</button>}
      </div>
    </form>
  );
}
