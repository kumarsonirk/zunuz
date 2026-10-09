import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  ShoppingBag,
  Heart,
  Star,
  SlidersHorizontal,
  X,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { productData, wp } from '../data/productData';
import Price from '../components/Price';
import Seo from '../components/Seo';

export default function LiteProductsPage({
  selectedCategory,
  productMap,
  onAddToCart,
  onSelectProduct,
  activeTab = 'all',
  setActiveTab,
  cartItems = [],
  onBuyNow,
  subcategories = [],
  productsLoaded = false,
  categories = wp,
  onSelectCategory,
}) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubcat, setSelectedSubcat] = useState('all');
  const [sortBy, setSortBy] = useState('popular'); // 'popular', 'price-low', 'price-high', 'discount'
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [wishlist, setWishlist] = useState({});

  const activeCategoryData = selectedCategory || (categories && categories[0]) || wp[0];
  const activeMap = productMap || productData;

  // Flatten products for current category or subcategory
  const products = useMemo(() => {
    const catKey = activeCategoryData?.id || 'core';
    const catProductsObj = activeMap[catKey] || activeMap['core'] || {};

    let list = [];
    if (selectedSubcat === 'all') {
      Object.keys(catProductsObj).forEach((key) => {
        if (Array.isArray(catProductsObj[key])) {
          list = list.concat(catProductsObj[key]);
        }
      });
    } else if (Array.isArray(catProductsObj[selectedSubcat])) {
      list = catProductsObj[selectedSubcat];
    } else {
      // Fallback: collect across all keys matching subcategory name
      Object.keys(catProductsObj).forEach((key) => {
        if (key.toLowerCase().includes(selectedSubcat.toLowerCase()) && Array.isArray(catProductsObj[key])) {
          list = list.concat(catProductsObj[key]);
        }
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.tagline?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    // Parse numeric price for sorting
    const parsePrice = (priceStr) => {
      if (typeof priceStr === 'number') return priceStr;
      return parseInt(String(priceStr).replace(/[^0-9]/g, ''), 10) || 0;
    };

    // Sort products
    const sorted = [...list];
    if (sortBy === 'price-low') {
      sorted.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    } else if (sortBy === 'price-high') {
      sorted.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    } else if (sortBy === 'discount') {
      sorted.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    }

    return sorted;
  }, [activeCategoryData, activeMap, selectedSubcat, searchQuery, sortBy]);

  const toggleWishlist = (id, e) => {
    e.stopPropagation();
    setWishlist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);

  const subcatOptions = useMemo(() => {
    if (subcategories && subcategories.length > 0) {
      return [{ slug: 'all', name: 'All' }, ...subcategories];
    }
    return [
      { slug: 'all', name: 'All' },
      { slug: 'necklaces', name: 'Necklaces' },
      { slug: 'earrings', name: 'Earrings' },
      { slug: 'bracelets', name: 'Bracelets' },
    ];
  }, [subcategories]);

  // Helper to generate realistic original price & discount tag
  const getPricingDetails = (product) => {
    const numPrice = typeof product.price === 'number'
      ? product.price
      : parseInt(String(product.price).replace(/[^0-9]/g, ''), 10) || 699;

    const originalPrice = Math.round(numPrice * 1.55);
    const discountPercent = Math.round(((originalPrice - numPrice) / originalPrice) * 100);
    const offerPrice = Math.round(numPrice * 0.88);

    return {
      current: `₹${numPrice.toLocaleString('en-IN')}`,
      original: `₹${originalPrice.toLocaleString('en-IN')}`,
      discountPercent: `${discountPercent}%`,
      offerPrice: `₹${offerPrice.toLocaleString('en-IN')}`,
    };
  };

  return (
    <>
      <Seo
        title={`${activeCategoryData?.title || 'Shop'} — Lite View`}
        description={activeCategoryData?.subtitle || 'Explore our full catalog in 2-column e-commerce view.'}
        path="/lite_products"
      />

      <div className="flex-1 w-full bg-[#111110] text-[#F5F2EB] font-sans overflow-y-auto scrollbar-none pb-24">
        {/* ── Top Fixed Navigation Bar ── */}
        <header className="sticky top-0 z-40 w-full bg-[#18191C]/95 backdrop-blur-md border-b border-white/10">
          {/* Top Search Bar Line */}
          <div className="px-3.5 py-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white flex-shrink-0"
            >
              <ArrowLeft size={20} />
            </button>

            {/* Search Bar Input */}
            <div className="flex-1 relative flex items-center">
              <Search size={16} className="absolute left-3.5 text-white/40 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full bg-[#242528] text-sm text-white placeholder-white/40 pl-9 pr-8 py-2 rounded-full border border-white/10 focus:outline-none focus:border-white/30 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-white/50 hover:text-white"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Filter / Sort Button */}
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                aria-label="Filter"
                className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/80 hover:text-white"
              >
                <SlidersHorizontal size={18} />
              </button>

              {/* Sort Dropdown Popup */}
              {showSortDropdown && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-[#242528] border border-white/15 rounded-xl shadow-2xl z-50 py-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => { setSortBy('popular'); setShowSortDropdown(false); }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-white/10 ${sortBy === 'popular' ? 'text-[#D8B26B] font-semibold' : 'text-white/80'}`}
                  >
                    Popularity
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSortBy('price-low'); setShowSortDropdown(false); }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-white/10 ${sortBy === 'price-low' ? 'text-[#D8B26B] font-semibold' : 'text-white/80'}`}
                  >
                    Price: Low to High
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSortBy('price-high'); setShowSortDropdown(false); }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-white/10 ${sortBy === 'price-high' ? 'text-[#D8B26B] font-semibold' : 'text-white/80'}`}
                  >
                    Price: High to Low
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSortBy('discount'); setShowSortDropdown(false); }}
                    className={`w-full text-left px-3.5 py-2 hover:bg-white/10 ${sortBy === 'discount' ? 'text-[#D8B26B] font-semibold' : 'text-white/80'}`}
                  >
                    Discount
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Underline Indicator Subcategory Tab Strip ── */}
          <div className="w-full bg-[#18191C] border-t border-white/5 flex items-center justify-start sm:justify-center overflow-x-auto scrollbar-none px-2">
            {subcatOptions.map((sub) => {
              const isActive = selectedSubcat === sub.slug;
              return (
                <button
                  key={sub.slug}
                  type="button"
                  onClick={() => setSelectedSubcat(sub.slug)}
                  className={`relative py-3 px-5 text-sm font-medium tracking-wide transition-colors flex-shrink-0 ${isActive ? 'text-white font-semibold' : 'text-[#9E9EA0] hover:text-white'
                    }`}
                >
                  {sub.name}
                  {/* Underline Indicator Bar */}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full transition-all duration-300" />
                  )}
                </button>
              );
            })}
          </div>
        </header>

        {/* ── 2-Column Traditional E-Commerce Products Grid ── */}
        <main className="p-2.5 pt-6 max-w-7xl mx-auto">
          {products.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <Search size={40} className="text-white/20 mb-3" />
              <p className="text-base font-medium text-white/80">No products found</p>
              <p className="text-xs text-white/50 mt-1">Try searching for something else or clearing your filters.</p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSelectedSubcat('all'); }}
                className="mt-4 px-4 py-2 bg-[#D8B26B] text-black text-xs font-bold rounded-full"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {products.map((product, index) => {
                const pricing = getPricingDetails(product);
                const isLiked = !!wishlist[product.id];

                return (
                  <div
                    key={product.id || index}
                    onClick={() => {
                      if (onSelectProduct) onSelectProduct(product);
                      else navigate(`/products/${product.slug || product.id}`);
                    }}
                    className="group relative bg-[#181817] border border-white/10 rounded-2xl overflow-hidden flex flex-col cursor-pointer hover:border-[#D8B26B]/50 transition-all duration-300 shadow-lg"
                  >
                    {/* Image Container with Badges */}
                    <div className="relative w-full aspect-[4/5] bg-[#0A0A09] overflow-hidden">
                      <img
                        src={product.image || (product.images && product.images[0]) || '/gold_knot_necklace.webp'}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />

                      {/* Top-Left Live / Offer Badge */}
                      {/* <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600/90 text-white font-bold text-[9px] tracking-wide px-1.5 py-0.5 rounded-md shadow-md uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        LIVE
                      </div> */}

                      {/* Top-Right Wishlist Heart Icon */}
                      {/* <button
                        type="button"
                        onClick={(e) => toggleWishlist(product.id, e)}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/70 transition-colors"
                      >
                        <Heart
                          size={15}
                          className={isLiked ? 'fill-red-500 text-red-500' : 'text-white/80'}
                        />
                      </button> */}
                    </div>

                    {/* Product Metadata & Price Body */}
                    <div className="p-2.5 flex-1 flex flex-col justify-between bg-[#181817]">
                      <div>
                        {/* Title */}
                        <h3 className="font-medium text-xs text-white line-clamp-2 leading-tight group-hover:text-[#D8B26B] transition-colors">
                          {product.name}
                        </h3>

                        {/* Rating & Assured Badge */}
                        <div className="flex items-center justify-between gap-1.5 mt-1.5">
                          <div className="flex items-center gap-0.5 bg-emerald-700/80 text-white text-[10px] font-bold px-1 py-0.2 rounded">
                            <span>4.8</span>
                            <Star size={9} className="fill-white" />
                          </div>
                          {/* <span className="text-[10px] text-white/50">({product.likes || '1.2k'})</span> */}
                          {/* <span className="flex items-center gap-0.5 text-[9px] text-amber-300 font-semibold ml-auto">
                            <ShieldCheck size={10} /> Assured
                          </span> */}
                          <span className="text-sm font-bold text-white">
                            {pricing.current}
                          </span>
                        </div>

                        {/* Price & Discount Row */}
                        <div className="flex items-baseline flex-wrap gap-1.5 mt-2">
                          {/* <span className="text-sm font-bold text-white">
                            {pricing.current}
                          </span> */}
                          {/* <span className="text-[11px] text-white/40 line-through">
                            {pricing.original}
                          </span> */}
                          {/* <span className="text-[11px] font-bold text-emerald-400">
                            ↓ {pricing.discountPercent}
                          </span> */}
                        </div>

                        {/* Offer Tagline */}
                        {/* <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-amber-300/90">
                          <Zap size={11} className="text-amber-400 fill-amber-400" />
                          <span>Buy at {pricing.offerPrice}</span>
                        </div> */}
                      </div>

                      {/* Quick Add To Cart Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onAddToCart) onAddToCart(product);
                        }}
                        className="mt-2.5 w-full py-1.5 rounded-xl bg-white/10 hover:bg-[#D8B26B] hover:text-black text-white font-semibold text-[11px] transition-colors flex items-center justify-center gap-1"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
