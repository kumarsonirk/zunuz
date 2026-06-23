import React from 'react';
import { wp } from '../data/productData';

export default function CategorySelection({ onSelectCategory }) {
  return (
    <>
      <section className="flex-1 flex flex-col w-full bg-[#1F2024] divide-y divide-zinc-800 overflow-hidden">
        {wp.map((D) => (
          <div
            key={D.id}
            onClick={() => onSelectCategory(D)}
            className="group relative flex-1 min-h-0 w-full overflow-hidden cursor-pointer flex flex-col items-center justify-center transition-all duration-700 bg-[#1F2024]"
          >
            {/* Background Image of Card */}
            <div className="absolute inset-0 z-0 scale-100 group-hover:scale-105 group-active:scale-102 transition-transform duration-[1200ms] ease-out select-none">
              <img src={D.image} alt={D.title} className="w-full h-full object-cover filter contrast-[1.1] brightness-[0.8] saturate-[1.05]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-black/45 group-hover:opacity-75 transition-opacity" />
            </div>
            {/* Text Content */}
            <div className="relative z-10 text-center px-4 flex flex-col items-center select-none transition-opacity duration-500 group-hover:opacity-80">
              <h3 className="text-[6.5vw] sm:text-3xl leading-none text-white tracking-widest drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)] transition-colors font-qrokinex font-bold" style={{ fontFamily: "'Qrokinex', sans-serif", fontWeight: 700 }}>
                {D.title}
              </h3>
              <p className="category-subtitle text-[10px] sm:text-xs tracking-widest text-[#F5F2EB]/80 mt-2.5 max-w-xs transition-colors duration-500" style={{ fontFamily: "'Grift', sans-serif" }}>
                {D.subtitle}
              </p>
            </div>
            {/* Thin border hover effect */}
            <div className="absolute inset-3 border border-[#F5F2EB]/0 group-hover:border-[#F5F2EB]/15 rounded transition-all duration-500 pointer-events-none" />
          </div>
        ))}
      </section>

      {/* Home Footer */}
      {/* <footer className="px-6 py-5 border-t border-zinc-900/50 bg-[#1F2024] flex justify-center items-center text-center text-[10px] font-medium text-zinc-500 tracking-wider">
        <span style={{ fontFamily: "'Grift', sans-serif" }}>© Zunuz | 2026</span>
      </footer> */}
    </>
  );
}
