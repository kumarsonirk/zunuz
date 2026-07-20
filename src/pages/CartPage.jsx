import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { productData } from '../data/productData';
import zr from '../utils/audio';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import usePlaceOrder from '../hooks/usePlaceOrder';
import AuthRequiredSheet from '../components/AuthRequiredSheet';
import AddressPickerSheet from '../components/AddressPickerSheet';
import OrderSuccessOverlay from '../components/OrderSuccessOverlay';
import PaymentMethodPicker from '../components/PaymentMethodPicker';
import Price from '../components/Price';

export default function CartPage({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onAddToCart,
  onSelectProduct,
  onClearCart,
  productMap,
  category,
  productsLoaded = false
}) {
  const navigate = useNavigate();
  const { customer } = useAuth();

  const getLiveProduct = (itemId) => {
    if (!productMap) return null;
    for (const cat of Object.values(productMap)) {
      for (const sub of Object.keys(cat).filter(k => Array.isArray(cat[k]))) {
        const found = (cat[sub] || []).find(p => p.id === itemId);
        if (found) return found;
      }
    }
    return null;
  };
  const getItemStock = (itemId) => getLiveProduct(itemId)?.stock ?? null;
  // Cart items snapshot price at add-to-cart time, so it can go stale if the
  // price changes later — always prefer the live productMap value when available.
  const getItemPrice = (item) => {
    const live = getLiveProduct(item.id);
    if (!live) return { price: item.price, priceNumeric: item.priceNumeric };
    const priceNumeric = parseInt(String(live.price).replace(/[^\d]/g, ''), 10) || item.priceNumeric;
    return { price: live.price, priceNumeric };
  };
  const [billSummaryExpanded, setBillSummaryExpanded] = useState(false);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY');
  const { placing, orderError, setOrderError, placedOrder, showSuccess, setShowSuccess, placeOrder } = usePlaceOrder(customer);

  useEffect(() => {
    if (!customer) { setLoadingAddress(false); return; }
    setLoadingAddress(true);
    api.get('/customers/addresses')
      .then(addrs => {
        if (!addrs.length) return;
        setSelectedAddress(addrs.find(a => a.isDefault) || addrs[0]);
      })
      .catch(() => {})
      .finally(() => setLoadingAddress(false));
  }, [customer]);

  // Compute recommended picks — use API productMap when loaded so IDs are consistent.
  // Don't fall back to mock data until we know the real fetch actually failed,
  // otherwise this briefly recommends stale mock products before the real ones load.
  const activeDataMap = productMap || (productsLoaded ? productData : null);
  const currentCollection = activeDataMap
    ? (category ? (activeDataMap[category.id] || null) : (activeDataMap.core || Object.values(activeDataMap)[0] || null))
    : null;
  const recommendedPicks = useMemo(() => {
    const list = [];
    if (currentCollection) {
      Object.keys(currentCollection).filter(k => Array.isArray(currentCollection[k])).forEach(tab => {
        const items = currentCollection[tab] || [];
        items.forEach(p => {
          if (!cartItems.some(item => item.id === p.id)) {
            list.push({ ...p, activeTab: tab });
          }
        });
      });
    }
    return list.slice(0, 6);
  }, [currentCollection, cartItems]);

  // Compute total price — only count available (non-zero-stock) items
  const availableItems = useMemo(() => {
    return cartItems.filter(item => {
      const stock = getItemStock(item.id);
      return stock === null || stock > 0; // null means productMap not loaded yet → treat as available
    });
  }, [cartItems, productMap]);

  const hasOutOfStock = useMemo(() => availableItems.length < cartItems.length, [availableItems, cartItems]);

  const totalPrice = useMemo(() => {
    return availableItems.reduce((acc, item) => acc + (getItemPrice(item).priceNumeric * item.quantity), 0);
  }, [availableItems, productMap]);

  useEffect(() => {
    if (showSuccess && placedOrder) {
      zr.playConfirm();
      onClearCart?.();
    }
  }, [showSuccess, placedOrder]);

  const handleCheckoutClick = () => {
    if (availableItems.length === 0) return;
    if (!customer) { setShowAuthSheet(true); return; }
    if (!selectedAddress) { setOrderError('Please select a delivery address first.'); setBillSummaryExpanded(true); return; }
    placeOrder({
      addressId: selectedAddress.id,
      items: availableItems.map(item => ({ productId: Number(item.id), quantity: item.quantity })),
      paymentMethod,
    });
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
            cartItems.map((item) => {
              const itemStock = getItemStock(item.id);
              const isOOS = itemStock !== null && itemStock === 0;
              const livePrice = getItemPrice(item);
              return (
              <div key={item.id} className="px-6 py-5 flex items-center justify-between bg-[#1F2024] relative" style={{ opacity: isOOS ? 0.45 : 1, transition: 'opacity 0.2s' }}>
                {/* Out of Stock label overlay */}
                {isOOS && (
                  <div style={{ position: 'absolute', top: '10px', left: '16px', background: 'rgba(113,113,122,0.18)', border: '1px solid rgba(113,113,122,0.35)', borderRadius: '20px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px', zIndex: 2 }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#71717A', display: 'inline-block' }} />
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#71717A', fontFamily: "'Grift', sans-serif", letterSpacing: '0.05em' }}>Out of Stock — Not charged</span>
                  </div>
                )}

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
                    <p className="text-[18px] font-light text-zinc-300 mt-1 font-grift" style={{ fontFamily: "'Grift', sans-serif", textDecoration: isOOS ? 'line-through' : 'none' }}>
                      <Price value={livePrice.price} />
                    </p>
                  </div>

                  {/* Quantity selector pill — disabled for OOS items */}
                  <div className="flex items-center w-[100px] h-[34px] rounded-lg bg-zinc-800/60 border border-zinc-700/40 overflow-hidden select-none" style={{ pointerEvents: isOOS ? 'none' : 'auto' }}>
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
              );
            })
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
                      <Price value={pick.price} />
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
            className="transition-all duration-300"
            style={{
              maxHeight: billSummaryExpanded ? '55vh' : '0px',
              opacity: billSummaryExpanded ? 1 : 0,
              overflowY: billSummaryExpanded ? 'auto' : 'hidden',
            }}
          >
            <div className="px-6 pb-5 flex flex-col gap-4 text-xs text-zinc-400 border-b border-zinc-900/40">

              {/* Cart Items Section */}
              <div className="flex flex-col gap-3 border-b border-zinc-800/40 pb-4">
                {cartItems.map(item => {
                  const itemStock = getItemStock(item.id);
                  const isOOS = itemStock !== null && itemStock === 0;
                  const livePrice = getItemPrice(item);
                  return (
                    <div key={item.id} className="flex items-center gap-3" style={{ opacity: isOOS ? 0.45 : 1 }}>
                      <div className="bg-white rounded-[8px] flex items-center justify-center border border-zinc-200 shadow-sm flex-shrink-0 overflow-hidden" style={{ width: '54px', height: '68px' }}>
                        <img src={item.image} alt={item.name} className="object-contain pointer-events-none" style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }} draggable="false" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[#F5F2EB] text-[13px] font-medium truncate" style={{ fontFamily: "'Grift', sans-serif" }}>{item.name}</div>
                        <div className="text-zinc-500 text-[11px] mt-0.5">Qty: {item.quantity}</div>
                        {isOOS && <div className="text-zinc-600 text-[10px] mt-0.5">Out of Stock</div>}
                      </div>
                      <div className="text-[13px] font-mono flex-shrink-0" style={{ color: isOOS ? '#52525b' : '#F5F2EB', textDecoration: isOOS ? 'line-through' : 'none' }}>
                        <Price value={`₹${livePrice.priceNumeric * item.quantity}`} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Delivery Details Section */}
              <div className="flex justify-between items-start border-b border-zinc-800/40 pb-3">
                <div style={{ flex: 1 }}>
                  <span className="text-[14px] uppercase tracking-wider text-zinc-400 font-semibold block mb-1">Deliver to:</span>
                  {!customer ? (
                    <p className="text-zinc-500 text-[13px]">Sign in to see delivery address.</p>
                  ) : loadingAddress ? (
                    <p className="text-zinc-500 text-[13px]">Loading address...</p>
                  ) : !selectedAddress ? (
                    <p className="text-zinc-500 text-[13px]">No address saved. Tap Add to add one.</p>
                  ) : (
                    <>
                      <div className="text-[#F5F2EB] font-medium text-[14px]">{selectedAddress.name || customer.name || 'Customer'}</div>
                      <div className="text-zinc-400 text-[13px] mt-0.5">{selectedAddress.houseNo ? `${selectedAddress.houseNo}, ` : ''}{selectedAddress.street}, {selectedAddress.city}, {selectedAddress.state} — {selectedAddress.pincode}</div>
                      {selectedAddress.landmark && <div className="text-zinc-400 text-[13px] mt-0.5">Near {selectedAddress.landmark}</div>}
                      <div className="text-zinc-400 text-[13px] mt-0.5">Phone: +91 {selectedAddress.phone || customer.phone}</div>
                    </>
                  )}
                </div>
                {customer && !loadingAddress && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (selectedAddress) { setShowAddressPicker(true); return; }
                      navigate('/account/addresses');
                    }}
                    className="text-[#FC4B4E] hover:text-[#ff6b6d] text-[12px] font-bold cursor-pointer transition-colors"
                    style={{ background: 'none', border: 'none', flexShrink: 0, marginLeft: '12px' }}
                  >
                    {selectedAddress ? 'Change' : 'Add'}
                  </button>
                )}
              </div>

              {/* Payment Method Section */}
              <div className="border-b border-zinc-800/40 pb-4">
                <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
              </div>

              {/* Price Details Section */}
              <div className="flex flex-col gap-2">
                <span className="text-[13px] uppercase tracking-wider text-zinc-300 font-semibold block mb-1">Price Details</span>
                {hasOutOfStock && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(113,113,122,0.1)', border: '1px solid rgba(113,113,122,0.25)', borderRadius: '8px', padding: '7px 10px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '11px', color: '#a1a1aa', fontFamily: "'Grift', sans-serif" }}>
                      {cartItems.length - availableItems.length} out-of-stock item{cartItems.length - availableItems.length > 1 ? 's' : ''} excluded from total
                    </span>
                  </div>
                )}
                <div className="flex text-[13px] justify-between">
                  <span>Items Total</span>
                  <span className="text-[#F5F2EB] font-mono"><Price value={`₹${totalPrice}`} /></span>
                </div>
                <div className="flex text-[13px] justify-between">
                  <span>Delivery Fee</span>
                  <span className="text-emerald-400 font-mono">Free</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-zinc-800/40 text-[16px] font-bold text-[#F5F2EB]">
                  <span>Grand Total</span>
                  <span className="font-mono"><Price value={`₹${totalPrice}`} /></span>
                </div>
              </div>
            </div>
          </div>

          {/* Error */}
          {orderError && (
            <div style={{ margin: '0 16px 8px', background: 'rgba(252,75,78,0.08)', border: '1px solid rgba(252,75,78,0.2)', borderRadius: '10px', padding: '10px 14px', color: '#FC4B4E', fontSize: '12px', fontFamily: "'Grift', sans-serif" }}>
              {orderError}
            </div>
          )}

          {/* Checkout Sticky Bar */}
          <div
            onClick={(placing || availableItems.length === 0) ? undefined : handleCheckoutClick}
            className="px-6 py-5.5 flex justify-between items-center bg-[#FC4B4E] select-none transition-colors"
            style={{ height: '62px', opacity: (placing || availableItems.length === 0) ? 0.5 : 1, cursor: (placing || availableItems.length === 0) ? 'not-allowed' : 'pointer' }}
          >
            <span className="text-base font-bold text-white tracking-wider font-grift" style={{ fontFamily: "'Grift', sans-serif" }}>
              {placing ? 'Placing Order...' : availableItems.length === 0 ? 'No Items Available' : 'Checkout'}
            </span>
            <span className="text-base font-bold text-white tracking-widest font-grift" style={{ fontFamily: "'Grift', sans-serif" }}>
              <Price value={`₹${totalPrice}`} />
            </span>
          </div>
        </div>
      )}

      <AuthRequiredSheet isOpen={showAuthSheet} onClose={() => setShowAuthSheet(false)} />
      <AddressPickerSheet
        isOpen={showAddressPicker}
        onClose={() => setShowAddressPicker(false)}
        selectedId={selectedAddress?.id}
        onSelect={setSelectedAddress}
      />
      <OrderSuccessOverlay
        isOpen={showSuccess}
        order={placedOrder}
        onContinue={() => setShowSuccess(false)}
      />
    </div>
  );
}
