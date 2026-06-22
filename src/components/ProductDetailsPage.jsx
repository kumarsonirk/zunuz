import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import { productData } from '../data/productData';
import zr from '../utils/audio';

export default function ProductDetailsPage({
  product,
  category,
  likedProducts,
  onLikeToggle,
  onAddToCart,
  onBack,
  onSelectProduct,
  isTransitioning,
  onMeasured
}) {
  const activeTab = product.id.includes('-n')
    ? 'necklaces'
    : product.id.includes('-e')
      ? 'earrings'
      : 'bracelets';

  const [isHearted, setIsHearted] = useState(likedProducts[product.id] || false);

  // Sync like/heart state when product changes
  useEffect(() => {
    setIsHearted(likedProducts[product.id] || false);
  }, [product, likedProducts]);

  const cardRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Reset scroll container position back to top when product changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [product]);

  useLayoutEffect(() => {
    if (cardRef.current && onMeasured) {
      onMeasured(cardRef.current.getBoundingClientRect());
    }
  }, [product, onMeasured]);

  // Setup variants for the carousel (use product.images if available, otherwise fallback)
  const carouselImages = product.images && product.images.length > 0
    ? product.images
    : [product.image, product.image, product.image];

  // We have exactly 3 slides. For infinite looping in both directions, we clone:
  // Slide 2 at the beginning, and Slide 0 at the end.
  // Rendered track: [Slide 2, Slide 0, Slide 1, Slide 2, Slide 0] (length 5)
  const trackImages = [carouselImages[2], carouselImages[0], carouselImages[1], carouselImages[2], carouselImages[0]];

  const [currentIndex, _setCurrentIndex] = useState(1); // Default to Slide 0 (canonical) at index 1
  const currentIndexRef = useRef(1);
  const setCurrentIndex = (val) => {
    currentIndexRef.current = val;
    _setCurrentIndex(val);
  };

  const [isTransitionEnabled, setIsTransitionEnabled] = useState(false);

  // Reset carousel index back to 1 when product changes
  useEffect(() => {
    setIsTransitionEnabled(false);
    setCurrentIndex(1);
  }, [product]);

  // Simple touch swipe implementation for product image carousel
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e) => {
    // Snap boundary index if we are currently at or beyond a cloned index
    if (currentIndexRef.current >= 4) {
      setIsTransitionEnabled(false);
      setCurrentIndex(1);
    } else if (currentIndexRef.current <= 0) {
      setIsTransitionEnabled(false);
      setCurrentIndex(3);
    }

    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(true);
    setIsTransitionEnabled(false); // Disable transition during drag
  };

  const handleTouchMove = (e) => {
    if (!isSwiping) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    touchDeltaX.current = dx;
    setSwipeOffset(dx);
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    const threshold = 60;
    
    let targetIndex = currentIndexRef.current;
    if (touchDeltaX.current < -threshold) {
      targetIndex = currentIndexRef.current + 1;
      zr.playTick();
    } else if (touchDeltaX.current > threshold) {
      targetIndex = currentIndexRef.current - 1;
      zr.playTick();
    }
    
    // Clamp targetIndex strictly within [0, 4] for absolute safety
    targetIndex = Math.max(0, Math.min(4, targetIndex));
    
    setIsTransitionEnabled(true);
    setCurrentIndex(targetIndex);
    setSwipeOffset(0);
    touchDeltaX.current = 0;
  };

  const handleTransitionEnd = () => {
    if (currentIndexRef.current === 4) {
      setIsTransitionEnabled(false);
      setCurrentIndex(1); // Jump back to Slide 0 (canonical)
    } else if (currentIndexRef.current === 0) {
      setIsTransitionEnabled(false);
      setCurrentIndex(3); // Jump forward to Slide 2 (canonical)
    }
  };

  // Derive canonicalIndex from currentIndex
  const canonicalIndex = (currentIndex - 1 + 3) % 3;

  // Get other items in the current active tab of the category for "Complete Your Look"
  const currentCollection = category ? productData[category.id] : null;
  // Get other items (filter out current product)
  const allTabProducts = currentCollection ? currentCollection[activeTab] || [] : [];
  const lookProducts = allTabProducts.filter(p => p.id !== product.id);

  // If lookProducts is empty, fallback to other categories in the same collection
  const fallbackProducts = [];
  if (lookProducts.length === 0 && currentCollection) {
    Object.keys(currentCollection).forEach(k => {
      if (k !== 'title' && k !== activeTab) {
        currentCollection[k].forEach(p => fallbackProducts.push({ ...p, activeTab: k }));
      }
    });
  }
  const sliderProducts = lookProducts.length > 0 ? lookProducts : fallbackProducts;

  const handleLikeClick = (e) => {
    e.stopPropagation();
    onLikeToggle(product.id);
    setIsHearted(!isHearted);
  };
  return (
    <div className="flex-1 flex flex-col bg-[#121315] text-[#F5F2EB] select-none overflow-hidden relative">
      {/* Category Tab Selector Bar (Fixed at top) */}
      <div className="flex w-full border-b border-zinc-900 bg-[#121315] flex-shrink-0" style={{ borderBottom: '1px solid rgba(24, 24, 27, 0.6)' }}>
        {[
          { id: "necklaces", label: "Necklaces" },
          { id: "earrings", label: "Earrings" },
          { id: "bracelets", label: "Bracelets" }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                zr.playConfirm();
                onBack(tab.id); // Go back and switch tab
              }}
              className={`flex-1 text-center py-4 text-sm font-grift tracking-wider relative transition-colors duration-300 ${isActive ? 'tab-btn-active' : 'tab-btn-inactive'}`}
            >
              <span className={isActive ? "text-white font-medium" : "text-[#71717A] font-normal"} style={{ color: isActive ? '#ffffff' : '#71717a', fontFamily: "'Grift', sans-serif" }}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white transition-all" style={{ height: '2px', backgroundColor: '#ffffff' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Scrollable Middle Container */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-none pb-6">

      {/* Title Header with Back Arrow */}
      <div className="px-6 pt-5 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              zr.playSplitOpen();
              onBack(activeTab);
            }}
            className="text-zinc-400 hover:text-white transition-colors p-1"
            aria-label="Go Back"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={22} />
          </button>
          <h2 className="text-[28px] font-grift font-light text-[#F5F2EB] tracking-wide" style={{ color: '#f5f2eb', fontFamily: "'Grift', sans-serif" }}>
            {currentCollection?.title || "Collection"}
          </h2>
        </div>
      </div>

      {/* Product Image Carousel Area */}
      <div
        ref={cardRef}
        className="relative mx-6 my-4 overflow-hidden bg-white flex-shrink-0 rounded-[32px] border border-zinc-200 shadow-2xl"
        style={{
          width: 'calc(100% - 48px)',
          height: '260px',
          opacity: isTransitioning ? 0 : 1,
          backgroundColor: '#ffffff'
        }}
      >
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTransitionEnd={handleTransitionEnd}
          className="flex h-full cursor-grab active:cursor-grabbing"
          style={{
            transform: `translate3d(calc(${-currentIndex * 20}% + ${swipeOffset}px), 0, 0)`,
            transition: isTransitionEnabled && !isSwiping ? 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
            width: '500%',
            touchAction: 'pan-y'
          }}
        >
          {trackImages.map((imgSrc, idx) => {
            let visualIndex = 0;
            if (idx === 0 || idx === 3) visualIndex = 2;
            else if (idx === 1 || idx === 4) visualIndex = 0;
            else if (idx === 2) visualIndex = 1;

            return (
              <div key={idx} className="w-[20%] h-full flex items-center justify-center relative p-6 flex-shrink-0">
                <img
                  src={imgSrc}
                  alt={`${product.name} - view ${visualIndex + 1}`}
                  className="w-full h-full object-contain pointer-events-none"
                  draggable="false"
                  style={{
                    transform: visualIndex === 1 
                      ? 'scale(1.15)' 
                      : 'scale(1)',
                    transformOrigin: 'center center',
                    backgroundColor: '#ffffff'
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Carousel Pagination & Likes Row overlayed at the bottom of white box */}
        <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between pointer-events-none z-20">
          {/* Spacer to push dots center */}
          <div className="w-[36px]" />

          {/* Dots Indicators */}
          <div className="flex gap-2 pointer-events-auto">
            {[0, 1, 2].map(dotIdx => (
              <button
                key={dotIdx}
                onClick={() => {
                  setCurrentIndex(dotIdx + 1);
                  setIsTransitionEnabled(true);
                  zr.playTick();
                }}
                className="w-[6px] h-[6px] rounded-full border-none cursor-pointer transition-colors duration-300"
                style={{
                  backgroundColor: dotIdx === canonicalIndex ? '#27272a' : '#e4e4e7'
                }}
              />
            ))}
          </div>

          {/* Floating Heart Likes button */}
          <button
            onClick={handleLikeClick}
            className="flex flex-col items-center justify-center w-[36px] focus:outline-none cursor-pointer pointer-events-auto btn-heart"
            style={{ border: 'none', background: 'none' }}
          >
            <svg
              className={`w-6.5 h-6.5 transition-all duration-300 ${
                isHearted ? "scale-110" : ""
              }`}
              viewBox="0 0 24 24"
              style={{ width: '24px', height: '24px', fill: isHearted ? '#ef4444' : '#ECEBE6', color: isHearted ? '#ef4444' : '#ECEBE6' }}
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span className="text-[9px] text-[#A1A1AA] font-bold mt-1 font-grift" style={{ color: '#a1a1aa', fontFamily: "'Grift', sans-serif" }}>
              {isHearted ? "21k" : product.likes}
            </span>
          </button>
        </div>
      </div>

      {/* Details content below image that slides up dynamically */}
      <div className="animate-details-content-slide-up flex flex-col">
        {/* Title & Price Row */}
        <div className="px-6 py-5 flex justify-between items-start">
          <h1 className="text-[26px] font-medium font-grift tracking-wide text-[#F5F2EB] leading-tight" style={{ fontFamily: "'Grift', sans-serif" }}>
            {product.name}
          </h1>
          <div className="text-[26px] font-medium font-grift text-[#F5F2EB] whitespace-nowrap" style={{ fontFamily: "'Grift', sans-serif" }}>
            {product.price}
          </div>
        </div>

        {/* Expandable Accordions */}
        <div className="px-6 border-t border-zinc-900/60" style={{ borderTop: '1px solid rgba(24, 24, 27, 0.4)' }}>
          <AccordionItem
            title="Description"
            content="Exquisitely crafted, this piece features a high-polished finish designed to capture the light from every angle. Ideal for elevating daily ensembles or making a statement at special occasions."
          />
          <AccordionItem
            title="Materials"
            content="Made from premium 18K yellow gold plated sterling silver (925). Nickel-free and hypoallergenic for sensitive skin."
          />
          <AccordionItem
            title="Returns"
            content="We offer complimentary 30-day returns and exchanges. Items must be in their original condition and packaging."
          />
        </div>

        {/* "Complete Your Look" slider section */}
        {sliderProducts.length > 0 && (
          <div className="py-6 flex flex-col gap-4 select-none">
            <h3 className="px-6 text-[18px] font-grift font-light text-[#F5F2EB] tracking-wide" style={{ fontFamily: "'Grift', sans-serif" }}>
              Complete Your Look
            </h3>
            <div className="flex gap-4 overflow-x-auto px-6 pb-2 scrollbar-none scroll-smooth">
              {sliderProducts.map(lookProd => (
                <div
                  key={lookProd.id}
                  onClick={() => {
                    zr.playConfirm();
                    onSelectProduct(lookProd);
                  }}
                  className="flex-shrink-0 w-[140px] rounded-[18px] bg-white p-3 border border-zinc-200 cursor-pointer hover:scale-103 transition-transform"
                  style={{ borderRadius: '18px', border: '1px solid #e4e4e7' }}
                >
                  <img
                    src={lookProd.image}
                    alt={lookProd.name}
                    className="w-full aspect-square object-contain rounded-t-[10px] mb-2 pointer-events-none"
                    draggable="false"
                    style={{ backgroundColor: '#ffffff' }}
                  />
                  <h4 className="text-[10px] font-grift text-zinc-900 truncate" style={{ fontFamily: "'Grift', sans-serif" }}>
                    {lookProd.name}
                  </h4>
                  <div className="text-[11px] font-grift text-zinc-900 mt-0.5" style={{ fontFamily: "'Grift', sans-serif" }}>
                    {lookProd.price}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Bottom Sticky Action Buttons (Fixed at bottom, non-scrollable) */}
    <div className="px-6 py-5 flex border-t border-zinc-900/60 bg-[#121315] flex-shrink-0" style={{ backgroundColor: '#121315', borderTop: '1px solid rgba(24, 24, 27, 0.6)', gap: '18px' }}>
        <button
          onClick={() => {
            zr.playConfirm();
            alert("Order placed successfully! Thank you for buying.");
          }}
          className="flex-1 flex items-center justify-center rounded-[20px] font-medium text-base cursor-pointer btn-buy-now"
          style={{ height: '58px', borderRadius: '20px', border: 'none' }}
        >
          Buy Now
        </button>
        <button
          onClick={onAddToCart}
          className="flex-1 flex items-center justify-center rounded-[20px] font-medium text-base cursor-pointer btn-add-to-cart"
          style={{ height: '58px', borderRadius: '20px', border: 'none', gap: '12px' }}
        >
          Add To Cart <ShoppingCart size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

// Inner Helper Accordion component
function AccordionItem({ title, content }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-zinc-900/60" style={{ borderBottom: '1px solid rgba(24, 24, 27, 0.4)' }}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          zr.playTick();
        }}
        className="w-full flex justify-between items-center py-4 text-left font-grift text-base tracking-wide"
        style={{ fontFamily: "'Grift', sans-serif", border: 'none', background: 'none' }}
      >
        <span style={{ color: '#F5F2EB' }}>{title}</span>
        <span className="text-xl font-light text-zinc-400" style={{ color: '#a1a1aa' }}>{isOpen ? '−' : '+'}</span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{
          maxHeight: isOpen ? '120px' : '0px',
          opacity: isOpen ? 1 : 0,
        }}
      >
        <p className="pb-4 text-xs text-zinc-400 font-sans leading-relaxed">
          {content}
        </p>
      </div>
    </div>
  );
}
