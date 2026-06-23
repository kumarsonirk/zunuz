import React from 'react';

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
      className="fixed z-50 bg-white border border-zinc-200 shadow-2xl flex flex-col justify-between items-center box-border p-6 overflow-hidden morph-transition-overlay"
      style={{
        top: isMorphing ? `${finalTop}px` : `${clickedCardRect.top}px`,
        left: isMorphing ? `${finalLeft}px` : `${clickedCardRect.left}px`,
        width: isMorphing ? `${finalWidth}px` : `${clickedCardRect.width}px`,
        height: isMorphing ? `${finalHeight}px` : `${clickedCardRect.height}px`,
        borderRadius: isMorphing ? '0px' : '32px'
      }}
    >
      {/* Absolute Image morphing from full-bleed to centered/fitted inside the shorter card */}
      <img
        src={selectedProduct.image}
        alt={selectedProduct.name}
        className="absolute object-contain pointer-events-none bg-white aspect-square morph-image-transition"
        style={{
          width: isMorphing ? `calc(${finalHeight}px - 48px)` : `${clickedCardRect.width}px`,
          height: isMorphing ? `calc(${finalHeight}px - 48px)` : `${clickedCardRect.width}px`,
          top: isMorphing ? '24px' : '50%',
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
          {selectedProduct.price}
        </div>
        <div className="w-[36px]" />
      </div>
    </div>
  );
}
