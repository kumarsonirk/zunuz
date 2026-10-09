import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function StyleReelsSection({
  title = 'Style it your way.',
  subtitle = 'See how Zunuz pieces come together with every look.',
  reels = [],
  sectionRef,
  reelVideoRefs,
  rowRef,
  playingStyleReel = null,
  setPlayingStyleReel,
  paperColor = '#F5F2EB',
  fadeClass = 'nw-fade-el',
}) {
  return (
    <section ref={sectionRef} style={{ padding: '50px 0 clamp(60px, 10vw, 100px)', boxSizing: 'border-box' }}>
      {title && (
        <h2 className={fadeClass} style={{
          fontFamily: "'Inter', sans-serif", margin: '0 0 20px', padding: '0 clamp(20px, 6vw, 80px)',
          fontWeight: 700, fontSize: 'clamp(24px, 3.6vw, 34px)', maxWidth: '520px',
        }}>
          {title} {subtitle}
        </h2>
      )}
      <div ref={rowRef} style={{
        display: 'flex', gap: '16px', overflowX: 'auto', scrollSnapType: 'x mandatory',
        padding: '0 clamp(20px, 6vw, 80px) 12px', scrollPaddingLeft: 'clamp(20px, 6vw, 80px)',
        WebkitOverflowScrolling: 'touch',
      }}>
        {reels.map((item, i) => (
          <div
            key={item.caption || i}
            style={{
              position: 'relative', flex: '0 0 clamp(200px, calc(100vw - 80px), 300px)', aspectRatio: '9 / 16',
              scrollSnapAlign: 'start', overflow: 'hidden', borderRadius: '10px', background: '#000',
              cursor: 'pointer',
            }}
            onClick={() => setPlayingStyleReel && setPlayingStyleReel(playingStyleReel === i ? null : i)}
          >
            <video
              ref={(el) => {
                if (reelVideoRefs) {
                  if (typeof reelVideoRefs === 'function') reelVideoRefs(el, i);
                  else if (reelVideoRefs.current) reelVideoRefs.current[i] = el;
                }
              }}
              src={item.video}
              poster={item.poster}
              autoPlay
              muted={playingStyleReel !== i}
              loop
              playsInline
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 40%)' }} />
            <div style={{
              position: 'absolute', top: '12px', right: '12px',
              width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(17,17,16,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {playingStyleReel === i
                ? <Volume2 size={14} color={paperColor} />
                : <VolumeX size={14} color={paperColor} />}
            </div>
            <p style={{
              position: 'absolute', left: '14px', bottom: '14px', margin: 0,
              fontFamily: "'Inter', sans-serif", fontStyle: 'italic', fontSize: '15px', color: paperColor,
            }}>
              {item.caption}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
