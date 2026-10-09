import React from 'react';

export default function FeatureRowsSection({
  heading = 'Stay stylish. Stay relaxed. Sweatproof, waterproof, and comfortable enough for all day.',
  items = [],
  featureRefs,
  headingRef,
  imgClass = 'nw-feature-image',
  textClass = 'nw-feature-text',
}) {
  return (
    <>
      {heading && (
        <section style={{ padding: '0 clamp(20px, 6vw, 80px) clamp(40px, 6vw, 60px)', boxSizing: 'border-box' }}>
          <h2 ref={headingRef} style={{ fontFamily: "'Inter', sans-serif", margin: 0, fontWeight: 700, fontSize: 'clamp(24px, 3.6vw, 34px)', maxWidth: '640px' }}>
            {heading}
          </h2>
        </section>
      )}
      <section style={{ padding: '0 0 clamp(60px, 10vw, 100px)', boxSizing: 'border-box' }}>
        {items.map((item, i) => (
          <div
            key={item.title || i}
            ref={(el) => {
              if (featureRefs) {
                if (typeof featureRefs === 'function') featureRefs(el, i);
                else if (featureRefs.current) featureRefs.current[i] = el;
              }
            }}
            style={{ marginBottom: i === items.length - 1 ? 0 : 'clamp(36px, 6vw, 60px)' }}
          >
            <div style={{ width: '100%', aspectRatio: '4 / 5', overflow: 'hidden', position: 'relative' }}>
              <img className={imgClass} src={item.image} alt={item.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ padding: '20px clamp(20px, 6vw, 80px) 0' }}>
              <h3 className={textClass} style={{ fontFamily: "'Inter', sans-serif", margin: '0 0 14px', fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 600 }}>{item.title}</h3>
              <p className={textClass} style={{ fontFamily: "'Inter', sans-serif", margin: 0, maxWidth: '400px', fontSize: '15px', lineHeight: 1.7, color: 'rgba(17,17,16,0.7)' }}>{item.copy}</p>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
