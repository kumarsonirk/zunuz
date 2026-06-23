import React from 'react';
import { X, MapPin } from 'lucide-react';
import zr from '../utils/audio';

export default function BillSummaryDrawer({
  isOpen,
  onClose,
  product,
  deliveryInfo,
  onChangeDelivery
}) {
  if (!product) return null;

  const priceVal = parseInt(product.price.replace(/[^\d]/g, ''), 10) || 0;

  const handlePlaceOrder = () => {
    zr.playConfirm();
    alert("Order placed successfully! Thank you for buying.");
    onClose();
  };

  return (
    <>
      {/* Semi-transparent Backdrop overlay */}
      <div 
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Slide up Drawer */}
      <div 
        className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-50 bg-[#1F2024] border-t border-zinc-800 rounded-t-3xl shadow-[0_-15px_40px_-10px_rgba(0,0,0,0.95)] flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform"
        style={{
          transform: isOpen ? 'translate3d(0, 0, 0)' : 'translate3d(0, calc(100% + 100px), 0)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
      >
        {/* Drag handle / indicator */}
        <div className="flex justify-center pt-3 pb-1.5" onClick={onClose}>
          <div className="w-12 h-1 bg-zinc-800 rounded-full cursor-pointer hover:bg-zinc-700 transition-colors" />
        </div>

        {/* Header */}
        <div className="px-6 pb-3 flex justify-between items-center border-b border-zinc-900/60">
          <span className="text-[18px] font-grift tracking-wider text-[#F5F2EB]">
            Checkout Summary
          </span>
          <button 
            onClick={onClose} 
            className="p-1 text-zinc-400 hover:text-white rounded-full bg-zinc-900/40 hover:bg-zinc-900/80 cursor-pointer transition-colors border-none"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Scrollable area */}
        <div className="flex-1 overflow-y-auto px-6 py-4.5 flex flex-col gap-5 text-zinc-300 max-h-[60vh]">
          {/* Product Details Section */}
          <div className="flex gap-4 items-center bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/40">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-14 h-14 object-contain bg-white rounded-lg p-1"
            />
            <div className="flex-1 min-w-0">
              <div className="text-[#F5F2EB] font-grift text-[14px] truncate">{product.name}</div>
              <div className="text-zinc-500 text-[12px] mt-0.5">Quantity: 1</div>
            </div>
            <div className="text-[#F5F2EB] font-mono text-[14px] font-semibold">
              {product.price}
            </div>
          </div>

          {/* Delivery Details Section */}
          <div className="flex flex-col gap-2.5 bg-zinc-900/20 p-4.5 rounded-xl border border-zinc-900/60">
            <div className="flex justify-between items-center">
              <span className="text-[13px] uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                <MapPin size={14} className="text-[#FC4B4E]" /> Deliver to
              </span>
              <button 
                onClick={onChangeDelivery} 
                className="text-[#FC4B4E] hover:text-[#ff6b6d] text-[12px] font-bold cursor-pointer transition-colors bg-transparent border-none"
              >
                Change
              </button>
            </div>
            <div className="text-[13px]">
              <div className="text-[#F5F2EB] font-semibold">{deliveryInfo.username}</div>
              <div className="text-zinc-400 mt-1 leading-relaxed text-[12px]">{deliveryInfo.address}</div>
              <div className="text-zinc-400 mt-0.5 text-[12px]">Phone: {deliveryInfo.phone}</div>
            </div>
          </div>

          {/* Price Details Section */}
          <div className="flex flex-col gap-3">
            <span className="text-[13px] uppercase tracking-wider text-zinc-400 font-semibold">Price Details</span>
            <div className="flex text-[13px] justify-between">
              <span>Items Total</span>
              <span className="text-[#F5F2EB] font-mono">Rs {priceVal}/-</span>
            </div>
            <div className="flex text-[13px] justify-between">
              <span>Delivery Fee</span>
              <span className="text-emerald-400 font-mono">Free</span>
            </div>
            <div className="flex justify-between pt-3.5 border-t border-zinc-800/40 text-[16px] font-bold text-[#F5F2EB]">
              <span>Grand Total</span>
              <span className="font-mono">Rs {priceVal}/-</span>
            </div>
          </div>
        </div>

        {/* Place Order Checkout Button */}
        <div className="p-6 bg-[#1F2024] border-t border-zinc-900/60">
          <button 
            onClick={handlePlaceOrder}
            className="w-full flex justify-between items-center bg-[#FC4B4E] hover:bg-[#ff6b6d] active:scale-[0.98] text-white py-4.5 px-6 rounded-xl font-bold tracking-wider font-grift transition-all duration-300 shadow-[0_4px_20px_rgba(252,75,78,0.2)] cursor-pointer border-none"
            style={{ height: '58px' }}
          >
            <span>PLACE ORDER</span>
            <span className="font-mono">Rs {priceVal}/-</span>
          </button>
        </div>
      </div>
    </>
  );
}
