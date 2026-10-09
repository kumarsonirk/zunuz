import { useState } from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import AuthLayout, { AuthField, AuthAlert, OrDivider } from '../../components/store/AuthLayout';
import { primaryBtnCls, BtnSweep } from '../../components/store/StoreShell';
import Seo from '../../components/Seo';

// Log in (/login). `location.state.returnTo` (set by checkout, reviews, …)
// is where we go afterwards; it's passed on to Sign up / Forgot password
// too, so switching pages doesn't lose it.
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { customer, loading: authLoading, login, loginWithGoogle } = useAuth();
  const location = useLocation();
  const returnTo = location.state?.returnTo;
  // Set when this page signs the customer in: the redirect below then goes
  // to returnTo (or home) instead of the "already signed in → account" one.
  const [justAuthed, setJustAuthed] = useState(false);

  // Already signed in — straight on (after the initial /customers/me check,
  // so a signed-in reload doesn't flash the form).
  if (authLoading) return null;
  if (customer) return <Navigate to={returnTo || (justAuthed ? '/' : '/account')} replace />;


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setLoading(true);
    try {
      setJustAuthed(true);
      await login(email.trim(), password);
    } catch (err) {
      setJustAuthed(false);
      setError(err.message || 'Invalid email or password');
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setError('');
    setLoading(true);
    try {
      setJustAuthed(true);
      await loginWithGoogle(credential);
    } catch (err) {
      setJustAuthed(false);
      setError(err.message || 'Google sign-in failed');
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      image="/modal2.webp"
      title="Welcome back"
      subtitle={returnTo === '/checkout' ? 'Log in to finish your order — your bag is saved.' : 'Log in to track orders, save addresses and check out faster.'}
      tagline="Your bag missed you."
    >
      <Seo title="Log in" path="/login" noindex />
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <AuthAlert>{error}</AuthAlert>
        <AuthField id="login-email" label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <AuthField
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          right={<Link to="/forgot-password" state={{ returnTo, email }} className="font-['Inter',sans-serif] text-[13px] font-semibold text-[#1A6FE8] no-underline hover:underline">Forgot password?</Link>}
        />
        <button type="submit" disabled={loading} className={`au-in ${primaryBtnCls} mt-1 w-full`}>
          <BtnSweep />
          {loading ? <><span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Logging in…</> : 'Log in'}
        </button>
      </form>

      <OrDivider />
      <div className="au-in"><GoogleSignInButton onCredential={handleGoogleCredential} text="signin_with" /></div>

      <p className="au-in m-0 mt-7 text-center font-['Inter',sans-serif] text-[15px] text-[#111110]/65">
        New to ZUNUZ?{' '}
        <Link to="/signup" state={{ returnTo }} className="font-bold text-[#FF3D8B] no-underline hover:underline">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
