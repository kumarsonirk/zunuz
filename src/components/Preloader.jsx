import React from 'react';

export default function Preloader({ percentage, muted, onMuteToggle }) {
  const r = 48;
  const c = 2 * Math.PI * r;
  const strokeOffset = c - (percentage / 100) * c;

  return (
    <div className="fixed inset-0 z-[999] bg-[#020203] flex items-center justify-center select-none">
      <div className="relative flex items-center justify-center scale-95 md:scale-100">
        <div className="w-[72vw] h-[72vw] max-w-[320px] max-h-[320px] flex items-center justify-center relative">
          <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={r} fill="transparent" stroke="#F5F2EB" strokeWidth="0.5" className="opacity-10" />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="transparent"
              stroke="#F5F2EB"
              strokeWidth="1.2"
              strokeDasharray={c}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              className="transition-all duration-300 ease-out"
            />
          </svg>
          <span className="text-[16vw] md:text-[100px] font-light text-[#F5F2EB] leading-none tracking-tighter" style={{ fontFamily: "'Qrokinex', sans-serif" }}>
            {percentage}%
          </span>
      </div>
      </div>
    </div>
  );
}
