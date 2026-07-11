import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import GoogleSignInButton from '../../components/GoogleSignInButton';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/account');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
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
      <div style={{ maxWidth: '420px', width: '100%', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#F5F2EB', letterSpacing: '0.02em' }}>Welcome back</h1>
          <p style={{ color: '#71717A', fontSize: '14px', marginTop: '8px' }}>Sign in to your Zunuz account</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(252,75,78,0.1)', border: '1px solid rgba(252,75,78,0.25)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', color: '#FC4B4E', fontSize: '13px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required style={inp} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required style={inp} />
          <button type="submit" disabled={loading}
            className="btn-buy-now"
            style={{ marginTop: '8px', height: '52px', borderRadius: '12px', border: 'none', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: '#71717A', fontSize: '11px', letterSpacing: '0.08em' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <GoogleSignInButton onCredential={handleGoogleCredential} text="signin_with" />

        <p style={{ textAlign: 'center', color: '#71717A', fontSize: '13px', marginTop: '28px' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#FC4B4E', textDecoration: 'none', fontWeight: 500 }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
