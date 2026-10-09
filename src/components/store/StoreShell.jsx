import { useRef } from 'react';
import useSmoothScroll from '../../hooks/useSmoothScroll';
import { LandingHeader } from '../landing/LandingIntro';
import SiteFooter from '../landing/SiteFooter';

// Page frame for the storefront's utility pages (bag, checkout, order
// success, auth, account): cream base + soft colour glows, its own smooth
// scroll container (the app shell keeps #root from scrolling), the shared
// header and footer. `glow` swaps the background glow; `after` renders
// outside the scroller (e.g. a sticky mobile bar).
const FONT_CLASS = "font-['Bricolage_Grotesque','Inter',sans-serif]";
const DEFAULT_GLOW = 'bg-[radial-gradient(55%_45%_at_8%_5%,#FFE0EA_0%,transparent_70%),radial-gradient(45%_40%_at_95%_20%,#FFF0B8_0%,transparent_70%),radial-gradient(50%_45%_at_60%_100%,#E6DCFA_0%,transparent_70%)]';

export default function StoreShell({ children, footer = true, glow = DEFAULT_GLOW, after = null }) {
  const scrollRef = useRef(null);
  const scrollContentRef = useRef(null);
  const lenisRef = useSmoothScroll(scrollRef, scrollContentRef);
  return (
    <div className={`relative h-dvh w-full overflow-hidden bg-[#FFF8EE] text-[#111110] ${FONT_CLASS}`}>
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${glow}`} />
      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden">
        <div ref={scrollContentRef} className="flex min-h-full flex-col">
          <div className="sticky top-0 z-40"><LandingHeader transparent={false} /></div>
          <div className="relative flex-1">{children}</div>
          {footer && <SiteFooter scrollRef={scrollRef} lenisRef={lenisRef} />}
          {/* room so a sticky mobile bar never covers the footer's last line */}
          {after && <div className="h-20 shrink-0 min-[901px]:hidden" />}
        </div>
      </div>
      {after}
    </div>
  );
}

// Shared look for inputs / buttons on these pages.
export const fieldCls = "w-full rounded-[14px] border-2 border-[#111110]/12 bg-white px-4 py-3 font-['Inter',sans-serif] text-[15px] text-[#111110] outline-none transition-colors placeholder:text-[#111110]/35 focus:border-[#111110] aria-[invalid=true]:border-[#E8304F]";
export const primaryBtnCls = 'group/pb relative isolate inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full border-0 bg-[#111110] px-7 py-3.5 text-[16px] font-bold text-white no-underline transition-[translate,opacity] duration-300 enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50';
// The pink fill that sweeps up inside primaryBtnCls on hover.
export function BtnSweep() {
  return <span aria-hidden="true" className="absolute inset-0 -z-10 translate-y-full rounded-full bg-[#FF3D8B] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/pb:translate-y-0" />;
}
export const ghostBtnCls = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-[#111110] bg-transparent px-7 py-3 text-[16px] font-bold text-[#111110] no-underline transition-colors duration-300 hover:bg-[#111110] hover:text-white';
export const cardCls = 'rounded-[24px] bg-white/85 shadow-[0_18px_40px_-28px_rgba(17,17,16,0.45)] backdrop-blur-sm';
