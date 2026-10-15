import { useState } from 'react';
import { Modal, Button, Field, Select, Toggle } from '../AdminUI';
import { inputCls } from '../adminStyles';
import { api } from '../../../utils/api';
import { INDIAN_STATES } from '../../../utils/address';

// Add / edit one delivery pincode.
export default function PincodeForm({ initial, onSaved, onClose }) {
  const [f, setF] = useState(() => ({
    pincode: initial?.pincode || '', city: initial?.city || '', state: initial?.state || '',
    etaDays: initial?.etaDays || '', codAvailable: initial ? initial.codAvailable : true, isActive: initial ? initial.isActive : true,
  }));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => {
    let v = e?.target ? e.target.value : e;
    if (k === 'pincode') v = v.replace(/\D/g, '').slice(0, 6);
    setF((s) => ({ ...s, [k]: v }));
    setErrors((s) => ({ ...s, [k]: undefined }));
  };
  // Keep a state that isn't in the list (e.g. from a bulk paste) selectable.
  const states = f.state && !INDIAN_STATES.includes(f.state) ? [f.state, ...INDIAN_STATES] : INDIAN_STATES;

  const save = async (ev) => {
    ev?.preventDefault();
    const e = {};
    if (!/^[1-9]\d{5}$/.test(f.pincode)) e.pincode = 'Enter a valid 6-digit pincode.';
    if (f.etaDays.length > 20) e.etaDays = 'Keep it short, e.g. "2–4 days".';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setError('');
    const body = { city: f.city.trim(), state: f.state, etaDays: f.etaDays.trim(), codAvailable: f.codAvailable, isActive: f.isActive };
    try {
      const saved = initial
        ? await api.put(`/admin/pincodes/${initial.pincode}`, body, true)
        : await api.post('/admin/pincodes', { pincode: f.pincode, ...body }, true);
      onSaved(saved);
    } catch (err) {
      setError(err.message || 'Could not save the pincode.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? `Edit ${initial.pincode}` : 'Add pincode'}
      subtitle="Delivery details shown to shoppers for this pincode."
      width={520}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={busy}>{initial ? 'Save changes' : 'Add pincode'}</Button>
        </>
      )}
    >
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <Field label="Pincode" htmlFor="pc-pin" error={errors.pincode}>
            <input id="pc-pin" inputMode="numeric" value={f.pincode} onChange={set('pincode')} disabled={!!initial} placeholder="560001" className={`${inputCls} font-mono tracking-wider`} />
          </Field>
          <Field label="Delivery time" htmlFor="pc-eta" error={errors.etaDays} hint='e.g. "24 hours" or "2–4 days". Empty = the listed-pincode time in Settings (48 hours).'>
            <input id="pc-eta" value={f.etaDays} onChange={set('etaDays')} maxLength={20} placeholder="2–4 days" className={inputCls} />
          </Field>
          <Field label="City" htmlFor="pc-city">
            <input id="pc-city" value={f.city} onChange={set('city')} maxLength={80} placeholder="Bengaluru" className={inputCls} />
          </Field>
          <Field label="State" htmlFor="pc-state">
            <Select id="pc-state" value={f.state} onChange={set('state')}>
              <option value="">Select state</option>
              {states.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
        <div className="flex flex-col gap-3 rounded-[12px] border border-[var(--admin-border-2)] bg-[var(--admin-hover-1)] p-4">
          <Toggle checked={f.codAvailable} onChange={(v) => setF((s) => ({ ...s, codAvailable: v }))} label="Cash on delivery available here" />
          <Toggle checked={f.isActive} onChange={(v) => setF((s) => ({ ...s, isActive: v }))} label="Active (we deliver here)" />
        </div>
        {error && <p role="alert" className="m-0 rounded-[12px] bg-[var(--tone-red)]/10 px-4 py-3 text-[14px] font-medium text-[var(--tone-red)]">{error}</p>}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
