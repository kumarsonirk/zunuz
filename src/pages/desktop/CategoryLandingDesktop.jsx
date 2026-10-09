import React from 'react';
import { wp } from '../../data/productData';
import Seo from '../../components/Seo';

export default function CategoryLandingDesktop({ onSelectCategory, categories = wp }) {
  return (
    <>
      <Seo path="/" />
      <section className="flex-1 flex flex-row w-full bg-[#1F2024]" style={{ gap: '20px', padding: '20px 64px 40px' }}>
        {categories.map((D, i) => (
          <div
            key={D.id}
            onClick={() => onSelectCategory(D)}
            className="group relative flex-1 overflow-hidden cursor-pointer flex items-end rounded-[20px] animate-card-fade-in"
            style={{ minHeight: '60vh', animationDelay: `${i * 90}ms` }}
          >
            {/* Background photo */}
            <div className="absolute inset-0 z-0 overflow-hidden select-none">
              <img
                src={D.image}
                alt={D.title}
                className="w-full h-full object-cover scale-100 group-hover:scale-[1.06] transition-transform duration-[1400ms] ease-out filter contrast-[1.1] brightness-[0.75] saturate-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/30 group-hover:from-black/85 transition-colors duration-700" />
            </div>

            {/* Title + subtitle + CTA, stacked */}
            <div className="relative z-10 w-full flex flex-col items-start gap-2 transition-transform duration-700 group-hover:-translate-y-1" style={{ padding: '0 28px 32px' }}>
              <h2
                className="text-white tracking-widest drop-shadow-[0_6px_20px_rgba(0,0,0,0.85)] font-qrokinex font-bold"
                style={{ fontFamily: "'Qrokinex', 'Syncopate', sans-serif", fontWeight: 700, fontSize: 'clamp(30px, 3.4vw, 46px)', lineHeight: 1 }}
              >
                {D.title}
              </h2>
              <span className="text-[#F5F2EB]/70" style={{ fontFamily: "'Grift', sans-serif", fontSize: '13px', letterSpacing: '0.04em' }}>
                {D.subtitle}
              </span>
              <span
                className="flex items-center gap-2 text-[#F5F2EB]"
                style={{ fontFamily: "'Grift', sans-serif", fontSize: '14px', letterSpacing: '0.03em', marginTop: '6px' }}
              >
                View our collection
                <span className="inline-block transition-transform duration-500 group-hover:translate-x-1.5">→</span>
              </span>
            </div>

            {/* Thin border hover effect */}
            <div className="absolute inset-3 border border-[#F5F2EB]/0 group-hover:border-[#F5F2EB]/15 rounded-[16px] transition-all duration-500 pointer-events-none" />
          </div>
        ))}
      </section>
    </>
  );
}
