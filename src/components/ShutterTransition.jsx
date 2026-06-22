import React from 'react';
import { Br, m1 } from '../data/productData';

export default function ShutterTransition({
  shutterActiveIndex,
  shutterSpeed,
  showZunuzText,
  shutterEnding,
  shutterSlideUp
}) {
  return (
    <div
      className="fixed inset-0 z-[998] overflow-hidden pointer-events-auto bg-[#020203] border-b border-[#F5F2EB]/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] will-change-transform"
      style={{
        transform: shutterSlideUp ? "translate3d(0, -100%, 0)" : "translate3d(0, 0, 0)",
        transition: "transform 1100ms cubic-bezier(0.76, 0, 0.24, 1)"
      }}
    >
      <div className="absolute inset-0 flex flex-col justify-center items-center p-6 bg-[#020203]">
        <div className="relative flex items-center justify-center w-full h-full">
          {/* Shutter Card Frame */}
          <div className="relative w-[75vw] max-w-[300px] h-[55vh] max-h-[460px] border border-zinc-800/60 rounded bg-zinc-950 overflow-hidden shadow-[0_0_90px_rgba(0,0,0,0.95)] z-10 animate-fade-in">
            {Br.map((src, index) => {
              const isActive = index === shutterActiveIndex;
              return (
                <img
                  key={src}
                  src={src}
                  alt="ZunUz Portrait"
                  className="absolute inset-0 w-full h-full object-cover filter contrast-[1.25] grayscale brightness-95 will-change-[opacity,transform]"
                  style={{
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? m1[index] : "rotate(0deg) scale(0.95)",
                    transition: `opacity ${shutterEnding && index === Br.length - 1 ? 1200 : shutterSpeed * 0.8}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform ${shutterEnding && index === Br.length - 1 ? 1200 : shutterSpeed * 0.85}ms cubic-bezier(0.16, 1, 0.3, 1)`
                  }}
                />
              );
            })}
            {/* Shutter Curtain Flash Overlay */}
            <div className="absolute inset-0 bg-[#020203] opacity-0 pointer-events-none shutter-flash-trigger" />
          </div>

          {/* Shutter Text Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="relative w-full text-center flex flex-col items-center justify-center">
              <img
                src="/logo_white.png"
                alt="Zunuz Logo"
                className={`w-[60vw] max-w-[320px] h-auto object-contain drop-shadow-[0_20px_45px_rgba(0,0,0,0.98)] transition-all duration-[750ms] cubic-bezier(0.16, 1, 0.3, 1) will-change-transform ${showZunuzText ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-16 scale-95"}`}
              />
              <p
                className={`text-[12px] md:text-sm font-mono tracking-[0.45em] text-[#F5F2EB]/60 mt-5 uppercase transition-opacity duration-1000 delay-300 ${showZunuzText ? "opacity-100" : "opacity-0"}`}
              >
                You Love it! Buy it!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
