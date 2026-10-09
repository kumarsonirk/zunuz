import { SETTINGS } from '../store/settings';

// Shown on every customer page while maintenance mode is on (admin Settings).
export default function MaintenancePage() {
  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-[#FFF8EE] px-6 text-center font-['Bricolage_Grotesque','Inter',sans-serif] text-[#111110]">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(50%_40%_at_20%_10%,#FFE0EA_0%,transparent_70%),radial-gradient(45%_40%_at_90%_80%,#FFF0B8_0%,transparent_70%)]" />
      <div className="relative flex flex-col items-center animate-[jw-rise_0.7s_cubic-bezier(0.16,1,0.3,1)_both]">
        <span className="bg-[linear-gradient(90deg,#FF3D8B,#F6C915)] bg-clip-text font-['Qrokinex','Syncopate',sans-serif] text-[clamp(44px,9vw,84px)] leading-none text-transparent">ZUNUZ</span>
        <span aria-hidden="true" className="mt-8 text-[48px] animate-cp-bob">✨</span>
        <h1 className="m-0 mt-4 text-[length:clamp(30px,5vw,48px)] font-extrabold tracking-[-0.02em]">We'll be right back</h1>
        <p className="m-0 mt-3 max-w-[460px] font-['Inter',sans-serif] text-[17px] leading-relaxed text-[#111110]/70">{SETTINGS.maintenanceMessage}</p>
        <a href={`mailto:${SETTINGS.supportEmail}`} className="mt-7 rounded-full bg-[#111110] px-6 py-3 font-['Inter',sans-serif] text-[15px] font-semibold text-white no-underline transition-colors hover:bg-[#FF3D8B]">Contact us</a>
      </div>
    </div>
  );
}
