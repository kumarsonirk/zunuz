import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/admin/auth/login', { email, password }, true);
      localStorage.setItem('zunuz_admin_token', data.token);
      localStorage.setItem('zunuz_admin_user', JSON.stringify(data.admin));
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0D0E10', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Grift', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <img src="/logo_white.png" alt="Zunuz" style={{ height: '32px', marginBottom: '12px' }} />
          <p style={{ color: '#A1A1AA', fontSize: '13px', letterSpacing: '0.1em' }}>ADMIN PANEL</p>
        </div>

        {/* Card */}
        <div style={{ background: '#16181E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '36px' }}>
          <h1 style={{ color: '#F5F2EB', fontSize: '22px', fontWeight: 500, marginBottom: '6px' }}>Welcome back</h1>
          <p style={{ color: '#A1A1AA', fontSize: '13px', marginBottom: '28px' }}>Sign in to manage your store</p>

          {error && (
            <div style={{ background: 'rgba(252,75,78,0.1)', border: '1px solid rgba(252,75,78,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#FC4B4E', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: '#A1A1AA', fontSize: '12px', letterSpacing: '0.08em', marginBottom: '8px' }}>EMAIL ADDRESS</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@zunuz.com"
                required
                style={{ width: '100%', background: '#0D0E10', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 16px', color: '#F5F2EB', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#A1A1AA', fontSize: '12px', letterSpacing: '0.08em', marginBottom: '8px' }}>PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ width: '100%', background: '#0D0E10', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 16px', color: '#F5F2EB', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ marginTop: '8px', background: loading ? '#7f2426' : '#FC4B4E', color: 'white', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.05em', transition: 'background 0.2s' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#3F3F46', fontSize: '12px', marginTop: '24px' }}>
          Zunuz Admin © 2026
        </p>
      </div>
    </div>
  );
}
