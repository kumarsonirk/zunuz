import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import zr from '../utils/audio';
import { Br } from '../data/productData';
import { findProductById, findCategoryByProductId } from '../utils/productUtils';

export function useAppState() {
  const navigate = useNavigate();
  const location = useLocation();

  const initialData = (() => {
    const path = window.location.pathname;
    if (path.startsWith('/products/')) {
      const productId = path.slice('/products/'.length);
      if (productId) {
        const product = findProductById(productId);
        if (product) {
          const category = findCategoryByProductId(productId);
          return { product, category };
        }
      }
    }
    return { product: null, category: null };
  })();

  const hasSavedCategory = (() => {
    if (initialData.category) return true;
    try {
      return !!localStorage.getItem('zunuz_selected_category');
    } catch {
      return false;
    }
  })();

  const [showPreloader, setShowPreloader] = useState(!hasSavedCategory);
  const [preloaderPercentage, setPreloaderPercentage] = useState(hasSavedCategory ? 100 : 0);
  const [muted, setMuted] = useState(false);
  const [showShutter, setShowShutter] = useState(false);
  const [shutterActiveIndex, setShutterActiveIndex] = useState(0);
  const [shutterSpeed, setShutterSpeed] = useState(180);
  const [showZunuzText, setShowZunuzText] = useState(false);
  const [showMainBackground, setShowMainBackground] = useState(hasSavedCategory);
  const [shutterEnding, setShutterEnding] = useState(false);
  const [shutterSlideUp, setShutterSlideUp] = useState(false);
  const [showMainContent, setShowMainContent] = useState(hasSavedCategory);
  const [selectedCategory, setSelectedCategory] = useState(() => {
    if (initialData.category) {
      try {
        localStorage.setItem('zunuz_selected_category', JSON.stringify(initialData.category));
      } catch (e) {}
      return initialData.category;
    }
    try {
      const saved = localStorage.getItem('zunuz_selected_category');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  
  const [likedProducts, setLikedProducts] = useState({});
  const [cartItems, setCartItems] = useState([]);
  const canvasRef = useRef(null);

  const [activeTab, setActiveTab] = useState("necklaces");
  const [selectedProduct, setSelectedProduct] = useState(initialData.product);
  const [transitionState, setTransitionState] = useState(initialData.product ? 'details' : 'none'); // 'none', 'animating_in', 'details', 'animating_out'
  const [clickedCardRect, setClickedCardRect] = useState(null);
  const [targetCardRect, setTargetCardRect] = useState(null);
  const [isMorphing, setIsMorphing] = useState(false);
  const [showCartToast, setShowCartToast] = useState(false);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (showCartToast) {
      const timer = setTimeout(() => {
        setShowCartToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showCartToast]);

  useEffect(() => {
    zr.muted = muted;
  }, [muted]);

  useEffect(() => {
    if (selectedCategory) {
      localStorage.setItem('zunuz_selected_category', JSON.stringify(selectedCategory));
    } else {
      localStorage.removeItem('zunuz_selected_category');
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    setActiveTab("necklaces");
    setSelectedProduct(null);
    setTransitionState('none');
  }, [selectedCategory]);

  // Sync URL → state on path changes (handles direct URL access, page refresh, and back/forward navigation)
  useEffect(() => {
    const path = location.pathname;
    const savedCategory = (() => {
      try { return JSON.parse(localStorage.getItem('zunuz_selected_category')); } catch { return null; }
    })();

    if (path.startsWith('/products/')) {
      const productId = path.slice('/products/'.length);
      const resolvedCategory = savedCategory || (productId ? findCategoryByProductId(productId) : null);
      if (resolvedCategory && productId) {
        const product = findProductById(productId);
        if (product) {
          if (!savedCategory) {
            try { localStorage.setItem('zunuz_selected_category', JSON.stringify(resolvedCategory)); } catch (e) {}
            setSelectedCategory(resolvedCategory);
          }
          // Only update selectedProduct if it's different to avoid interrupting morph animations
          if (!selectedProduct || selectedProduct.id !== product.id) {
            setSelectedProduct(product);
            setTransitionState('details');
          }
        } else {
          navigate('/products', { replace: true });
        }
      } else {
        navigate(resolvedCategory ? '/products' : '/', { replace: true });
      }
    } else if (path === '/products') {
      if (!savedCategory) {
        navigate('/', { replace: true });
      } else {
        // If we are at /products and have a selected product, the user went back!
        if (selectedProduct) {
          setSelectedProduct(null);
          setTransitionState('none');
        }
      }
    } else if (path === '/cart') {
      // Valid path, let it render the CartPage
    } else if (path === '/') {
      if (selectedCategory) setSelectedCategory(null);
      if (selectedProduct) setSelectedProduct(null);
      setTransitionState('none');
    } else {
      navigate('/', { replace: true });
    }
  }, [location.pathname]);

  // Preloader Percentage Counter Loop
  useEffect(() => {
    if (hasSavedCategory) return;
    let timer;
    const countUp = (currentVal) => {
      if (currentVal >= 100) {
        timer = setTimeout(() => {
          triggerShutterReveal();
        }, 900);
        return;
      }
      let increment = 1, delay = 50;
      if (currentVal < 25) {
        increment = Math.floor(Math.random() * 3) + 2;
        if (currentVal + increment >= 25) increment = 25 - currentVal;
        delay = 80;
      } else if (currentVal === 25) {
        increment = 1;
        delay = 900; // Pause briefly at 25%
      } else if (currentVal < 50) {
        increment = Math.floor(Math.random() * 4) + 2;
        if (currentVal + increment >= 50) increment = 50 - currentVal;
        delay = 70;
      } else if (currentVal === 50) {
        increment = 1;
        delay = 900; // Pause briefly at 50%
      } else {
        increment = Math.floor(Math.random() * 6) + 4;
        if (currentVal + increment >= 100) increment = 100 - currentVal;
        delay = 45;
      }
      const nextVal = currentVal + increment;
      timer = setTimeout(() => {
        setPreloaderPercentage(nextVal);
        zr.playTick();
        countUp(nextVal);
      }, delay);
    };
    countUp(0);
    return () => clearTimeout(timer);
  }, []);

  const triggerShutterReveal = () => {
    setShowShutter(true);
    setTimeout(() => {
      setShowMainBackground(true);
      setTimeout(() => {
        startShutterFlashSequence();
      }, 250);
    }, 100);
  };

  // Camera Shutter Fast-Flash Sequence
  const startShutterFlashSequence = () => {
    let index = 0;
    const totalFrames = 23;
    const flash = () => {
      if (index >= totalFrames) {
        setShutterActiveIndex(Br.length - 1);
        zr.playFinalClank();
        setShowZunuzText(true);
        setShutterEnding(true);
        setShutterSpeed(1200);
        setTimeout(() => {
          zr.playSplitOpen();
          setShutterSlideUp(true);
          setShowMainContent(true);
          setShowPreloader(false);
          setTimeout(() => {
            setShowShutter(false);
          }, 1100);
        }, 1200);
        return;
      }
      const activeFrame = index % Br.length;
      setShutterActiveIndex(activeFrame);
      const pitchMultiplier = 1 + (index / totalFrames) * 0.95;
      zr.playCameraShutter(pitchMultiplier);
      const speed = 70; // Constant speed of 70ms per frame throughout
      setShutterSpeed(speed);
      index++;
      setTimeout(flash, speed);
    };
    flash();
  };

  const handleLikeToggle = (productId) => {
    setLikedProducts(prev => {
      const copy = { ...prev };
      if (copy[productId]) {
        delete copy[productId];
      } else {
        copy[productId] = true;
      }
      return copy;
    });
    zr.playConfirm();
  };

  const handleAddToCart = (productToAdd) => {
    const prod = (productToAdd && productToAdd.id) ? productToAdd : selectedProduct;
    if (!prod || !prod.id) return;

    setCartItems(prev => {
      const existing = prev.find(item => item.id === prod.id);
      if (existing) {
        return prev.map(item =>
          item.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      const priceVal = parseInt(prod.price.replace(/[^\d]/g, ''), 10) || 0;
      return [
        ...prev,
        {
          id: prod.id,
          name: prod.name,
          price: prod.price,
          priceNumeric: priceVal,
          image: prod.image,
          quantity: 1
        }
      ];
    });
    zr.playConfirm();

    // Show toast for 3 seconds if not on the cart page
    if (location.pathname !== '/cart') {
      setShowCartToast(true);
    }
  };

  const handleUpdateCartQuantity = (productId, delta) => {
    setCartItems(prev => {
      return prev.map(item => {
        if (item.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      });
    });
    zr.playTick();
  };

  const handleRemoveCartItem = (productId) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
    zr.playConfirm();
  };

  const handleSelectProduct = (product, rect) => {
    navigate(`/products/${product.id}`);
    if (!rect) {
      setSelectedProduct(product);
      setTransitionState('details');
      return;
    }

    setSelectedProduct(product);
    setClickedCardRect(rect);
    setTransitionState('animating_in');
    setIsMorphing(false);

    // Let React render the overlay and then morph it in subsequent frames
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsMorphing(true);
      });
    });

    setTimeout(() => {
      setTransitionState('details');
    }, 600);
  };

  const handleBackToProductPage = (targetTab) => {
    navigate('/products');
    const productCategory = selectedProduct
      ? (selectedProduct.id.includes('-n') ? 'necklaces' : selectedProduct.id.includes('-e') ? 'earrings' : 'bracelets')
      : null;

    if (targetTab && productCategory && targetTab !== productCategory) {
      // Different category selected from navigation: bypass morph animation entirely for a clean cross-fade switch
      setSelectedProduct(null);
      setTransitionState('none');
      setTargetCardRect(null);
      setActiveTab(targetTab);
      return;
    }

    if (targetTab) {
      setActiveTab(targetTab);
    }
    
    if (selectedProduct) {
      setTransitionState('animating_out');
      setIsMorphing(true); // make sure it starts at detail header coords
      
      // Let one frame pass, then morph back down to card coords
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsMorphing(false);
        });
      });

      setTimeout(() => {
        setSelectedProduct(null);
        setTransitionState('none');
        setTargetCardRect(null);
      }, 600);
    }
  };

  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    navigate('/products');
    zr.playConfirm();
  };

  return {
    showPreloader,
    preloaderPercentage,
    muted,
    setMuted,
    showShutter,
    shutterActiveIndex,
    shutterSpeed,
    showZunuzText,
    shutterEnding,
    shutterSlideUp,
    showMainBackground,
    showMainContent,
    selectedCategory,
    setSelectedCategory,
    likedProducts,
    setLikedProducts,
    cartItems,
    setCartItems,
    canvasRef,
    activeTab,
    setActiveTab,
    selectedProduct,
    setSelectedProduct,
    transitionState,
    setTransitionState,
    clickedCardRect,
    setClickedCardRect,
    targetCardRect,
    setTargetCardRect,
    isMorphing,
    setIsMorphing,
    showCartToast,
    setShowCartToast,
    handleLikeToggle,
    handleAddToCart,
    handleUpdateCartQuantity,
    handleRemoveCartItem,
    handleSelectProduct,
    handleBackToProductPage,
    handleSelectCategory
  };
}
