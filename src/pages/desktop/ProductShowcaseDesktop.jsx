import React, { useState, useRef, useEffect } from 'react';
import { productData } from '../../data/productData';
import Price from '../../components/Price';
import Seo from '../../components/Seo';

// Arc carousel geometry — every card is the same size; only its angle (and, as a
// consequence of pivoting from a point below the frame, its vertical position)
// changes with distance from the active card. Matches the reference "arc
// carousel" pattern: a row of equal cards fanned along one shared arc, the
// active one sitting upright at the peak, the rest drooping down on either side.
const CONTAINER_HEIGHT = 480;
const CARD_WIDTH = 190;
const CARD_HEIGHT = 260;
const ANGLE_STEP = 16;       // degrees between each card, away from center
const FAN_RADIUS = 560;      // distance from the pivot point to every card
const PIVOT_BELOW = 400;     // how far below the container the pivot sits — together
                              // with FAN_RADIUS, everything past roughly ±45° already
                              // falls below the container's bottom edge on its own, so
                              // cards conceptually sit on a full 360° circle and the
                              // container's overflow:hidden is what limits what's ever
                              // visible to that top slice — no separate cutoff needed to
                              // hide the "back" of the circle.
const FADE_STEP = 0.16;      // opacity lost per step away from the active card
const MIN_FADE_OPACITY = 0.3;
const RENDER_LIMIT_OFFSET = 10; // pure DOM-node safety cap for very long catalogs —
                                 // not a visual boundary; real cards stop rendering
                                 // this far out regardless of whether they'd still be
                                 // (barely) visible, since they'd be almost fully faded
                                 // and off-frame by then anyway.
const AUTO_ADVANCE_MS = 4500;
const WHEEL_COOLDOWN_MS = 500; // ignore further wheel ticks briefly after one advances the carousel

