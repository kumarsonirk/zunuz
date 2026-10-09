import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, HelpCircle } from 'lucide-react';
import { api } from '../../utils/api';
import Seo from '../../components/Seo';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [answer, setAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [question, setQuestion] = useState('What is your store security code?');
  const [questionOn, setQuestionOn] = useState(false); // only when an answer is set
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const expired = params.get('expired') === '1';

  useEffect(() => {
    api.get('/admin/auth/question')
      .then((d) => {
        if (d?.question) setQuestion(d.question);
        setQuestionOn(!!d?.enabled);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/admin/auth/login', { email, password, ...(questionOn ? { answer } : {}) }, true);
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
    <div style={{ minHeight: '100vh', background: '#0D0E10', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
      <Seo title="Admin Login" path="/admin/login" noindex />
      <div style={{ width: '100%', maxWidth: '420px', padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 className="m-0 inline-block bg-[linear-gradient(90deg,#FF3D8B,#F6C915)] bg-clip-text font-['Qrokinex','Syncopate',sans-serif] text-[44px] leading-none font-normal text-transparent">ZUNUZ</h1>
          <p style={{ color: '#A1A1AA', fontSize: '12px', fontWeight: 700, letterSpacing: '0.22em', marginTop: '10px' }}>ADMIN PANEL</p>
        </div>

        {/* Card */}
        <div style={{ background: '#16181E', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '36px' }}>
          <h1 style={{ color: '#F5F2EB', fontSize: '22px', fontWeight: 500, marginBottom: '6px' }}>Welcome back</h1>
          <p style={{ color: '#A1A1AA', fontSize: '13px', marginBottom: '28px' }}>Sign in to manage your store</p>

          {expired && !error && (
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#F59E0B', fontSize: '13px' }}>
              Your session expired — please sign in again.
            </div>
          )}
          {error && (
            <div style={{ background: 'rgba(255,61,139,0.1)', border: '1px solid rgba(255,61,139,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#FF3D8B', fontSize: '13px' }}>
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

            {questionOn && <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ display: 'block', color: '#A1A1AA', fontSize: '12px', letterSpacing: '0.08em' }}>SECURITY QUESTION</label>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', marginBottom: '8px', color: '#E4E4E7', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={15} style={{ color: '#FF3D8B', flexShrink: 0 }} />
                <span>{question}</span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showAnswer ? 'text' : 'password'}
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder="Answer the question"
                  required
                  style={{ width: '100%', background: '#0D0E10', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 42px 12px 16px', color: '#F5F2EB', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowAnswer(s => !s)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#71717A', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                  aria-label={showAnswer ? 'Hide answer' : 'Show answer'}
                >
                  {showAnswer ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>}

            <button
              type="submit"
              disabled={loading}
              style={{ marginTop: '8px', background: loading ? '#7f2426' : '#FF3D8B', color: 'white', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.05em', transition: 'background 0.2s' }}
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
