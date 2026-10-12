import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Copy, Check, Link2, Share2, UserPlus, ShoppingBag, Coins, Clock, Users, Hourglass, Sparkles } from 'lucide-react';
import AccountLayout from '../../components/store/AccountLayout';
import { cardCls, primaryBtnCls, ghostBtnCls, BtnSweep } from '../../components/store/StoreShell';
import Seo from '../../components/Seo';
import { api } from '../../utils/api';
import { referralUrl } from '../../utils/referral';
import { formatPrice } from '../../store/catalogConfig';
import { SETTINGS } from '../../store/settings';

// Refer & Earn (/account/refer): the customer's referral code + link with
// copy / WhatsApp / native share, how it works, stats, the friends they've
// referred, and their ZUNUZ Credits wallet (balance + history). Amounts come
// from GET /referrals/me (falling back to the public settings). With the
// program switched off only a friendly note (and an existing balance) shows.
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

const FRIEND_STATUS = {
  JOINED: { label: 'Signed up', cls: 'bg-[#FFF0B8] text-[#8A6A00]' },
  ORDERED: { label: 'Ordered — reward on its way', cls: 'bg-[#D6E6FF] text-[#1A5BC4]' },
  REWARDED: { label: 'Rewarded', cls: 'bg-[#E8F7EE] text-[#1E8A4C]' },
  NOT_ELIGIBLE: { label: 'Not eligible', cls: 'bg-[#111110]/6 text-[#111110]/60' },
};

// Copies `text`; `done` flips for a moment so the button can say "Copied".
function useCopy() {
  const [copied, setCopied] = useState('');
  const copy = useCallback(async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers / blocked clipboard: a hidden textarea + execCommand.
      try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      } catch { return; }
    }
    setCopied(key);
    setTimeout(() => setCopied((k) => (k === key ? '' : k)), 1600);
  }, []);
  return { copied, copy };
}

