import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('zunuz_customer_token');
    if (token) {
      api.get('/customers/me').then(setCustomer).catch(() => {
        localStorage.removeItem('zunuz_customer_token');
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const sendOtp = async (phone) => {
    return api.post('/auth/send-otp', { phone });
  };

  const verifyOtp = async (phone, otp, name) => {
    const data = await api.post('/auth/verify-otp', { phone, otp, name });
    localStorage.setItem('zunuz_customer_token', data.token);
    setCustomer(data.customer);
    return data;
  };

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('zunuz_customer_token', data.token);
    setCustomer(data.customer);
    return data;
  };

  const signup = async (name, email, password, phone) => {
    const data = await api.post('/auth/register', { name, email, password, phone });
    localStorage.setItem('zunuz_customer_token', data.token);
    setCustomer(data.customer);
    return data;
  };

  const loginWithGoogle = async (credential) => {
    const data = await api.post('/auth/google', { credential });
    localStorage.setItem('zunuz_customer_token', data.token);
    setCustomer(data.customer);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('zunuz_customer_token');
    setCustomer(null);
  };

  const updateProfile = async (updates) => {
    const updated = await api.put('/customers/me', updates);
    setCustomer(updated);
    return updated;
  };

  return (
    <AuthContext.Provider value={{ customer, loading, sendOtp, verifyOtp, login, signup, loginWithGoogle, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
