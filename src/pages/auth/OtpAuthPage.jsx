import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Phone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const inp = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  padding: '14px 16px',
  color: '#F5F2EB',
  fontSize: '15px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: "'Grift', sans-serif",
};

function OtpBox({ index, value, onChange, onKeyDown, inputRef }) {
  return (
    <input
      ref={inputRef}
      type="tel"
      inputMode="numeric"
      maxLength={1}
      value={value}
      onChange={e => onChange(index, e.target.value)}
      onKeyDown={e => onKeyDown(index, e)}
      style={{
        width: '44px',
        height: '52px',
        textAlign: 'center',
        fontSize: '20px',
        fontWeight: 600,
        background: value ? 'rgba(252,75,78,0.08)' : 'rgba(255,255,255,0.04)',
        border: `1.5px solid ${value ? 'rgba(252,75,78,0.5)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '12px',
        color: '#F5F2EB',
        outline: 'none',
        caretColor: '#FC4B4E',
        fontFamily: "'Grift', sans-serif",
        transition: 'border-color 0.15s, background 0.15s',
      }}
    />
  );
}

export default function OtpAuthPage() {
  const { sendOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 = phone, 2 = otp
  const [phone, setPhone] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [name, setName] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const boxRefs = useRef([]);
  const phoneRef = useRef(null);

  useEffect(() => { phoneRef.current?.focus(); }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  const cleanPhone = phone.replace(/\D/g, '');

  const handleSendOtp = async () => {
    if (cleanPhone.length !== 10) return setError('Enter a valid 10-digit mobile number');
    setError('');
    setLoading(true);
    try {
      const res = await sendOtp(cleanPhone);
      setIsNewUser(res.isNewUser);
      if (res.devOtp) setDevOtp(res.devOtp);
      setStep(2);
      setResendTimer(30);
      setTimeout(() => boxRefs.current[0]?.focus(), 100);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = digit;
    setDigits(next);
    if (digit && i < 5) boxRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      boxRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = pasted.split('').concat(Array(6).fill('')).slice(0, 6);
    setDigits(next);
    const lastFilled = Math.min(pasted.length, 5);
    boxRefs.current[lastFilled]?.focus();
    e.preventDefault();
  };

  const otp = digits.join('');

  const handleVerify = async () => {
    if (otp.length !== 6) return setError('Enter the 6-digit OTP');
    if (isNewUser && !name.trim()) return setError('Please enter your name');
    setError('');
    setLoading(true);
    try {
      await verifyOtp(cleanPhone, otp, name.trim() || undefined);
      navigate('/account');
    } catch (e) {
      setError(e.message);
      setDigits(['', '', '', '', '', '']);
      boxRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setDigits(['', '', '', '', '', '']);
    setDevOtp('');
    setError('');
    setLoading(true);
    try {
      const res = await sendOtp(cleanPhone);
      if (res.devOtp) setDevOtp(res.devOtp);
      setResendTimer(30);
      setTimeout(() => boxRefs.current[0]?.focus(), 50);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex-1 flex flex-col bg-[#1F2024] text-[#F5F2EB] overflow-y-auto"
      style={{ fontFamily: "'Grift', sans-serif" }}
    >
      {/* Back button */}
      {step === 2 && (
        <button
          onClick={() => { setStep(1); setDigits(['', '', '', '', '', '']); setError(''); setDevOtp(''); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', padding: '16px 20px 0', fontSize: '13px', fontFamily: "'Grift', sans-serif" }}
        >
          <ChevronLeft size={16} strokeWidth={1.5} /> Change number
        </button>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 28px 48px' }}>

        {/* Step 1 — Phone */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <div style={{ marginBottom: '32px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(252,75,78,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <Phone size={22} strokeWidth={1.5} color="#FC4B4E" />
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, fontFamily: "'Grift', sans-serif" }}>
                Enter your<br />mobile number
              </h1>
              <p style={{ color: '#71717A', fontSize: '13px', marginTop: '10px', lineHeight: 1.5 }}>
                We'll send a one-time password to verify your number.
              </p>
            </div>

            {error && (
              <div style={{ background: 'rgba(252,75,78,0.08)', border: '1px solid rgba(252,75,78,0.2)', borderRadius: '10px', padding: '11px 14px', color: '#FC4B4E', fontSize: '13px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              {/* Country code */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px 14px', flexShrink: 0, color: '#A1A1AA', fontSize: '15px' }}>
                🇮🇳 +91
              </div>
              <input
                ref={phoneRef}
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                placeholder="98765 43210"
                style={{ ...inp, flex: 1, letterSpacing: '0.05em' }}
              />
            </div>

            <button
              onClick={handleSendOtp}
              disabled={loading || cleanPhone.length !== 10}
              className="btn-buy-now"
              style={{ height: '52px', borderRadius: '14px', border: 'none', fontSize: '15px', fontWeight: 600, cursor: loading || cleanPhone.length !== 10 ? 'not-allowed' : 'pointer', opacity: loading || cleanPhone.length !== 10 ? 0.5 : 1 }}
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </div>
        )}

        {/* Step 2 — OTP */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <div style={{ marginBottom: '28px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, fontFamily: "'Grift', sans-serif" }}>
                Verify OTP
              </h1>
              <p style={{ color: '#71717A', fontSize: '13px', marginTop: '10px', lineHeight: 1.5 }}>
                Sent to +91 {cleanPhone.slice(0, 5)} {cleanPhone.slice(5)}
              </p>

              {/* Dev OTP hint */}
              {devOtp && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '8px 12px', marginTop: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#F59E0B', letterSpacing: '0.06em' }}>DEV OTP</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#F59E0B', letterSpacing: '0.15em' }}>{devOtp}</span>
                </div>
              )}
            </div>

            {error && (
              <div style={{ background: 'rgba(252,75,78,0.08)', border: '1px solid rgba(252,75,78,0.2)', borderRadius: '10px', padding: '11px 14px', color: '#FC4B4E', fontSize: '13px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            {/* Name input — only for new users */}
            {isNewUser && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#71717A', fontSize: '11px', letterSpacing: '0.08em', marginBottom: '8px' }}>YOUR NAME</label>
                <input
                  value={name}
                  onChange={e => { setName(e.target.value); setError(''); }}
                  placeholder="Rahul Kumar Soni"
                  style={inp}
                />
              </div>
            )}

            {/* OTP boxes */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', marginBottom: '24px' }} onPaste={handlePaste}>
              {digits.map((d, i) => (
                <OtpBox
                  key={i}
                  index={i}
                  value={d}
                  onChange={handleOtpChange}
                  onKeyDown={handleOtpKeyDown}
                  inputRef={el => (boxRefs.current[i] = el)}
                />
              ))}
            </div>

            <button
              onClick={handleVerify}
              disabled={loading || otp.length !== 6}
              className="btn-buy-now"
              style={{ height: '52px', borderRadius: '14px', border: 'none', fontSize: '15px', fontWeight: 600, cursor: loading || otp.length !== 6 ? 'not-allowed' : 'pointer', opacity: loading || otp.length !== 6 ? 0.5 : 1, marginBottom: '16px' }}
            >
              {loading ? 'Verifying...' : isNewUser ? 'Create Account' : 'Sign In'}
            </button>

            {/* Resend */}
            <button
              onClick={handleResend}
              disabled={resendTimer > 0 || loading}
              style={{ background: 'none', border: 'none', color: resendTimer > 0 ? '#52525B' : '#FC4B4E', fontSize: '13px', cursor: resendTimer > 0 ? 'default' : 'pointer', fontFamily: "'Grift', sans-serif", textAlign: 'center' }}
            >
              {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
