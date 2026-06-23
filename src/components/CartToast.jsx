import React from 'react';

export default function CartToast({ showCartToast, onGoToCart }) {
  if (!showCartToast) return null;

  return (
    <div className="absolute bottom-[90px] left-6 right-6 z-50 bg-[#1F2024]/95 border border-zinc-800 backdrop-blur-md rounded-xl py-3.5 px-4.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center justify-between animate-[fade-slide-up_0.3s_cubic-bezier(0.16,1,0.3,1)]">
      <div className="flex items-center gap-2.5">
        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-[13px] font-grift text-[#F5F2EB] tracking-wide">
          Item added to cart
        </span>
      </div>
      <button 
        onClick={onGoToCart}
        className="text-[#FC4B4E] hover:text-[#ff6b6d] text-[12px] font-bold tracking-wider uppercase font-grift cursor-pointer bg-transparent border-none"
      >
        Go to Cart
      </button>
    </div>
  );
}
