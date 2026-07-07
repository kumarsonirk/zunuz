import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, User } from 'lucide-react';

const ANIMATION_DURATION_MS = 2500;

export default function Header({ cartItems, onLogoClick, onCartClick }) {
  const navigate = useNavigate();
  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const [bagAnimating, setBagAnimating] = useState(false);
  const [userAnimating, setUserAnimating] = useState(false);
  const bagTimeoutRef = useRef(null);
  const userTimeoutRef = useRef(null);

  const triggerAnimation = (setter, timeoutRef) => {
    clearTimeout(timeoutRef.current);
    setter(true);
    timeoutRef.current = setTimeout(() => setter(false), ANIMATION_DURATION_MS);
  };

  return (
    <header className="sticky top-0 z-50 flex justify-between items-center px-6 py-4 backdrop-blur-lg bg-[#1F2024]/80 main-header">
      <img
        src="/logo_white.png"
        alt="Zunuz Logo"
        onClick={onLogoClick}
        className="h-6 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
      />
      <div className="flex items-center gap-8 text-[#F5F2EB]">
        {/* Shopping Bag Icon */}
        <button
          onClick={() => { triggerAnimation(setBagAnimating, bagTimeoutRef); onCartClick(); }}
          className={`btn-nav-item btn-nav-bag relative ${bagAnimating ? 'is-animating' : ''}`}
          aria-label="Shopping Bag"
        >
          <ShoppingBag size={20} strokeWidth={1.5} />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-2 bg-[#FC4B4E] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>
        {/* Account Profile Icon */}
        <button
          onClick={() => { triggerAnimation(setUserAnimating, userTimeoutRef); navigate('/account'); }}
          className={`btn-nav-item btn-nav-user ${userAnimating ? 'is-animating' : ''}`}
          aria-label="User Account"
        >
          <User size={20} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
