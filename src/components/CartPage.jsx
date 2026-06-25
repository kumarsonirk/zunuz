import React, { useState, useMemo } from 'react';
import { Trash2, ChevronUp, ChevronDown, ShoppingBag } from 'lucide-react';
import { productData } from '../data/productData';
import zr from '../utils/audio';

export default function CartPage({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onAddToCart,
  onSelectProduct,
  category
}) {
  const [billSummaryExpanded, setBillSummaryExpanded] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState({
    username: "Rahul Kumar Soni",
    address: "c/o Zunuz Studio, 123 Luxury Road, Mumbai - 400001",
    phone: "+91 98765 43210"
  });

  const handleChangeDelivery = (e) => {
    e.stopPropagation();
    const newUsername = prompt("Enter Username:", deliveryInfo.username);
    if (newUsername === null) return;
    const newAddress = prompt("Enter Address:", deliveryInfo.address);
    if (newAddress === null) return;
    const newPhone = prompt("Enter Phone No:", deliveryInfo.phone);
    if (newPhone === null) return;

    setDeliveryInfo({
      username: newUsername.trim() || deliveryInfo.username,
      address: newAddress.trim() || deliveryInfo.address,
      phone: newPhone.trim() || deliveryInfo.phone
    });
    zr.playConfirm();
  };

  // Compute recommended picks
  const currentCollection = category ? productData[category.id] : productData.core;
  const recommendedPicks = useMemo(() => {
    const list = [];
    if (currentCollection) {
      ['necklaces', 'earrings', 'bracelets'].forEach(tab => {
        const items = currentCollection[tab] || [];
        items.forEach(p => {
          // Avoid recommending items that are already in the cart
          if (!cartItems.some(item => item.id === p.id)) {
            list.push({ ...p, activeTab: tab });
          }
        });
      });
    }
    // If list is empty, fallback to all products in currentCollection
    if (list.length === 0 && currentCollection) {
      ['necklaces', 'earrings', 'bracelets'].forEach(tab => {
        const items = currentCollection[tab] || [];
        items.forEach(p => {
          list.push({ ...p, activeTab: tab });
        });
      });
    }
    return list.slice(0, 6);
  }, [currentCollection, cartItems]);

  // Compute total price
  const totalPrice = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.priceNumeric * item.quantity), 0);
  }, [cartItems]);

  const handleCheckoutClick = () => {
    if (cartItems.length === 0) {
      alert("Your cart is empty!");
      return;
    }
    zr.playConfirm();
    alert(`Thank you for your order! Checkout total: Rs ${totalPrice}/-`);
  };

  const toggleBillSummary = () => {
    setBillSummaryExpanded(!billSummaryExpanded);
    zr.playTick();
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1F2024] text-[#F5F2EB] select-none overflow-hidden relative">
      {/* Scrollable Middle Container */}
      <div 
        className="flex-1 overflow-y-auto scrollbar-none"
        style={{ paddingBottom: cartItems.length > 0 ? '120px' : '24px' }}
      >
        {/* Header Row */}
        <div className="px-6 pt-2 pb-2 flex items-center gap-3">
          <h2 className="text-[20px] font-grift font-light text-[#F5F2EB] tracking-wide" style={{ color: '#f5f2eb', fontFamily: "'Grift', sans-serif" }}>
            My Cart
          </h2>
        </div>

        {/* Cart items list */}
        <div className="flex flex-col divide-y divide-zinc-800/60 border-t border-b border-zinc-800/60">
          {cartItems.length === 0 ? (
            <div className="px-6 py-12 text-center text-zinc-500 text-sm tracking-wider font-grift" style={{ fontFamily: "'Grift', sans-serif" }}>
              Your cart is empty.
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="px-6 py-5 flex items-center justify-between bg-[#1F2024]">
                {/* Product image (white card shape) */}
                <div 
                  onClick={() => onSelectProduct(item)}
                  className="bg-white rounded-[10px] flex items-center justify-center border border-zinc-200 shadow-md cursor-pointer flex-shrink-0 overflow-hidden"
                  style={{ width: '110px', height: '140px' }}
                >
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="object-contain pointer-events-none" 
                    style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}
                    draggable="false"
                  />
                </div>

                {/* Details / Quantities middle column */}
                <div className="flex-1 min-w-0 pl-5 flex flex-col justify-between h-[100px]">
                  <div>
                    <h4 
                      onClick={() => onSelectProduct(item)}
                      className="text-[20px] font-medium font-grift text-[#F5F2EB] truncate tracking-wide cursor-pointer"
                      style={{ fontFamily: "'Grift', sans-serif" }}
                    >
                      {item.name}
                    </h4>
                    <p className="text-[18px] font-light text-zinc-300 mt-1 font-grift" style={{ fontFamily: "'Grift', sans-serif" }}>
                      {item.price}
                    </p>
                  </div>

                  {/* Quantity selector pill */}
                  <div className="flex items-center w-[100px] h-[34px] rounded-lg bg-zinc-800/60 border border-zinc-700/40 overflow-hidden select-none">
                    <button 
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="bg-gray-800 flex-1 h-full flex items-center justify-center text-zinc-400 hover:text-white font-medium hover:bg-zinc-700/30 transition-colors"
                      style={{ border: 'none', cursor: 'pointer' }}
                    >
                      −
                    </button>
                    <span className="text-[13px] text-[#F5F2EB] font-bold w-[30px] text-center font-mono">
                      {item.quantity}
                    </span>
                    <button 
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="bg-gray-800 flex-1 h-full flex items-center justify-center text-zinc-400 hover:text-white font-medium hover:bg-zinc-700/30 transition-colors"
                      style={{border: 'none', cursor: 'pointer' }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Vertical separator & delete button right column */}
                <div className="flex items-center pl-4">
                  <div className="h-[70px] w-[1px] bg-zinc-800/80 mr-4" />
                  <button 
                    onClick={() => onRemoveItem(item.id)}
                    className="text-zinc-500 hover:text-red-400 p-2 transition-colors cursor-pointer"
                    aria-label="Remove Item"
                    style={{ background: 'none', border: 'none' }}
                  >
                    <Trash2 size={20} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pair It With These Picks section */}
        {recommendedPicks.length > 0 && (
          <div className="py-6 flex flex-col gap-4 select-none">
            <h3 className="px-6 text-[18px] font-grift font-light text-[#F5F2EB] tracking-wide" style={{ fontFamily: "'Grift', sans-serif" }}>
              {cartItems.length === 0 ? "Complete your style" : "Pair It With These Picks"}
            </h3>
            <div className="flex gap-4 overflow-x-auto px-6 pt-2 pb-2 scrollbar-none scroll-smooth">
              {recommendedPicks.map(pick => (
                <div
                  key={pick.id}
                  className="flex-shrink-0 w-[140px] rounded-[18px] bg-white p-3 border border-zinc-200 flex flex-col justify-between"
                  style={{ borderRadius: '18px', border: '1px solid #e4e4e7', height: '210px' }}
                >
                  <div 
                    onClick={() => onSelectProduct(pick)}
                    className="cursor-pointer"
                  >
                    <img
                      src={pick.image}
                      alt={pick.name}
                      className="w-full aspect-square object-contain rounded-t-[10px] mb-2 pointer-events-none"
                      draggable="false"
                      style={{ backgroundColor: '#ffffff' }}
                    />
                    <h4 className="text-[14px] font-grift text-zinc-900 truncate" style={{ fontFamily: "'Grift', sans-serif" }}>
                      {pick.name}
                    </h4>
                    <div className="text-[13px] font-grift text-zinc-900 mt-0.5" style={{ fontFamily: "'Grift', sans-serif" }}>
                      {pick.price}
                    </div>
                  </div>
                  <button
                    onClick={() => onAddToCart(pick)}
                    className="w-full h-[32px] bg-[#FC4B4E] hover:bg-[#ff6b6d] text-white text-[12px] font-bold rounded-[6px] tracking-wide cursor-pointer transition-colors mt-2"
                    style={{ border: 'none', fontFamily: "'Grift', sans-serif" }}
                  >
                    ADD
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bill Summary expandable Drawer & Sticky Checkout Bar */}
      {cartItems.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-40 bg-[#1F2024] border-t border-zinc-900/60 shadow-[0_-15px_40px_-10px_rgba(0,0,0,0.85)] flex flex-col">
          {/* Bill Summary header row */}
          <div 
            onClick={toggleBillSummary}
            className="px-6 py-4.5 flex justify-between items-center cursor-pointer hover:bg-zinc-800/20 transition-colors select-none"
          >
            <span className="text-[18px] font-grift tracking-wider text-[#F5F2EB]" style={{ fontFamily: "'Grift', sans-serif" }}>
              Bill Summary
            </span>
            <span className="text-zinc-400">
              {billSummaryExpanded ? <ChevronDown size={22} /> : <ChevronUp size={22} />}
            </span>
          </div>

          {/* Collapsible content area */}
          <div 
            className="overflow-hidden transition-all duration-300"
            style={{
              maxHeight: billSummaryExpanded ? '300px' : '0px',
              opacity: billSummaryExpanded ? 1 : 0
            }}
          >
            <div className="px-6 pb-5 flex flex-col gap-4 text-xs text-zinc-400 border-b border-zinc-900/40">
              {/* Delivery Details Section */}
              <div className="flex justify-between items-start border-b border-zinc-800/40 pb-3">
                <div>
                  <span className="text-[14px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1">Deliver to:</span>
                  <div className="text-[#F5F2EB] font-medium text-[14px]">{deliveryInfo.username}</div>
                  <div className="text-zinc-400 text-[13px] mt-0.5">{deliveryInfo.address}</div>
                  <div className="text-zinc-400 text-[13px] mt-0.5">Phone: {deliveryInfo.phone}</div>
                </div>
                <button 
                  onClick={handleChangeDelivery} 
                  className="text-[#FC4B4E] hover:text-[#ff6b6d] text-[12px] font-bold cursor-pointer transition-colors"
                  style={{ background: 'none', border: 'none' }}
                >
                  Change
                </button>
              </div>

              {/* Price Details Section */}
              <div className="flex flex-col gap-2">
                <span className="text-[13px] uppercase tracking-wider text-zinc-300 font-semibold block mb-1">Price Details</span>
                <div className="flex text-[13px] justify-between">
                  <span>Items Total</span>
                  <span className="text-[#F5F2EB] font-mono">Rs {totalPrice}/-</span>
                </div>
                <div className="flex text-[13px] justify-between">
                  <span>Delivery Fee</span>
                  <span className="text-emerald-400 font-mono">Free</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-zinc-800/40 text-[16px] font-bold text-[#F5F2EB]">
                  <span>Grand Total</span>
                  <span className="font-mono">Rs {totalPrice}/-</span>
                </div>
              </div>
            </div>
          </div>

          {/* Checkout Sticky Bar */}
          <div 
            onClick={handleCheckoutClick}
            className="px-6 py-5.5 flex justify-between items-center bg-[#FC4B4E] hover:bg-[#ff6b6d] active:opacity-90 cursor-pointer select-none transition-colors"
            style={{ height: '62px' }}
          >
            <span className="text-base font-bold text-white tracking-wider font-grift" style={{ fontFamily: "'Grift', sans-serif" }}>
              Checkout
            </span>
            <span className="text-base font-bold text-white tracking-widest font-grift" style={{ fontFamily: "'Grift', sans-serif" }}>
              Rs {totalPrice}/-
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
