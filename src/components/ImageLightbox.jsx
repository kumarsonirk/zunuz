import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

// Full-screen image viewer: pinch-to-zoom, double-tap to zoom, pan while
// zoomed, hover-to-magnify on desktop, and swipe left/right between images
// while at 1x zoom.
export default function ImageLightbox({ images, initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const imgRef = useRef(null);

  // Desktop hover-magnifier: entering the image's box engages a fixed zoom
  // level, moving within it slides the transform-origin to track the cursor
  // (so the zoomed region follows the pointer), leaving disengages. Only
  // "transform" is transitioned so the enter/leave zoom animates smoothly
  // while the origin itself snaps instantly as the cursor moves (no laggy
  // follow).
  const HOVER_ZOOM = 2.4;
  const [hoverActive, setHoverActive] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  const pinchRef = useRef({ startDist: 0, startScale: 1 });
  const panRef = useRef({ startX: 0, startY: 0, startTranslate: { x: 0, y: 0 } });
  const swipeRef = useRef({ startX: 0 });
  const lastTapRef = useRef(0);
  // True while a pinch/pan touch gesture is actively moving, so that
  // interaction can track the finger 1:1 instead of animating behind it.
  const touchActiveRef = useRef(false);

  const clampScale = (s) => Math.min(4, Math.max(1, s));
  const resetZoom = () => { setScale(1); setTranslate({ x: 0, y: 0 }); };

  useEffect(() => { resetZoom(); }, [index]);

  // Lock page scroll while the lightbox is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && images.length > 1) setIndex(i => (i + 1) % images.length);
      if (e.key === 'ArrowLeft' && images.length > 1) setIndex(i => (i - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [images.length, onClose]);

  const touchDistance = (touches) => {
    const [a, b] = touches;
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinchRef.current.startDist = touchDistance(e.touches);
      pinchRef.current.startScale = scale;
      return;
    }
    if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        lastTapRef.current = 0;
        if (scale > 1) resetZoom(); else setScale(2.5);
        return;
      }
      lastTapRef.current = now;

      if (scale > 1) {
        panRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, startTranslate: { ...translate } };
      } else {
        swipeRef.current.startX = e.touches[0].clientX;
      }
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      touchActiveRef.current = true;
      const dist = touchDistance(e.touches);
      if (pinchRef.current.startDist > 0) {
        setScale(clampScale(pinchRef.current.startScale * (dist / pinchRef.current.startDist)));
      }
      return;
    }
    if (e.touches.length === 1 && scale > 1) {
      e.preventDefault();
      touchActiveRef.current = true;
      const dx = e.touches[0].clientX - panRef.current.startX;
      const dy = e.touches[0].clientY - panRef.current.startY;
      setTranslate({ x: panRef.current.startTranslate.x + dx, y: panRef.current.startTranslate.y + dy });
    }
  };

  const handleTouchEnd = (e) => {
    touchActiveRef.current = false;
    if (scale <= 1 && e.changedTouches.length === 1) {
      const dx = e.changedTouches[0].clientX - swipeRef.current.startX;
      if (Math.abs(dx) > 50 && images.length > 1) {
        setIndex(i => dx < 0 ? (i + 1) % images.length : (i - 1 + images.length) % images.length);
      }
    }
    if (scale < 1.05) resetZoom();
  };

  const rafRef = useRef(null);
  const latestPosRef = useRef({ x: 50, y: 50 });
  // The image's own on-screen box grows the moment it's scaled up for the
  // magnifier, which — if hit-tested live — creates a feedback loop right at
  // the boundary (enlarging box re-triggers "still inside", shrinking box
  // re-triggers "left" mid-transition, so the zoom flickers/stutters as the
  // cursor crosses the edge). Instead we freeze the image's rest-state (1x)
  // rect the moment hovering begins and test the cursor against that fixed
  // box for the whole hover session, so the hoverable area never moves.
  const restRectRef = useRef(null);

  const disengageHover = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setHoverActive(false);
    setOrigin({ x: 50, y: 50 });
  };

  const handleMouseLeaveContainer = () => disengageHover();

  // Attached to the stable, never-transformed outer container (not the image
  // itself) so hit-testing always happens against fixed geometry.
  const handleMouseMoveContainer = (e) => {
    if (!hoverActive) {
      if (!imgRef.current) return;
      restRectRef.current = imgRef.current.getBoundingClientRect();
    }
    const rect = restRectRef.current;
    if (!rect || rect.width === 0 || rect.height === 0) return;

    const inside = e.clientX >= rect.left && e.clientX <= rect.right
      && e.clientY >= rect.top && e.clientY <= rect.bottom;

    if (!inside) {
      if (hoverActive) disengageHover();
      return;
    }

    if (!hoverActive) setHoverActive(true);

    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    latestPosRef.current = { x, y };

    // Raw mousemove can fire far more often than the screen refreshes, so
    // setState-ing on every event causes visible lag/jank. Batch to at most
    // one update per animation frame, always using the latest position.
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setOrigin(latestPosRef.current);
    });
  };

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.94)', zIndex: 200 }}
      onClick={(e) => { if (e.target === e.currentTarget && scale <= 1) onClose(); }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 1, width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <X size={20} color="#F5F2EB" />
      </button>

      {images.length > 1 && (
        <div style={{ position: 'absolute', bottom: '24px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '8px', zIndex: 1 }}>
          {images.map((_, i) => (
            <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === index ? '#F5F2EB' : 'rgba(255,255,255,0.3)' }} />
          ))}
        </div>
      )}

      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        style={{ touchAction: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseMove={handleMouseMoveContainer}
        onMouseLeave={handleMouseLeaveContainer}
      >
        <img
          ref={imgRef}
          src={images[index]}
          alt=""
          draggable="false"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            transform: `translate3d(${hoverActive ? 0 : translate.x}px, ${hoverActive ? 0 : translate.y}px, 0) scale(${hoverActive ? HOVER_ZOOM : scale})`,
            transformOrigin: hoverActive ? `${origin.x}% ${origin.y}%` : 'center center',
            transition: touchActiveRef.current ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: hoverActive ? 'zoom-in' : scale > 1 ? 'grab' : 'zoom-in',
            willChange: 'transform',
          }}
        />
      </div>
    </div>
  );
}
