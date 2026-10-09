import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MailX, MailCheck } from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import AuthLayout, { AuthAlert } from '../../components/store/AuthLayout';
import { primaryBtnCls, ghostBtnCls, BtnSweep } from '../../components/store/StoreShell';
import Seo from '../../components/Seo';

// Verify email (/verify-email?token=…), from the emailed link. Confirms the
// token on load (the API call is idempotent, so a re-opened link is fine),
// then strips it from the address bar. On failure a signed-in customer can
// ask for a fresh link.
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get('token'));
  const { customer, refreshCustomer, resendVerification } = useAuth();

  const [status, setStatus] = useState(token ? 'checking' : 'error'); // checking | done | error
  const [email, setEmail] = useState('');
  const [error, setError] = useState(token ? '' : 'This verification link is missing its code.');
  const [resend, setResend] = useState('idle'); // idle | sending | sent | error
  const [resendError, setResendError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('token')) {
      window.history.replaceState(window.history.state, '', window.location.pathname);
    }
    // StrictMode runs effects twice in dev — only send the request once.
    if (!token || started.current) return;
    started.current = true;
    api.post('/auth/verify-email', { token })
      .then((res) => {
        setEmail(res.email || '');
        setStatus('done');
        // Signed in on this device: pick up emailVerified=true right away.
        refreshCustomer().catch(() => {});
      })
      .catch((err) => {
        setError(err.message || 'This verification link is invalid or has expired.');
        setStatus('error');
      });
  }, [token, refreshCustomer]);

  const handleResend = async () => {
    setResend('sending');
    setResendError('');
    try { await resendVerification(); setResend('sent'); }
    catch (err) { setResendError(err.message || "Couldn't send it — try again in a few minutes."); setResend('error'); }
  };

  let content;
  if (status === 'checking') {
    content = (
      <div className="au-in flex items-center gap-3 rounded-[18px] bg-white/85 p-5 font-['Inter',sans-serif] text-[15px] text-[#111110]/70" aria-live="polite">
        <span className="size-5 animate-spin rounded-full border-2 border-[#111110]/15 border-t-[#FF3D8B]" /> Checking your link…
      </div>
    );
  } else if (status === 'done') {
    content = (
      <div className="au-in flex flex-col items-center rounded-[22px] bg-white/85 px-6 py-8 text-center animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
        <CheckCircle2 size={52} className="animate-[jw-pop_0.6s_cubic-bezier(0.34,1.56,0.64,1)_both] text-[#1E8A4C]" />
        <p className="m-0 mt-3 text-[22px] font-bold">Email verified</p>
        <p className="m-0 mt-1 font-['Inter',sans-serif] text-[14px] text-[#111110]/65">
          {email ? <><b className="break-all text-[#111110]">{email}</b> is confirmed — you</> : 'You'} can now use coupon codes.
        </p>
        <Link to={customer ? '/account' : '/login'} className={`${primaryBtnCls} mt-5`}><BtnSweep />{customer ? 'Go to my account' : 'Log in'}</Link>
        <Link to="/jewellery" className="mt-3 font-['Inter',sans-serif] text-[14px] font-bold text-[#1A6FE8] no-underline hover:underline">Start shopping →</Link>
      </div>
    );
  } else {
    const canResend = !!customer?.email && customer.emailVerified === false;
    content = (
      <div className="flex flex-col gap-4">
        <div className="au-in flex items-start gap-3 rounded-[18px] bg-white/85 p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#FFE3E8] text-[#E8304F]"><MailX size={22} /></span>
          <p className="m-0 font-['Inter',sans-serif] text-[15px] leading-relaxed text-[#111110]/75">{error} Links work for 48 hours, and only the newest one for your current email.</p>
        </div>
        {resend === 'sent' ? (
          <p role="status" className="au-in m-0 flex items-start gap-2 font-['Inter',sans-serif] text-[14px] text-[#1E6B3E]"><MailCheck size={18} className="mt-0.5 shrink-0" /><span className="min-w-0">A new link is on its way to <b className="my-0.5 block [overflow-wrap:anywhere]">{customer?.email}</b></span></p>
        ) : canResend ? (
          <>
            {resend === 'error' && <AuthAlert>{resendError}</AuthAlert>}
            <button type="button" onClick={handleResend} disabled={resend === 'sending'} className={`au-in ${primaryBtnCls} w-full`}>
              <BtnSweep />{resend === 'sending' ? 'Sending…' : 'Resend verification email'}
            </button>
          </>
        ) : customer ? (
          <Link to="/account" className={`au-in ${ghostBtnCls} w-full`}>Go to my account</Link>
        ) : (
          <Link to="/login" state={{ returnTo: '/account' }} className={`au-in ${ghostBtnCls} w-full`}>Log in to get a new link</Link>
        )}
      </div>
    );
  }

  return (
    <AuthLayout
      image="/modal2.webp"
      title={status === 'error' ? 'Link not valid' : 'Verify email'}
      accent={status === 'error' ? 'text-[#E8304F]' : 'text-[#1E8A4C]'}
      subtitle={status === 'checking' ? 'One moment while we confirm your email.' : null}
      tagline="Almost there."
    >
      <Seo title="Verify email" path="/verify-email" noindex />
      {content}
    </AuthLayout>
  );
}
