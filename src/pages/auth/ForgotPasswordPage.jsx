import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { api } from '../../utils/api';
import AuthLayout, { AuthField, AuthAlert } from '../../components/store/AuthLayout';
import { primaryBtnCls, ghostBtnCls, BtnSweep } from '../../components/store/StoreShell';
import Seo from '../../components/Seo';

// Forgot password (/forgot-password): emails a 15-minute reset link. The
// server answers the same whether or not the email has an account (no
// account enumeration), so the success copy says "if".
export default function ForgotPasswordPage() {
  const location = useLocation();
  const returnTo = location.state?.returnTo;
  const [email, setEmail] = useState(location.state?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
      // Local development only: the API returns the link (when started with
      // EXPOSE_DEV_SECRETS=1) so it can be tested without a mailbox. Never
      // present in production — the page works the same without it.
      if (import.meta.env.DEV && res.devLink) setDevLink(res.devLink);
    } catch (err) {
      setError(err.message || 'Could not send the reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      image="/modal3.webp"
      title={sent ? 'Check your inbox' : 'Forgot password?'}
      accent="text-[#7A4BD6]"
      subtitle={sent ? null : "No worries — enter your email and we'll send you a link to set a new one."}
      tagline="Happens to the best of us."
    >
      <Seo title="Forgot password" path="/forgot-password" noindex />
      {sent ? (
        <div className="flex flex-col gap-4">
          <div className="au-in flex items-start gap-3 rounded-[18px] bg-white/85 p-5 animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
            <span className="flex size-11 shrink-0 animate-cp-bob items-center justify-center rounded-full bg-[#E8F7EE] text-[#1E8A4C]"><MailCheck size={22} /></span>
            <p className="m-0 font-['Inter',sans-serif] text-[15px] leading-relaxed text-[#111110]/75">
              If <b className="text-[#111110]">{email.trim()}</b> has a ZUNUZ account, a reset link is on its way. It works for 15 minutes — check spam too.
            </p>
          </div>
          {devLink && (
            <a href={devLink} className="au-in rounded-[14px] border-2 border-dashed border-[#111110]/20 px-4 py-3 font-['Inter',sans-serif] text-[13px] break-all text-[#1A6FE8]">
              Dev only — open reset link
            </a>
          )}
          <button type="button" onClick={() => { setSent(false); setDevLink(''); }} className={`au-in ${ghostBtnCls} w-full`}>Use a different email</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <AuthAlert>{error}</AuthAlert>
          <AuthField id="fp-email" label="Email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} />
          <button type="submit" disabled={loading} className={`au-in ${primaryBtnCls} mt-1 w-full`}>
            <BtnSweep />
            {loading ? <><span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Sending…</> : 'Send reset link'}
          </button>
        </form>
      )}
      <p className="au-in m-0 mt-7 text-center font-['Inter',sans-serif] text-[15px] text-[#111110]/65">
        Remembered it?{' '}
        <Link to="/login" state={{ returnTo }} className="font-bold text-[#FF3D8B] no-underline hover:underline">Back to log in</Link>
      </p>
    </AuthLayout>
  );
}