export default function ProductShowcaseDesktop({
  selectedCategory,
  productMap,
  onSelectProduct,
  activeTab,
  setActiveTab,
  subcategories = [],
  productsLoaded = false
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const pausedRef = useRef(false);
  const wheelLockRef = useRef(false);

  const isLoadingProducts = !productMap && !productsLoaded;
  const activeData = productMap || (productsLoaded ? productData : null);
  const currentCollection = (selectedCategory && activeData) ? activeData[selectedCategory.id] : null;
  const productsList = currentCollection ? currentCollection[activeTab] || [] : [];
  const n = productsList.length;

  useEffect(() => { setActiveIndex(0); }, [selectedCategory?.id, activeTab]);

  // Loop carousel: advances forever, wrapping back to 0 after the last card.
  // Pauses while the cursor is over it so a manual click/scroll doesn't fight it.
  useEffect(() => {
    if (n <= 1) return;
    const id = setInterval(() => {
      if (!pausedRef.current) setActiveIndex(i => (i + 1) % n);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [n]);

  const tabs = subcategories.length > 0
    ? subcategories.map(s => ({ id: s.slug, label: s.name }))
    : [
        { id: 'necklaces', label: 'Necklaces' },
        { id: 'earrings', label: 'Earrings' },
        { id: 'bracelets', label: 'Bracelets' }
      ];

  const offsetOf = (i) => {
    let d = i - activeIndex;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  };

  // Scroll to step through the carousel one card at a time, same direction as
  // the wheel — a short cooldown stops one physical scroll gesture (which fires
  // many wheel events) from racing through several cards at once.
  const handleWheel = (e) => {
    if (n <= 1 || wheelLockRef.current) return;
    e.preventDefault();
    const dir = e.deltaY > 0 ? 1 : -1;
    setActiveIndex(i => ((i + dir) % n + n) % n);
    wheelLockRef.current = true;
    setTimeout(() => { wheelLockRef.current = false; }, WHEEL_COOLDOWN_MS);
  };

  return (
    <>
      <Seo title={selectedCategory?.title ? `${selectedCategory.title} Collection` : 'Shop'} description={selectedCategory?.subtitle} path="/products" />

      {/* Hero */}
      <section
        className="w-full flex flex-col items-center text-center animate-details-content-slide-up"
        style={{ padding: '72px 64px 32px' }}
      >
        <h1
          className="text-[#F5F2EB] font-qrokinex font-bold tracking-wide"
          style={{ fontFamily: "'Qrokinex', 'Syncopate', sans-serif", fontSize: 'clamp(36px, 4.5vw, 60px)', lineHeight: 1.1, maxWidth: '820px' }}
        >
          {currentCollection?.title || selectedCategory?.title}
        </h1>
        {selectedCategory?.subtitle && (
          <p
            className="text-[#F5F2EB]/65"
            style={{ fontFamily: "'Grift', sans-serif", fontSize: '15px', marginTop: '18px', maxWidth: '520px', lineHeight: 1.6 }}
          >
            {selectedCategory.subtitle}
          </p>
        )}
      </section>

      {/* Subcategory tabs */}
      <div className="w-full flex justify-center" style={{ gap: '48px', paddingBottom: '32px' }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative ${isActive ? '' : 'tab-btn-inactive'}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', position: 'relative' }}
            >
              <span style={{ fontFamily: "'Grift', sans-serif", fontSize: '15px', letterSpacing: '0.05em', color: isActive ? '#F5F2EB' : 'rgba(245,242,235,0.6)', fontWeight: isActive ? 600 : 400 }}>
                {tab.label}
              </span>
              {isActive && <div className="absolute -bottom-2 left-0 right-0 h-[2px]" style={{ background: '#F5F2EB' }} />}
            </button>
          );
        })}
      </div>

      {/* Arc carousel — every card pivots off one shared point below the frame
          (rotating that pivot swings the card along the arc, same technique as a
          hand fan); the active card lands at angle 0, upright and highest, the
          rest droop down and outward symmetrically the further they are from it. */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: `${CONTAINER_HEIGHT}px` }}
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
        onWheel={handleWheel}
      >
        {isLoadingProducts ? (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm" style={{ fontFamily: "'Grift', sans-serif" }}>Loading...</div>
        ) : n === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm" style={{ fontFamily: "'Grift', sans-serif" }}>Coming soon.</div>
        ) : (
          productsList.map((product, i) => {
            const offset = offsetOf(i);
            const abs = Math.abs(offset);
            if (abs > RENDER_LIMIT_OFFSET) return null;
            const isActive = offset === 0;
            const angle = offset * ANGLE_STEP;
            // Center card highlighted at full opacity; every other card fades a
            // little more the further it sits from center, down to a floor so
            // distant-but-still-visible cards don't vanish abruptly.
            const fade = isActive ? 1 : Math.max(MIN_FADE_OPACITY, 1 - abs * FADE_STEP);

            return (
              <div
                key={product.id}
                className="desktop-fan-pivot absolute"
                style={{
                  left: '50%',
                  bottom: `-${PIVOT_BELOW}px`,
                  width: 0,
                  height: 0,
                  zIndex: 100 - abs,
                  opacity: fade,
                  transform: `rotate(${angle}deg)`,
                }}
              >
                <div
                  onClick={() => (isActive ? onSelectProduct(product) : setActiveIndex(i))}
                  className="absolute cursor-pointer overflow-hidden rounded-2xl"
                  style={{
                    left: '50%',
                    bottom: `${FAN_RADIUS}px`,
                    width: `${CARD_WIDTH}px`,
                    height: `${CARD_HEIGHT}px`,
                    transform: 'translateX(-50%)',
                    boxShadow: isActive ? '0 25px 50px rgba(0,0,0,0.5)' : '0 14px 28px rgba(0,0,0,0.4)',
                  }}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    draggable="false"
                  />
                  {product.stock != null && product.stock <= 2 && (
                    <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10, background: product.stock === 0 ? 'rgba(113,113,122,0.85)' : 'rgba(239,68,68,0.85)', borderRadius: '20px', padding: '3px 9px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: '#fff', fontFamily: "'Grift', sans-serif" }}>
                        {product.stock === 0 ? 'Out of Stock' : product.stock === 1 ? 'Last piece!' : `Only ${product.stock} left!`}
                      </span>
                    </div>
                  )}
                  <div
                    className="absolute bottom-0 left-0 right-0"
                    style={{ padding: '24px 14px 14px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0))' }}
                  >
                    <div className="flex justify-between items-center">
                      <span style={{ fontFamily: "'Grift', sans-serif", fontSize: '13px', color: '#F5F2EB', fontWeight: 500 }}>{product.name}</span>
                      <span style={{ fontFamily: "'Grift', sans-serif", fontSize: '13px', color: '#F5F2EB', fontWeight: 500 }}><Price value={product.price} /></span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
