import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../../utils/api';
import AuthLayout, { AuthField, AuthAlert } from '../../components/store/AuthLayout';
import { primaryBtnCls, BtnSweep } from '../../components/store/StoreShell';
import Seo from '../../components/Seo';

// Reset password (/reset-password?token=…), from the emailed link. On
// success it counts down and goes to Log in. The token is read once, then
// stripped from the address bar so analytics / history never record it.
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get('token'));
  const navigate = useNavigate();

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('token')) return;
    window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(4);

  useEffect(() => {
    if (!done) return undefined;
    if (count <= 0) { navigate('/login', { replace: true }); return undefined; }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [done, count, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const errs = {};
    if (password.length < 6) errs.password = 'At least 6 characters';
    if (confirm !== password) errs.confirm = "Passwords don't match";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not reset the password. Please request a new link.');
    } finally {
      setLoading(false);
    }
  };

  let content;
  if (!token) {
    content = (
      <>
        <AuthAlert>This reset link is missing its code. Request a new one below.</AuthAlert>
        <Link to="/forgot-password" className={`au-in ${primaryBtnCls} mt-5 w-full`}><BtnSweep />Get a new link</Link>
      </>
    );
  } else if (done) {
    content = (
      <div className="au-in flex flex-col items-center rounded-[22px] bg-white/85 px-6 py-8 text-center animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
        <CheckCircle2 size={52} className="animate-[jw-pop_0.6s_cubic-bezier(0.34,1.56,0.64,1)_both] text-[#1E8A4C]" />
        <p className="m-0 mt-3 text-[22px] font-bold">Password updated!</p>
        <p className="m-0 mt-1 font-['Inter',sans-serif] text-[14px] text-[#111110]/65" aria-live="polite">Taking you to log in in {count}s…</p>
        <Link to="/login" replace className={`${primaryBtnCls} mt-5`}><BtnSweep />Log in now</Link>
      </div>
    );
  } else {
    content = (
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <AuthAlert>{error}</AuthAlert>
        {error && /expired|invalid/i.test(error) && (
          <Link to="/forgot-password" className="au-in font-['Inter',sans-serif] text-[14px] font-bold text-[#1A6FE8]">Request a new link →</Link>
        )}
        <AuthField id="rp-password" label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} hint="At least 6 characters" />
        <AuthField id="rp-confirm" label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        <button type="submit" disabled={loading} className={`au-in ${primaryBtnCls} mt-1 w-full`}>
          <BtnSweep />
          {loading ? <><span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Saving…</> : 'Set new password'}
        </button>
      </form>
    );
  }

  return (
    <AuthLayout image="/modal4.webp" title="New password" accent="text-[#1E8A4C]" subtitle={done ? null : 'Choose something you’ll remember (and nobody will guess).'} tagline="Fresh start, same sparkle.">
      <Seo title="Reset password" path="/reset-password" noindex />
      {content}
    </AuthLayout>
  );
}
