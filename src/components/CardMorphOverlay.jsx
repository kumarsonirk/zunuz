import React from 'react';
import Price from './Price';

export default function CardMorphOverlay({
  transitionState,
  selectedProduct,
  clickedCardRect,
  targetCardRect,
  isMorphing
}) {
  if ((transitionState !== 'animating_in' && transitionState !== 'animating_out') || !selectedProduct || !clickedCardRect) {
    return null;
  }

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
      className="fixed z-50 border flex flex-col justify-between items-center box-border overflow-hidden morph-transition-overlay"
      style={{
        top: isMorphing ? `${finalTop}px` : `${clickedCardRect.top}px`,
        left: isMorphing ? `${finalLeft}px` : `${clickedCardRect.left}px`,
        width: isMorphing ? `${finalWidth}px` : `${clickedCardRect.width}px`,
        height: isMorphing ? `${finalHeight}px` : `${clickedCardRect.height}px`,
        padding: isMorphing ? '0px' : '24px',
        borderRadius: isMorphing ? '0px' : '32px',
        borderColor: isMorphing ? 'transparent' : '#e4e4e7',
        boxShadow: isMorphing ? 'none' : '0 25px 50px -12px rgba(0,0,0,0.25)',
        backgroundColor: '#fef5e7'
      }}
    >
      {/* Absolute Image morphing from centered/fitted (matching the source card) to
          full-bleed cover (matching ProductDetailsPage's carousel exactly), so there's
          no visual pop when this overlay hands off to the real page underneath. */}
      <img
        src={selectedProduct.image}
        alt={selectedProduct.name}
        className="absolute pointer-events-none morph-image-transition"
        style={{
          backgroundColor: '#fef5e7',
          objectFit: isMorphing ? 'cover' : 'contain',
          width: isMorphing ? '100%' : `${clickedCardRect.imgWidth || clickedCardRect.width}px`,
          height: isMorphing ? '100%' : `${clickedCardRect.imgHeight || clickedCardRect.width}px`,
          top: isMorphing ? '0' : '50%',
          transform: isMorphing ? 'translate3d(-50%, 0, 0)' : 'translate3d(-50%, -50%, 0)'
        }}
      />
      {/* Title Overlay (Fade out when morphing) */}
      <div
        className="text-center w-full mt-1 z-10 relative morph-fade-transition"
        style={{
          opacity: isMorphing ? 0 : 1
        }}
      >
        <h3 className="text-[24px] font-medium text-zinc-900 tracking-wide font-grift">
          {selectedProduct.name}
        </h3>
      </div>
      {/* Bottom row Overlay (Fade out when morphing) */}
      <div
        className="w-full flex justify-between items-end px-1 z-10 relative morph-fade-transition"
        style={{
          opacity: isMorphing ? 0 : 1
        }}
      >
        <div className="w-[36px]" />
        <div className="text-[28px] font-medium text-zinc-900 font-grift">
          <Price value={selectedProduct.price} />
        </div>
        <div className="w-[36px]" />
      </div>
    </div>
  );
}
