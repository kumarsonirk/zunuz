import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { productData } from '../data/productData'; // fallback when API not loaded
import zr from '../utils/audio';

function CardImage({ src, alt, style }) {
  const checkCached = (url) => {
    try {
      const img = new Image();
      img.src = url;
      return img.complete;
    } catch {
      return false;
    }
  };

  const [loaded, setLoaded] = useState(() => checkCached(src));
  const [prevSrc, setPrevSrc] = useState(src);

  if (src !== prevSrc) {
    setPrevSrc(src);
    setLoaded(checkCached(src));
  }

  const imgRef = useRef(null);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      decoding="sync"
      onLoad={() => setLoaded(true)}
      className="absolute object-contain pointer-events-none"
      draggable="false"
      style={{
        ...style,
        opacity: loaded ? 1 : 0,
        transition: 'opacity 0.25s ease-out'
      }}
    />
  );
}

export default function ProductPage({
  selectedCategory,
  productMap,
  onAddToCart,
  onSelectProduct,
  activeTab,
  setActiveTab,
  cartItems = [],
  onBuyNow,
  subcategories = [],
  productsLoaded = false
}) {
  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [pos, setPos] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const isSwipeDirectionChecked = useRef(false);
  const isHorizontalSwipe = useRef(false);
  const animationRef = useRef(null);

  // Reset tab, index, and pos when the category or tab changes
  useEffect(() => {
    setActiveProductIndex(0);
    setPos(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [selectedCategory, activeTab]);

  // Don't fall back to the hardcoded mock data while the real fetch is still in
  // flight — that would flash stale names/prices/stock before the real ones load.
  // Mock data is only used as a genuine offline/API-down fallback, once loading
  // has actually finished without producing real data.
  const isLoadingProducts = !productMap && !productsLoaded;
  const activeData = productMap || (productsLoaded ? productData : null);
  const currentCollection = (selectedCategory && activeData) ? activeData[selectedCategory.id] : null;
  const productsList = currentCollection ? currentCollection[activeTab] || [] : [];
  const n = productsList.length;
  const activeProduct = productsList[activeProductIndex];
  const navigate = useNavigate();
  const isInCart = activeProduct ? cartItems.some(item => item.id === activeProduct.id) : false;

  const handleAddClick = () => {
    if (activeProduct && isInCart) {
      navigate('/cart');
      zr.playConfirm();
      return;
    }
    if (isAdding || !activeProduct) return;
    setIsAdding(true);
    onAddToCart(activeProduct);
    setTimeout(() => {
      setIsAdding(false);
    }, 3000);
  };

  const getWrappedIndex = (index, total) => {
    if (total <= 0) return 0;
    return ((Math.round(index) % total) + total) % total;
  };

  const animateTo = (target) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const start = pos;
    const startTime = performance.now();
    const duration = 250; // Snappy 250ms snapping transition

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentPos = start + (target - start) * ease;

      setPos(currentPos);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        const finalWrappedIndex = getWrappedIndex(target, n);
        setActiveProductIndex(finalWrappedIndex);
        setPos(finalWrappedIndex);
      }
    };
    animationRef.current = requestAnimationFrame(step);
  };

  const handlePointerDown = (e) => {
    if (n <= 1) return;

    // Ignore pointer down if triggered on buttons or links
    if (e.target.closest('button') || e.target.closest('a')) {
      return;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Instantly snap to the nearest integer index to complete any pending transition
    const nearestIndex = getWrappedIndex(pos, n);
    setActiveProductIndex(nearestIndex);
    setPos(nearestIndex);

    startX.current = e.clientX;
    startY.current = e.clientY;
    dragStartPos.current = nearestIndex;
    setIsDragging(true);
    isSwipeDirectionChecked.current = false;
    isHorizontalSwipe.current = false;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      console.error("Pointer capture failed", err);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;

    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (!isSwipeDirectionChecked.current) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx > 10 || absDy > 10) {
        if (absDx > absDy) {
          isHorizontalSwipe.current = true;
        } else {
          // Vertical swipe: let the page scroll and snap back
          setIsDragging(false);
          animateTo(Math.round(pos));
        }
        isSwipeDirectionChecked.current = true;
      }
      return;
    }

    if (isHorizontalSwipe.current) {
      e.preventDefault();
      // Swipe scaling: cardWidth + gap (~316px) is a good reference
      const newPos = dragStartPos.current - dx / 300;
      setPos(newPos);
    }
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    setIsDragging(false);

    const dx = e.clientX - startX.current;
    const absDx = Math.abs(dx);

    // Tap detection: small drag delta treated as a card click to view details
    if (absDx < 8) {
      const activeProduct = productsList[activeProductIndex];
      if (activeProduct) {
        const rect = e.currentTarget.getBoundingClientRect();
        const imgEl = e.currentTarget.querySelector('img');
        let imgWidth = rect.width;
        let imgHeight = rect.width;
        let imgTop = rect.top + (rect.height - imgHeight) / 2;
        let imgLeft = rect.left;

        if (imgEl) {
          const imgRect = imgEl.getBoundingClientRect();
          imgWidth = imgRect.width;
          imgHeight = imgRect.height;
          imgTop = imgRect.top;
          imgLeft = imgRect.left;
        }

        onSelectProduct(activeProduct, {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          imgWidth,
          imgHeight,
          imgTop,
          imgLeft,
          activeTab
        });
      }
      zr.playTick();
      return;
    }

    if (isHorizontalSwipe.current) {
      // Responsive flick snapping with a low 55px threshold
      let target;
      if (dx < -55) {
        target = Math.floor(dragStartPos.current) + 1;
      } else if (dx > 55) {
        target = Math.floor(dragStartPos.current) - 1;
      } else {
        target = Math.round(dragStartPos.current);
      }
      animateTo(target);
    }
  };

  const handleDotClick = (dotIdx) => {
    let d = dotIdx - activeProductIndex;
    if (n > 1) {
      const halfN = n / 2;
      let wrapped = d % n;
      if (wrapped > halfN) {
        wrapped -= n;
      } else if (wrapped < -halfN) {
        wrapped += n;
      }
      d = wrapped;
    }
    const target = activeProductIndex + d;
    animateTo(target);
  };

  // Compute swipe interpolation value t relative to the active card index
  const t = pos - activeProductIndex;

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative bg-[#1F2024]">
      {/* Category Tab Selector Bar */}
      <div className="flex w-full border-b border-zinc-900 sticky top-0 z-40 select-none bg-[#1F2024]" style={{ backgroundColor: '#1F2024', borderBottom: '1px solid rgba(24, 24, 27, 0.6)' }}>
        {(subcategories.length > 0
          ? subcategories.map(s => ({ id: s.slug, label: s.name }))
          : [
              { id: "necklaces", label: "Necklaces" },
              { id: "earrings", label: "Earrings" },
              { id: "bracelets", label: "Bracelets" }
            ]
        ).map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                zr.playConfirm();
              }}
              className={`flex-1 text-center py-4 text-md font-grift tracking-wider relative transition-colors duration-300 ${isActive ? 'tab-btn-active' : 'tab-btn-inactive'}`}
            >
              <span className={isActive ? "text-white font-medium" : "text-[#71717A] font-normal"} style={{ color: isActive ? '#f5f5f7' : '#71717a', fontFamily: "'Grift', sans-serif" }}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#f5f5f7] transition-all" style={{ height: '2px', backgroundColor: '#f5f5f7' }} />
              )}
            </button>
          );
        })}
      </div>

      <div className="px-6 pt-3 pb-1 flex justify-between items-end select-none">
        <h2 className="text-[24px] font-grift font-light text-[#F5F2EB] tracking-wide leading-tight" style={{ color: '#f5f2eb', fontFamily: "'Grift', sans-serif" }}>
          {currentCollection?.title}
        </h2>
      </div>

      {/* Product Card Stack Area */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 pb-2 relative overflow-hidden select-none" style={{ minHeight: 0 }}>
        {isLoadingProducts ? (
          <div className="text-zinc-500 text-xs tracking-wider font-grift" style={{ fontFamily: "'Grift', sans-serif" }}>Loading...</div>
        ) : n === 0 ? (
          <div className="text-zinc-500 text-xs tracking-wider font-grift" style={{ fontFamily: "'Grift', sans-serif" }}>No items in this category yet.</div>
        ) : (
          <div
            key={activeTab}
            className="relative w-full max-w-[390px] animate-card-fade-in"
            style={{ width: '100%', maxWidth: '390px', height: 'min(calc((100vw - 32px) * 1.45), calc(100% - 16px), 500px)' }}
          >
            {/* Fake Stacked Card Layers behind the active card */}
            {n > 1 && (
              <>
                {/* Layer 2 (Bottom-most) */}
                <div
                  className="absolute border shadow-sm pointer-events-none transition-all duration-300"
                  style={{
                    backgroundColor: '#fef5e7',
                    border: '1px solid #e4e4e7',
                    borderBottomLeftRadius: '32px',
                    borderBottomRightRadius: '32px',
                    left: '16px',
                    right: '16px',
                    bottom: '-16px',
                    height: '60px',
                    zIndex: 800,
                    opacity: 0.4
                  }}
                />
                {/* Layer 1 (Middle) */}
                <div
                  className="absolute border shadow-md pointer-events-none transition-all duration-300"
                  style={{
                    backgroundColor: '#fef5e7',
                    border: '1px solid #e4e4e7',
                    borderBottomLeftRadius: '32px',
                    borderBottomRightRadius: '32px',
                    left: '8px',
                    right: '8px',
                    bottom: '-8px',
                    height: '60px',
                    zIndex: 810,
                    opacity: 0.75
                  }}
                />
              </>
            )}

            {productsList.map((product, idx) => {
              // Calculate index pointers relative to active card
              const nextIdx = (activeProductIndex + 1) % n;
              const prevIdx = (activeProductIndex - 1 + n) % n;

              let transform = '';
              let opacity = 0;
              let zIndex = 900;
              let blur = 0;

              // Clamp t to [-1, 1] to prevent scaling up past 1.0 on long swipes
              const clampedT = Math.max(-1, Math.min(1, t));

              if (n === 1) {
                const tx = isDragging ? clampedT * -120 : 0;
                transform = `translate3d(${tx}px, 0, 0) scale(1)`;
                opacity = 1;
                zIndex = 1000;
                blur = 0;
              } else if (idx === activeProductIndex) {
                // Active Card: Fully solid (opacity 1) all the time to prevent bleed-through
                const tx = -clampedT * (300 + 16);
                const rot = -clampedT * 30; // 30 degrees tilt at full swipe
                transform = `translate3d(${tx}px, 0, 0) rotate(${rot}deg) scale(1)`;
                opacity = 1;
                zIndex = 1005;
                blur = 0;
              } else if (idx === nextIdx && clampedT > 0) {
                // Next Card (scaling up and sliding up) as we swipe left
                const scale = 0.955 + 0.045 * clampedT;
                const ty = (1 - clampedT) * 18;
                transform = `translate3d(0, ${ty}px, 0) scale(${scale})`;
                // Fades in extremely quickly at the very beginning of the swipe
                opacity = Math.min(1, clampedT * 8);
                zIndex = 1000;
                blur = 1.0 * (1 - clampedT);
              } else if (idx === prevIdx && clampedT < 0) {
                // Previous Card (scaling up and sliding up) as we swipe right
                const absT = Math.abs(clampedT);
                const scale = 0.955 + 0.045 * absT;
                const ty = (1 - absT) * 18;
                transform = `translate3d(0, ${ty}px, 0) scale(${scale})`;
                // Fades in extremely quickly at the very beginning of the swipe
                opacity = Math.min(1, absT * 8);
                zIndex = 1000;
                blur = 1.0 * (1 - absT);
              } else {
                // Hidden cards resting at the bottom of the stack
                // We keep them rendered but completely transparent so they don't peek out
                if (idx === nextIdx && clampedT === 0) {
                  transform = `translate3d(0, 18px, 0) scale(0.955)`;
                  opacity = 0;
                  zIndex = 1000;
                  blur = 2.0;
                } else {
                  transform = `translate3d(0, 36px, 0) scale(0.91)`;
                  opacity = 0;
                  zIndex = 990;
                  blur = 4.0;
                }
              }

              // Determine if this card is currently in active transition
              const isTransitioning = idx === activeProductIndex || (idx === nextIdx && clampedT > 0) || (idx === prevIdx && clampedT < 0);
              const transition = isDragging || !isTransitioning
                ? 'none'
                : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s, filter 0.4s';

              return (
                <div
                  key={product.id}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="absolute inset-0 p-1 shadow-2xl flex flex-col justify-between items-center cursor-grab active:cursor-grabbing select-none rounded-[32px] border border-zinc-200"
                  style={{
                    backgroundColor: '#fef5e7',
                    borderRadius: '32px',
                    border: '1px solid #e4e4e7',
                    transform,
                    opacity,
                    zIndex,
                    filter: blur > 0 ? `blur(${blur}px)` : 'none',
                    transition,
                    touchAction: 'none',
                    overflow: 'hidden' // Clip the scaled image at card boundaries
                  }}
                >
                  {/* Full-width image flush against the top edge */}
                  <div style={{ position: 'absolute', top: '-20px', left: 0, right: 0, height: '100%', overflow: 'hidden' }}>
                    <CardImage
                      src={product.image}
                      alt={product.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        maxWidth: 'none',
                        maxHeight: 'none',
                        top: 0,
                        left: 0,
                        transform: 'none',
                      }}
                    />
                    {product.stock != null && product.stock <= 5 && (
                      <div style={{ position: 'absolute', top: '14px', left: '14px', zIndex: 10, display: 'inline-flex', alignItems: 'center', gap: '4px', background: product.stock === 0 ? 'rgba(113,113,122,0.12)' : product.stock <= 2 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${product.stock === 0 ? 'rgba(113,113,122,0.3)' : product.stock <= 2 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`, borderRadius: '20px', padding: '3px 10px' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: product.stock === 0 ? '#71717A' : product.stock <= 2 ? '#EF4444' : '#F59E0B', display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontSize: '10px', fontWeight: 600, color: product.stock === 0 ? '#71717A' : product.stock <= 2 ? '#EF4444' : '#F59E0B', fontFamily: "'Grift', sans-serif", letterSpacing: '0.04em' }}>
                          {product.stock === 0 ? 'Out of Stock' : product.stock === 1 ? 'Last piece!' : `Only ${product.stock} left!`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Area: Title+Tagline on the left / Price on the right, counter centered below */}
                  <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col gap-1.5 px-6 pb-5 pt-3">
                    <div className="flex justify-between items-end gap-3">
                      <div style={{ textAlign: 'left', minWidth: 0 }}>
                        <h3 className="text-[20px] sm:text-[24px] font-medium text-zinc-900 tracking-wide font-grift truncate" style={{ color: '#18181b', fontFamily: "'Grift', sans-serif" }}>
                          {product.name}
                        </h3>
                        {product.tagline && (
                          <p className="text-[12px] text-zinc-500 font-grift mt-0.5 truncate" style={{ color: '#71717a', fontFamily: "'Grift', sans-serif" }}>
                            {product.tagline}
                          </p>
                        )}
                      </div>
                      <div
                        className="text-[28px] sm:text-[28px] font-medium text-zinc-900 font-grift flex-shrink-0"
                        style={{
                          color: '#18181b',
                          fontFamily: "'Grift', sans-serif"
                        }}
                      >
                        {product.price}
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-grift text-center tracking-widest uppercase" style={{ color: '#a1a1aa', fontFamily: "'Grift', sans-serif" }}>
                      {idx + 1} Of {n}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Swipe/Tap helper hint */}
      <div className="text-[9px] font-grift tracking-wider text-zinc-500 text-center pt-1.5 pb-1 select-none uppercase" style={{ color: '#71717a', fontFamily: "'Grift', sans-serif" }}>
        Swipe cards horizontally or tap for product details
      </div>

      {/* Bottom Sticky Action Buttons */}
      <div className="px-6 pt-2 pb-4 flex select-none bg-[#1F2024]" style={{ backgroundColor: '#1F2024', gap: '18px' }}>
        <button
          onClick={() => {
            if (activeProduct && activeProduct.stock !== 0) onBuyNow(activeProduct);
          }}
          disabled={!activeProduct || activeProduct.stock === 0}
          className="flex-1 flex items-center justify-center rounded-[10px] font-medium text-base btn-buy-now"
          style={{ height: '58px', borderRadius: '10px', border: 'none', cursor: activeProduct?.stock === 0 ? 'not-allowed' : 'pointer', opacity: activeProduct?.stock === 0 ? 0.45 : 1 }}
        >
          {activeProduct?.stock === 0 ? 'Out of Stock' : 'Buy Now'}
        </button>
        <button
          onClick={handleAddClick}
          className={`flex-1 flex items-center justify-center rounded-[10px] font-medium text-base cursor-pointer btn-add-to-cart ${isAdding ? 'is-adding' : ''}`}
          style={{ height: '58px', borderRadius: '10px', border: 'none', gap: '12px' }}
        >
          {isAdding ? 'Added!' : isInCart ? 'Go to Cart' : 'Add To Cart'} <ShoppingCart size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
