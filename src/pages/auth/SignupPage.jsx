import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import GoogleSignInButton from '../../components/GoogleSignInButton';

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { customer, loading: authLoading, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Already signed in — don't show the form again until they log out.
  // Wait for the initial /customers/me check (authLoading) before deciding,
  // otherwise a logged-in user reloading this page briefly sees the form
  // flash before redirecting.
  if (authLoading) return null;
  if (customer) return <Navigate to="/account" replace />;

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      await signup(form.name, form.email, form.password, form.phone);
      navigate('/account');
    } catch (err) {
      setError(err.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle(credential);
      navigate('/account');
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const inp = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '13px 16px', color: '#F5F2EB', fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: "'Grift', sans-serif" };

  return (
    <div className="flex-1 flex flex-col justify-center bg-[#1F2024] text-[#F5F2EB] overflow-y-auto" style={{ fontFamily: "'Grift', sans-serif" }}>
      <div style={{ maxWidth: '420px', width: '100%', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#F5F2EB' }}>Create account</h1>
          <p style={{ color: '#71717A', fontSize: '14px', marginTop: '8px' }}>Join Zunuz and start shopping</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(252,75,78,0.1)', border: '1px solid rgba(252,75,78,0.25)', borderRadius: '12px', padding: '12px 16px', marginBottom: '18px', color: '#FC4B4E', fontSize: '13px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input value={form.name} onChange={set('name')} placeholder="Full Name" required style={inp} />
          <input type="email" value={form.email} onChange={set('email')} placeholder="Email" required style={inp} />
          <input type="tel" value={form.phone} onChange={set('phone')} placeholder="Phone (optional)" style={inp} />
          <input type="password" value={form.password} onChange={set('password')} placeholder="Password (min. 6 characters)" required style={inp} />
          <input type="password" value={form.confirm} onChange={set('confirm')} placeholder="Confirm Password" required style={inp} />
          <button type="submit" disabled={loading}
            className="btn-buy-now"
            style={{ marginTop: '8px', height: '52px', borderRadius: '12px', border: 'none', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: '#71717A', fontSize: '11px', letterSpacing: '0.08em' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <GoogleSignInButton onCredential={handleGoogleCredential} text="signup_with" />

        <p style={{ textAlign: 'center', color: '#71717A', fontSize: '13px', marginTop: '28px' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#FC4B4E', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
