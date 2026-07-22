import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, CheckCircle2, AlertCircle, Send, Mail, Phone, Calendar, User } from 'lucide-react';
import { api } from '../utils/api';

// A dense field of tiny twinkling dots (starfield/dust look), not a handful of
// big icon shapes. Generated once from a seeded PRNG (not Math.random() at
// render time) so the layout is dense and organic-looking but still stable
// across re-renders.
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
const rand = seededRandom(42);
const SPARKLE_DOTS = Array.from({ length: 90 }, () => {
  const size = 1 + rand() * 2.5; // 1px–3.5px
  return {
    left: (rand() * 100).toFixed(1) + '%',
    size,
    delay: (rand() * 8).toFixed(1) + 's',
    duration: (6 + rand() * 6).toFixed(1) + 's',
    color: rand() > 0.65 ? '#D4AF37' : '#F5F2EB',
    opacity: (0.35 + rand() * 0.5).toFixed(2),
  };
});

const InstagramIcon = ({ size = 18, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);


export default function ShineWithUsPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    email: '',
    phone: '',
    insta_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return setError('Please enter your full name.');
    if (!formData.dob) return setError('Please select your date of birth.');

    const year = parseInt(formData.dob.split('-')[0], 10);
    if (isNaN(year) || year < 1920 || year > new Date().getFullYear()) {
      return setError('Please enter a valid birth year (e.g. 2002).');
    }

    if (!formData.email.trim()) return setError('Please enter your email address.');
    if (!formData.insta_id.trim()) return setError('Please enter your Instagram handle/ID.');


    setLoading(true);
    setError('');

    try {
      await api.post('/campaign/submit', formData);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100dvh',
      width: '100%',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      backgroundColor: '#000000',
      color: '#F5F2EB',
      fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 16px 48px 16px',
      boxSizing: 'border-box'
    }}>

      {/* Golden sparkle drift — decorative, celebration/offer feel. Fixed to
          the viewport (not the scrolling container) so it stays put behind
          the content regardless of scroll position. */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {SPARKLE_DOTS.map((s, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: s.left,
              top: '-2%',
              width: `${s.size}px`,
              height: `${s.size}px`,
              borderRadius: '50%',
              background: s.color,
              '--peak-opacity': s.opacity,
              boxShadow: `0 0 ${s.size * 2}px ${s.color}`,
              animation: `sparkle-fall ${s.duration} linear ${s.delay} infinite, sparkle-twinkle 2.4s ease-in-out ${s.delay} infinite`
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes sparkle-fall {
          0%   { transform: translateY(0); }
          100% { transform: translateY(105vh); }
        }
        @keyframes sparkle-twinkle {
          0%, 100% { opacity: 0.15; }
          50%      { opacity: var(--peak-opacity, 0.8); }
        }
      `}</style>

      {/* Centered Content Wrapper (margin: auto handles vertical centering without clipping on small screens like iPhone SE) */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        margin: 'auto 0',
        width: '100%',
        maxWidth: '480px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Centered Zunuz Logo outside form */}
        <div style={{ marginBottom: 'clamp(16px, 3vh, 24px)', display: 'flex', justifyContent: 'center' }}>
          <img
            src="/logo_white.png"
            alt="Zunuz"
            style={{ height: 'clamp(28px, 6vw, 36px)', objectFit: 'contain', cursor: 'pointer' }}
            onClick={() => navigate('/')}
          />
        </div>

        {/* Form Container */}
        <div style={{
          width: '100%',
          background: 'rgba(28, 29, 34, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: 'clamp(20px, 5vw, 36px) clamp(16px, 4.5vw, 28px)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          boxSizing: 'border-box'
        }}>

        {submitted ? (
          <div style={{
            textAlign: 'center',
            padding: '32px 16px',
            background: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            borderRadius: '20px'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#FFFFFF', marginBottom: '8px' }}>🎉 You're In!</h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', lineHeight: '1.6', marginBottom: '0px' }}>   
              Thank you for joining the ZUNUZ Lucky Campaign. If you're selected, Our team will review your application and reach out to you on Instagram or via email soon!
            </p>
          </div>
        ) : (
          <>
            {/* Banner Title */}
            <div style={{ textAlign: 'center', marginBottom: 'clamp(20px, 4vw, 32px)' }}>
              <div style={{
                width: 'clamp(48px, 12vw, 64px)',
                height: 'clamp(48px, 12vw, 64px)',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.05))',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                margin: '0 auto 12px auto',
                color: '#D4AF37',
                boxShadow: '0 0 25px rgba(212, 175, 55, 0.25)'
              }}>
                <Sparkles size={26} />
              </div>
              <h1 style={{
                fontSize: 'clamp(22px, 6vw, 28px)',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                margin: '0 0 8px 0',
                background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0.8) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Join. Win. Shine.
              </h1>
              <p style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: 'clamp(13px, 3.5vw, 14px)',
                lineHeight: '1.5',
                margin: 0
              }}>
               Register today for a chance to be selected as one of our Lucky 10 members and enjoy exclusive jewellery offers, special discounts, and exciting rewards. Fill out the form below to enter.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(14px, 3.5vw, 20px)' }}>
              {error && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#EF4444',
                  fontSize: '13px'
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}


            {/* Name */}
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.35)', pointerEvents: 'none' }} />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Full Name *"
                required
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '13px 14px 13px 42px',
                  color: '#FFF',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#FC4B4E'}
                onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
              />
            </div>

            {/* Date of Birth */}
            <div style={{ position: 'relative' }}>
              <Calendar size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.35)', pointerEvents: 'none' }} />
              <input
                type={formData.dob ? "date" : "text"}
                name="dob"
                min="1940-01-01"
                max="2026-12-31"
                value={formData.dob}
                onChange={handleChange}
                onFocus={e => {
                  e.target.type = 'date';
                  e.target.style.borderColor = '#FC4B4E';
                }}
                onBlur={e => {
                  if (!e.target.value) e.target.type = 'text';
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                }}
                placeholder="Date of Birth *"
                required
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '13px 14px 13px 42px',
                  color: '#FFF',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  colorScheme: 'dark',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>

            {/* Email */}
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.35)', pointerEvents: 'none' }} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email Address *"
                required
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '13px 14px 13px 42px',
                  color: '#FFF',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#FC4B4E'}
                onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
              />
            </div>

            {/* Phone (Optional) */}
            <div style={{ position: 'relative' }}>
              <Phone size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.35)', pointerEvents: 'none' }} />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone Number (Optional)"
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '13px 14px 13px 42px',
                  color: '#FFF',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#FC4B4E'}
                onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
              />
            </div>

            {/* Instagram ID */}
            <div style={{ position: 'relative' }}>
              <InstagramIcon size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.35)', pointerEvents: 'none' }} />
              <input
                type="text"
                name="insta_id"
                value={formData.insta_id}
                onChange={handleChange}
                placeholder="Instagram ID / Handle *"
                required
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '13px 14px 13px 42px',
                  color: '#FFF',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#FC4B4E'}
                onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '8px',
                width: '100%',
                background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
                border: 'none',
                borderRadius: '14px',
                padding: '14px',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 600,
                letterSpacing: '0.02em',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',

                boxShadow: '0 10px 25px rgba(212, 175, 55, 0.3)',
                transition: 'transform 0.2s, boxShadow 0.2s',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? (
                <span>Joining...</span>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Join Us</span>
                </>
              )}
            </button>
          </form>
        </>
      )}


      </div>
    </div>
  </div>
);

}
