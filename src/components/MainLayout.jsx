import React from 'react';
import { useNavigate } from 'react-router-dom';
import zr from '../utils/audio';
import Preloader from './Preloader';
import ShutterTransition from './ShutterTransition';
import ParticleBackground from './ParticleBackground';
import Header from './Header';
import CartToast from './CartToast';
import CardMorphOverlay from './CardMorphOverlay';
import BillSummaryDrawer from './BillSummaryDrawer';

export default function MainLayout({ children, state }) {
  const navigate = useNavigate();

  return (
    <div className="h-[100dvh] w-full bg-[#1F2024] text-[#F5F2EB] font-sans selection:bg-amber-400 selection:text-black overflow-x-hidden relative">
      {/* 1. Preloader Circle loader */}
      {state.showPreloader && !state.showMainBackground && (
        <Preloader
          percentage={state.preloaderPercentage}
          muted={state.muted}
          onMuteToggle={() => state.setMuted(!state.muted)}
        />
      )}

      {/* 2. Shutter Transition Screens */}
      {state.showShutter && state.showMainBackground && (
        <ShutterTransition
          shutterActiveIndex={state.shutterActiveIndex}
          shutterSpeed={state.shutterSpeed}
          showZunuzText={state.showZunuzText}
          shutterEnding={state.shutterEnding}
          shutterSlideUp={state.shutterSlideUp}
        />
      )}

      {/* 3. Three.js Particles Canvas Background */}
      {state.showMainBackground && (
        <ParticleBackground canvasRef={state.canvasRef} />
      )}

      {/* 4. Main Portfolio Layout */}
      {state.showMainBackground && (
        <div
          className="relative z-10 h-[100dvh] w-full flex flex-col justify-between max-w-lg mx-auto shadow-2xl border-x border-zinc-900/80 pb-safe-bottom will-change-[opacity,transform] bg-[#1F2024] main-layout-content-transition overflow-hidden"
          style={{
            opacity: state.showMainContent ? 1 : 0,
            transform: state.showMainContent ? "translate3d(0, 0, 0) scale(1)" : "translate3d(0, 100px, 0) scale(0.96)"
          }}
        >
          {/* Header */}
          <Header
            cartItems={state.cartItems}
            onLogoClick={() => {
              state.setSelectedCategory(null);
              navigate('/');
              zr.playSplitOpen();
            }}
            onCartClick={() => {
              navigate('/cart');
              zr.playConfirm();
            }}
          />

          {children}

          {/* Floating Cart Toast */}
          <CartToast
            showCartToast={state.showCartToast}
            onGoToCart={() => {
              navigate('/cart');
              state.setShowCartToast(false);
              zr.playConfirm();
            }}
          />

          {/* Global Bill Summary Drawer */}
          <BillSummaryDrawer
            isOpen={state.showBillSummaryDrawer}
            onClose={() => state.setShowBillSummaryDrawer(false)}
            product={state.billSummaryProduct}
            deliveryInfo={state.deliveryInfo}
            onChangeDelivery={state.handleChangeDelivery}
          />
        </div>
      )}

      {/* 5. Shared Element Card Morph Overlay during transitions */}
      <CardMorphOverlay
        transitionState={state.transitionState}
        selectedProduct={state.selectedProduct}
        clickedCardRect={state.clickedCardRect}
        targetCardRect={state.targetCardRect}
        isMorphing={state.isMorphing}
      />
    </div>
  );
}
