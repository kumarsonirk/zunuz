import { memo, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { SETTINGS } from '../../store/settings';

// Slim announcement strip at the very top of every storefront page (rendered
// by LandingHeader, above the desktop and mobile headers). Text, link and
// on/off come from admin → Settings (announcementEnabled / Text / Link).
// - internal links ("/shop…") use the router; https:// links open a new tab;
// - dismissible for the browser session (remembered per text, so a new
//   message shows again);
// - the text eases in once; it only scrolls (marquee) when it doesn't fit.
// It's a normal block in the header's flow, so pages that float the header
// over a hero (home / jewellery) just get the header pushed down by its height;
// while it's showing it also sets --announce-h on <html> so those heroes can
// nudge copy that's positioned from the top (portrait layouts) down to match.
const BAR_H = 34;
const DISMISS_KEY = 'zunuz_announcement_dismissed';
const isDismissed = (text) => {
  try { return sessionStorage.getItem(DISMISS_KEY) === text; } catch { return false; }
};

const Sparkle = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" className="shrink-0">
    <path d="M12 0c.9 6.6 5.4 11.1 12 12-6.6.9-11.1 5.4-12 12-.9-6.6-5.4-11.1-12-12C6.6 11.1 11.1 6.6 12 0z" fill="#F6C915" />
  </svg>
);

function Message({ text, link, tabIndex }) {
  const inner = (
    <>
      <Sparkle />
      <span>{text}</span>
      {link && <span aria-hidden="true" className="inline-block transition-transform duration-300 group-hover/an:translate-x-1">→</span>}
    </>
  );
  const cls = 'group/an inline-flex items-center gap-2 whitespace-nowrap text-inherit no-underline';
  if (!link) return <span className={cls}>{inner}</span>;
  if (/^https?:\/\//i.test(link)) {
    return <a href={link} target="_blank" rel="noopener noreferrer" tabIndex={tabIndex} className={`${cls} hover:underline underline-offset-2`}>{inner}</a>;
  }
  return <Link to={link} tabIndex={tabIndex} className={`${cls} hover:underline underline-offset-2`}>{inner}</Link>;
}

function AnnouncementBar() {
  const text = String(SETTINGS.announcementText || '').trim();
  const link = String(SETTINGS.announcementLink || '').trim();
  const enabled = !!SETTINGS.announcementEnabled && !!text;
  const [hidden, setHidden] = useState(() => !enabled || isDismissed(text));
  const [closing, setClosing] = useState(false);
  // Natural text width when it overflows (→ marquee), else 0.
  const [overflowW, setOverflowW] = useState(0);
  const boxRef = useRef(null);
  const measureRef = useRef(null);

  // Marquee only when the single copy is wider than the space it has.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const m = measureRef.current;
    if (!box || !m) return undefined;
    const check = () => setOverflowW(m.scrollWidth > box.clientWidth + 1 ? m.scrollWidth : 0);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(box);
    return () => ro.disconnect();
  }, [hidden]);

  // Publish the bar's height for hero layouts (0 once dismissed / hidden).
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (hidden || closing) { root.style.removeProperty('--announce-h'); return undefined; }
    root.style.setProperty('--announce-h', `${BAR_H}px`);
    return () => root.style.removeProperty('--announce-h');
  }, [hidden, closing]);

  if (hidden) return null;

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, text); } catch { /* ignore */ }
    setClosing(true);
    setTimeout(() => setHidden(true), 320);
  };

  // ~40px/s, whatever the length.
  const duration = `${Math.max(12, Math.round((overflowW + 48) / 40))}s`;

  return (
    <div
      role="region"
      aria-label="Announcement"
      style={{ '--bar-h': `${BAR_H}px` }}
      className={`relative z-[1] grid bg-[#FF3D8B] text-white transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${closing ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr]'}`}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="flex h-[var(--bar-h)] items-center gap-2 pr-1.5 pl-4 font-['Inter',sans-serif] text-[13px] font-semibold tracking-[0.01em]">
          {/* Text area — centred when it fits, scrolling when it doesn't. */}
          <div ref={boxRef} className="relative flex min-w-0 flex-1 justify-center overflow-hidden animate-[jw-rise_0.6s_cubic-bezier(0.16,1,0.3,1)_0.15s_both] motion-reduce:animate-none">
            {/* Invisible copy used only to measure the natural width. */}
            <span ref={measureRef} aria-hidden="true" className="pointer-events-none invisible absolute top-0 left-0 inline-flex items-center gap-2 whitespace-nowrap">
              <Sparkle /><span>{text}</span>{link && <span>→</span>}
            </span>
            {overflowW ? (
              <div className="flex w-max animate-t3-marquee hover:[animation-play-state:paused] motion-reduce:animate-none" style={{ animationDuration: duration }}>
                {[0, 1].map((copy) => (
                  <span key={copy} aria-hidden={copy === 1} className="pr-12">
                    <Message text={text} link={link} tabIndex={copy === 1 ? -1 : undefined} />
                  </span>
                ))}
              </div>
            ) : (
              <Message text={text} link={link} />
            )}
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss announcement"
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-white/85 transition-[background-color,color,rotate] duration-300 hover:rotate-90 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          >
            <X size={15} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(AnnouncementBar);
