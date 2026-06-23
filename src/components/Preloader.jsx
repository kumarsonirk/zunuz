import React, { useState, useEffect, useRef } from 'react';

export default function Preloader({ percentage, muted, onMuteToggle }) {
  const r = 48;
  const c = 2 * Math.PI * r;
  const strokeOffset = c - (percentage / 100) * c;

  let suffix = 'EXPLORE';
  if (percentage > 25 && percentage <= 50) {
    suffix = 'SHOP';
  } else if (percentage > 50) {
    suffix = 'WEAR';
  }

  const prevSuffixRef = useRef(suffix);
  const [displaySuffix, setDisplaySuffix] = useState(suffix);
  const [opacity, setOpacity] = useState(1);
  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    if (suffix !== prevSuffixRef.current) {
      // 1. Fade out and slide up out of view
      setOpacity(0);
      setTranslateY(-6);

      const timeout = setTimeout(() => {
        // 2. Set new text and position it below center
        setDisplaySuffix(suffix);
        setTranslateY(6);

        // 3. Slide up to center and fade back in
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setOpacity(1);
            setTranslateY(0);
          });
        });
        prevSuffixRef.current = suffix;
      }, 250);

      return () => clearTimeout(timeout);
    }
  }, [suffix]);

  return (
    <div className="fixed inset-0 z-[999] bg-[#1F2024] flex items-center justify-center select-none">
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
          <div 
            className="absolute inset-0 flex items-center justify-center text-[3.8vw] md:text-[18px] font-light text-[#F5F2EB] leading-normal tracking-[0.2em] px-2" 
            style={{ 
              fontFamily: "'Space Grotesk', sans-serif",
              textShadow: '0 0 12px rgba(245, 242, 235, 0.2)'
            }}
          >
            {/* Left aligned anchor for prefix */}
            <div className="w-1/2 text-right pr-1.5 whitespace-nowrap">
              <span>EASY TO</span>
            </div>
            {/* Right aligned anchor for dynamic changing suffix */}
            <div className="w-1/2 text-left pl-1.5 whitespace-nowrap overflow-visible">
              <span 
                className="font-medium tracking-[0.2em] inline-block transition-all duration-[250ms] ease-out transform"
                style={{ 
                  opacity: opacity,
                  transform: `translate3d(0, ${translateY}px, 0)`
                }}
              >
                {displaySuffix}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
