import React, { useState, useEffect, useRef } from 'react';

export default function Preloader({ percentage, muted, onMuteToggle }) {
  const r = 48;
  const c = 2 * Math.PI * r;
  const strokeOffset = c - (percentage / 100) * c;

  let text = 'EASY TO EXPLORE';
  if (percentage > 25 && percentage <= 50) {
    text = 'EASY TO SHOP';
  } else if (percentage > 50) {
    text = 'EASY TO WEAR';
  }

  const prevTextRef = useRef(text);
  const [displayText, setDisplayText] = useState(text);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (text !== prevTextRef.current) {
      setOpacity(0);
      const timeout = setTimeout(() => {
        setDisplayText(text);
        setOpacity(1);
        prevTextRef.current = text;
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [text]);

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
            className="text-[3.8vw] md:text-[18px] font-light text-[#F5F2EB] leading-normal tracking-[0.2em] text-center px-4" 
            style={{ 
              opacity: opacity, 
              transition: 'opacity 300ms ease-in-out',
              fontFamily: "'Space Grotesk', sans-serif",
              maxWidth: '240px',
              textShadow: '0 0 12px rgba(245, 242, 235, 0.2)'
            }}
          >
            {displayText}
          </div>
        </div>
      </div>
    </div>
  );
}

