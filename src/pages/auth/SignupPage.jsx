import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link, Navigate } from 'react-router-dom';
import { MailCheck, Gift } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import AuthLayout, { AuthField, AuthAlert, OrDivider } from '../../components/store/AuthLayout';
import { primaryBtnCls, BtnSweep } from '../../components/store/StoreShell';
import Seo from '../../components/Seo';
import { api } from '../../utils/api';
import { getReferralCode, normalizeRefCode } from '../../utils/referral';
import { formatPrice } from '../../store/catalogConfig';
import { SETTINGS } from '../../store/settings';

// Create an account (/signup). Same returnTo handling as Log in. After an
// email signup we briefly say "check your inbox" (the verification link is
// needed for coupons) before moving on — the customer is already signed in.
const STRENGTH = [
  { label: 'Too short', color: '#E8304F' },
  { label: 'Okay', color: '#F2A900' },
  { label: 'Good', color: '#1A6FE8' },
  { label: 'Strong', color: '#1E8A4C' },
];
function strength(pw) {
  if (pw.length < 6) return 0;
  let s = 1;
  if (pw.length >= 10) s += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw)) s += 1;
  if (/[^A-Za-z0-9]/.test(pw)) s += 1;
  return Math.min(3, s);
}

// Live check of the optional referral code (GET /referrals/check), debounced.
// `result` is the answer for `result.code`; while it's for another code the
// field reads "checking".
function useReferralCheck(code) {
  const [result, setResult] = useState(null); // { code, valid, name }
  useEffect(() => {
    if (!code || !SETTINGS.referralEnabled) return undefined;
    let alive = true;
    const t = setTimeout(() => {
      api.get(`/referrals/check?code=${encodeURIComponent(code)}`)
        .then((r) => { if (alive) setResult({ code, valid: !!r?.valid, name: r?.name || null }); })
        .catch(() => { if (alive) setResult({ code, valid: null, name: null }); }); // couldn't check — let the server decide
    }, 400);
    return () => { alive = false; clearTimeout(t); };
  }, [code]);
  if (!code) return { status: 'idle' };
  if (result?.code !== code) return { status: 'checking' };
  if (result.valid === null) return { status: 'unknown' };
  return { status: result.valid ? 'valid' : 'invalid', name: result.name };
}

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Refer & Earn: prefilled from a friend's ?ref= link (saved for 30 days).
  const [refCode, setRefCode] = useState(() => getReferralCode());
  const ref = useReferralCheck(refCode);
  const { customer, loading: authLoading, signup, loginWithGoogle } = useAuth();
  const location = useLocation();
  const returnTo = location.state?.returnTo;
  // Set when this page signs the customer in: the redirect below then goes
  // to returnTo (or home) instead of the "already signed in → account" one.
  const [justAuthed, setJustAuthed] = useState(false);
  // Email the verification link went to; set just before signup() so the
  // render right after it resolves shows the notice instead of redirecting.
  const [sentTo, setSentTo] = useState('');
  const [count, setCount] = useState(6);
  const navigate = useNavigate();
  const showNotice = !!(customer && sentTo);

  useEffect(() => {
    if (!showNotice) return undefined;
    if (count <= 0) { navigate(returnTo || '/', { replace: true }); return undefined; }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [showNotice, count, navigate, returnTo]);

  if (authLoading) return null;
  if (showNotice) {
    return (
      <AuthLayout image="/modal1.webp" title="You're in!" accent="text-[#1A6FE8]" subtitle={null} tagline="Made for every you.">
        <Seo title="Create account" path="/signup" noindex />
        <div className="au-in flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-[18px] bg-white/85 p-5 animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
            <span className="flex size-11 shrink-0 animate-cp-bob items-center justify-center rounded-full bg-[#E8F7EE] text-[#1E8A4C]"><MailCheck size={22} /></span>
            <p className="m-0 font-['Inter',sans-serif] text-[15px] leading-relaxed text-[#111110]/75">
              Your account is ready. We've sent a verification link to <b className="break-all text-[#111110]">{sentTo}</b> — open it to unlock coupon codes. Check spam too.
            </p>
          </div>
          <p className="m-0 text-center font-['Inter',sans-serif] text-[14px] text-[#111110]/60" aria-live="polite">Continuing in {count}s…</p>
          <button type="button" onClick={() => navigate(returnTo || '/', { replace: true })} className={`${primaryBtnCls} w-full`}><BtnSweep />Continue shopping</button>
        </div>
      </AuthLayout>
    );
  }
  if (customer) return <Navigate to={returnTo || (justAuthed ? '/' : '/account')} replace />;

  const set = (k) => (e) => {
    const v = k === 'phone' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Tell us your name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email';
    if (form.phone && !/^\d{10}$/.test(form.phone)) e.phone = 'Enter a 10-digit mobile number (or leave it empty)';
    if (form.password.length < 6) e.password = 'At least 6 characters';
    if (form.confirm !== form.password) e.confirm = "Passwords don't match";
    if (refCode && ref.status === 'invalid') e.ref = "This referral code isn't valid — fix it or clear the field";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setError('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) { document.getElementById(`su-${Object.keys(e)[0]}`)?.focus(); return; }
    setLoading(true);
    try {
      setJustAuthed(true);
      setSentTo(form.email.trim());
      await signup(form.name.trim(), form.email.trim(), form.password, form.phone || undefined, refCode && ref.status !== 'invalid' ? refCode : '');
    } catch (err) {
      setJustAuthed(false);
      setSentTo('');
      setError(err.message || 'Could not create account');
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setError('');
    setLoading(true);
    try {
      setJustAuthed(true);
      await loginWithGoogle(credential, refCode && ref.status !== 'invalid' ? refCode : '');
    } catch (err) {
      setJustAuthed(false);
      setError(err.message || 'Google sign-in failed');
      setLoading(false);
    }
  };

  const st = strength(form.password);

  return (
    <AuthLayout
      image="/modal1.webp"
      title="Join the club"
      accent="text-[#1A6FE8]"
      tagline="Made for every you."
    >
      <Seo title="Create account" path="/signup" noindex />
      <div className="au-in"><GoogleSignInButton onCredential={handleGoogleCredential} text="signup_with" /></div>
      <OrDivider />
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <AuthAlert>{error}</AuthAlert>
        <AuthField id="su-name" label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
        <AuthField id="su-email" label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <AuthField id="su-phone" label="Mobile number (optional)" inputMode="numeric" autoComplete="tel-national" value={form.phone} onChange={set('phone')} error={errors.phone} />
        <div className="flex flex-col gap-2">
          <AuthField id="su-password" label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} />
          {form.password && (
            <div className="flex items-center gap-3" aria-live="polite">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="h-1.5 flex-1 rounded-full transition-colors duration-300" style={{ background: i <= st ? STRENGTH[st].color : 'rgba(17,17,16,0.1)' }} />
                ))}
              </div>
              <span className="w-16 text-right font-['Inter',sans-serif] text-[12px] font-bold" style={{ color: STRENGTH[st].color }}>{STRENGTH[st].label}</span>
            </div>
          )}
        </div>
        <AuthField id="su-confirm" label="Confirm password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />
        {SETTINGS.referralEnabled && (
          <div className="flex flex-col gap-1.5">
            <AuthField
              id="su-ref"
              label="Referral code (optional)"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={refCode}
              onChange={(e) => { setRefCode(normalizeRefCode(e.target.value)); if (errors.ref) setErrors((x) => ({ ...x, ref: undefined })); }}
              error={errors.ref || (ref.status === 'invalid' ? "We couldn't find that code" : undefined)}
            />
            {ref.status === 'checking' && (
              <span className="flex items-center gap-2 font-['Inter',sans-serif] text-[12px] text-[#111110]/50" aria-live="polite">
                <span className="size-3 animate-spin rounded-full border-2 border-[#111110]/15 border-t-[#FF3D8B]" /> Checking code…
              </span>
            )}
            {ref.status === 'valid' && (
              <span className="flex items-start gap-2 rounded-[12px] bg-[#E8F7EE] px-3 py-2 font-['Inter',sans-serif] text-[13px] font-semibold text-[#1E6B3E]" aria-live="polite">
                <Gift size={15} className="mt-0.5 shrink-0" />
                <span>{ref.name ? `Referred by ${ref.name}` : 'Referral code applied'} — you'll get {formatPrice(SETTINGS.referralFriendBonus)} credit after verifying your email.</span>
              </span>
            )}
          </div>
        )}
        <button type="submit" disabled={loading} className={`au-in ${primaryBtnCls} mt-1 w-full`}>
          <BtnSweep />
          {loading ? <><span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Creating account…</> : 'Create account'}
        </button>
        <p className="au-in m-0 text-center font-['Inter',sans-serif] text-[12px] text-[#111110]/50">
          By signing up you agree to our <Link to="/terms" className="text-inherit underline">Terms</Link> and <Link to="/privacy" className="text-inherit underline">Privacy policy</Link>.
        </p>
      </form>

      <p className="au-in m-0 mt-6 text-center font-['Inter',sans-serif] text-[15px] text-[#111110]/65">
        Already have an account?{' '}
        <Link to="/login" state={{ returnTo }} className="font-bold text-[#FF3D8B] no-underline hover:underline">Log in</Link>
      </p>
    </AuthLayout>
  );
}
