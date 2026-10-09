import { useEffect, useState } from 'react';
import { Check, KeyRound, MailCheck } from 'lucide-react';
import AccountLayout from '../../components/store/AccountLayout';
import { AuthField, AuthAlert } from '../../components/store/AuthLayout';
import { cardCls, primaryBtnCls, ghostBtnCls, BtnSweep } from '../../components/store/StoreShell';
import Seo from '../../components/Seo';
import VerifyEmailBanner from '../../components/store/VerifyEmailBanner';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

// Profile (/account/profile): edit name / email / mobile; change the
// password via the emailed reset link (same flow as Forgot password).
export default function ProfilePage() {
  return (
    <AccountLayout title="Profile" subtitle="Your details, kept up to date.">
      <Seo title="Profile" path="/account/profile" noindex />
      <VerifyEmailBanner className="ac-in mb-4" />
      <ProfileBody />
    </AccountLayout>
  );
}

// Rendered by AccountLayout only once the customer is loaded, so the form
// can start from their saved details.
const digits10 = (p) => (p || '').replace(/\D/g, '').slice(-10);
function ProfileBody() {
  const { customer, updateProfile } = useAuth();
  const [form, setForm] = useState(() => ({ name: customer.name || '', email: customer.email || '', phone: digits10(customer.phone) }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [verifySentTo, setVerifySentTo] = useState('');
  const [pwState, setPwState] = useState('idle'); // idle | sending | sent | error

  useEffect(() => {
    if (!saved) return undefined;
    const t = setTimeout(() => setSaved(false), 2600);
    return () => clearTimeout(t);
  }, [saved]);

  const set = (k) => (e) => {
    const v = k === 'phone' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };
  const dirty = form.name !== (customer.name || '') || form.email !== (customer.email || '') || form.phone !== digits10(customer.phone);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    const errs = {};
    if (!form.name.trim()) errs.name = 'Enter your name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email';
    if (form.phone && form.phone.length !== 10) errs.phone = 'Enter a 10-digit mobile number';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const updated = await updateProfile({ name: form.name.trim(), email: form.email.trim(), phone: form.phone });
      setSaved(true);
      // Email changed: it's unverified again until the new link is opened.
      setVerifySentTo(updated?.verificationSent ? updated.email : '');
    } catch (err) { setError(err.message || 'Could not save.'); }
    finally { setSaving(false); }
  };

  const sendReset = async () => {
    setPwState('sending');
    try { await api.post('/auth/forgot-password', { email: customer.email }); setPwState('sent'); }
    catch { setPwState('error'); }
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,320px)] items-start gap-4 max-[980px]:grid-cols-1">
        <form onSubmit={save} noValidate className={`ac-in flex flex-col gap-4 p-[clamp(18px,2.4vw,28px)] ${cardCls}`}>
          <h2 className="m-0 text-[22px] font-bold">Personal info</h2>
          <AuthAlert>{error}</AuthAlert>
          <AuthField showLabel id="pf-name" label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
          <AuthField showLabel id="pf-email" label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} hint="Order updates and receipts go here." />
          <AuthField showLabel id="pf-phone" label="Mobile number" inputMode="numeric" autoComplete="tel-national" placeholder="10 digits" value={form.phone} onChange={set('phone')} error={errors.phone} />
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={saving || !dirty} className={primaryBtnCls}><BtnSweep />{saving ? 'Saving…' : 'Save changes'}</button>
            {saved && <span role="status" className="inline-flex items-center gap-1.5 font-['Inter',sans-serif] text-[14px] font-bold text-[#1E8A4C] animate-[jw-rise_0.4s_cubic-bezier(0.16,1,0.3,1)_both]"><Check size={16} /> Saved</span>}
          </div>
          {verifySentTo && <p role="status" className="m-0 font-['Inter',sans-serif] text-[13px] text-[#111110]/65">We've sent a verification link to <b>{verifySentTo}</b> — open it to confirm your new email.</p>}
        </form>

        <section className={`ac-in flex flex-col gap-3 p-[clamp(18px,2.4vw,28px)] ${cardCls}`}>
          <span className="flex size-12 items-center justify-center rounded-full bg-[#FFF0B8] text-[#8A6A00]"><KeyRound size={22} /></span>
          <h2 className="m-0 text-[20px] font-bold">Password</h2>
          {pwState === 'sent' ? (
            <p className="m-0 flex items-start gap-2 font-['Inter',sans-serif] text-[14px] text-[#1E6B3E]"><MailCheck size={18} className="mt-0.5 shrink-0" /><span className="min-w-0">We've emailed a link to <b className="my-0.5 block [overflow-wrap:anywhere]">{customer?.email}</b>to set a new password (valid 15 minutes).</span></p>
          ) : (
            <>
              <p className="m-0 font-['Inter',sans-serif] text-[14px] text-[#111110]/65">We'll email you a secure link to set a new one.</p>
              {pwState === 'error' && <p role="alert" className="m-0 font-['Inter',sans-serif] text-[13px] text-[#E8304F]">Couldn't send it — try again in a minute.</p>}
              <button type="button" onClick={sendReset} disabled={pwState === 'sending' || !customer?.email} className={`${ghostBtnCls} disabled:cursor-not-allowed disabled:opacity-50`}>{pwState === 'sending' ? 'Sending…' : 'Change password'}</button>
            </>
          )}
        </section>
    </div>
  );
}
