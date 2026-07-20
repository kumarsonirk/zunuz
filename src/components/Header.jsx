import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ANIMATION_DURATION_MS = 2500;

export default function Header({ cartItems, onLogoClick, onCartClick }) {
  const navigate = useNavigate();
  const { customer } = useAuth();
  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  // Shown instead of the plain icon whenever someone's logged in, so a shared
  // or borrowed device reveals whose account is active on any page — not just
  // after navigating into Account — making a leftover session hard to miss.
  const initials = customer?.name
    ? customer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : null;

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
        {/* Account Profile Icon — shows initials instead of the plain icon
            whenever someone's logged in, so it's obvious at a glance whose
            account is active on this device. */}
        <button
          onClick={() => { triggerAnimation(setUserAnimating, userTimeoutRef); navigate('/account'); }}
          className={`btn-nav-item btn-nav-user ${userAnimating ? 'is-animating' : ''}`}
          aria-label={initials ? `Account (signed in as ${customer.name})` : 'User Account'}
        >
          {initials ? (
            <span
              style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #FC4B4E 0%, #c0392b 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '9px', fontWeight: 700, color: 'white', letterSpacing: '0.02em',
                fontFamily: "'Grift', sans-serif",
              }}
            >
              {initials}
            </span>
          ) : (
            <User size={20} strokeWidth={1.5} />
          )}
        </button>
      </div>
    </header>
  );
}
