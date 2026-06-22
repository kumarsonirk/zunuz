import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, User, Search } from 'lucide-react';
import zr from './utils/audio';
import { Br } from './data/productData';
import ParticleBackground from './components/ParticleBackground';
import Preloader from './components/Preloader';
import ShutterTransition from './components/ShutterTransition';
import CategorySelection from './components/CategorySelection';
import ProductPage from './components/ProductPage';
import ProductDetailsPage from './components/ProductDetailsPage';

export default function App() {
  const hasSavedCategory = (() => {
    try {
      return !!localStorage.getItem('zunuz_selected_category');
    } catch {
      return false;
    }
  })();

  const [showPreloader, setShowPreloader] = useState(!hasSavedCategory);
  const [preloaderPercentage, setPreloaderPercentage] = useState(hasSavedCategory ? 100 : 0);
  const [muted, setMuted] = useState(false);
  const [showShutter, setShowShutter] = useState(false);
  const [shutterActiveIndex, setShutterActiveIndex] = useState(0);
  const [shutterSpeed, setShutterSpeed] = useState(180);
  const [showZunuzText, setShowZunuzText] = useState(false);
  const [showMainBackground, setShowMainBackground] = useState(hasSavedCategory);
  const [shutterEnding, setShutterEnding] = useState(false);
  const [shutterSlideUp, setShutterSlideUp] = useState(false);
  const [showMainContent, setShowMainContent] = useState(hasSavedCategory);
  const [selectedCategory, setSelectedCategory] = useState(() => {
    try {
      const saved = localStorage.getItem('zunuz_selected_category');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  
  // Mobile App Specific states
  const [likedProducts, setLikedProducts] = useState({});
  const [cartCount, setCartCount] = useState(2);
  const canvasRef = useRef(null);

  const [activeTab, setActiveTab] = useState("necklaces");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [transitionState, setTransitionState] = useState('none'); // 'none', 'animating_in', 'details', 'animating_out'
  const [clickedCardRect, setClickedCardRect] = useState(null);
  const [targetCardRect, setTargetCardRect] = useState(null);

  useEffect(() => {
    zr.muted = muted;
  }, [muted]);

  useEffect(() => {
    if (selectedCategory) {
      localStorage.setItem('zunuz_selected_category', JSON.stringify(selectedCategory));
    } else {
      localStorage.removeItem('zunuz_selected_category');
    }
  }, [selectedCategory]);

  useEffect(() => {
    setActiveTab("necklaces");
    setSelectedProduct(null);
    setTransitionState('none');
  }, [selectedCategory]);

  // Preloader Percentage Counter Loop
  useEffect(() => {
    if (hasSavedCategory) return;
    let timer;
    const countUp = (currentVal) => {
      if (currentVal >= 100) {
        timer = setTimeout(() => {
          triggerShutterReveal();
        }, 900);
        return;
      }
      let increment = 1, delay = 50;
      if (currentVal < 25) {
        increment = Math.floor(Math.random() * 3) + 2;
        if (currentVal + increment >= 25) increment = 25 - currentVal;
        delay = 80;
      } else if (currentVal === 25) {
        increment = 1;
        delay = 900; // Pause briefly at 25%
      } else if (currentVal < 50) {
        increment = Math.floor(Math.random() * 4) + 2;
        if (currentVal + increment >= 50) increment = 50 - currentVal;
        delay = 70;
      } else if (currentVal === 50) {
        increment = 1;
        delay = 900; // Pause briefly at 50%
      } else {
        increment = Math.floor(Math.random() * 6) + 4;
        if (currentVal + increment >= 100) increment = 100 - currentVal;
        delay = 45;
      }
      const nextVal = currentVal + increment;
      timer = setTimeout(() => {
        setPreloaderPercentage(nextVal);
        zr.playTick();
        countUp(nextVal);
      }, delay);
    };
    countUp(0);
    return () => clearTimeout(timer);
  }, []);

  const triggerShutterReveal = () => {
    setShowShutter(true);
    setTimeout(() => {
      setShowMainBackground(true);
      setTimeout(() => {
        startShutterFlashSequence();
      }, 250);
    }, 100);
  };

  // Camera Shutter Fast-Flash Sequence
  const startShutterFlashSequence = () => {
    let index = 0;
    const totalFrames = 23;
    const flash = () => {
      if (index >= totalFrames) {
        setShutterActiveIndex(Br.length - 1);
        zr.playFinalClank();
        setShowZunuzText(true);
        setShutterEnding(true);
        setShutterSpeed(1200);
        setTimeout(() => {
          zr.playSplitOpen();
          setShutterSlideUp(true);
          setShowMainContent(true);
          setShowPreloader(false);
          setTimeout(() => {
            setShowShutter(false);
          }, 1100);
        }, 1200);
        return;
      }
      const activeFrame = index % Br.length;
      setShutterActiveIndex(activeFrame);
      const pitchMultiplier = 1 + (index / totalFrames) * 0.95;
      zr.playCameraShutter(pitchMultiplier);
      const speed = 70; // Constant speed of 70ms per frame throughout
      setShutterSpeed(speed);
      index++;
      setTimeout(flash, speed);
    };
    flash();
  };

  const handleLikeToggle = (productId) => {
    setLikedProducts(prev => {
      const copy = { ...prev };
      if (copy[productId]) {
        delete copy[productId];
      } else {
        copy[productId] = true;
      }
      return copy;
    });
    zr.playConfirm();
  };

  const handleAddToCart = () => {
    setCartCount(prev => prev + 1);
    zr.playConfirm();
  };

  const [isMorphing, setIsMorphing] = useState(false);

  const handleSelectProduct = (product, rect) => {
    if (!rect) {
      setSelectedProduct(product);
      setTransitionState('details');
      return;
    }

    setSelectedProduct(product);
    setClickedCardRect(rect);
    setTransitionState('animating_in');
    setIsMorphing(false);

    // Let React render the overlay and then morph it in subsequent frames
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsMorphing(true);
      });
    });

    setTimeout(() => {
      setTransitionState('details');
    }, 600);
  };

  const handleBackToProductPage = (targetTab) => {
    const productCategory = selectedProduct
      ? (selectedProduct.id.includes('-n') ? 'necklaces' : selectedProduct.id.includes('-e') ? 'earrings' : 'bracelets')
      : null;

    if (targetTab && productCategory && targetTab !== productCategory) {
      // Different category selected from navigation: bypass morph animation entirely for a clean cross-fade switch
      setSelectedProduct(null);
      setTransitionState('none');
      setTargetCardRect(null);
      setActiveTab(targetTab);
      return;
    }

    if (targetTab) {
      setActiveTab(targetTab);
    }
    
    if (selectedProduct) {
      setTransitionState('animating_out');
      setIsMorphing(true); // make sure it starts at detail header coords
      
      // Let one frame pass, then morph back down to card coords
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsMorphing(false);
        });
      });

      setTimeout(() => {
        setSelectedProduct(null);
        setTransitionState('none');
        setTargetCardRect(null);
      }, 600);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-[#020203] text-[#F5F2EB] font-sans selection:bg-amber-400 selection:text-black overflow-x-hidden relative">
      {/* 1. Preloader Circle loader */}
      {showPreloader && !showMainBackground && (
        <Preloader
          percentage={preloaderPercentage}
          muted={muted}
          onMuteToggle={() => setMuted(!muted)}
        />
      )}

      {/* 2. Shutter Transition Screens */}
      {showShutter && showMainBackground && (
        <ShutterTransition
          shutterActiveIndex={shutterActiveIndex}
          shutterSpeed={shutterSpeed}
          showZunuzText={showZunuzText}
          shutterEnding={shutterEnding}
          shutterSlideUp={shutterSlideUp}
        />
      )}

      {/* 3. Three.js Particles Canvas Background */}
      {showMainBackground && (
        <ParticleBackground canvasRef={canvasRef} />
      )}

      {/* 4. Main Portfolio Layout */}
      {showMainBackground && (
        <div
          className={`relative z-10 h-[100dvh] w-full flex flex-col justify-between max-w-lg mx-auto shadow-2xl border-x border-zinc-900/80 pb-safe-bottom will-change-[opacity,transform] ${selectedCategory ? "bg-[#121315]" : "bg-[#020203]/90"}`}
          style={{
            opacity: showMainContent ? 1 : 0,
            transform: showMainContent ? "translate3d(0, 0, 0) scale(1)" : "translate3d(0, 100px, 0) scale(0.96)",
            transition: "transform 1200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 1000ms ease-out",
            backgroundColor: selectedCategory ? "#121315" : "rgba(2, 2, 3, 0.9)"
          }}
        >
          {/* Header */}
          <header className="sticky top-0 z-50 flex justify-between items-center px-6 py-5 border-b border-zinc-900/60 backdrop-blur-lg bg-[#121315]/80" style={{ backgroundColor: '#121315', borderBottom: '1px solid rgba(24, 24, 27, 0.6)' }}>
            <img 
              src="/logo_white.png"
              alt="Zunuz Logo"
              onClick={() => {
                setSelectedCategory(null);
                zr.playSplitOpen();
              }}
              className="h-6 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity" 
            />
            <div className="flex items-center gap-8 text-[#F5F2EB]">
              {/* Search Icon */}
              <button className="btn-nav-item btn-nav-search" aria-label="Search Products" style={{ color: '#f5f2eb', background: 'none', border: 'none', cursor: 'pointer' }}>
                <Search size={20} strokeWidth={1.5} />
              </button>
              {/* Shopping Bag Icon */}
              <button className="btn-nav-item btn-nav-bag" aria-label="Shopping Bag" style={{ color: '#f5f2eb', background: 'none', border: 'none', cursor: 'pointer' }}>
                <ShoppingBag size={20} strokeWidth={1.5} />
              </button>
              {/* Account Profile Icon */}
              <button className="btn-nav-item btn-nav-user" aria-label="User Account" style={{ color: '#f5f2eb', background: 'none', border: 'none', cursor: 'pointer' }}>
                <User size={20} strokeWidth={1.5} />
              </button>
            </div>
          </header>

          {selectedCategory === null ? (
            /* View 1: Main Category Selection list */
            <CategorySelection
              onSelectCategory={(category) => {
                setSelectedCategory(category);
                zr.playConfirm();
              }}
            />
          ) : selectedProduct !== null && transitionState !== 'animating_out' ? (
            /* View 3: Dedicated Product Details Page */
            <ProductDetailsPage
              product={selectedProduct}
              category={selectedCategory}
              likedProducts={likedProducts}
              onLikeToggle={handleLikeToggle}
              onAddToCart={handleAddToCart}
              onBack={handleBackToProductPage}
              onSelectProduct={handleSelectProduct}
              isTransitioning={transitionState === 'animating_in' || transitionState === 'animating_out'}
              onMeasured={setTargetCardRect}
            />
          ) : (
            /* View 2: Mobile App Detail Screen (Jewelry Slider/Stack) - now ProductPage */
            <ProductPage
              selectedCategory={selectedCategory}
              likedProducts={likedProducts}
              onLikeToggle={handleLikeToggle}
              onAddToCart={handleAddToCart}
              onSelectProduct={handleSelectProduct}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          )}
        </div>
      )}

      {/* Font face injector */}
      <style>{`
        @font-face {
          font-family: 'Qrokinex';
          src: url('/font/Qrokinex.woff2') format('woff2');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }

        @font-face {
          font-family: 'Grift';
          src: url('/font/Grift-Light.woff') format('woff');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }

        /* Default base font */
        html, body, #root, .font-qrokinex {
          font-family: 'Qrokinex', sans-serif;
        }

        .font-grift, .font-grift * {
          font-family: 'Grift', sans-serif !important;
        }

        .font-serif-custom, .font-serif-custom * {
          font-family: 'Cormorant Garamond', Georgia, serif !important;
        }

        .font-sans-custom, .font-sans-custom * {
          font-family: 'Space Grotesk', sans-serif !important;
        }

        .category-subtitle {
          font-family: 'Grift', sans-serif !important;
        }

        /* Global scrollbar hiding rules to fix frame & remove sidebar from all views */
        html, body, #root, * {
          scrollbar-width: none !important; /* Firefox */
          -ms-overflow-style: none !important; /* IE, Edge */
        }
        
        ::-webkit-scrollbar {
          display: none !important; /* Chrome, Safari, Opera */
          width: 0 !important;
          height: 0 !important;
        }

        @keyframes center-fade-in {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes fadeInPlatform {
          from {
            opacity: 0;
            transform: scale(0.98);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes shutter-curtain-flash {
          0% { opacity: 0.95; }
          100% { opacity: 0; }
        }
        
        .shutter-flash-trigger {
          animation: shutter-curtain-flash 0.12s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        .animate-fade-in-platform {
          animation: fadeInPlatform 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-spin-slow {
          animation: spin 6s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Custom Button Animations & Transitions */
        .btn-buy-now {
          position: relative !important;
          overflow: hidden !important;
          background: linear-gradient(135deg, #FC4B4E 0%, #ff6b6d 50%, #FC4B4E 100%) !important;
          background-size: 200% auto !important;
          color: #ffffff !important;
          box-shadow: 0 4px 15px rgba(252, 75, 78, 0.15) !important;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-position 0.4s ease, letter-spacing 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        
        .btn-buy-now:hover {
          background-position: right center !important;
          transform: translateY(-2px) scale(1.03) !important;
          box-shadow: 0 10px 25px rgba(252, 75, 78, 0.4) !important;
          letter-spacing: 0.05em !important;
        }
        
        .btn-buy-now::after {
          content: '' !important;
          position: absolute !important;
          top: 0 !important;
          left: -60% !important;
          width: 30% !important;
          height: 100% !important;
          background: linear-gradient(
            to right,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.4) 50%,
            rgba(255, 255, 255, 0) 100%
          ) !important;
          transform: skewX(-25deg) !important;
          transition: none !important;
          pointer-events: none !important;
        }
        
        .btn-buy-now:hover::after {
          left: 160% !important;
          transition: left 0.7s ease-in-out !important;
        }
        
        .btn-buy-now:active {
          transform: translateY(1px) scale(0.96) !important;
          transition: transform 0.075s ease-out !important;
          box-shadow: 0 4px 10px rgba(252, 75, 78, 0.2) !important;
        }

        .btn-add-to-cart {
          position: relative !important;
          overflow: hidden !important;
          background-color: #F4F4F5 !important;
          color: #000000 !important;
          border: 1px solid rgba(0, 0, 0, 0.05) !important;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05) !important;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1), color 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
          z-index: 1;
        }
        
        .btn-add-to-cart::before {
          content: '' !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background-color: #18181b !important;
          transform: scaleX(0) !important;
          transform-origin: right !important;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
          z-index: -1 !important;
        }
        
        .btn-add-to-cart:hover::before {
          transform: scaleX(1) !important;
          transform-origin: left !important;
        }
        
        .btn-add-to-cart:hover {
          color: #ffffff !important;
          border-color: #18181b !important;
          transform: translateY(-2px) scale(1.03) !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25) !important;
        }
        
        .btn-add-to-cart:hover svg {
          animation: cart-bounce 0.6s ease-in-out infinite alternate !important;
        }
        
        @keyframes cart-bounce {
          0% {
            transform: translateY(0) scale(1);
          }
          100% {
            transform: translateY(-3px) scale(1.1);
          }
        }
        
        .btn-add-to-cart:active {
          transform: translateY(1px) scale(0.96) !important;
          transition: transform 0.075s ease-out !important;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1) !important;
        }

        /* Nav Header items hover animations */
        .btn-nav-item {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s !important;
        }
        .btn-nav-item:hover {
          transform: scale(1.15) !important;
          opacity: 1 !important;
        }
        .btn-nav-item:active {
          transform: scale(0.95) !important;
        }
        
        .btn-nav-search:hover svg {
          transform: rotate(15deg) !important;
          transition: transform 0.3s ease !important;
        }
        
        .btn-nav-bag:hover svg {
          animation: bag-swing 0.5s ease-in-out infinite alternate !important;
        }
        @keyframes bag-swing {
          0% { transform: rotate(-8deg); }
          100% { transform: rotate(8deg); }
        }
        
        .btn-nav-user:hover svg {
          animation: user-bounce 0.5s ease-in-out infinite alternate !important;
        }
        @keyframes user-bounce {
          0% { transform: translateY(0); }
          100% { transform: translateY(-2.5px); }
        }

        /* Tab Category Buttons hover */
        .tab-btn-inactive {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .tab-btn-inactive:hover span {
          color: #ffffff !important;
          text-shadow: 0 0 8px rgba(255, 255, 255, 0.3) !important;
        }
        .tab-btn-inactive::after {
          content: '' !important;
          position: absolute !important;
          bottom: 0 !important;
          left: 50% !important;
          width: 0 !important;
          height: 2px !important;
          background-color: rgba(255, 255, 255, 0.4) !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          transform: translateX(-50%) !important;
        }
        .tab-btn-inactive:hover::after {
          width: 40% !important;
        }

        /* Heart Button hover heartbeat */
        .btn-heart {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .btn-heart:hover svg {
          animation: heartbeat 0.8s infinite cubic-bezier(0.215, 0.610, 0.355, 1) !important;
        }
        @keyframes heartbeat {
          0% { transform: scale(1); }
          14% { transform: scale(1.22); }
          28% { transform: scale(1); }
          42% { transform: scale(1.22); }
          70% { transform: scale(1); }
        }

        /* Details page slide up transitions */
        @keyframes details-content-slide-up {
          from {
            opacity: 0;
            transform: translate3d(0, 40px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        .animate-details-content-slide-up {
          animation: details-content-slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Product page card stack entrance animation */
        @keyframes card-fade-in {
          from {
            opacity: 0;
            transform: translate3d(0, 10px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        .animate-card-fade-in {
          opacity: 0;
          animation: card-fade-in 0.55s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}</style>

      {/* 5. Shared Element Card Morph Overlay during transitions */}
      {(transitionState === 'animating_in' || transitionState === 'animating_out') && selectedProduct && clickedCardRect && (() => {
        const containerWidth = Math.min(window.innerWidth, 512);
        const targetWidth = containerWidth - 48;
        const targetLeft = (window.innerWidth - containerWidth) / 2 + 24;
        
        // Dynamically compute layout destination from the actual details card ref
        const finalTop = targetCardRect ? targetCardRect.top : 192;
        const finalLeft = targetCardRect ? targetCardRect.left : targetLeft;
        const finalWidth = targetCardRect ? targetCardRect.width : targetWidth;
        const finalHeight = targetCardRect ? targetCardRect.height : 260;

        return (
          <div
            className="fixed z-50 bg-white border border-zinc-200 shadow-2xl flex flex-col justify-between items-center"
            style={{
              top: isMorphing ? `${finalTop}px` : `${clickedCardRect.top}px`,
              left: isMorphing ? `${finalLeft}px` : `${clickedCardRect.left}px`,
              width: isMorphing ? `${finalWidth}px` : `${clickedCardRect.width}px`,
              height: isMorphing ? `${finalHeight}px` : `${clickedCardRect.height}px`,
              borderRadius: '32px',
              padding: '24px',
              boxSizing: 'border-box',
              overflow: 'hidden',
              transition: 'top 0.6s cubic-bezier(0.16, 1, 0.3, 1), left 0.6s cubic-bezier(0.16, 1, 0.3, 1), width 0.6s cubic-bezier(0.16, 1, 0.3, 1), height 0.6s cubic-bezier(0.16, 1, 0.3, 1), padding 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              backgroundColor: '#ffffff'
            }}
          >
            {/* Absolute Image morphing from full-bleed to centered/fitted inside the shorter card */}
            <img
              src={selectedProduct.image}
              alt={selectedProduct.name}
              className="absolute object-contain pointer-events-none"
              style={{
                width: isMorphing ? `calc(${finalHeight}px - 48px)` : `${clickedCardRect.width}px`,
                height: isMorphing ? `calc(${finalHeight}px - 48px)` : `${clickedCardRect.width}px`,
                aspectRatio: '1/1',
                top: isMorphing ? '24px' : '50%',
                left: '50%',
                transform: isMorphing ? 'translate3d(-50%, 0, 0)' : 'translate3d(-50%, -50%, 0)',
                transition: 'top 0.6s cubic-bezier(0.16, 1, 0.3, 1), width 0.6s cubic-bezier(0.16, 1, 0.3, 1), height 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                backgroundColor: '#ffffff'
              }}
            />
            {/* Title Overlay (Fade out when morphing) */}
            <div
              className="text-center w-full mt-1 z-10 relative"
              style={{
                opacity: isMorphing ? 0 : 1,
                transition: 'opacity 0.3s ease-out'
              }}
            >
              <h3 className="text-[24px] font-medium text-zinc-900 tracking-wide font-grift" style={{ fontFamily: "'Grift', sans-serif" }}>
                {selectedProduct.name}
              </h3>
            </div>
            {/* Bottom row Overlay (Fade out when morphing) */}
            <div
              className="w-full flex justify-between items-end px-1 z-10 relative"
              style={{
                opacity: isMorphing ? 0 : 1,
                transition: 'opacity 0.3s ease-out'
              }}
            >
              <div className="w-[36px]" />
              <div className="text-[28px] font-medium text-zinc-900 font-grift" style={{ fontFamily: "'Grift', sans-serif" }}>
                {selectedProduct.price}
              </div>
              <div className="w-[36px]" />
            </div>
          </div>
        );
      })()}
    </div>
  );
}
