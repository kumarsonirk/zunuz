import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../../utils/api';

const inp = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '13px 16px',
  color: '#F5F2EB',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: "'Grift', sans-serif"
};

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) return setError('Reset token is missing. Please request a new password reset link.');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { token, password });
      setSuccess(res.message || 'Password reset successful!');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center bg-[#1F2024] text-[#F5F2EB] overflow-y-auto" style={{ fontFamily: "'Grift', sans-serif" }}>
      <div style={{ maxWidth: '420px', width: '100%', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#F5F2EB', letterSpacing: '0.02em' }}>Set New Password</h1>
          <p style={{ color: '#71717A', fontSize: '14px', marginTop: '8px' }}>
            Choose a strong password for your Zunuz account
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(252,75,78,0.1)', border: '1px solid rgba(252,75,78,0.25)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', color: '#FC4B4E', fontSize: '13px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', color: '#22C55E', fontSize: '13px', textAlign: 'center' }}>
            {success}
          </div>
        )}

        {!token && (
          <div style={{ background: 'rgba(252,75,78,0.1)', border: '1px solid rgba(252,75,78,0.25)', borderRadius: '12px', padding: '16px', marginBottom: '20px', color: '#FC4B4E', fontSize: '13px', textAlign: 'center' }}>
            Invalid or missing reset token. Please request a new password reset from the{' '}
            <Link to="/forgot-password" style={{ color: '#FC4B4E', textDecoration: 'underline' }}>Forgot Password page</Link>.
          </div>
        )}

        {!success && token && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="New Password (min. 6 characters)"
                required
                style={inp}
              />
            </div>

            <div>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                placeholder="Confirm New Password"
                required
                style={inp}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="btn-buy-now"
              style={{ height: '52px', borderRadius: '12px', border: 'none', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Updating password...' : 'Save Password'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', color: '#71717A', fontSize: '13px', marginTop: '28px' }}>
          Back to{' '}
          <Link to="/login" style={{ color: '#FC4B4E', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
