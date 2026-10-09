import React from 'react';

export default function ThreeWaysSection({
  title = 'Three ways to live it.',
  subtitle = 'Designed around the way you live.',
  cards = [],
  sectionRef,
  tileRefs,
  inkColor = '#1F2024',
  paperColor = '#F5F2EB',
  fadeClass = 'tw-fade-el',
  imageClass = 'tw-tile-image',
}) {
  return (
    <section ref={sectionRef} style={{ padding: 'clamp(30px, 7vw, 64px) 0', boxSizing: 'border-box' }}>
      {title && (
        <h2 className={fadeClass} style={{
          fontFamily: "'Inter', sans-serif", margin: '0 0 6px', padding: '0 clamp(20px, 6vw, 80px)',
          fontWeight: 700, fontSize: 'clamp(28px, 3.2vw, 30px)', color: inkColor, lineHeight: '32px',
        }}>
          {title}
        </h2>
      )}
      {subtitle && (
        <p className={fadeClass} style={{
          fontFamily: "'Inter', sans-serif", margin: '0 0 50px', padding: '0 clamp(20px, 6vw, 80px)',
          fontSize: 'clamp(28px, 1.8vw, 18px)', fontWeight: 600, color: '#6E6E73', lineHeight: '32px',
        }}>
          {subtitle}
        </p>
      )}
      <div style={{
        display: 'flex', gap: '12px', overflowX: 'auto', scrollSnapType: 'x mandatory',
        padding: '0 clamp(20px, 6vw, 80px) 12px', scrollPaddingLeft: 'clamp(20px, 6vw, 80px)',
        WebkitOverflowScrolling: 'touch',
      }}>
        {cards.map((card, i) => (
          <a
            key={card.label || i}
            href={card.href || '/products'}
            data-cursor-hover
            ref={(el) => {
              if (tileRefs) {
                if (typeof tileRefs === 'function') tileRefs(el, i);
                else if (tileRefs.current) tileRefs.current[i] = el;
              }
            }}
            style={{
              position: 'relative', flex: '0 0 280px', width: '280px', height: '500px',
              scrollSnapAlign: 'start', overflow: 'hidden', borderRadius: '6px', textDecoration: 'none',
            }}
          >
            <img className={imageClass} src={card.image} alt={card.label} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0 }} />
            <div style={{ position: 'absolute', left: '16px', top: '16px', right: '16px' }}>
              <p style={{ margin: '0 0 4px', fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 'clamp(21px, 1.8vw, 18px)', color: paperColor }}>{card.label}</p>
              <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: '15px', color: 'rgba(245,242,235,0.85)' }}>{card.tagline}</p>
            </div>
            <span style={{
              position: 'absolute', left: '50%', bottom: '60px', transform: 'translateX(-50%)',
              padding: '10px 40px', borderRadius: '999px', background: inkColor, color: paperColor,
              fontFamily: "'Inter', sans-serif", fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
            }}>
              Shop {card.label}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
