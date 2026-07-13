import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { ShoppingCart, ArrowLeft, RotateCcw, Truck, ChevronRight, Star, ZoomIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { productData } from '../data/productData';
import zr from '../utils/audio';
import ImageLightbox from '../components/ImageLightbox';
import Price from '../components/Price';
import { sampleCornerColor } from '../utils/sampleImageColor';

export default function ProductDetailsPage({
  product,
  category,
  productMap,
  onAddToCart,
  onBack,
  onSelectProduct,
  isTransitioning,
  onMeasured,
  cartItems = [],
  onBuyNow,
  categories = [],
  onSelectCategory
}) {
  const findActiveTab = () => {
    const activeMap = productMap || productData;
    const collection = category ? activeMap[category.id] : null;
    if (collection) {
      for (const sub of Object.keys(collection).filter(k => Array.isArray(collection[k]))) {
        if (collection[sub].some(p => p.id === product.id)) return sub;
      }
    }
    // Fallback heuristic for legacy mock IDs (e.g. "c-n1") when no match is found above
    return product.id.includes('-n')
      ? 'necklaces'
      : product.id.includes('-e')
        ? 'earrings'
        : 'bracelets';
  };
  const activeTab = findActiveTab();

  const [isAdding, setIsAdding] = useState(false);
  const [openAccordion, setOpenAccordion] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const navigate = useNavigate();
  const isInCart = cartItems.some(item => item.id === product.id);

  // Cart items don't carry stock/description/materials — look up the full record
  // from productMap as a fallback when navigating here from the cart.
  const fullProduct = React.useMemo(() => {
    if (!productMap) return null;
    for (const cat of Object.values(productMap)) {
      for (const sub of Object.keys(cat).filter(k => Array.isArray(cat[k]))) {
        const found = (cat[sub] || []).find(p => p.id === product.id);
        if (found) return found;
      }
    }
    return null;
  }, [product.id, productMap]);

  const effectiveStock = product.stock != null ? product.stock : (fullProduct?.stock ?? null);
  // Cart items snapshot price at add-to-cart time, so it can go stale if the
  // price changes later — always prefer the live productMap value when available.
  const effectivePrice = fullProduct?.price || product.price;
  const effectiveDescription = product.description || fullProduct?.description
    || "Exquisitely crafted, this piece features a high-polished finish designed to capture the light from every angle. Ideal for elevating daily ensembles or making a statement at special occasions.";
  const effectiveMaterials = product.materials || fullProduct?.materials
    || "Made from premium 18K yellow gold plated sterling silver (925). Nickel-free and hypoallergenic for sensitive skin.";
  const effectiveTagline = product.tagline || fullProduct?.tagline || null;

  // Deterministic per-product rating (stable across renders/reloads, not a real
  // Math.random() each time) — hashes the product id into a 4.0–5.0 range.
  const rating = React.useMemo(() => {
    let hash = 0;
    const str = String(product.id);
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return Math.round((4.0 + (hash % 11) / 10) * 10) / 10; // 4.0–5.0, one decimal
  }, [product.id]);

  // Reset accordion state when product changes
  useEffect(() => {
    setOpenAccordion(null);
  }, [product]);

  const handleAddClick = () => {
    if (isInCart) {
      navigate('/cart');
      zr.playConfirm();
      return;
    }
    if (isAdding) return;
    setIsAdding(true);
    onAddToCart({ ...product, price: effectivePrice, stock: effectiveStock });
    setTimeout(() => {
      setIsAdding(false);
    }, 2000);
  };


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

  // Setup variants for the carousel (use product.images if available, otherwise fallback).
  // The morph transition from the product card ends on product.image (the card
  // thumbnail), so that same photo must be the carousel's first slide — otherwise
  // whenever the gallery's own first entry differs from the thumbnail, the details
  // page mounts showing a different photo and it visibly swaps out.
  const carouselImages = product.images && product.images.length > 0
    ? [product.image, ...product.images.filter(img => img !== product.image)]
    : [product.image];
  const slideCount = carouselImages.length;

  // For infinite looping in both directions, we clone the last slide at the
  // beginning and the first slide at the end. Sized to however many real
  // images this product has (slideCount), not a fixed count, so a product
  // with 2 photos doesn't get a 3rd empty slot.
  // Rendered track: [clone-of-last, slide 0, ...slide N-2, slide N-1, clone-of-first]
  const trackImages = [carouselImages[slideCount - 1], ...carouselImages, carouselImages[0]];

  const [currentIndex, _setCurrentIndex] = useState(1); // Default to Slide 0 (canonical) at index 1
  const currentIndexRef = useRef(1);
  const setCurrentIndex = (val) => {
    currentIndexRef.current = val;
    _setCurrentIndex(val);
  };

  const [isTransitionEnabled, setIsTransitionEnabled] = useState(false);

  const autoplayRef = useRef(null);

  const stopAutoplay = () => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
  };

  const startAutoplay = () => {
    stopAutoplay();
    autoplayRef.current = setInterval(() => {
      // Enable transition in one render, then advance in the next frame so
      // the browser sees two separate paints and animates correctly.
      setIsTransitionEnabled(true);
      requestAnimationFrame(() => {
        setCurrentIndex(currentIndexRef.current + 1);
      });
    }, 2000);
  };

  // Reset carousel + restart autoplay when product changes; clear on unmount.
  // Autoplay's countdown must start once the entrance morph has actually
  // settled, not the instant this page mounts (which is the moment the user
  // taps the card, still ~600ms before the morph finishes) — otherwise its
  // first auto-advance lands awkwardly just after arrival and reads as an
  // unexpected flash/jump right when things were supposed to be settled.
  useEffect(() => {
    setIsTransitionEnabled(false);
    setCurrentIndex(1);
    if (!isTransitioning) {
      startAutoplay();
    }
    return () => stopAutoplay();
  }, [product, isTransitioning]);

  // Simple touch swipe implementation for product image carousel
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e) => {
    stopAutoplay();

    // Snap boundary index if we are currently at or beyond a cloned index
    if (currentIndexRef.current >= slideCount + 1) {
      setIsTransitionEnabled(false);
      setCurrentIndex(1);
    } else if (currentIndexRef.current <= 0) {
      setIsTransitionEnabled(false);
      setCurrentIndex(slideCount);
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

    // Clamp targetIndex strictly within [0, slideCount + 1] for absolute safety
    targetIndex = Math.max(0, Math.min(slideCount + 1, targetIndex));

    setIsTransitionEnabled(true);
    setCurrentIndex(targetIndex);
    setSwipeOffset(0);
    touchDeltaX.current = 0;
    startAutoplay();
  };

  const openLightbox = (visualIdx) => {
    stopAutoplay();
    setLightboxIndex(visualIdx);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    startAutoplay();
  };

  const handleTransitionEnd = () => {
    if (currentIndexRef.current === slideCount + 1) {
      setIsTransitionEnabled(false);
      setCurrentIndex(1); // Jump back to Slide 0 (canonical)
    } else if (currentIndexRef.current === 0) {
      setIsTransitionEnabled(false);
      setCurrentIndex(slideCount); // Jump forward to the last canonical slide
    }
  };

  // Derive canonicalIndex from currentIndex
  const canonicalIndex = (currentIndex - 1 + slideCount) % slideCount;

  // Use productMap (API data) when available, fall back to static productData
  const activeDataMap = productMap || productData;
  const currentCollection = category ? activeDataMap[category.id] : null;

  // Get all items in the collection, filter out current product, and shuffle randomly
  const sliderProducts = React.useMemo(() => {
    const list = [];
    if (currentCollection) {
      ['necklaces', 'earrings', 'bracelets'].forEach(tab => {
        const items = currentCollection[tab] || [];
        items.forEach(p => {
          if (p.id !== product.id) {
            list.push({ ...p, activeTab: tab });
          }
        });
      });
    }
    // Shuffle the list randomly (Fisher-Yates shuffle)
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }, [currentCollection, product.id]);

  // Other top-level categories (e.g. viewing a Core product shows Trending +
  // Complete Vibe) — lets a shopper jump straight into another collection
  // from wherever they currently are, rather than only from the home screen.
  const otherCategories = React.useMemo(
    () => categories.filter(c => c.id !== category?.id),
    [categories, category]
  );

  // Sample each "Complete Your Look" photo's own backdrop color (product photos
  // aren't all shot on the same background — some are cream, some are black
  // studio backdrops) so the thumbnail's fallback background matches that
  // specific photo instead of a single fixed color that only matches some of
  // them, leaving a visible mismatched border on the rest.
  const [lookColors, setLookColors] = useState({});
  useEffect(() => {
    let cancelled = false;
    sliderProducts.forEach((p) => {
      if (!p?.image || lookColors[p.id]) return;
      sampleCornerColor(p.image).then((sample) => {
        if (cancelled || !sample) return;
        setLookColors(prev => (prev[p.id] ? prev : { ...prev, [p.id]: sample }));
      });
    });
    return () => { cancelled = true; };
  }, [sliderProducts, lookColors]);

  return (
    <div className="flex-1 flex flex-col bg-[#1F2024] text-[#F5F2EB] select-none overflow-hidden relative">
      {/* Scrollable Middle Container */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-none pb-6">

      {/* Product Image Carousel Area */}
      <div
        ref={cardRef}
        className="relative mx-0 mt-0 mb-4 overflow-hidden shrink-0"
        style={{
          width: '100%',
          // Matches the product photos' own portrait ratio (same as the listing-page
          // card) instead of a fixed 380px, so object-cover fills the box without
          // cropping most of the necklace away. maxHeight only kicks in on very wide
          // screens (tablets) — on phones the aspect ratio is what actually governs.
          aspectRatio: '2 / 1',
          // maxHeight: '380px',
          opacity: isTransitioning ? 0 : 1,
          transition: 'opacity 0.25s ease-out',
          backgroundColor: '#fef5e7'
        }}
      >
        <button
          onClick={() => openLightbox(canonicalIndex)}
          aria-label="Zoom image"
          className="absolute top-3 right-3 z-20 flex items-center justify-center"
          style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(0,0,0,0.45)', border: 'none', cursor: 'pointer' }}
        >
          <ZoomIn size={16} strokeWidth={2} color="#F5F2EB" />
        </button>

        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTransitionEnd={handleTransitionEnd}
          className="flex h-full cursor-grab active:cursor-grabbing"
          style={{
            transform: `translate3d(calc(${-currentIndex * (100 / trackImages.length)}% + ${swipeOffset}px), 0, 0)`,
            transition: isTransitionEnabled && !isSwiping ? 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
            width: `${trackImages.length * 100}%`,
            touchAction: 'pan-y'
          }}
        >
          {trackImages.map((imgSrc, idx) => {
            // idx 0 is the cloned last slide, idx slideCount+1 is the cloned
            // first slide; everything in between maps 1:1 to a canonical slide.
            let visualIndex;
            if (idx === 0) visualIndex = slideCount - 1;
            else if (idx === slideCount + 1) visualIndex = 0;
            else visualIndex = idx - 1;

            // Only the slide that's actually on screen first should compete for
            // bandwidth right away — everything else (other photos, loop clones)
            // is deferred so a slow connection isn't split three ways on load.
            const isInitialVisible = visualIndex === 0;

            return (
              <div
                key={idx}
                className="h-full flex items-center justify-center relative flex-shrink-0"
                style={{ width: `${100 / trackImages.length}%`, overflow: 'hidden' }}
              >
                <img
                  src={imgSrc}
                  alt={`${product.name} - view ${visualIndex + 1}`}
                  className="w-full h-full object-cover pointer-events-none"
                  draggable="false"
                  loading={isInitialVisible ? 'eager' : 'lazy'}
                  fetchPriority={isInitialVisible ? 'high' : 'low'}
                  style={{
                    transform: visualIndex === 1
                      ? 'scale(1.15)'
                      : 'scale(1)',
                    transformOrigin: 'center center',
                    backgroundColor: '#fef5e7'
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

          {/* Dots Indicators — one per actual photo, no dot for a single-image product */}
          {slideCount > 1 && (
            <div className="flex gap-2 pointer-events-auto">
              {carouselImages.map((_, dotIdx) => (
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
          )}

          {/* Rating Badge */}
          <div
            className="pointer-events-auto"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: '#FC4B4E', borderRadius: '6px', padding: '3px 7px' }}
          >
            <span style={{ color: 'white', fontSize: '12px', fontWeight: 700, fontFamily: "'Grift', sans-serif" }}>
              {rating.toFixed(1)}
            </span>
            <Star size={11} strokeWidth={0} fill="white" color="white" />
          </div>
        </div>
      </div>

      {/* Details content below image — stays hidden while the card morph is
          still in flight and only starts its slide-up once the image has
          actually landed, so the two don't visibly race each other. */}
      <div
        className={isTransitioning ? 'flex flex-col' : 'animate-details-content-slide-up flex flex-col'}
        style={isTransitioning ? { opacity: 0 } : undefined}
      >
        {/* Title & Price Row */}
        <div className="px-6 py-5 flex flex-col">
          <div className="flex justify-between items-start gap-4">
            <h1 className="text-[26px] font-medium font-grift tracking-wide text-[#F5F2EB] leading-tight" style={{ fontFamily: "'Grift', sans-serif" }}>
              {product.name}
            </h1>
            <div className="text-[26px] font-medium font-grift text-[#F5F2EB] whitespace-nowrap" style={{ fontFamily: "'Grift', sans-serif" }}>
              <Price value={effectivePrice} />
            </div>
          </div>
          {effectiveTagline && (
            <p className="text-[15px] font-grift text-zinc-400 leading-tight" style={{ color: '#a1a1aa', fontFamily: "'Grift', sans-serif", marginTop: '-4px' }}>
              {effectiveTagline}
            </p>
          )}

          {effectiveStock != null && effectiveStock <= 5 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px', background: effectiveStock === 0 ? 'rgba(113,113,122,0.1)' : effectiveStock <= 2 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${effectiveStock === 0 ? 'rgba(113,113,122,0.25)' : effectiveStock <= 2 ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`, borderRadius: '20px', padding: '5px 12px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: effectiveStock === 0 ? '#71717A' : effectiveStock <= 2 ? '#EF4444' : '#F59E0B', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: effectiveStock === 0 ? '#71717A' : effectiveStock <= 2 ? '#EF4444' : '#F59E0B', fontFamily: "'Grift', sans-serif", letterSpacing: '0.04em' }}>
                {effectiveStock === 0 ? 'Out of Stock' : effectiveStock === 1 ? 'Last piece! Order now' : `Only ${effectiveStock} left in stock`}
              </span>
            </div>
          )}
        </div>

        {/* Expandable Accordions */}
        <div className="px-6 border-t border-zinc-900/60" style={{ borderTop: '1px solid rgba(24, 24, 27, 0.4)' }}>
          <AccordionItem
            title="Description"
            content={effectiveDescription}
            isOpen={openAccordion === 'Description'}
            onToggle={() => {
              setOpenAccordion(openAccordion === 'Description' ? null : 'Description');
              zr.playTick();
            }}
          />
          <AccordionItem
            title="Materials"
            content={effectiveMaterials}
            isOpen={openAccordion === 'Materials'}
            onToggle={() => {
              setOpenAccordion(openAccordion === 'Materials' ? null : 'Materials');
              zr.playTick();
            }}
          />
        </div>

        {/* Returns & Delivery capsule links */}
        <div className="px-6 pt-4 pb-1 flex gap-3">
          <button
            onClick={() => { zr.playTick(); navigate('/customer-care/returns-replacements'); }}
            className="flex-1 flex items-center gap-2 rounded-full capsule-link-btn capsule-returns"
            style={{ padding: '10px 16px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer' }}
          >
            <RotateCcw size={14} strokeWidth={1.5} style={{ color: '#A1A1AA', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#F5F2EB', fontFamily: "'Grift', sans-serif", flex: 1, textAlign: 'left' }}>Returns</span>
            <ChevronRight size={14} strokeWidth={1.5} style={{ color: '#71717A', flexShrink: 0 }} />
          </button>
          <button
            onClick={() => { zr.playTick(); navigate('/customer-care/shipping-policy'); }}
            className="flex-1 flex items-center gap-2 rounded-full capsule-link-btn capsule-delivery"
            style={{ padding: '10px 16px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer' }}
          >
            <Truck size={14} strokeWidth={1.5} style={{ color: '#A1A1AA', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#F5F2EB', fontFamily: "'Grift', sans-serif", flex: 1, textAlign: 'left' }}>Delivery</span>
            <ChevronRight size={14} strokeWidth={1.5} style={{ color: '#71717A', flexShrink: 0 }} />
          </button>
        </div>


        {/* "Complete Your Look" slider section */}
        {sliderProducts.length > 0 && (
          <div className="py-6 flex flex-col gap-4 select-none">
            <h3 className="px-6 text-[18px] font-grift font-light text-[#F5F2EB] tracking-wide" style={{ fontFamily: "'Grift', sans-serif" }}>
              Complete Your Look
            </h3>
            <div className="flex gap-4 overflow-x-auto px-6 pt-2 pb-2 scrollbar-none scroll-smooth">
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
                    style={{
                      backgroundColor: lookColors[lookProd.id]
                        ? `rgb(${lookColors[lookProd.id].r}, ${lookColors[lookProd.id].g}, ${lookColors[lookProd.id].b})`
                        : '#f8ebda',
                      transition: 'background-color 0.4s ease'
                    }}
                  />
                  <h4 className="text-[10px] font-grift text-zinc-900 truncate" style={{ fontFamily: "'Grift', sans-serif" }}>
                    {lookProd.name}
                  </h4>
                  <div className="text-[11px] font-grift text-zinc-900 mt-0.5" style={{ fontFamily: "'Grift', sans-serif" }}>
                    <Price value={lookProd.price} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Browse other collections */}
        {otherCategories.length > 0 && (
          <div className="py-6 px-6 flex flex-col gap-4 select-none border-t border-zinc-900/60" style={{ borderTop: '1px solid rgba(24, 24, 27, 0.4)' }}>
            <h3 className="text-[18px] font-grift font-light text-[#F5F2EB] tracking-wide" style={{ fontFamily: "'Grift', sans-serif" }}>
              Explore More Collections
            </h3>
            <div className="flex gap-4">
              {otherCategories.map(cat => (
                <div
                  key={cat.id}
                  onClick={() => {
                    zr.playConfirm();
                    onSelectCategory?.(cat);
                  }}
                  className="relative flex-1 rounded-[18px] overflow-hidden cursor-pointer group"
                  style={{ height: '140px' }}
                >
                  <img
                    src={cat.image}
                    alt={cat.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    draggable="false"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
                  <div className="absolute inset-0 flex items-center justify-center text-center px-2">
                    <h4
                      className="text-[16px] text-white tracking-widest font-qrokinex font-bold"
                      style={{ fontFamily: "'Qrokinex', 'Syncopate', sans-serif" }}
                    >
                      {cat.title}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Bottom Sticky Action Buttons (Fixed at bottom, non-scrollable) */}
    <div className="px-6 py-5 flex border-t border-zinc-900/60 bg-[#1F2024] flex-shrink-0" style={{ backgroundColor: '#1F2024', borderTop: '1px solid rgba(24, 24, 27, 0.6)', gap: '18px' }}>
        <button
          onClick={() => { if (effectiveStock !== 0) onBuyNow({ ...product, price: effectivePrice, stock: effectiveStock }); }}
          disabled={effectiveStock === 0}
          className="flex-1 flex items-center justify-center rounded-[10px] font-medium text-base btn-buy-now"
          style={{ height: '50px', borderRadius: '10px', border: 'none', cursor: effectiveStock === 0 ? 'not-allowed' : 'pointer', opacity: effectiveStock === 0 ? 0.45 : 1 }}
        >
          {effectiveStock === 0 ? 'Out of Stock' : 'Buy Now'}
        </button>
        <button
          onClick={handleAddClick}
          className={`flex-1 flex items-center justify-center rounded-[10px] font-medium text-base cursor-pointer btn-add-to-cart ${isAdding ? 'is-adding' : ''}`}
          style={{ height: '50px', borderRadius: '10px', border: 'none', gap: '12px' }}
        >
          {isAdding ? 'Added!' : isInCart ? 'Go to Cart' : 'Add To Cart'} <ShoppingCart size={18} strokeWidth={2} />
        </button>
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={carouselImages}
          initialIndex={lightboxIndex}
          onClose={closeLightbox}
        />
      )}
    </div>
  );
}

// Inner Helper Accordion component
function AccordionItem({ title, content, isOpen, onToggle }) {
  return (
    <div className="border-b border-zinc-900/60" style={{ borderBottom: '1px solid rgba(24, 24, 27, 0.4)' }}>
      <button
        onClick={onToggle}
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
        <p className="pb-4 text-sm text-zinc-400 leading-relaxed font-sans" style={{ color: '#a1a1aa' }}>
          {content}
        </p>
      </div>
    </div>
  );
}