function Stat({ icon: Icon, label, value, tint }) {
  return (
    <div className={`flex items-center gap-3 p-4 max-[560px]:flex-col max-[560px]:items-start max-[560px]:gap-2 ${cardCls}`}>
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${tint}`}><Icon size={20} /></span>
      <span className="min-w-0">
        <span className="block text-[26px] leading-none font-bold">{value}</span>
        <span className="mt-1 block font-['Inter',sans-serif] text-[13px] text-[#111110]/60">{label}</span>
      </span>
    </div>
  );
}

function CreditsWallet({ credits }) {
  const balance = Math.max(0, Number(credits?.balance) || 0);
  const pending = Math.max(0, Number(credits?.pending) || 0);
  const history = credits?.history || [];
  const soon = credits?.expiringSoon;
  const days = SETTINGS.creditExpiryDays;
  return (
    <section id="ref-wallet" className={`ac-in scroll-mt-28 p-6 max-[560px]:p-5 ${cardCls}`} aria-labelledby="ref-wallet-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="ref-wallet-heading" className="m-0 flex items-center gap-2 text-[22px] font-bold"><Coins size={20} className="text-[#1E8A4C]" /> ZUNUZ Credits</h2>
          <p className="m-0 mt-1 font-['Inter',sans-serif] text-[13px] text-[#111110]/55">Use them at checkout — they can pay for the whole order, delivery included.</p>
        </div>
        <div className="text-right max-[560px]:text-left">
          <span className="block font-['Inter',sans-serif] text-[12px] font-semibold tracking-wide text-[#111110]/50 uppercase">Balance</span>
          <span className="block text-[36px] leading-none font-extrabold text-[#1E8A4C]">{formatPrice(balance)}</span>
        </div>
      </div>

      {(pending > 0 || soon) && (
        <div className="mt-4 flex flex-col gap-2 font-['Inter',sans-serif] text-[13px]">
          {pending > 0 && (
            <p className="m-0 flex items-center gap-2 rounded-[12px] bg-[#D6E6FF]/60 px-3 py-2 text-[#1A5BC4]"><Hourglass size={15} className="shrink-0" /> <span><b>{formatPrice(pending)}</b> on its way — added once your friends' orders are delivered (or your email is verified).</span></p>
          )}
          {soon && soon.amount > 0 && (
            <p className="m-0 flex items-center gap-2 rounded-[12px] bg-[#FFF0B8] px-3 py-2 text-[#8A6A00]"><Clock size={15} className="shrink-0" /> <span><b>{formatPrice(soon.amount)}</b> expires on {fmtDate(soon.date)} — use it before then.</span></p>
          )}
        </div>
      )}

      <h3 className="m-0 mt-6 text-[16px] font-bold">History</h3>
      {history.length === 0 ? (
        <p className="m-0 mt-2 font-['Inter',sans-serif] text-[14px] text-[#111110]/55">No credits yet — they'll show up here when you earn or use them.</p>
      ) : (
        <ul className="m-0 mt-2 flex max-h-[420px] list-none flex-col overflow-y-auto p-0" data-lenis-prevent>
          {history.map((h) => {
            const plus = h.amount > 0;
            return (
              <li key={h.id} className="flex items-center gap-3 border-b border-[#111110]/8 py-3 font-['Inter',sans-serif] last:border-b-0">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-[#111110]">{h.label || (plus ? 'Credits added' : 'Credits used')}</span>
                  <span className="block text-[12px] text-[#111110]/50">
                    {fmtDate(h.createdAt)}
                    {h.orderId && <> · <Link to={`/account/orders?open=${h.orderId}`} className="font-semibold text-[#1A6FE8] no-underline hover:underline">Order #{h.orderId}</Link></>}
                    {plus && h.expiresAt && <> · expires {fmtDate(h.expiresAt)}</>}
                  </span>
                </span>
                <span className={`shrink-0 text-[15px] font-bold tabular-nums ${plus ? 'text-[#1E8A4C]' : 'text-[#E8304F]'}`}>{plus ? '+' : '−'}{formatPrice(Math.abs(h.amount))}</span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="m-0 mt-4 font-['Inter',sans-serif] text-[12px] text-[#111110]/50">Credits can't be withdrawn or transferred and expire {days} days after they're added. They can't be combined with a coupon on the same order.</p>
    </section>
  );
}

export default function ReferPage() {
  const [me, setMe] = useState(null); // GET /referrals/me
  const [credits, setCredits] = useState(null); // GET /credits/me
  const [error, setError] = useState('');
  const [tries, setTries] = useState(0);
  const { copied, copy } = useCopy();

  useEffect(() => {
    let alive = true;
    Promise.all([
      SETTINGS.referralEnabled ? api.get('/referrals/me') : Promise.resolve(null),
      api.get('/credits/me').catch(() => null),
    ])
      .then(([r, c]) => { if (alive) { setMe(r || { enabled: false }); setCredits(c); setError(''); } })
      .catch((e) => { if (alive) setError(e.message || "Couldn't load your referral details."); });
    return () => { alive = false; };
  }, [tries]);

  const reward = me?.reward ?? SETTINGS.referralReward;
  const friendBonus = me?.friendBonus ?? SETTINGS.referralFriendBonus;
  const enabled = SETTINGS.referralEnabled && me?.enabled !== false;
  const link = me?.code ? referralUrl(me.link || me.code) : '';
  const shareText = `I love ZUNUZ jewellery! Sign up with my link and get ${formatPrice(friendBonus)} in ZUNUZ Credits to spend on your first order:`;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const share = () => { navigator.share({ title: 'ZUNUZ', text: shareText, url: link }).catch(() => { /* cancelled */ }); };

  const scrollToWallet = useCallback((e) => {
    if (e && e.preventDefault) e.preventDefault();
    const el = document.getElementById('ref-wallet');
    if (!el) return;
    const scroller = el.closest('.overflow-y-auto') || document.querySelector('.overflow-y-auto') || window;
    const headerOffset = 96; // Space for sticky LandingHeader + breathing room
    if (scroller && scroller !== window) {
      const scrollerRect = scroller.getBoundingClientRect ? scroller.getBoundingClientRect() : { top: 0 };
      const elRect = el.getBoundingClientRect();
      const targetY = scroller.scrollTop + (elRect.top - scrollerRect.top) - headerOffset;
      scroller.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    } else {
      const y = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  }, []);

  const loading = !me && !error;
  const hasCredits = (Number(credits?.balance) || 0) > 0 || (credits?.history?.length || 0) > 0;

  let body;
  if (loading) {
    body = (
      <div className="flex flex-col gap-4">
        <div className="h-[260px] animate-pulse rounded-[24px] bg-white/60" />
        <div className="h-[160px] animate-pulse rounded-[24px] bg-white/60" />
      </div>
    );
  } else if (error && !me) {
    body = (
      <div className={`ac-in flex flex-col items-center px-6 py-12 text-center ${cardCls}`}>
        <p className="m-0 text-[20px] font-bold">Something went wrong</p>
        <p className="m-0 mt-1 font-['Inter',sans-serif] text-[15px] text-[#111110]/60">{error}</p>
        <button type="button" onClick={() => { setError(''); setTries((t) => t + 1); }} className={`${primaryBtnCls} mt-5`}><BtnSweep />Try again</button>
      </div>
    );
  } else if (!enabled) {
    body = (
      <div className="flex flex-col gap-4">
        <div className={`ac-in flex flex-col items-center px-6 py-12 text-center ${cardCls}`}>
          <span aria-hidden="true" className="flex size-16 animate-cp-bob items-center justify-center rounded-full bg-[#FFE0EA] text-[30px]">🎁</span>
          <p className="m-0 mt-4 text-[22px] font-bold">Refer & Earn is taking a little break</p>
          <p className="m-0 mt-1 max-w-[420px] font-['Inter',sans-serif] text-[15px] text-[#111110]/60">We're polishing our referral program. Check back soon — your friends will love it.</p>
          <Link to="/jewellery" className={`${primaryBtnCls} mt-5`}><BtnSweep />Keep shopping</Link>
        </div>
        {hasCredits && <CreditsWallet credits={credits} />}
      </div>
    );
  } else {
    const stats = me.stats || {};
    const friends = me.friends || [];
    const waText = `${shareText} ${link}`;
    const steps = [
      { icon: Share2, title: 'Share your link', text: 'Send your code or link to friends — WhatsApp, Instagram, anywhere.' },
      { icon: UserPlus, title: `They get ${formatPrice(friendBonus)}`, text: `Your friend signs up and gets ${formatPrice(friendBonus)} in ZUNUZ Credits once they verify their email.` },
      { icon: Gift, title: `You get ${formatPrice(reward)}`, text: `At the same time — as soon as your friend verifies their email, ${formatPrice(reward)} lands in your credits too.` },
    ];
    body = (
      <div className="flex flex-col gap-5">
        {/* Top Credit Balance Card */}
        <section className={`ac-in flex flex-wrap items-center justify-between gap-4 p-6 max-[560px]:p-5 ${cardCls}`} aria-label="ZUNUZ Credit balance">
          <div className="flex items-center gap-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#E8F7EE] text-[#1E8A4C]">
              <Coins size={24} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="m-0 text-[19px] font-bold text-[#111110]">ZUNUZ Credits</h2>
                <span className="whitespace-nowrap rounded-full bg-[#E8F7EE] px-2.5 py-0.5 text-[11px] font-bold text-[#1E8A4C]">Ready to spend</span>
              </div>
              <p className="m-0 mt-0.5 font-['Inter',sans-serif] text-[13px] text-[#111110]/60">Use them at checkout — they can pay for the whole order, delivery included.</p>
            </div>
          </div>
          <div className="flex items-center gap-5 max-[560px]:w-full max-[560px]:justify-between">
            <button
              type="button"
              onClick={scrollToWallet}
              className="text-right max-[560px]:text-left bg-transparent border-0 p-0 cursor-pointer"
              title="View credits wallet"
            >
              <span className="block font-['Inter',sans-serif] text-[11px] font-bold tracking-wider text-[#111110]/50 uppercase">Balance</span>
              <span className="block text-[34px] font-extrabold leading-none text-[#1E8A4C] tabular-nums">
                {formatPrice(credits?.balance || 0)}
              </span>
            </button>
            {credits?.history?.length > 0 && (
              <a
                href="#ref-wallet"
                onClick={scrollToWallet}
                className="rounded-full bg-[#111110]/6 px-4 py-2 font-['Inter',sans-serif] text-[13px] font-semibold text-[#111110] no-underline transition-colors hover:bg-[#111110]/12 cursor-pointer"
              >
                View history ↓
              </a>
            )}
          </div>
        </section>

        {/* Hero: code + share — light festive card in the store palette */}
        <section className="ac-in relative overflow-hidden rounded-[28px] border-2 border-[#FF3D8B]/15 bg-[linear-gradient(135deg,#FFF0F5_0%,#FFF8EE_55%,#FFF4CC_100%)] p-[clamp(22px,3.4vw,40px)] text-[#111110] shadow-[0_24px_50px_-34px_rgba(255,61,139,0.55)]">
          <div aria-hidden="true" className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-[#FF3D8B]/12 blur-2xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-[#F6C915]/20 blur-2xl" />
          <Gift aria-hidden="true" size={150} strokeWidth={1.2} className="pointer-events-none absolute -right-4 top-6 rotate-12 text-[#FF3D8B]/10 max-[760px]:hidden" />

          <div className="relative">
            <p className="m-0 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 font-['Inter',sans-serif] text-[12px] font-bold tracking-[0.12em] text-[#E8304F] uppercase shadow-xs"><Sparkles size={14} /> Refer & Earn</p>
            <h2 className="m-0 mt-3 text-[length:clamp(34px,5vw,56px)] leading-[0.95] font-extrabold tracking-[-0.03em]">
              Give <span className="text-[#FF3D8B]">{formatPrice(friendBonus)}</span>, get <span className="relative inline-block text-[#FF3D8B]">{formatPrice(reward)}<span aria-hidden="true" className="absolute inset-x-0 -bottom-1 h-[0.18em] rounded-full bg-[#F6C915]/70" /></span>
            </h2>
            <p className="m-0 mt-3 max-w-[520px] font-['Inter',sans-serif] text-[15px] text-[#111110]/65">
              Your friends get {formatPrice(friendBonus)} in ZUNUZ Credits when they join — and you get {formatPrice(reward)} at the same time.
            </p>

            {/* Code ticket */}
            <div className="mt-6 flex max-w-[560px] items-stretch overflow-hidden rounded-[20px] bg-white shadow-[0_12px_30px_-20px_rgba(17,17,16,0.35)] max-[480px]:flex-col">
              <div className="relative flex flex-1 flex-col justify-center px-5 py-4">
                <span className="font-['Inter',sans-serif] text-[11px] font-bold tracking-[0.14em] text-[#111110]/45 uppercase">Your code</span>
                <span className="mt-0.5 text-[length:clamp(24px,3vw,32px)] font-extrabold tracking-[0.14em] text-[#111110]" aria-label={`Your referral code ${me.code}`}>{me.code}</span>
                <span className="mt-1 font-['Inter',sans-serif] text-[12px] break-all text-[#111110]/45">{link}</span>
              </div>
              <div aria-hidden="true" className="relative w-0 border-l-2 border-dashed border-[#FF3D8B]/30 max-[480px]:hidden">
                <span className="absolute -top-3 -left-3 size-6 rounded-full bg-[#FFF5EE]" />
                <span className="absolute -bottom-3 -left-3 size-6 rounded-full bg-[#FFF5EE]" />
              </div>
              <button type="button" onClick={() => copy('code', me.code)} className="flex shrink-0 cursor-pointer items-center justify-center gap-2 border-0 bg-[#FF3D8B] px-6 py-4 font-['Inter',sans-serif] text-[14px] font-bold text-white transition-colors hover:bg-[#E8304F]">
                {copied === 'code' ? <Check size={16} /> : <Copy size={16} />} {copied === 'code' ? 'Copied!' : 'Copy code'}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5 font-['Inter',sans-serif]">
              <button type="button" onClick={() => copy('link', link)} className="inline-flex cursor-pointer items-center gap-2 rounded-full border-0 bg-[#111110] px-5 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-[#FF3D8B]">
                {copied === 'link' ? <Check size={16} /> : <Link2 size={16} />} {copied === 'link' ? 'Copied!' : 'Copy link'}
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-[14px] font-bold text-white no-underline transition-opacity hover:opacity-90">
                <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4c-1-1.6-1.5-3.4-1.5-5.2 0-5.4 4.4-9.8 9.8-9.8 2.6 0 5.1 1 6.9 2.9 1.8 1.8 2.9 4.3 2.9 6.9 0 5.4-4.4 9.8-9.8 9.8zm8.4-18.2C18.2 1.3 15.2 0 12 0 5.5 0 .1 5.3.1 11.9c0 2.1.5 4.1 1.6 5.9L0 24l6.3-1.7c1.7.9 3.7 1.4 5.7 1.4 6.6 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.2-3.5-8.4z" /></svg>
                WhatsApp
              </a>
              {canShare && (
                <button type="button" onClick={share} className="inline-flex cursor-pointer items-center gap-2 rounded-full border-2 border-[#111110]/15 bg-white/70 px-5 py-2 text-[14px] font-bold text-[#111110] transition-colors hover:border-[#111110] hover:bg-white">
                  <Share2 size={16} /> Share
                </button>
              )}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className={`ac-in p-6 max-[560px]:p-5 ${cardCls}`} aria-labelledby="ref-how">
          <h2 id="ref-how" className="m-0 text-[22px] font-bold">How it works</h2>
          <ol className="m-0 mt-4 grid list-none grid-cols-3 gap-4 p-0 max-[760px]:grid-cols-1">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="flex gap-3 rounded-[18px] bg-[#FFF8EE] p-4">
                <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-[#FF3D8B] text-white">
                  <Icon size={19} />
                  <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-[#111110] font-['Inter',sans-serif] text-[11px] font-bold">{i + 1}</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-[16px] font-bold">{title}</span>
                  <span className="mt-0.5 block font-['Inter',sans-serif] text-[13px] leading-snug text-[#111110]/65">{text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* Stats */}
        <div className="ac-in grid grid-cols-3 gap-3 max-[560px]:gap-2">
          <Stat icon={Users} label="Friends joined" value={stats.joined ?? 0} tint="bg-[#D6E6FF] text-[#1A6FE8]" />
          <Stat icon={Hourglass} label="Pending" value={stats.pending ?? 0} tint="bg-[#FFF0B8] text-[#8A6A00]" />
          <Stat icon={Coins} label="Earned" value={formatPrice(stats.earned ?? 0)} tint="bg-[#E8F7EE] text-[#1E8A4C]" />
        </div>

        {/* Friends */}
        <section className={`ac-in p-6 max-[560px]:p-5 ${cardCls}`} aria-labelledby="ref-friends">
          <h2 id="ref-friends" className="m-0 text-[22px] font-bold">Your friends</h2>
          {friends.length === 0 ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-[18px] bg-[#FFF8EE] p-5">
              <p className="m-0 font-['Inter',sans-serif] text-[15px] text-[#111110]/65">No one yet — share your link and your friends will show up here.</p>
              <button type="button" onClick={() => copy('link2', link)} className={`${ghostBtnCls} px-5 py-2 text-[14px]`}>
                {copied === 'link2' ? <><Check size={16} /> Copied!</> : <><Link2 size={16} /> Copy link</>}
              </button>
            </div>
          ) : (
            <ul className="m-0 mt-3 flex list-none flex-col p-0">
              {friends.map((f, i) => {
                const s = FRIEND_STATUS[f.status] || FRIEND_STATUS.JOINED;
                return (
                  <li key={`${f.name}-${f.joinedAt}-${i}`} className="flex flex-wrap items-center gap-3 border-b border-[#111110]/8 py-3 font-['Inter',sans-serif] last:border-b-0">
                    <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FFE0EA] text-[14px] font-bold text-[#FF3D8B]">{(f.name || '?').trim().charAt(0).toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{f.name || 'Friend'}</span>
                      <span className="block text-[12px] text-[#111110]/50">Joined {fmtDate(f.joinedAt)}</span>
                    </span>
                    <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[12px] font-bold ${s.cls}`}>{s.label}</span>
                    {f.status === 'REWARDED' && f.reward > 0 && <span className="shrink-0 text-[15px] font-bold text-[#1E8A4C]">+{formatPrice(f.reward)}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {credits ? <CreditsWallet credits={credits} /> : (
          <p className={`ac-in m-0 p-5 font-['Inter',sans-serif] text-[14px] text-[#111110]/60 ${cardCls}`}>We couldn't load your ZUNUZ Credits right now — try again in a bit.</p>
        )}
        <p className="m-0 flex items-center gap-2 font-['Inter',sans-serif] text-[12px] text-[#111110]/50"><ShoppingBag size={14} /> Rewards are for genuine new customers — self-referrals and duplicate accounts don't count.</p>
      </div>
    );
  }

  const balanceAction = credits ? (
    <a
      href="#ref-wallet"
      onClick={scrollToWallet}
      className="flex cursor-pointer items-center gap-2.5 rounded-full bg-[#E8F7EE] px-4 py-2 text-[#1E8A4C] no-underline transition-all hover:bg-[#d8f2e2] shadow-sm border border-[#1E8A4C]/20"
      title="View credits wallet"
    >
      <Coins size={17} className="text-[#1E8A4C]" />
      <span className="font-['Inter',sans-serif] text-[11px] font-bold tracking-wider uppercase text-[#111110]/60">Balance:</span>
      <span className="text-[17px] font-extrabold leading-none text-[#1E8A4C] tabular-nums">{formatPrice(credits?.balance || 0)}</span>
    </a>
  ) : null;

  return (
    <AccountLayout
      title="Refer & Earn"
      subtitle={enabled ? `Give ${formatPrice(friendBonus)}, get ${formatPrice(reward)} — for every friend who shops with us.` : 'Your ZUNUZ Credits and referrals.'}
      action={balanceAction}
    >
      <Seo title="Refer & Earn" path="/account/refer" noindex />
      {body}
    </AccountLayout>
  );
}
