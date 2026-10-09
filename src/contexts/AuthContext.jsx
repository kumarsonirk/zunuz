import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { getReferralCode, clearReferralCode } from '../utils/referral';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  // Only "loading" when there's a saved token to check.
  const [loading, setLoading] = useState(() => !!localStorage.getItem('zunuz_customer_token'));

  useEffect(() => {
    const token = localStorage.getItem('zunuz_customer_token');
    if (!token) return;
    // A rejected token (expired, or signed out by a password reset) is dropped.
    api.get('/customers/me').then((c) => {
      setCustomer(c);
      clearReferralCode();
      try { sessionStorage.removeItem('zunuz_ref_toast_active'); } catch { /* ignore */ }
    }).catch(() => {
      localStorage.removeItem('zunuz_customer_token');
    }).finally(() => setLoading(false));
  }, []);

  // api.js signals a revoked session (401) — show the signed-out state.
  useEffect(() => {
    const onSignedOut = () => setCustomer(null);
    window.addEventListener('zunuz:customer-signed-out', onSignedOut);
    return () => window.removeEventListener('zunuz:customer-signed-out', onSignedOut);
  }, []);

  const sendOtp = async (phone) => {
    return api.post('/auth/send-otp', { phone });
  };

  const verifyOtp = async (phone, otp, name) => {
    const data = await api.post('/auth/verify-otp', { phone, otp, name });
    localStorage.setItem('zunuz_customer_token', data.token);
    clearReferralCode();
    try { sessionStorage.removeItem('zunuz_ref_toast_active'); } catch { /* ignore */ }
    setCustomer(data.customer);
    return data;
  };

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('zunuz_customer_token', data.token);
    clearReferralCode();
    try { sessionStorage.removeItem('zunuz_ref_toast_active'); } catch { /* ignore */ }
    setCustomer(data.customer);
    return data;
  };

  // referralCode (Refer & Earn) defaults to the one saved from a friend's
  // ?ref= link; it's forgotten once an account exists.
  const signup = async (name, email, password, phone, referralCode = getReferralCode()) => {
    const data = await api.post('/auth/register', { name, email, password, phone, ...(referralCode ? { referralCode } : {}) });
    localStorage.setItem('zunuz_customer_token', data.token);
    clearReferralCode();
    try { sessionStorage.removeItem('zunuz_ref_toast_active'); } catch { /* ignore */ }
    setCustomer(data.customer);
    return data;
  };

  // The server only uses referralCode when this Google sign-in creates a new account.
  const loginWithGoogle = async (credential, referralCode = getReferralCode()) => {
    const data = await api.post('/auth/google', { credential, ...(referralCode ? { referralCode } : {}) });
    localStorage.setItem('zunuz_customer_token', data.token);
    clearReferralCode();
    try { sessionStorage.removeItem('zunuz_ref_toast_active'); } catch { /* ignore */ }
    setCustomer(data.customer);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('zunuz_customer_token');
    clearReferralCode();
    try { sessionStorage.removeItem('zunuz_ref_toast_active'); } catch { /* ignore */ }
    setCustomer(null);
  };

  // Re-reads the profile (e.g. after the verify-email link was opened).
  const refreshCustomer = useCallback(async () => {
    if (!localStorage.getItem('zunuz_customer_token')) return null;
    const me = await api.get('/customers/me');
    setCustomer(me);
    return me;
  }, []);

  const resendVerification = async () => api.post('/auth/resend-verification', {});

  const updateProfile = async (updates) => {
    const updated = await api.put('/customers/me', updates);
    setCustomer(updated);
    return updated;
  };

  return (
    <AuthContext.Provider value={{ customer, loading, sendOtp, verifyOtp, login, signup, loginWithGoogle, logout, updateProfile, refreshCustomer, resendVerification }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
