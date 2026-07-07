import React, { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import zr from '../utils/audio';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import usePlaceOrder from '../hooks/usePlaceOrder';
import AuthRequiredSheet from './AuthRequiredSheet';
import AddressPickerSheet from './AddressPickerSheet';
import OrderSuccessOverlay from './OrderSuccessOverlay';
import PaymentMethodPicker from './PaymentMethodPicker';

export default function BillSummaryDrawer({ isOpen, onClose, product }) {
  const { customer } = useAuth();
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY');
  const { placing, orderError, setOrderError, placedOrder, showSuccess, placeOrder, reset } = usePlaceOrder(customer);

  useEffect(() => {
    if (!isOpen || !customer) return;
    api.get('/customers/addresses')
      .then(addrs => {
        if (!addrs.length) return;
        setSelectedAddress(addrs.find(a => a.isDefault) || addrs[0]);
      })
      .catch(() => {});
  }, [isOpen, customer]);

  useEffect(() => {
    if (!isOpen) { setSelectedAddress(null); reset(); }
  }, [isOpen]);

  useEffect(() => {
    if (showSuccess && placedOrder) zr.playConfirm();
  }, [showSuccess, placedOrder]);

  if (!product) return null;

  // Use pre-computed priceNumeric if available (cart items), otherwise parse from price string.
  // Fall back to displaying product.price directly to avoid format-mismatch rendering issues.
  const priceNumeric = product.priceNumeric != null
    ? product.priceNumeric
    : parseInt((product.price || '').replace(/[^\d]/g, ''), 10) || 0;
  const priceDisplay = product.price || `Rs ${priceNumeric}/-`;

  const handlePlaceOrder = () => {
    if (!customer) { setShowAuthSheet(true); return; }
    if (!selectedAddress) { setOrderError('Please select a delivery address.'); return; }
    placeOrder({
      addressId: selectedAddress.id,
      items: [{ productId: Number(product.id), quantity: 1 }],
      paymentMethod,
    });
  };

  return (
    <>
      <OrderSuccessOverlay isOpen={showSuccess} order={placedOrder} onContinue={onClose} />
      <AuthRequiredSheet isOpen={showAuthSheet} onClose={() => setShowAuthSheet(false)} onNavigate={onClose} />
      <AddressPickerSheet
        isOpen={showAddressPicker}
        onClose={() => setShowAddressPicker(false)}
        selectedId={selectedAddress?.id}
        onSelect={setSelectedAddress}
      />

      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Drawer */}
      <div
        className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-50 bg-[#1F2024] border-t border-zinc-800 rounded-t-3xl shadow-[0_-15px_40px_-10px_rgba(0,0,0,0.95)] flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transform: isOpen ? 'translate3d(0,0,0)' : 'translate3d(0,calc(100% + 100px),0)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1.5" onClick={onClose}>
          <div className="w-12 h-1 bg-zinc-800 rounded-full cursor-pointer hover:bg-zinc-700 transition-colors" />
        </div>

        {/* Header */}
        <div className="px-6 pb-3 flex justify-between items-center border-b border-zinc-900/60">
          <span className="text-[18px] font-grift tracking-wider text-[#F5F2EB]">Checkout Summary</span>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white rounded-full bg-zinc-900/40 hover:bg-zinc-900/80 cursor-pointer transition-colors border-none">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5 text-zinc-300 max-h-[60vh]">

          {/* Product */}
          <div className="flex items-center gap-4 border-b border-zinc-800/50 pb-4">
            <div className="bg-white rounded-[10px] flex items-center justify-center border border-zinc-200 shadow-md flex-shrink-0 overflow-hidden" style={{ width: '90px', height: '115px' }}>
              <img
                src={product.image}
                alt={product.name}
                className="object-contain pointer-events-none"
                style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}
                draggable="false"
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
              <div className="text-[#F5F2EB] font-grift text-[17px] font-medium tracking-wide leading-tight" style={{ fontFamily: "'Grift', sans-serif" }}>{product.name}</div>
              <div className="text-zinc-500 text-[13px]" style={{ fontFamily: "'Grift', sans-serif" }}>Quantity: 1</div>
              <div className="text-[#F5F2EB] font-grift text-[16px] font-light mt-1" style={{ fontFamily: "'Grift', sans-serif" }}>{priceDisplay}</div>
            </div>
          </div>

          {/* Delivery address */}
          <div className="flex flex-col gap-2 bg-zinc-900/20 p-4 rounded-xl border border-zinc-900/60">
            <div className="flex justify-between items-center">
              <span className="text-[13px] uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                <MapPin size={14} className="text-[#FC4B4E]" /> Deliver to
              </span>
              <button
                onClick={() => customer ? setShowAddressPicker(true) : setShowAuthSheet(true)}
                className="text-[#FC4B4E] hover:text-[#ff6b6d] text-[12px] font-bold cursor-pointer transition-colors bg-transparent border-none"
              >
                Change
              </button>
            </div>

            {!customer ? (
              <p className="text-zinc-500 text-[13px]">Sign in to see your saved addresses.</p>
            ) : !selectedAddress ? (
              <p className="text-zinc-500 text-[13px]">No address selected. Tap Change to add one.</p>
            ) : (
              <div className="text-[13px]">
                <div className="text-[#F5F2EB] font-semibold">{selectedAddress.name || customer.name || 'Customer'}</div>
                <div className="text-zinc-400 mt-1 leading-relaxed text-[12px]">
                  {selectedAddress.houseNo ? `${selectedAddress.houseNo}, ` : ''}{selectedAddress.street}, {selectedAddress.city}, {selectedAddress.state} — {selectedAddress.pincode}
                </div>
                {selectedAddress.landmark && <div className="text-zinc-400 mt-0.5 text-[12px]">Near {selectedAddress.landmark}</div>}
                <div className="text-zinc-400 mt-0.5 text-[12px]">Phone: +91 {selectedAddress.phone || customer.phone}</div>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />

          {/* Price */}
          <div className="flex flex-col gap-3">
            <span className="text-[13px] uppercase tracking-wider text-zinc-400 font-semibold">Price Details</span>
            <div className="flex text-[13px] justify-between">
              <span>Items Total</span>
              <span className="text-[#F5F2EB] font-mono">{priceDisplay}</span>
            </div>
            <div className="flex text-[13px] justify-between">
              <span>Delivery Fee</span>
              <span className="text-emerald-400 font-mono">Free</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-zinc-800/40 text-[16px] font-bold text-[#F5F2EB]">
              <span>Grand Total</span>
              <span className="font-mono">{priceDisplay}</span>
            </div>
          </div>
        </div>

        {/* Place Order */}
        <div className="p-6 bg-[#1F2024] border-t border-zinc-900/60">
          {orderError && (
            <div style={{ background: 'rgba(252,75,78,0.08)', border: '1px solid rgba(252,75,78,0.2)', borderRadius: '10px', padding: '10px 14px', color: '#FC4B4E', fontSize: '12px', marginBottom: '12px', fontFamily: "'Grift', sans-serif" }}>
              {orderError}
            </div>
          )}
          <button
            onClick={handlePlaceOrder}
            disabled={placing}
            className="w-full flex justify-between items-center bg-[#FC4B4E] hover:bg-[#ff6b6d] active:scale-[0.98] text-white py-4 px-6 rounded-xl font-bold tracking-wider font-grift transition-all duration-300 shadow-[0_4px_20px_rgba(252,75,78,0.2)] cursor-pointer border-none"
            style={{ height: '58px', opacity: placing ? 0.7 : 1, cursor: placing ? 'not-allowed' : 'pointer' }}
          >
            <span>{placing ? 'Placing Order...' : 'PLACE ORDER'}</span>
            <span className="font-mono">{priceDisplay}</span>
          </button>
        </div>
      </div>
    </>
  );
}
