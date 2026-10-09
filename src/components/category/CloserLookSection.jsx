import React from 'react';
import { Play } from 'lucide-react';

export default function CloserLookSection({
  title = 'Get a closer look.',
  subtitle = 'Discover the details that make every piece special.',
  videoSrc = '/reel1.mp4',
  sectionRef,
  videoRef,
  videoPlaying = false,
  onTogglePlay,
  paperColor = '#F5F2EB',
  fadeClass = 'nw-fade-el',
}) {
  return (
    <section ref={sectionRef} style={{ padding: 'clamp(0px, 10vw, 100px) clamp(0px, 6vw, 80px)', boxSizing: 'border-box' }}>
      <h2 className={fadeClass} style={{ fontFamily: "'Inter', sans-serif", margin: '0 0 5px', fontWeight: 700, fontSize: 'clamp(28px, 3.6vw, 34px)' }}>
        {title}
      </h2>
      {subtitle && (
        <p className={fadeClass} style={{ fontFamily: "'Inter', sans-serif", margin: '0 0 28px', maxWidth: '520px', fontSize: '18px', color: 'rgba(17,17,16,0.7)' }}>
          {subtitle}
        </p>
      )}
      <div
        className={fadeClass}
        onClick={onTogglePlay}
        data-cursor-hover
        style={{
          position: 'relative', width: '100%', maxWidth: '520px', height: 'clamp(500px, 42vw, 440px)',
          overflow: 'hidden', borderRadius: '10px', background: '#000', cursor: 'pointer',
        }}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          muted={!videoPlaying}
          loop
          playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {!videoPlaying && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }} />}
        <div style={{
          position: 'absolute', left: '18px', bottom: '18px', display: 'inline-flex', alignItems: 'center', gap: '10px',
          padding: '10px 18px', borderRadius: '999px', background: 'rgba(17,17,16,0.55)', backdropFilter: 'blur(6px)',
        }}>
          <Play size={14} color={paperColor} fill={paperColor} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: paperColor }}>Watch the video</span>
        </div>
      </div>
    </section>
  );
}
