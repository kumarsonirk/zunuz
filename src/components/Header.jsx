import React from 'react';
import { ShoppingBag, User, Search } from 'lucide-react';

export default function Header({ cartItems, onLogoClick, onCartClick }) {
  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="sticky top-0 z-50 flex justify-between items-center px-6 py-5 border-b border-zinc-900/60 backdrop-blur-lg bg-[#1F2024]/80 main-header">
      <img 
        src="/logo_white.png"
        alt="Zunuz Logo"
        onClick={onLogoClick}
        className="h-6 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity" 
      />
      <div className="flex items-center gap-8 text-[#F5F2EB]">
        {/* Search Icon */}
        <button className="btn-nav-item btn-nav-search" aria-label="Search Products">
          <Search size={20} strokeWidth={1.5} />
        </button>
        {/* Shopping Bag Icon */}
        <button 
          onClick={onCartClick}
          className="btn-nav-item btn-nav-bag relative" 
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
        <button className="btn-nav-item btn-nav-user" aria-label="User Account">
          <User size={20} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
