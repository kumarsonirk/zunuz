import React from 'react';

const SplitWords = ({ text, wordClass = 'nw-word-inner' }) => (
  <span style={{ display: 'inline' }}>
    {text.split(' ').map((word, i) => (
      <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', marginRight: '0.28em' }}>
        <span className={wordClass} style={{ display: 'inline-block' }}>{word}</span>
      </span>
    ))}
  </span>
);

export default function CategoryHero({
  title,
  subtitle,
  ctaText,
  ctaHref = '/products',
  videoSrc = '/main_video.mp4',
  imageSrc,
  heroRef,
  heroVideoRef,
  goldColor = '#D8B26B',
  paperColor = '#F5F2EB',
  wordClass = 'nw-word-inner',
  fadeClass = 'nw-fade-el',
}) {
  return (
    <section ref={heroRef} style={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden' }}>
      {videoSrc ? (
        <video
          ref={heroVideoRef}
          src={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          style={{ position: 'absolute', top: '-9%', left: 0, width: '100%', height: '118%', objectFit: 'cover' }}
        />
      ) : imageSrc ? (
        <img
          src={imageSrc}
          alt={title}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : null}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)' }} />
      <div style={{
        position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-end', textAlign: 'center',
        padding: '0 clamp(20px, 5vw, 64px) clamp(100px, 8vw, 84px)', boxSizing: 'border-box', color: paperColor,
      }}>
        <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, margin: 0, fontSize: 'clamp(40px, 9vw, 110px)', lineHeight: 1.02 }}>
          <SplitWords text={title} wordClass={wordClass} />
        </h1>
        {subtitle && (
          <p className={fadeClass} style={{
            fontFamily: "'Inter', sans-serif", margin: '18px 0 0', fontWeight: 400,
            maxWidth: '380px', fontSize: 'clamp(18px, 2vw, 20px)', lineHeight: 1.5, color: 'rgba(245,242,235,0.85)',
          }}>
            {subtitle}
          </p>
        )}
        {ctaText && (
          <a
            href={ctaHref}
            data-cursor-hover
            className={fadeClass}
            style={{
              marginTop: '24px', display: 'inline-flex', alignItems: 'center', gap: '10px',
              padding: '14px 28px', borderRadius: '999px', border: `1px solid ${goldColor}`,
              color: paperColor, textDecoration: 'none', fontSize: '11px', letterSpacing: '0.14em',
              textTransform: 'uppercase', fontFamily: "'Inter', sans-serif",
            }}
          >
            {ctaText}
          </a>
        )}
      </div>
    </section>
  );
}
