import React from 'react';
import { Play } from 'lucide-react';

export default function MoreCategoryTilesSection({
  title = 'More from Zunuz.',
  subtitle = "Take a look at what's next.",
  items = [],
  moreTileRefs,
  sectionRef,
  inkColor = '#1F2024',
  paperColor = '#F5F2EB',
  imgClass = 'nw-more-image',
}) {
  return (
    <section ref={sectionRef} style={{ padding: 'clamp(30px, 7vw, 64px) 0 clamp(70px, 11vw, 120px)', boxSizing: 'border-box' }}>
      {title && (
        <h2 style={{ fontFamily: "'Inter', sans-serif", margin: '0 0 5px', padding: '0 clamp(20px, 6vw, 80px)', fontWeight: 700, fontSize: 'clamp(24px, 3.6vw, 34px)' }}>
          {title}
        </h2>
      )}
      {subtitle && (
        <p style={{ fontFamily: "'Inter', sans-serif", margin: '0 0 24px', padding: '0 clamp(20px, 6vw, 80px)', fontSize: '24px', color: 'rgba(17,17,16,0.65)' }}>
          {subtitle}
        </p>
      )}
      <div style={{
        display: 'flex', gap: '12px', overflowX: 'auto', scrollSnapType: 'x mandatory',
        padding: '0 clamp(20px, 6vw, 80px) 12px', scrollPaddingLeft: 'clamp(20px, 6vw, 80px)',
        WebkitOverflowScrolling: 'touch',
      }}>
        {items.map((item, i) => (
          <a
            key={item.label || i}
            href={item.href || '/products'}
            data-cursor-hover
            ref={(el) => {
              if (moreTileRefs) {
                if (typeof moreTileRefs === 'function') moreTileRefs(el, i);
                else if (moreTileRefs.current) moreTileRefs.current[i] = el;
              }
            }}
            style={{
              position: 'relative', flex: '0 0 280px', width: '280px', height: '500px',
              scrollSnapAlign: 'start', overflow: 'hidden', borderRadius: '6px', textDecoration: 'none',
            }}
          >
            <img className={imgClass} src={item.image} alt={item.label || ''} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(17,17,16,0.5) 0%, rgba(17,17,16,0) 40%, rgba(17,17,16,0.1) 100%)' }} />
            <Play
              size={30}
              color={paperColor}
              fill={paperColor}
              style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.85 }}
            />
            <p style={{
              position: 'absolute', left: 0, right: 0, bottom: '70px', margin: 0, textAlign: 'center',
              fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 'clamp(26px, 3vw, 32px)', color: paperColor,
            }}>
              {item.label}
            </p>
            <span style={{
              position: 'absolute', left: '50%', bottom: '22px', transform: 'translateX(-50%)',
              padding: '10px 32px', borderRadius: '999px', background: inkColor, color: paperColor,
              fontFamily: "'Inter', sans-serif", fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap',
            }}>
              explore
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
