import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MailX, MailCheck, Loader2 } from 'lucide-react';
import { api } from '../../utils/api';
import AuthLayout, { AuthAlert } from '../../components/store/AuthLayout';
import { primaryBtnCls, ghostBtnCls, BtnSweep } from '../../components/store/StoreShell';
import Seo from '../../components/Seo';

// Newsletter unsubscribe (/unsubscribe?token=…), from the link in every
// newsletter email. One click: it unsubscribes on load (idempotent), strips
// the token from the address bar, and offers "Changed your mind?" →
// resubscribe with the same link.
export default function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get('token'));
  const [status, setStatus] = useState(token ? 'working' : 'error'); // working | done | error
  const [email, setEmail] = useState('');
  const [error, setError] = useState(token ? '' : 'This unsubscribe link is missing its code.');
  const [back, setBack] = useState('idle'); // idle | sending | done | error
  const [backError, setBackError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('token')) {
      window.history.replaceState(window.history.state, '', window.location.pathname);
    }
    // StrictMode runs effects twice in dev — only send the request once.
    if (!token || started.current) return;
    started.current = true;
    api.post('/newsletter/unsubscribe', { token })
      .then((res) => { setEmail(res.email || ''); setStatus('done'); })
      .catch((err) => { setError(err.message || 'This unsubscribe link is not valid.'); setStatus('error'); });
  }, [token]);

  const resubscribe = async () => {
    setBack('sending');
    setBackError('');
    try { await api.post('/newsletter/resubscribe', { token }); setBack('done'); }
    catch (err) { setBackError(err.message || "Couldn't do that — try again."); setBack('error'); }
  };

  let content;
  if (status === 'working') {
    content = (
      <div className="au-in flex items-center gap-3 rounded-[18px] bg-white/85 p-5 font-['Inter',sans-serif] text-[15px] text-[#111110]/70" aria-live="polite">
        <Loader2 size={20} className="animate-spin text-[#FF3D8B]" /> Unsubscribing…
      </div>
    );
  } else if (status === 'done') {
    content = back === 'done' ? (
      <div className="au-in flex flex-col items-center rounded-[22px] bg-white/85 px-6 py-8 text-center animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
        <MailCheck size={50} className="animate-[jw-pop_0.6s_cubic-bezier(0.34,1.56,0.64,1)_both] text-[#1E8A4C]" />
        <p className="m-0 mt-3 text-[22px] font-bold">Welcome back!</p>
        <p className="m-0 mt-1 font-['Inter',sans-serif] text-[14px] text-[#111110]/65">You're on the list again{email ? <> as <b className="text-[#111110]">{email}</b></> : ''}.</p>
        <Link to="/jewellery" className={`${primaryBtnCls} mt-5`}><BtnSweep />Shop jewellery</Link>
      </div>
    ) : (
      <div className="flex flex-col gap-4">
        <div className="au-in flex flex-col items-center rounded-[22px] bg-white/85 px-6 py-8 text-center animate-[jw-rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
          <span className="flex size-14 items-center justify-center rounded-full bg-[#FFE0EA] text-[#FF3D8B]"><MailX size={26} /></span>
          <p className="m-0 mt-3 text-[22px] font-bold">You're unsubscribed</p>
          <p className="m-0 mt-1 font-['Inter',sans-serif] text-[14px] text-[#111110]/65">
            {email ? <><b className="text-[#111110]">{email}</b> won't</> : "You won't"} get any more newsletter emails from us. Order and account emails still arrive as usual.
          </p>
        </div>
        {back === 'error' && <AuthAlert>{backError}</AuthAlert>}
        <button type="button" onClick={resubscribe} disabled={back === 'sending'} className={`au-in ${ghostBtnCls} w-full disabled:cursor-wait disabled:opacity-60`}>
          {back === 'sending' ? 'One moment…' : 'Changed your mind? Resubscribe'}
        </button>
        <Link to="/" className="au-in text-center font-['Inter',sans-serif] text-[14px] font-bold text-[#1A6FE8] no-underline hover:underline">Back to ZUNUZ →</Link>
      </div>
    );
  } else {
    content = (
      <div className="flex flex-col gap-4">
        <div className="au-in flex items-start gap-3 rounded-[18px] bg-white/85 p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#FFE3E8] text-[#E8304F]"><MailX size={22} /></span>
          <p className="m-0 font-['Inter',sans-serif] text-[15px] leading-relaxed text-[#111110]/75">{error} Use the unsubscribe link from the most recent email, or contact customer care and we'll remove you.</p>
        </div>
        <Link to="/customer-care" className={`au-in ${ghostBtnCls} w-full`}>Contact customer care</Link>
      </div>
    );
  }

  return (
    <AuthLayout
      image="/modal2.webp"
      title={status === 'error' ? 'Link not valid' : 'Newsletter'}
      accent={status === 'error' ? 'text-[#E8304F]' : 'text-[#FF3D8B]'}
      subtitle={status === 'working' ? 'One moment…' : null}
      tagline="See you around."
    >
      <Seo title="Unsubscribe" path="/unsubscribe" noindex />
      {content}
    </AuthLayout>
  );
}
