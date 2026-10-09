import { useState } from 'react';
import { MailWarning, MailCheck } from 'lucide-react';
import { ghostBtnCls } from './StoreShell';
import { useAuth } from '../../contexts/AuthContext';

// "Verify your email" nudge for the account pages. Only shows for a signed-in
// customer who has an email that hasn't been confirmed yet (OTP-only accounts
// without an email never see it).
export default function VerifyEmailBanner({ className = '' }) {
  const { customer, resendVerification } = useAuth();
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');

  if (!customer?.email || customer.emailVerified !== false) return null;

  const resend = async () => {
    setState('sending');
    setError('');
    try { await resendVerification(); setState('sent'); }
    catch (err) { setError(err.message || "Couldn't send it — try again in a few minutes."); setState('error'); }
  };

  return (
    <div role="status" className={`flex flex-wrap items-center gap-4 rounded-[20px] border-2 border-[#F2A900]/40 bg-[#FFF6D6] p-4 ${className}`}>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#FFF0B8] text-[#8A6A00]">
        {state === 'sent' ? <MailCheck size={20} /> : <MailWarning size={20} />}
      </span>
      <div className="min-w-0 flex-1 font-['Inter',sans-serif]">
        <p className="m-0 text-[15px] font-bold text-[#111110]">Verify your email to use coupon codes</p>
        <p className="m-0 mt-0.5 text-[13px] break-words text-[#111110]/65">
          {state === 'sent'
            ? <>Sent! Check <b>{customer.email}</b> (and your spam folder) for the link.</>
            : <>We sent a link to <b>{customer.email}</b>. Didn't get it?</>}
        </p>
        {state === 'error' && <p role="alert" className="m-0 mt-1 text-[13px] text-[#E8304F]">{error}</p>}
      </div>
      {state !== 'sent' && (
        <button type="button" onClick={resend} disabled={state === 'sending'} className={`${ghostBtnCls} px-5 py-2 text-[14px] disabled:cursor-not-allowed disabled:opacity-50`}>
          {state === 'sending' ? 'Sending…' : 'Resend email'}
        </button>
      )}
    </div>
  );
}
